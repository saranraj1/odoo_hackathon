import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../config/db';
import { sendSuccess } from '../utils/response';
import { authenticateJWT } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { Role, AssetStatus, AuditCycleStatus, AuditResult, ResolutionStatus } from '@prisma/client';
import { BadRequestError, ConflictError, ForbiddenError, NotFoundError } from '../utils/errors';
import { validateAuditCycleTransition, canTransition } from '../utils/lifecycle';
import { ActivityLogService } from '../services/activity.service';
import { NotificationService } from '../services/notification.service';

const router = Router();

const createCycleSchema = z.object({
  name: z.string().min(2),
  scopeDepartmentId: z.string().uuid().nullable().optional(),
  scopeLocation: z.string().nullable().optional(),
  startDate: z.string(),
  endDate: z.string(),
});

const assignSchema = z.object({
  auditorIds: z.array(z.string().uuid()).min(1),
  assignedScope: z.string().min(1),
});

const verifyItemSchema = z.object({
  result: z.enum([AuditResult.VERIFIED, AuditResult.MISSING, AuditResult.DAMAGED]),
  notes: z.string().nullable().optional(),
  evidenceUrl: z.string().nullable().optional(),
});

const resolveItemSchema = z.object({
  resolutionStatus: z.literal(ResolutionStatus.RESOLVED),
});

async function assertCycleVisible(req: any, cycle: { createdById: string }) {
  if (req.user.role === Role.ADMIN || req.user.role === Role.ASSET_MANAGER) return true;
  const hasAssignment = await prisma.auditAssignment.findFirst({
    where: { cycleId: (cycle as any).id, auditorId: req.user.id },
  });
  if (hasAssignment) return true;
  const hasItem = await prisma.auditItem.findFirst({
    where: { cycleId: (cycle as any).id, auditorId: req.user.id },
  });
  return !!hasItem;
}

// GET /api/audits
router.get('/', authenticateJWT, async (req, res, next) => {
  try {
    const { status } = req.query as Record<string, string | undefined>;
    const where: any = {};
    if (status) where.status = status;

    let cycles = await prisma.auditCycle.findMany({ where, orderBy: { createdAt: 'desc' } });

    if (req.user!.role !== Role.ADMIN && req.user!.role !== Role.ASSET_MANAGER) {
      const visible = await Promise.all(cycles.map((c) => assertCycleVisible(req, c)));
      cycles = cycles.filter((_, i) => visible[i]);
    }

    return sendSuccess(res, cycles);
  } catch (err) {
    next(err);
  }
});

// POST /api/audits (Admin only)
router.post('/', authenticateJWT, requireRole([Role.ADMIN]), async (req, res, next) => {
  try {
    const body = createCycleSchema.parse(req.body);

    if (new Date(body.startDate) >= new Date(body.endDate)) {
      throw new BadRequestError('endDate must be after startDate');
    }

    const cycle = await prisma.auditCycle.create({
      data: {
        name: body.name,
        scopeDepartmentId: body.scopeDepartmentId || null,
        scopeLocation: body.scopeLocation || null,
        startDate: new Date(body.startDate),
        endDate: new Date(body.endDate),
        createdById: req.user!.id,
        status: AuditCycleStatus.DRAFT,
      },
    });

    await ActivityLogService.log({
      actorId: req.user?.id,
      action: 'AUDIT_CYCLE_CREATE',
      entityType: 'AuditCycle',
      entityId: cycle.id,
      afterData: cycle,
    });

    return sendSuccess(res, cycle, 'Audit cycle created successfully', 201);
  } catch (err) {
    next(err);
  }
});

// GET /api/audits/:id
router.get('/:id', authenticateJWT, async (req, res, next) => {
  try {
    const { id } = req.params;
    const cycle = await prisma.auditCycle.findUnique({ where: { id } });
    if (!cycle) throw new NotFoundError('Audit cycle not found');

    if (!(await assertCycleVisible(req, cycle))) {
      throw new ForbiddenError('You are not assigned to this audit cycle');
    }

    const items = await prisma.auditItem.findMany({ where: { cycleId: id } });
    return sendSuccess(res, { ...cycle, items });
  } catch (err) {
    next(err);
  }
});

