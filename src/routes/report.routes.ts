import { Router } from 'express';
import { prisma } from '../config/db';
import { sendSuccess } from '../utils/response';
import { authenticateJWT } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { Role, AssetStatus, MaintenanceStatus } from '@prisma/client';

const router = Router();

// GET /api/reports — utilization, maintenance cost, and retirement-risk analytics.
// Admin/Asset Manager see org-wide data; Department Head is scoped to their department.
router.get(
  '/',
  authenticateJWT,
  requireRole([Role.ADMIN, Role.ASSET_MANAGER, Role.DEPARTMENT_HEAD]),
  async (req, res, next) => {
    try {
      const user = req.user!;
      const assetWhere: any = {};
      if (user.role === Role.DEPARTMENT_HEAD && user.departmentId) {
        assetWhere.owningDepartmentId = user.departmentId;
      }

      const assets = await prisma.asset.findMany({ where: assetWhere });
      const assetIds = assets.map((a) => a.id);

      const maintenance = await prisma.maintenanceRequest.findMany({
        where: user.role === Role.DEPARTMENT_HEAD ? { assetId: { in: assetIds } } : {},
      });

      const total = assets.length;
      const allocated = assets.filter((a) => a.status === AssetStatus.ALLOCATED).length;
      const available = assets.filter((a) => a.status === AssetStatus.AVAILABLE).length;
      const inRepair = assets.filter((a) => a.status === AssetStatus.UNDER_MAINTENANCE).length;
      const rate = total > 0 ? Math.round((allocated / total) * 100) : 0;

      const totalRepairs = maintenance.length;
      const resolvedRepairs = maintenance.filter((m) => m.status === MaintenanceStatus.RESOLVED).length;
      const totalCost = maintenance.reduce((sum, m) => sum + Number(m.cost || 0), 0);

      const highRisk = assets.filter((a) => {
        const ageMonths = (Date.now() - new Date(a.acquisitionDate).getTime()) / (1000 * 60 * 60 * 24 * 30);
        return (a.condition === 'Damaged' || a.condition === 'Fair') && ageMonths > 12;
      });

      return sendSuccess(res, {
        utilization: { total, allocated, available, inRepair, rate },
        maintenance: { totalRepairs, resolvedRepairs, totalCost },
        retirement: { highRisk },
      });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
