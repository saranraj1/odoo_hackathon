import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../config/db';
import { sendSuccess } from '../utils/response';
import { authenticateJWT } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { Role, Status } from '@prisma/client';
import { ConflictError, NotFoundError } from '../utils/errors';
import { ActivityLogService } from '../services/activity.service';

const router = Router();

const createCategorySchema = z.object({
  name: z.string().min(2),
  description: z.string().min(2),
  metadataSchema: z.record(z.any()).nullable().optional(),
});

const updateCategorySchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().min(2).optional(),
  metadataSchema: z.record(z.any()).nullable().optional(),
  status: z.nativeEnum(Status).optional(),
});

// GET /api/categories
router.get('/', authenticateJWT, async (req, res, next) => {
  try {
    const statusQuery = req.query.status as string | undefined;
    const status = statusQuery === 'INACTIVE' ? Status.INACTIVE : Status.ACTIVE;

    const categories = await prisma.category.findMany({
      where: statusQuery ? { status } : {},
      orderBy: { name: 'asc' },
    });

    return sendSuccess(res, categories);
  } catch (err) {
    next(err);
  }
});

// POST /api/categories (Admin only)
router.post('/', authenticateJWT, requireRole([Role.ADMIN]), async (req, res, next) => {
  try {
    const body = createCategorySchema.parse(req.body);

    const existingName = await prisma.category.findUnique({
      where: { name: body.name },
    });
    if (existingName) {
      throw new ConflictError('Category name already exists');
    }

    const category = await prisma.category.create({
      data: {
        name: body.name,
        description: body.description,
        metadataSchema: body.metadataSchema || undefined,
        status: Status.ACTIVE,
      },
    });

    await ActivityLogService.log({
      actorId: req.user?.id,
      action: 'CATEGORY_CREATE',
      entityType: 'Category',
      entityId: category.id,
      afterData: category,
    });

    return sendSuccess(res, category, 'Category created successfully', 201);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/categories/:id (Admin only)
router.patch('/:id', authenticateJWT, requireRole([Role.ADMIN]), async (req, res, next) => {
  try {
    const { id } = req.params;
    const body = updateCategorySchema.parse(req.body);

    const category = await prisma.category.findUnique({
      where: { id },
    });
    if (!category) {
      throw new NotFoundError('Category not found');
    }

    if (body.name && body.name !== category.name) {
      const existingName = await prisma.category.findUnique({
        where: { name: body.name },
      });
      if (existingName) {
        throw new ConflictError('Category name already exists');
      }
    }

    const updated = await prisma.category.update({
      where: { id },
      data: {
        name: body.name,
        description: body.description,
        metadataSchema: body.metadataSchema !== undefined ? body.metadataSchema : undefined,
        status: body.status,
      },
    });

    await ActivityLogService.log({
      actorId: req.user?.id,
      action: 'CATEGORY_UPDATE',
      entityType: 'Category',
      entityId: id,
      beforeData: category,
      afterData: updated,
    });

    return sendSuccess(res, updated, 'Category updated successfully');
  } catch (err) {
    next(err);
  }
});

export default router;
