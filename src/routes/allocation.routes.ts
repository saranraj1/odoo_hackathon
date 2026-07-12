import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../config/db';
import { sendSuccess } from '../utils/response';
import { authenticateJWT } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { Role, AssetStatus, AllocationStatus } from '@prisma/client';
import { BadRequestError, ConflictError, NotFoundError } from '../utils/errors';
import { validateTransition } from '../utils/lifecycle';
import { ActivityLogService } from '../services/activity.service';
import { NotificationService } from '../services/notification.service';

const router = Router();

const allocateSchema = z
  .object({
    assetId: z.string().uuid(),
    employeeId: z.string().uuid().nullable().optional(),
    departmentId: z.string().uuid().nullable().optional(),
    expectedReturnAt: z.string().nullable().optional(),
  })
  .refine((b) => !!b.employeeId || !!b.departmentId, {
    message: 'Either employeeId or departmentId is required',
  });

const returnSchema = z.object({
  returnCondition: z.string().min(1),
  checkInNotes: z.string().nullable().optional(),
});

async function flagOverdueAllocations(allocations: { id: string; expectedReturnAt: Date | null; employeeId: string | null; assetId: string }[]) {
  const now = new Date();
  const overdue = allocations.filter((a) => a.expectedReturnAt && a.expectedReturnAt < now && a.employeeId);

  for (const alloc of overdue) {
    const existing = await prisma.notification.findFirst({
      where: { type: 'Overdue Return', entityType: 'Allocation', entityId: alloc.id },
    });
    if (!existing) {
      await NotificationService.create({
        recipientId: alloc.employeeId!,
        type: 'Overdue Return',
        title: 'Overdue asset return',
        message: 'An asset allocated to you is past its expected return date.',
        entityType: 'Allocation',
        entityId: alloc.id,
      });
    }
  }
}

// GET /api/allocations
router.get('/', authenticateJWT, async (req, res, next) => {
  try {
    const { assetId, employeeId, departmentId, status } = req.query as Record<string, string | undefined>;

    const where: any = {};
    if (assetId) where.assetId = assetId;
    if (status) where.status = status;

    if (req.user!.role === Role.EMPLOYEE) {
      where.employeeId = req.user!.id;
    } else if (req.user!.role === Role.DEPARTMENT_HEAD && req.user!.departmentId) {
      // Scope to allocations targeting their department directly, or to employees within it
      where.OR = [{ departmentId: req.user!.departmentId }, { employee: { departmentId: req.user!.departmentId } }];
    } else {
      if (employeeId) where.employeeId = employeeId;
      if (departmentId) where.departmentId = departmentId;
    }

    const allocations = await prisma.allocation.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    await flagOverdueAllocations(allocations);

    return sendSuccess(res, allocations);
  } catch (err) {
    next(err);
  }
});

// POST /api/allocations (Asset Manager only)
router.post('/', authenticateJWT, requireRole([Role.ASSET_MANAGER]), async (req, res, next) => {
  try {
    const body = allocateSchema.parse(req.body);

    const asset = await prisma.asset.findUnique({ where: { id: body.assetId } });
    if (!asset) throw new NotFoundError('Asset not found');

    if (asset.status !== AssetStatus.AVAILABLE) {
      const currentAlloc = await prisma.allocation.findFirst({
        where: { assetId: asset.id, status: AllocationStatus.ACTIVE },
        include: { employee: { select: { name: true } }, department: { select: { name: true } } },
      });
      throw new ConflictError(
        `Asset is already ${asset.status.toLowerCase()}${
          currentAlloc ? ` (held by ${currentAlloc.employee?.name || currentAlloc.department?.name || 'unknown holder'})` : ''
        }`,
        'ASSET_ALREADY_ALLOCATED'
      );
    }

    if (body.employeeId) {
      const employee = await prisma.user.findUnique({ where: { id: body.employeeId } });
      if (!employee || employee.status !== 'ACTIVE') {
        throw new BadRequestError('Invalid employee or employee is inactive');
      }
    }
    if (body.departmentId) {
      const department = await prisma.department.findUnique({ where: { id: body.departmentId } });
      if (!department || department.status !== 'ACTIVE') {
        throw new BadRequestError('Invalid department or department is inactive');
      }
    }

    const [allocation] = await prisma.$transaction([
      prisma.allocation.create({
        data: {
          assetId: asset.id,
          employeeId: body.employeeId || null,
          departmentId: body.departmentId || null,
          allocatedById: req.user!.id,
          expectedReturnAt: body.expectedReturnAt ? new Date(body.expectedReturnAt) : null,
          status: AllocationStatus.ACTIVE,
        },
      }),
      prisma.asset.update({ where: { id: asset.id }, data: { status: AssetStatus.ALLOCATED } }),
    ]);

    await ActivityLogService.log({
      actorId: req.user?.id,
      action: 'ALLOCATION_CREATE',
      entityType: 'Allocation',
      entityId: allocation.id,
      afterData: allocation,
    });

    if (body.employeeId) {
      await NotificationService.create({
        recipientId: body.employeeId,
        type: 'Asset Assigned',
        title: 'New asset assigned',
        message: `${asset.name} (${asset.assetTag}) has been allocated to you.`,
        entityType: 'Asset',
        entityId: asset.id,
      });
    }

    return sendSuccess(res, allocation, 'Asset allocated successfully', 201);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/allocations/:id/return (Asset Manager only)
router.patch('/:id/return', authenticateJWT, requireRole([Role.ASSET_MANAGER]), async (req, res, next) => {
  try {
    const { id } = req.params;
    const body = returnSchema.parse(req.body);

    const allocation = await prisma.allocation.findUnique({ where: { id } });
    if (!allocation) throw new NotFoundError('Allocation not found');
    if (allocation.status !== AllocationStatus.ACTIVE) {
      throw new ConflictError('This allocation has already been returned');
    }

    const asset = await prisma.asset.findUnique({ where: { id: allocation.assetId } });
    if (!asset) throw new NotFoundError('Asset not found');
    validateTransition(asset.status, AssetStatus.AVAILABLE);

    const [updatedAllocation] = await prisma.$transaction([
      prisma.allocation.update({
        where: { id },
        data: {
          status: AllocationStatus.RETURNED,
          returnedAt: new Date(),
          returnCondition: body.returnCondition,
          checkInNotes: body.checkInNotes || null,
        },
      }),
      prisma.asset.update({ where: { id: asset.id }, data: { status: AssetStatus.AVAILABLE, condition: body.returnCondition } }),
    ]);

    await ActivityLogService.log({
      actorId: req.user?.id,
      action: 'ALLOCATION_RETURN',
      entityType: 'Allocation',
      entityId: id,
      beforeData: allocation,
      afterData: updatedAllocation,
    });

    return sendSuccess(res, updatedAllocation, 'Asset return recorded successfully');
  } catch (err) {
    next(err);
  }
});

export default router;
