import { Router } from 'express';
import { prisma } from '../config/db';
import { sendSuccess } from '../utils/response';
import { authenticateJWT } from '../middleware/auth';
import {
  Role,
  AssetStatus,
  AllocationStatus,
  TransferStatus,
  BookingStatus,
  MaintenanceStatus,
} from '@prisma/client';

const router = Router();

const OPEN_MAINTENANCE_STATUSES: MaintenanceStatus[] = [
  MaintenanceStatus.PENDING,
  MaintenanceStatus.APPROVED,
  MaintenanceStatus.TECHNICIAN_ASSIGNED,
  MaintenanceStatus.IN_PROGRESS,
];

function splitByDueDate(allocations: { id: string; assetId: string; employeeId: string | null; expectedReturnAt: Date | null; asset: { assetTag: string; name: string }; employee: { name: string } | null }[], now: Date) {
  const overdue: typeof allocations = [];
  const upcoming: typeof allocations = [];
  for (const a of allocations) {
    if (!a.expectedReturnAt) continue;
    (a.expectedReturnAt < now ? overdue : upcoming).push(a);
  }
  return { overdue, upcoming };
}

function toOverdueDto(a: { id: string; assetId: string; expectedReturnAt: Date | null; asset: { assetTag: string; name: string }; employee: { name: string } | null }) {
  return {
    allocationId: a.id,
    assetId: a.assetId,
    assetTag: a.asset.assetTag,
    assetName: a.asset.name,
    employeeName: a.employee?.name || 'Unknown employee',
    expectedReturnAt: a.expectedReturnAt,
  };
}

// GET /api/dashboard — role-scoped KPI snapshot for the home screen.
router.get('/', authenticateJWT, async (req, res, next) => {
  try {
    const user = req.user!;
    const now = new Date();
    const allocationInclude = {
      asset: { select: { assetTag: true, name: true } },
      employee: { select: { name: true } },
    } as const;

    if (user.role === Role.EMPLOYEE) {
      const [myAllocations, maintenanceToday, activeBookings, pendingTransfers, recentActivity] = await Promise.all([
        prisma.allocation.findMany({
          where: { employeeId: user.id, status: AllocationStatus.ACTIVE },
          include: allocationInclude,
        }),
        prisma.maintenanceRequest.count({
          where: { reporterId: user.id, status: { in: OPEN_MAINTENANCE_STATUSES } },
        }),
        prisma.booking.count({
          where: { bookedById: user.id, status: { in: [BookingStatus.UPCOMING, BookingStatus.ONGOING] } },
        }),
        prisma.transferRequest.count({
          where: { requestedById: user.id, status: TransferStatus.REQUESTED },
        }),
        prisma.activityLog.findMany({
          where: { actorId: user.id },
          include: { actor: { select: { id: true, name: true, email: true, role: true } } },
          orderBy: { timestamp: 'desc' },
          take: 5,
        }),
      ]);

      const { overdue, upcoming } = splitByDueDate(myAllocations, now);

      return sendSuccess(res, {
        kpis: {
          assetsAvailable: 0,
          assetsAllocated: myAllocations.length,
          maintenanceToday,
          activeBookings,
          pendingTransfers,
          upcomingReturns: upcoming.length,
        },
        overdueReturns: overdue.map(toOverdueDto),
        recentActivity,
        pendingApprovals: [],
      });
    }

    const isDeptHead = user.role === Role.DEPARTMENT_HEAD && !!user.departmentId;
    const assetWhere: any = isDeptHead ? { owningDepartmentId: user.departmentId } : {};
    const maintWhere: any = { status: { in: OPEN_MAINTENANCE_STATUSES } };
    const allocWhere: any = { status: AllocationStatus.ACTIVE };
    const activityWhere: any = {};
    const transferWhere: any = { status: TransferStatus.REQUESTED };

    if (isDeptHead) {
      maintWhere.asset = { owningDepartmentId: user.departmentId };
      allocWhere.OR = [{ departmentId: user.departmentId }, { employee: { departmentId: user.departmentId } }];
      activityWhere.actor = { departmentId: user.departmentId };

      // TransferRequest has no relation fields for toEmployeeId/requestedById (scalars only),
      // so department scoping goes through the member id set rather than a nested relation filter.
      const deptMembers = await prisma.user.findMany({
        where: { departmentId: user.departmentId },
        select: { id: true },
      });
      const deptMemberIds = deptMembers.map((u) => u.id);
      transferWhere.OR = [
        { toDepartmentId: user.departmentId },
        { toEmployeeId: { in: deptMemberIds } },
        { requestedById: { in: deptMemberIds } },
      ];
    }

    const [assetsAvailable, assetsAllocated, maintenanceToday, activeBookings, pendingTransfers, activeAllocations, recentActivity] =
      await Promise.all([
        prisma.asset.count({ where: { ...assetWhere, status: AssetStatus.AVAILABLE } }),
        prisma.asset.count({ where: { ...assetWhere, status: AssetStatus.ALLOCATED } }),
        prisma.maintenanceRequest.count({ where: maintWhere }),
        prisma.booking.count({ where: { status: { in: [BookingStatus.UPCOMING, BookingStatus.ONGOING] } } }),
        prisma.transferRequest.count({ where: transferWhere }),
        prisma.allocation.findMany({ where: allocWhere, include: allocationInclude }),
        prisma.activityLog.findMany({
          where: activityWhere,
          include: { actor: { select: { id: true, name: true, email: true, role: true } } },
          orderBy: { timestamp: 'desc' },
          take: 5,
        }),
      ]);

    const { overdue, upcoming } = splitByDueDate(activeAllocations, now);

    const pendingApprovals: { id: string; type: 'transfer' | 'maintenance'; title: string; createdAt: Date }[] = [];
    if (user.role === Role.ASSET_MANAGER || isDeptHead) {
      const pendingTransferRows = await prisma.transferRequest.findMany({
        where: transferWhere,
        include: { asset: { select: { name: true } } },
      });
      for (const t of pendingTransferRows) {
        pendingApprovals.push({ id: t.id, type: 'transfer', title: `Transfer request for ${t.asset.name}`, createdAt: t.createdAt });
      }
    }
    if (user.role === Role.ASSET_MANAGER) {
      const pendingMaintenanceRows = await prisma.maintenanceRequest.findMany({
        where: { status: MaintenanceStatus.PENDING },
        include: { asset: { select: { name: true } } },
      });
      for (const m of pendingMaintenanceRows) {
        pendingApprovals.push({ id: m.id, type: 'maintenance', title: `Maintenance approval for ${m.asset.name}`, createdAt: m.reportedAt });
      }
    }

    return sendSuccess(res, {
      kpis: {
        assetsAvailable,
        assetsAllocated,
        maintenanceToday,
        activeBookings,
        pendingTransfers,
        upcomingReturns: upcoming.length,
      },
      overdueReturns: overdue.map(toOverdueDto),
      recentActivity,
      pendingApprovals,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
