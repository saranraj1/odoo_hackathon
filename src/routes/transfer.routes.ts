import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../config/db';
import { sendSuccess } from '../utils/response';
import { authenticateJWT } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { Role, AssetStatus, AllocationStatus, TransferStatus } from '@prisma/client';
import { BadRequestError, ConflictError, ForbiddenError, NotFoundError } from '../utils/errors';
import { ActivityLogService } from '../services/activity.service';
import { NotificationService } from '../services/notification.service';

const router = Router();

const createTransferSchema = z
  .object({
    assetId: z.string().uuid(),
    sourceAllocationId: z.string().uuid(),
    toEmployeeId: z.string().uuid().nullable().optional(),
    toDepartmentId: z.string().uuid().nullable().optional(),
    reason: z.string().min(10),
  })
  .refine((b) => !!b.toEmployeeId || !!b.toDepartmentId, {
    message: 'Either toEmployeeId or toDepartmentId is required',
  });

const decisionSchema = z.object({
  status: z.enum([TransferStatus.APPROVED, TransferStatus.REJECTED]),
  decisionNote: z.string().nullable().optional(),
});

// GET /api/transfers
router.get('/', authenticateJWT, async (req, res, next) => {
  try {
    const { assetId, status } = req.query as Record<string, string | undefined>;

    const where: any = {};
    if (assetId) where.assetId = assetId;
    if (status) where.status = status;

    if (req.user!.role === Role.EMPLOYEE) {
      where.OR = [{ requestedById: req.user!.id }, { toEmployeeId: req.user!.id }];
    } else if (req.user!.role === Role.DEPARTMENT_HEAD && req.user!.departmentId) {
      where.OR = [
        { toDepartmentId: req.user!.departmentId },
        { toEmployee: { departmentId: req.user!.departmentId } },
        { requestedBy: { departmentId: req.user!.departmentId } },
      ];
    }

    const transfers = await prisma.transferRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return sendSuccess(res, transfers);
  } catch (err) {
    next(err);
  }
});

