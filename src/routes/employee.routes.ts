import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../config/db';
import { sendSuccess } from '../utils/response';
import { authenticateJWT } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { Role, UserStatus } from '@prisma/client';
import { BadRequestError, ConflictError, NotFoundError } from '../utils/errors';
import { ActivityLogService } from '../services/activity.service';

const router = Router();

const updateEmployeeSchema = z.object({
  departmentId: z.string().uuid().nullable().optional(),
  status: z.nativeEnum(UserStatus).optional(),
});

const promoteEmployeeSchema = z.object({
  role: z.nativeEnum(Role),
});

// GET /api/employees
router.get('/', authenticateJWT, async (req, res, next) => {
  try {
    const deptId = req.query.departmentId as string | undefined;
    const roleQuery = req.query.role as Role | undefined;
    const statusQuery = req.query.status as UserStatus | undefined;

    // Apply filters
    const whereClause: any = {};
    if (deptId) whereClause.departmentId = deptId;
    if (roleQuery) whereClause.role = roleQuery;
    if (statusQuery) whereClause.status = statusQuery;

    const employees = await prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        departmentId: true,
        department: {
          select: { id: true, name: true, code: true },
        },
        createdAt: true,
      },
      orderBy: { name: 'asc' },
    });

    return sendSuccess(res, employees);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/employees/:id (Admin only)
router.patch('/:id', authenticateJWT, requireRole([Role.ADMIN]), async (req, res, next) => {
  try {
    const { id } = req.params;
    const body = updateEmployeeSchema.parse(req.body);

    const employee = await prisma.user.findUnique({
      where: { id },
    });
    if (!employee) {
      throw new NotFoundError('Employee not found');
    }

    if (body.departmentId) {
      const dept = await prisma.department.findUnique({
        where: { id: body.departmentId },
      });
      if (!dept || dept.status === 'INACTIVE') {
        throw new BadRequestError('Invalid department or department is inactive');
      }
    }

    // Deactivation logic checks:
    // Block deactivation if the user is the head of an active department.
    if (body.status === UserStatus.INACTIVE && employee.status === UserStatus.ACTIVE) {
      const isHeadOf = await prisma.department.count({
        where: { headUserId: id, status: 'ACTIVE' },
      });
      if (isHeadOf > 0) {
        throw new ConflictError('Cannot deactivate user who is currently an active Department Head. Reassign department head first.');
      }
    }

    const updated = await prisma.user.update({
      where: { id },
      data: {
        departmentId: body.departmentId !== undefined ? body.departmentId : undefined,
        status: body.status,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        departmentId: true,
      },
    });

    await ActivityLogService.log({
      actorId: req.user?.id,
      action: 'EMPLOYEE_UPDATE',
      entityType: 'User',
      entityId: id,
      beforeData: { departmentId: employee.departmentId, status: employee.status },
      afterData: { departmentId: updated.departmentId, status: updated.status },
    });

    return sendSuccess(res, updated, 'Employee updated successfully');
  } catch (err) {
    next(err);
  }
});

// PATCH /api/employees/:id/role (Admin only)
router.patch('/:id/role', authenticateJWT, requireRole([Role.ADMIN]), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { role } = promoteEmployeeSchema.parse(req.body);

    const employee = await prisma.user.findUnique({
      where: { id },
    });
    if (!employee) {
      throw new NotFoundError('Employee not found');
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { role },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        departmentId: true,
      },
    });

    await ActivityLogService.log({
      actorId: req.user?.id,
      action: 'EMPLOYEE_ROLE_PROMOTION',
      entityType: 'User',
      entityId: id,
      beforeData: { role: employee.role },
      afterData: { role: updated.role },
    });

    return sendSuccess(res, updated, `Employee role promoted to ${role} successfully`);
  } catch (err) {
    next(err);
  }
});

export default router;
