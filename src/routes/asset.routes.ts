import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../config/db';
import { sendSuccess } from '../utils/response';
import { authenticateJWT } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { Role, AssetStatus, AllocationStatus, Status } from '@prisma/client';
import { BadRequestError, ConflictError, NotFoundError } from '../utils/errors';
import { validateTransition } from '../utils/lifecycle';
import { ActivityLogService } from '../services/activity.service';

const router = Router();

const registerAssetSchema = z.object({
  name: z.string().min(2),
  description: z.string().min(2),
  categoryId: z.string().uuid(),
  owningDepartmentId: z.string().uuid(),
  location: z.string().min(1),
  condition: z.string().min(1),
  serialNumber: z.string().min(1),
  acquisitionDate: z.string(),
  acquisitionCost: z.coerce.number().nonnegative(),
  isBookable: z.boolean().optional().default(false),
  photoUrl: z.string().nullable().optional(),
});

const updateAssetSchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().min(2).optional(),
  categoryId: z.string().uuid().optional(),
  owningDepartmentId: z.string().uuid().optional(),
  location: z.string().min(1).optional(),
  condition: z.string().min(1).optional(),
  isBookable: z.boolean().optional(),
  photoUrl: z.string().nullable().optional(),
  status: z.nativeEnum(AssetStatus).optional(),
});

type Holder = { type: 'employee' | 'department'; id: string; name: string };

async function computeCurrentHolders(assetIds: string[]): Promise<Map<string, Holder>> {
  const map = new Map<string, Holder>();
  if (assetIds.length === 0) return map;

  const activeAllocations = await prisma.allocation.findMany({
    where: { assetId: { in: assetIds }, status: AllocationStatus.ACTIVE },
    include: {
      employee: { select: { id: true, name: true } },
      department: { select: { id: true, name: true } },
    },
  });

  for (const alloc of activeAllocations) {
    if (alloc.employee) {
      map.set(alloc.assetId, { type: 'employee', id: alloc.employee.id, name: alloc.employee.name });
    } else if (alloc.department) {
      map.set(alloc.assetId, { type: 'department', id: alloc.department.id, name: alloc.department.name });
    }
  }
  return map;
}

async function generateAssetTag(): Promise<string> {
  const base = await prisma.asset.count();
  for (let attempt = 0; attempt < 10; attempt++) {
    const candidate = `AF-${String(base + 1 + attempt).padStart(4, '0')}`;
    const existing = await prisma.asset.findUnique({ where: { assetTag: candidate } });
    if (!existing) return candidate;
  }
  throw new ConflictError('Unable to generate a unique asset tag, please retry');
}

