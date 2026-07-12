import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../config/db';
import { sendSuccess } from '../utils/response';
import { authenticateJWT } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { Role, Status } from '@prisma/client';
import { BadRequestError, ConflictError, NotFoundError } from '../utils/errors';
import { ActivityLogService } from '../services/activity.service';

const router = Router();

const createDeptSchema = z.object({
  name: z.string().min(2),
  code: z.string().min(2).toUpperCase(),
  parentDepartmentId: z.string().uuid().nullable().optional(),
  headUserId: z.string().uuid().nullable().optional(),
});

const updateDeptSchema = z.object({
  name: z.string().min(2).optional(),
  code: z.string().min(2).toUpperCase().optional(),
  parentDepartmentId: z.string().uuid().nullable().optional(),
  headUserId: z.string().uuid().nullable().optional(),
  status: z.nativeEnum(Status).optional(),
});

// GET /api/departments
router.get('/', authenticateJWT, async (req, res, next) => {
  try {
    const statusQuery = req.query.status as string | undefined;
    const status = statusQuery === 'INACTIVE' ? Status.INACTIVE : Status.ACTIVE;

    const departments = await prisma.department.findMany({
      where: statusQuery ? { status } : {},
      include: {
        headUser: {
          select: { id: true, name: true, email: true },
        },
        parentDepartment: {
          select: { id: true, name: true, code: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    return sendSuccess(res, departments);
  } catch (err) {
    next(err);
  }
});

// POST /api/departments (Admin only)
router.post('/', authenticateJWT, requireRole([Role.ADMIN]), async (req, res, next) => {
  try {
    const body = createDeptSchema.parse(req.body);

    // Check unique code
    const existingCode = await prisma.department.findUnique({
      where: { code: body.code },
    });
    if (existingCode) {
      throw new ConflictError('Department code already exists');
    }

    // Check parent department exists and is active
    if (body.parentDepartmentId) {
      const parent = await prisma.department.findUnique({
        where: { id: body.parentDepartmentId },
      });
      if (!parent || parent.status === Status.INACTIVE) {
        throw new BadRequestError('Invalid parent department or parent is inactive');
      }
    }

    // Check head user exists and is active
    if (body.headUserId) {
      const head = await prisma.user.findUnique({
        where: { id: body.headUserId },
      });
      if (!head || head.status === 'INACTIVE') {
        throw new BadRequestError('Invalid head user or user is inactive');
      }
    }

    const department = await prisma.department.create({
      data: {
        name: body.name,
        code: body.code,
        parentDepartmentId: body.parentDepartmentId || null,
        headUserId: body.headUserId || null,
        status: Status.ACTIVE,
      },
    });

    // If head user was assigned, we automatically promote them to DEPARTMENT_HEAD if they are currently an EMPLOYEE
    if (body.headUserId) {
      const user = await prisma.user.findUnique({ where: { id: body.headUserId } });
      if (user && user.role === Role.EMPLOYEE) {
        await prisma.user.update({
          where: { id: body.headUserId },
          data: { role: Role.DEPARTMENT_HEAD, departmentId: department.id },
        });
      }
    }

    await ActivityLogService.log({
      actorId: req.user?.id,
      action: 'DEPARTMENT_CREATE',
      entityType: 'Department',
      entityId: department.id,
      afterData: department,
    });

    return sendSuccess(res, department, 'Department created successfully', 201);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/departments/:id (Admin only)
router.patch('/:id', authenticateJWT, requireRole([Role.ADMIN]), async (req, res, next) => {
  try {
    const { id } = req.params;
    const body = updateDeptSchema.parse(req.body);

    const department = await prisma.department.findUnique({
      where: { id },
    });
    if (!department) {
      throw new NotFoundError('Department not found');
    }

    // Block deactivation if active users or assets are linked
    if (body.status === Status.INACTIVE && department.status === Status.ACTIVE) {
      const activeEmployees = await prisma.user.count({
        where: { departmentId: id, status: 'ACTIVE' },
      });
      const activeAssets = await prisma.asset.count({
        where: { owningDepartmentId: id, NOT: { status: 'DISPOSED' } },
      });

      if (activeEmployees > 0 || activeAssets > 0) {
        throw new ConflictError(
          'Cannot deactivate department with active employees or active assets. Reassign them first.'
        );
      }
    }

    if (body.code && body.code !== department.code) {
      const existingCode = await prisma.department.findUnique({
        where: { code: body.code },
      });
      if (existingCode) {
        throw new ConflictError('Department code already exists');
      }
    }

    const updated = await prisma.department.update({
      where: { id },
      data: {
        name: body.name,
        code: body.code,
        parentDepartmentId: body.parentDepartmentId !== undefined ? body.parentDepartmentId : undefined,
        headUserId: body.headUserId !== undefined ? body.headUserId : undefined,
        status: body.status,
      },
    });

    // If head user was updated, verify promotion
    if (body.headUserId) {
      const user = await prisma.user.findUnique({ where: { id: body.headUserId } });
      if (user && user.role === Role.EMPLOYEE) {
        await prisma.user.update({
          where: { id: body.headUserId },
          data: { role: Role.DEPARTMENT_HEAD, departmentId: id },
        });
      }
    }

    await ActivityLogService.log({
      actorId: req.user?.id,
      action: 'DEPARTMENT_UPDATE',
      entityType: 'Department',
      entityId: id,
      beforeData: department,
      afterData: updated,
    });

    return sendSuccess(res, updated, 'Department updated successfully');
  } catch (err) {
    next(err);
  }
});

export default router;
