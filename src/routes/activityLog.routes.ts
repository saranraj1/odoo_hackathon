import { Router } from 'express';
import { prisma } from '../config/db';
import { sendSuccess } from '../utils/response';
import { authenticateJWT } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { Role } from '@prisma/client';

const router = Router();

// GET /api/activity-logs (Admin / Asset Manager only)
router.get('/', authenticateJWT, requireRole([Role.ADMIN, Role.ASSET_MANAGER]), async (req, res, next) => {
  try {
    const { entityType, actorId, action, from, to } = req.query as Record<string, string | undefined>;

    const where: any = {};
    if (entityType) where.entityType = entityType;
    if (actorId) where.actorId = actorId;
    if (action) where.action = action;
    if (from || to) {
      where.timestamp = {};
      if (from) where.timestamp.gte = new Date(from);
      if (to) where.timestamp.lte = new Date(to);
    }

    const logs = await prisma.activityLog.findMany({
      where,
      include: { actor: { select: { id: true, name: true, email: true, role: true } } },
      orderBy: { timestamp: 'desc' },
      take: 200,
    });

    return sendSuccess(res, logs);
  } catch (err) {
    next(err);
  }
});

export default router;
