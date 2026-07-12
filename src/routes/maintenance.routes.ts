import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../config/db';
import { sendSuccess } from '../utils/response';
import { authenticateJWT } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { Role, AssetStatus, AllocationStatus, MaintenanceStatus, Priority } from '@prisma/client';
import { BadRequestError, ConflictError, ForbiddenError, NotFoundError } from '../utils/errors';
import { validateMaintenanceTransition, validateTransition } from '../utils/lifecycle';
import { ActivityLogService } from '../services/activity.service';
import { NotificationService } from '../services/notification.service';

const router = Router();

const createSchema = z.object({
  assetId: z.string().uuid(),
  priority: z.nativeEnum(Priority).optional().default(Priority.MEDIUM),
  issueDescription: z.string().min(10),
  attachmentUrl: z.string().nullable().optional(),
});

const updateSchema = z.object({
  status: z.nativeEnum(MaintenanceStatus),
  approvalNote: z.string().nullable().optional(),
  technicianId: z.string().uuid().optional(),
  resolution: z.string().min(10).optional(),
  cost: z.coerce.number().nonnegative().optional(),
  condition: z.string().optional(),
});

// GET /api/maintenance
router.get('/', authenticateJWT, async (req, res, next) => {
  try {
    const { assetId, status, technicianId, reporterId } = req.query as Record<string, string | undefined>;

    const where: any = {};
    if (assetId) where.assetId = assetId;
    if (status) where.status = status;
    if (technicianId) where.technicianId = technicianId;
    if (reporterId) where.reporterId = reporterId;

    if (req.user!.role === Role.DEPARTMENT_HEAD && req.user!.departmentId) {
      where.asset = { owningDepartmentId: req.user!.departmentId };
    }

    const requests = await prisma.maintenanceRequest.findMany({
      where,
      orderBy: { reportedAt: 'desc' },
    });

    return sendSuccess(res, requests);
  } catch (err) {
    next(err);
  }
});