// POST /api/audits/:id/activate (Admin only)
router.post('/:id/activate', authenticateJWT, requireRole([Role.ADMIN]), async (req, res, next) => {
  try {
    const { id } = req.params;
    const cycle = await prisma.auditCycle.findUnique({ where: { id } });
    if (!cycle) throw new NotFoundError('Audit cycle not found');

    validateAuditCycleTransition(cycle.status, AuditCycleStatus.ACTIVE);

    const assetWhere: any = {};
    if (cycle.scopeDepartmentId) assetWhere.owningDepartmentId = cycle.scopeDepartmentId;
    if (cycle.scopeLocation) assetWhere.location = cycle.scopeLocation;

    const inScopeAssets = await prisma.asset.findMany({ where: assetWhere, select: { id: true } });
    if (inScopeAssets.length === 0) {
      throw new BadRequestError('No assets match this audit cycle scope');
    }

    const [updatedCycle] = await prisma.$transaction([
      prisma.auditCycle.update({ where: { id }, data: { status: AuditCycleStatus.ACTIVE } }),
      prisma.auditItem.createMany({
        data: inScopeAssets.map((a) => ({ cycleId: id, assetId: a.id, result: AuditResult.PENDING })),
      }),
    ]);

    await ActivityLogService.log({
      actorId: req.user?.id,
      action: 'AUDIT_CYCLE_ACTIVATE',
      entityType: 'AuditCycle',
      entityId: id,
      beforeData: cycle,
      afterData: updatedCycle,
    });

    return sendSuccess(res, updatedCycle, 'Audit cycle activated and assets snapshotted');
  } catch (err) {
    next(err);
  }
});

// POST /api/audits/:id/assign (Admin only)
router.post('/:id/assign', authenticateJWT, requireRole([Role.ADMIN]), async (req, res, next) => {
  try {
    const { id } = req.params;
    const body = assignSchema.parse(req.body);

    const cycle = await prisma.auditCycle.findUnique({ where: { id } });
    if (!cycle) throw new NotFoundError('Audit cycle not found');
    if (cycle.status !== AuditCycleStatus.ACTIVE) {
      throw new ConflictError('Auditors can only be assigned to an active audit cycle');
    }

    const auditors = await prisma.user.findMany({ where: { id: { in: body.auditorIds }, status: 'ACTIVE' } });
    if (auditors.length !== body.auditorIds.length) {
      throw new BadRequestError('One or more selected auditors are invalid or inactive');
    }

    const pendingItems = await prisma.auditItem.findMany({
      where: { cycleId: id, result: AuditResult.PENDING },
    });

    await prisma.$transaction([
      ...body.auditorIds.map((auditorId) =>
        prisma.auditAssignment.create({ data: { cycleId: id, auditorId, assignedScope: body.assignedScope } })
      ),
      ...pendingItems.map((item, index) =>
        prisma.auditItem.update({
          where: { id: item.id },
          data: { auditorId: body.auditorIds[index % body.auditorIds.length] },
        })
      ),
    ]);

    await ActivityLogService.log({
      actorId: req.user?.id,
      action: 'AUDIT_ASSIGN_AUDITORS',
      entityType: 'AuditCycle',
      entityId: id,
      afterData: { auditorIds: body.auditorIds, assignedScope: body.assignedScope },
    });

    await Promise.all(
      body.auditorIds.map((auditorId) =>
        NotificationService.create({
          recipientId: auditorId,
          type: 'Audit Assignment',
          title: 'You have been assigned to an audit cycle',
          message: `You have been assigned to verify assets for "${cycle.name}".`,
          entityType: 'AuditCycle',
          entityId: id,
        })
      )
    );

    const updatedCycle = await prisma.auditCycle.findUnique({ where: { id } });
    return sendSuccess(res, updatedCycle, 'Auditors assigned successfully');
  } catch (err) {
    next(err);
  }
});