// GET /api/assets
router.get('/', authenticateJWT, async (req, res, next) => {
  try {
    const { tag, category, serialNumber, status, department, location, isBookable } =
      req.query as Record<string, string | undefined>;

    const where: any = {};
    if (tag) where.assetTag = { contains: tag, mode: 'insensitive' };
    if (category) where.categoryId = category;
    if (serialNumber) where.serialNumber = { contains: serialNumber, mode: 'insensitive' };
    if (status) where.status = status;
    if (department) where.owningDepartmentId = department;
    if (location) where.location = { contains: location, mode: 'insensitive' };
    if (isBookable !== undefined) where.isBookable = isBookable === 'true';

    if (req.user!.role === Role.DEPARTMENT_HEAD && req.user!.departmentId) {
      where.owningDepartmentId = req.user!.departmentId;
    }

    const assets = await prisma.asset.findMany({
      where,
      include: {
        category: { select: { id: true, name: true, description: true, metadataSchema: true, status: true } },
        owningDepartment: { select: { id: true, name: true, code: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    let scoped = assets;
    if (req.user!.role === Role.EMPLOYEE) {
      const myActive = await prisma.allocation.findMany({
        where: { employeeId: req.user!.id, status: AllocationStatus.ACTIVE },
        select: { assetId: true },
      });
      const myAssetIds = new Set(myActive.map((a) => a.assetId));
      scoped = assets.filter((a) => myAssetIds.has(a.id));
    }

    const holders = await computeCurrentHolders(scoped.map((a) => a.id));
    const enriched = scoped.map((a) => ({ ...a, currentHolder: holders.get(a.id) || null }));

    return sendSuccess(res, enriched);
  } catch (err) {
    next(err);
  }
});

// POST /api/assets (Asset Manager only)
router.post('/', authenticateJWT, requireRole([Role.ASSET_MANAGER]), async (req, res, next) => {
  try {
    const body = registerAssetSchema.parse(req.body);

    const category = await prisma.category.findUnique({ where: { id: body.categoryId } });
    if (!category || category.status === Status.INACTIVE) {
      throw new BadRequestError('Invalid category or category is inactive');
    }
    const department = await prisma.department.findUnique({ where: { id: body.owningDepartmentId } });
    if (!department || department.status === Status.INACTIVE) {
      throw new BadRequestError('Invalid department or department is inactive');
    }

    const existingSerial = await prisma.asset.findUnique({ where: { serialNumber: body.serialNumber } });
    if (existingSerial) {
      throw new ConflictError('Serial number already registered');
    }

    const assetTag = await generateAssetTag();

    const asset = await prisma.asset.create({
      data: {
        assetTag,
        serialNumber: body.serialNumber,
        name: body.name,
        description: body.description,
        categoryId: body.categoryId,
        owningDepartmentId: body.owningDepartmentId,
        location: body.location,
        condition: body.condition,
        acquisitionDate: new Date(body.acquisitionDate),
        acquisitionCost: body.acquisitionCost,
        isBookable: body.isBookable ?? false,
        photoUrl: body.photoUrl || null,
        status: AssetStatus.AVAILABLE,
      },
    });

    await ActivityLogService.log({
      actorId: req.user?.id,
      action: 'ASSET_REGISTER',
      entityType: 'Asset',
      entityId: asset.id,
      afterData: asset,
    });

    return sendSuccess(res, { ...asset, currentHolder: null }, 'Asset registered successfully', 201);
  } catch (err) {
    next(err);
  }
});

// GET /api/assets/:id
router.get('/:id', authenticateJWT, async (req, res, next) => {
  try {
    const { id } = req.params;
    const asset = await prisma.asset.findUnique({
      where: { id },
      include: {
        category: true,
        owningDepartment: { select: { id: true, name: true, code: true } },
      },
    });
    if (!asset) throw new NotFoundError('Asset not found');

    const holders = await computeCurrentHolders([id]);
    return sendSuccess(res, { ...asset, currentHolder: holders.get(id) || null });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/assets/:id (Asset Manager only)
router.patch('/:id', authenticateJWT, requireRole([Role.ASSET_MANAGER]), async (req, res, next) => {
  try {
    const { id } = req.params;
    const body = updateAssetSchema.parse(req.body);

    const asset = await prisma.asset.findUnique({ where: { id } });
    if (!asset) throw new NotFoundError('Asset not found');

    if (body.status && body.status !== asset.status) {
      validateTransition(asset.status, body.status);
    }
    if (body.categoryId) {
      const category = await prisma.category.findUnique({ where: { id: body.categoryId } });
      if (!category || category.status === Status.INACTIVE) {
        throw new BadRequestError('Invalid category or category is inactive');
      }
    }
    if (body.owningDepartmentId) {
      const department = await prisma.department.findUnique({ where: { id: body.owningDepartmentId } });
      if (!department || department.status === Status.INACTIVE) {
        throw new BadRequestError('Invalid department or department is inactive');
      }
    }

    const updated = await prisma.asset.update({
      where: { id },
      data: {
        name: body.name,
        description: body.description,
        categoryId: body.categoryId,
        owningDepartmentId: body.owningDepartmentId,
        location: body.location,
        condition: body.condition,
        isBookable: body.isBookable,
        photoUrl: body.photoUrl,
        status: body.status,
      },
    });

    await ActivityLogService.log({
      actorId: req.user?.id,
      action: 'ASSET_UPDATE',
      entityType: 'Asset',
      entityId: id,
      beforeData: asset,
      afterData: updated,
    });

    const holders = await computeCurrentHolders([id]);
    return sendSuccess(res, { ...updated, currentHolder: holders.get(id) || null }, 'Asset updated successfully');
  } catch (err) {
    next(err);
  }
});

export default router;
export { computeCurrentHolders };