// POST /api/maintenance
router.post('/', authenticateJWT, async (req, res, next) => {
  try {
    const body = createSchema.parse(req.body);

    const asset = await prisma.asset.findUnique({ where: { id: body.assetId } });
    if (!asset) throw new NotFoundError('Asset not found');

    const request = await prisma.maintenanceRequest.create({
      data: {
        assetId: body.assetId,
        reporterId: req.user!.id,
        priority: body.priority,
        issueDescription: body.issueDescription,
        attachmentUrl: body.attachmentUrl || null,
        status: MaintenanceStatus.PENDING,
      },
    });

    await ActivityLogService.log({
      actorId: req.user?.id,
      action: 'MAINTENANCE_REQUEST_CREATE',
      entityType: 'MaintenanceRequest',
      entityId: request.id,
      afterData: request,
    });

    await NotificationService.notifyRole(Role.ASSET_MANAGER, {
      type: 'Maintenance Requested',
      title: 'New maintenance request pending approval',
      message: `A maintenance request for ${asset.name} (${asset.assetTag}) needs review.`,
      entityType: 'MaintenanceRequest',
      entityId: request.id,
    });

    return sendSuccess(res, request, 'Maintenance request submitted successfully', 201);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/maintenance/:id - single flexible endpoint driving the whole workflow
router.patch('/:id', authenticateJWT, async (req, res, next) => {
  try {
    const { id } = req.params;
    const body = updateSchema.parse(req.body);

    const request = await prisma.maintenanceRequest.findUnique({ where: { id } });
    if (!request) throw new NotFoundError('Maintenance request not found');

    validateMaintenanceTransition(request.status, body.status);

    const isApprovalDecision = body.status === MaintenanceStatus.APPROVED || body.status === MaintenanceStatus.REJECTED;
    const isAssignment = body.status === MaintenanceStatus.TECHNICIAN_ASSIGNED;
    const isTechnicianAction = body.status === MaintenanceStatus.IN_PROGRESS || body.status === MaintenanceStatus.RESOLVED;

    if ((isApprovalDecision || isAssignment) && req.user!.role !== Role.ASSET_MANAGER) {
      throw new ForbiddenError('Only an Asset Manager can approve, reject, or assign maintenance requests');
    }
    if (isTechnicianAction && request.technicianId !== req.user!.id) {
      throw new ForbiddenError('Only the assigned technician can update this work order');
    }
    if (isAssignment && !body.technicianId) {
      throw new BadRequestError('technicianId is required to assign a technician');
    }
    if (body.status === MaintenanceStatus.REJECTED && !body.approvalNote) {
      throw new BadRequestError('A rejection note is required');
    }
    if (body.status === MaintenanceStatus.RESOLVED && !body.resolution) {
      throw new BadRequestError('Resolution notes are required');
    }

    const asset = await prisma.asset.findUnique({ where: { id: request.assetId } });
    if (!asset) throw new NotFoundError('Asset not found');

    const updateData: any = { status: body.status };
    const assetUpdates: any[] = [];

    if (body.status === MaintenanceStatus.APPROVED) {
      updateData.approvedById = req.user!.id;
      updateData.approvedAt = new Date();
      updateData.approvalNote = body.approvalNote || null;
      validateTransition(asset.status, AssetStatus.UNDER_MAINTENANCE);
      assetUpdates.push(
        prisma.asset.update({ where: { id: asset.id }, data: { status: AssetStatus.UNDER_MAINTENANCE } })
      );
    } else if (body.status === MaintenanceStatus.REJECTED) {
      updateData.approvedById = req.user!.id;
      updateData.approvedAt = new Date();
      updateData.approvalNote = body.approvalNote || null;
      // Asset's operational state is intentionally left unchanged on rejection.
    } else if (body.status === MaintenanceStatus.TECHNICIAN_ASSIGNED) {
      updateData.technicianId = body.technicianId;
    } else if (body.status === MaintenanceStatus.IN_PROGRESS) {
      updateData.startedAt = new Date();
    } else if (body.status === MaintenanceStatus.RESOLVED) {
      updateData.resolution = body.resolution;
      updateData.cost = body.cost ?? 0;
      updateData.resolvedAt = new Date();

      const activeAllocation = await prisma.allocation.findFirst({
        where: { assetId: asset.id, status: AllocationStatus.ACTIVE },
      });
      const restoredStatus = activeAllocation ? AssetStatus.ALLOCATED : AssetStatus.AVAILABLE;
      validateTransition(asset.status, restoredStatus);
      assetUpdates.push(
        prisma.asset.update({
          where: { id: asset.id },
          data: { status: restoredStatus, condition: body.condition || asset.condition },
        })
      );
    }

    const [updated] = await prisma.$transaction([
      prisma.maintenanceRequest.update({ where: { id }, data: updateData }),
      ...assetUpdates,
    ]);

    await ActivityLogService.log({
      actorId: req.user?.id,
      action: `MAINTENANCE_${body.status}`,
      entityType: 'MaintenanceRequest',
      entityId: id,
      beforeData: request,
      afterData: updated,
    });

    if (body.status === MaintenanceStatus.APPROVED) {
      await NotificationService.create({
        recipientId: request.reporterId,
        type: 'Maintenance Approved',
        title: 'Maintenance request approved',
        message: `Your maintenance request for ${asset.name} (${asset.assetTag}) was approved.`,
        entityType: 'MaintenanceRequest',
        entityId: id,
      });
    } else if (body.status === MaintenanceStatus.REJECTED) {
      await NotificationService.create({
        recipientId: request.reporterId,
        type: 'Maintenance Rejected',
        title: 'Maintenance request rejected',
        message: `Your maintenance request for ${asset.name} (${asset.assetTag}) was rejected.`,
        entityType: 'MaintenanceRequest',
        entityId: id,
      });
    } else if (body.status === MaintenanceStatus.TECHNICIAN_ASSIGNED && body.technicianId) {
      await NotificationService.create({
        recipientId: body.technicianId,
        type: 'Technician Assigned',
        title: 'You have been assigned a repair',
        message: `You have been assigned to repair ${asset.name} (${asset.assetTag}).`,
        entityType: 'MaintenanceRequest',
        entityId: id,
      });
    } else if (body.status === MaintenanceStatus.RESOLVED) {
      await NotificationService.create({
        recipientId: request.reporterId,
        type: 'Maintenance Resolved',
        title: 'Maintenance resolved',
        message: `Repairs on ${asset.name} (${asset.assetTag}) have been completed.`,
        entityType: 'MaintenanceRequest',
        entityId: id,
      });
    }

    return sendSuccess(res, updated, 'Maintenance request updated successfully');
  } catch (err) {
    next(err);
  }
});

export default router;