// PATCH /api/audits/:id/items/:itemId - auditor verification OR asset-manager discrepancy resolution
router.patch('/:id/items/:itemId', authenticateJWT, async (req, res, next) => {
  try {
    const { id, itemId } = req.params;

    const cycle = await prisma.auditCycle.findUnique({ where: { id } });
    if (!cycle) throw new NotFoundError('Audit cycle not found');
    if (cycle.status === AuditCycleStatus.CLOSED) {
      throw new ConflictError('This audit cycle is closed and its records are locked', 'AUDIT_CYCLE_LOCKED');
    }
    if (cycle.status !== AuditCycleStatus.ACTIVE) {
      throw new ConflictError('This audit cycle is not active');
    }

    const item = await prisma.auditItem.findUnique({ where: { id: itemId } });
    if (!item || item.cycleId !== id) throw new NotFoundError('Audit item not found');

    const isResolution = req.body && req.body.resolutionStatus !== undefined;

    if (isResolution) {
      if (req.user!.role !== Role.ASSET_MANAGER) {
        throw new ForbiddenError('Only an Asset Manager can resolve discrepancies');
      }
      resolveItemSchema.parse(req.body);
      if (item.result !== AuditResult.MISSING && item.result !== AuditResult.DAMAGED) {
        throw new BadRequestError('Only Missing or Damaged items can be resolved');
      }

      const updated = await prisma.auditItem.update({
        where: { id: itemId },
        data: { resolutionStatus: ResolutionStatus.RESOLVED, resolvedById: req.user!.id },
      });

      await ActivityLogService.log({
        actorId: req.user?.id,
        action: 'AUDIT_DISCREPANCY_RESOLVE',
        entityType: 'AuditItem',
        entityId: itemId,
        beforeData: item,
        afterData: updated,
      });

      return sendSuccess(res, updated, 'Discrepancy resolved');
    }

    if (item.auditorId !== req.user!.id) {
      throw new ForbiddenError('You are not the assigned auditor for this item');
    }

    const body = verifyItemSchema.parse(req.body);

    const updated = await prisma.auditItem.update({
      where: { id: itemId },
      data: {
        result: body.result,
        notes: body.notes || null,
        evidenceUrl: body.evidenceUrl || null,
        verifiedAt: new Date(),
      },
    });

    await ActivityLogService.log({
      actorId: req.user?.id,
      action: 'AUDIT_ITEM_VERIFY',
      entityType: 'AuditItem',
      entityId: itemId,
      beforeData: item,
      afterData: updated,
    });

    if (body.result === AuditResult.MISSING || body.result === AuditResult.DAMAGED) {
      await NotificationService.notifyRole(Role.ASSET_MANAGER, {
        type: 'Audit Discrepancy Flagged',
        title: `Asset flagged as ${body.result.toLowerCase()}`,
        message: `An asset was flagged ${body.result} during audit "${cycle.name}".`,
        entityType: 'AuditItem',
        entityId: itemId,
      });
    }

    return sendSuccess(res, updated, 'Audit item updated');
  } catch (err) {
    next(err);
  }
});

// POST /api/audits/:id/close (Admin only)
router.post('/:id/close', authenticateJWT, requireRole([Role.ADMIN]), async (req, res, next) => {
  try {
    const { id } = req.params;
    const cycle = await prisma.auditCycle.findUnique({ where: { id } });
    if (!cycle) throw new NotFoundError('Audit cycle not found');

    validateAuditCycleTransition(cycle.status, AuditCycleStatus.CLOSED);

    const missingItems = await prisma.auditItem.findMany({
      where: { cycleId: id, result: AuditResult.MISSING },
      include: { asset: true },
    });

    const assetUpdates = missingItems
      .filter((item) => canTransition(item.asset.status, AssetStatus.LOST))
      .map((item) => prisma.asset.update({ where: { id: item.assetId }, data: { status: AssetStatus.LOST } }));

    const [updatedCycle] = await prisma.$transaction([
      prisma.auditCycle.update({
        where: { id },
        data: { status: AuditCycleStatus.CLOSED, closedById: req.user!.id, closedAt: new Date() },
      }),
      ...assetUpdates,
    ]);

    await ActivityLogService.log({
      actorId: req.user?.id,
      action: 'AUDIT_CYCLE_CLOSE',
      entityType: 'AuditCycle',
      entityId: id,
      beforeData: cycle,
      afterData: updatedCycle,
    });

    return sendSuccess(res, updatedCycle, 'Audit cycle closed successfully');
  } catch (err) {
    next(err);
  }
});

export default router;