// POST /api/transfers
router.post('/', authenticateJWT, async (req, res, next) => {
  try {
    const body = createTransferSchema.parse(req.body);

    const asset = await prisma.asset.findUnique({ where: { id: body.assetId } });
    if (!asset) throw new NotFoundError('Asset not found');

    const sourceAllocation = await prisma.allocation.findUnique({ where: { id: body.sourceAllocationId } });
    if (!sourceAllocation || sourceAllocation.assetId !== body.assetId) {
      throw new BadRequestError('Source allocation does not match this asset');
    }
    if (sourceAllocation.status !== AllocationStatus.ACTIVE) {
      throw new ConflictError('The source allocation is no longer active');
    }

    if (body.toEmployeeId) {
      const employee = await prisma.user.findUnique({ where: { id: body.toEmployeeId } });
      if (!employee || employee.status !== 'ACTIVE') {
        throw new BadRequestError('Invalid recipient employee or employee is inactive');
      }
    }
    if (body.toDepartmentId) {
      const department = await prisma.department.findUnique({ where: { id: body.toDepartmentId } });
      if (!department || department.status !== 'ACTIVE') {
        throw new BadRequestError('Invalid recipient department or department is inactive');
      }
    }

    const transfer = await prisma.transferRequest.create({
      data: {
        assetId: body.assetId,
        sourceAllocationId: body.sourceAllocationId,
        toEmployeeId: body.toEmployeeId || null,
        toDepartmentId: body.toDepartmentId || null,
        requestedById: req.user!.id,
        reason: body.reason,
        status: TransferStatus.REQUESTED,
      },
    });

    await ActivityLogService.log({
      actorId: req.user?.id,
      action: 'TRANSFER_REQUEST_CREATE',
      entityType: 'TransferRequest',
      entityId: transfer.id,
      afterData: transfer,
    });

    if (sourceAllocation.employeeId) {
      await NotificationService.create({
        recipientId: sourceAllocation.employeeId,
        type: 'Transfer Requested',
        title: 'Transfer requested for your asset',
        message: `A transfer has been requested for ${asset.name} (${asset.assetTag}).`,
        entityType: 'TransferRequest',
        entityId: transfer.id,
      });
    }
    await NotificationService.notifyRole(Role.ASSET_MANAGER, {
      type: 'Transfer Requested',
      title: 'New transfer request pending approval',
      message: `A transfer request for ${asset.name} (${asset.assetTag}) needs review.`,
      entityType: 'TransferRequest',
      entityId: transfer.id,
    });

    return sendSuccess(res, transfer, 'Transfer request submitted successfully', 201);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/transfers/:id (Asset Manager or Department Head)
router.patch(
  '/:id',
  authenticateJWT,
  requireRole([Role.ASSET_MANAGER, Role.DEPARTMENT_HEAD]),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const body = decisionSchema.parse(req.body);

      const transfer = await prisma.transferRequest.findUnique({ where: { id } });
      if (!transfer) throw new NotFoundError('Transfer request not found');
      if (transfer.status !== TransferStatus.REQUESTED) {
        throw new ConflictError('This transfer request has already been decided');
      }

      const asset = await prisma.asset.findUnique({ where: { id: transfer.assetId } });
      if (!asset) throw new NotFoundError('Asset not found');

      if (req.user!.role === Role.DEPARTMENT_HEAD && asset.owningDepartmentId !== req.user!.departmentId) {
        throw new ForbiddenError('You may only decide transfers for assets owned by your department');
      }

      if (body.status === TransferStatus.REJECTED) {
        const updated = await prisma.transferRequest.update({
          where: { id },
          data: { status: TransferStatus.REJECTED, approverId: req.user!.id, decisionNote: body.decisionNote || null },
        });

        await ActivityLogService.log({
          actorId: req.user?.id,
          action: 'TRANSFER_REJECT',
          entityType: 'TransferRequest',
          entityId: id,
          beforeData: transfer,
          afterData: updated,
        });

        await NotificationService.create({
          recipientId: transfer.requestedById,
          type: 'Transfer Rejected',
          title: 'Transfer request rejected',
          message: `Your transfer request for ${asset.name} (${asset.assetTag}) was rejected.`,
          entityType: 'TransferRequest',
          entityId: id,
        });

        return sendSuccess(res, updated, 'Transfer request rejected');
      }

      // APPROVED path: close source allocation + open new allocation in one transaction
      const sourceAllocation = await prisma.allocation.findUnique({ where: { id: transfer.sourceAllocationId } });
      if (!sourceAllocation || sourceAllocation.status !== AllocationStatus.ACTIVE) {
        throw new ConflictError('The source allocation is no longer active');
      }
      if (asset.status !== AssetStatus.ALLOCATED) {
        throw new ConflictError(`Asset is currently ${asset.status.toLowerCase()}, cannot complete transfer`);
      }

      const [updatedTransfer, , newAllocation] = await prisma.$transaction([
        prisma.transferRequest.update({
          where: { id },
          data: { status: TransferStatus.APPROVED, approverId: req.user!.id, decisionNote: body.decisionNote || null },
        }),
        prisma.allocation.update({
          where: { id: sourceAllocation.id },
          data: { status: AllocationStatus.RETURNED, returnedAt: new Date() },
        }),
        prisma.allocation.create({
          data: {
            assetId: asset.id,
            employeeId: transfer.toEmployeeId,
            departmentId: transfer.toDepartmentId,
            allocatedById: req.user!.id,
            status: AllocationStatus.ACTIVE,
          },
        }),
      ]);

      await ActivityLogService.log({
        actorId: req.user?.id,
        action: 'TRANSFER_APPROVE',
        entityType: 'TransferRequest',
        entityId: id,
        beforeData: transfer,
        afterData: updatedTransfer,
      });

      await NotificationService.create({
        recipientId: transfer.requestedById,
        type: 'Transfer Approved',
        title: 'Transfer request approved',
        message: `Your transfer request for ${asset.name} (${asset.assetTag}) was approved.`,
        entityType: 'TransferRequest',
        entityId: id,
      });
      if (transfer.toEmployeeId) {
        await NotificationService.create({
          recipientId: transfer.toEmployeeId,
          type: 'Asset Assigned',
          title: 'Asset transferred to you',
          message: `${asset.name} (${asset.assetTag}) has been transferred to you.`,
          entityType: 'Asset',
          entityId: asset.id,
        });
      }

      return sendSuccess(res, updatedTransfer, 'Transfer request approved');
    } catch (err) {
      next(err);
    }
  }
);

export default router;
