import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../config/db';
import { sendSuccess } from '../utils/response';
import { authenticateJWT } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { Role, AssetStatus, BookingStatus } from '@prisma/client';
import { BadRequestError, BookingOverlapError, ForbiddenError, NotFoundError, ConflictError } from '../utils/errors';
import { ActivityLogService } from '../services/activity.service';
import { NotificationService } from '../services/notification.service';

const router = Router();

const NON_BOOKABLE_STATUSES = new Set<AssetStatus>([
  AssetStatus.LOST,
  AssetStatus.RETIRED,
  AssetStatus.DISPOSED,
  AssetStatus.UNDER_MAINTENANCE,
]);

const createBookingSchema = z.object({
  assetId: z.string().uuid(),
  departmentId: z.string().uuid().nullable().optional(),
  startAt: z.string(),
  endAt: z.string(),
  purpose: z.string().min(1),
});

function deriveStatus(booking: { status: BookingStatus; startAt: Date; endAt: Date }): BookingStatus {
  if (booking.status === BookingStatus.CANCELLED) return BookingStatus.CANCELLED;
  const now = new Date();
  if (now < booking.startAt) return BookingStatus.UPCOMING;
  if (now >= booking.startAt && now < booking.endAt) return BookingStatus.ONGOING;
  return BookingStatus.COMPLETED;
}

// GET /api/bookings
router.get('/', authenticateJWT, async (req, res, next) => {
  try {
    const { assetId, status, bookedById } = req.query as Record<string, string | undefined>;

    const where: any = {};
    if (assetId) where.assetId = assetId;
    if (bookedById) where.bookedById = bookedById;

    const bookings = await prisma.booking.findMany({
      where,
      include: { bookedBy: { select: { id: true, name: true, email: true } } },
      orderBy: { startAt: 'asc' },
    });

    let withDerivedStatus = bookings.map((b) => ({ ...b, status: deriveStatus(b) }));
    if (status) withDerivedStatus = withDerivedStatus.filter((b) => b.status === status);

    return sendSuccess(res, withDerivedStatus);
  } catch (err) {
    next(err);
  }
});

// POST /api/bookings
router.post('/', authenticateJWT, async (req, res, next) => {
  try {
    const body = createBookingSchema.parse(req.body);
    const start = new Date(body.startAt);
    const end = new Date(body.endAt);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start >= end) {
      throw new BadRequestError('endAt must be strictly after startAt');
    }
    if (start < new Date()) {
      throw new BadRequestError('Cannot book a slot in the past');
    }

    const asset = await prisma.asset.findUnique({ where: { id: body.assetId } });
    if (!asset) throw new NotFoundError('Asset not found');
    if (!asset.isBookable) throw new BadRequestError('This asset is not marked as a bookable resource');
    if (NON_BOOKABLE_STATUSES.has(asset.status)) {
      throw new ConflictError(`Asset is currently ${asset.status.toLowerCase()} and cannot be booked`);
    }

    const existing = await prisma.booking.findMany({
      where: { assetId: body.assetId, status: { not: BookingStatus.CANCELLED } },
    });
    const overlap = existing.find((b) => start < b.endAt && end > b.startAt);
    if (overlap) {
      throw new BookingOverlapError(
        `This resource is already booked from ${overlap.startAt.toISOString()} to ${overlap.endAt.toISOString()}`
      );
    }

    const booking = await prisma.booking.create({
      data: {
        assetId: body.assetId,
        bookedById: req.user!.id,
        departmentId: body.departmentId || null,
        startAt: start,
        endAt: end,
        purpose: body.purpose,
        status: BookingStatus.UPCOMING,
      },
    });

    await ActivityLogService.log({
      actorId: req.user?.id,
      action: 'BOOKING_CREATE',
      entityType: 'Booking',
      entityId: booking.id,
      afterData: booking,
    });

    return sendSuccess(res, booking, 'Booking created successfully', 201);
  } catch (err) {
    next(err);
  }
});

// POST /api/bookings/:id/cancel
router.post('/:id/cancel', authenticateJWT, async (req, res, next) => {
  try {
    const { id } = req.params;
    const booking = await prisma.booking.findUnique({ where: { id } });
    if (!booking) throw new NotFoundError('Booking not found');

    const isOwner = booking.bookedById === req.user!.id;
    const canManage = req.user!.role === Role.ASSET_MANAGER;
    if (!isOwner && !canManage) {
      throw new ForbiddenError('You may only cancel your own bookings');
    }

    const currentStatus = deriveStatus(booking);
    if (currentStatus === BookingStatus.CANCELLED || currentStatus === BookingStatus.COMPLETED) {
      throw new ConflictError(`Cannot cancel a booking that is already ${currentStatus.toLowerCase()}`);
    }

    const updated = await prisma.booking.update({
      where: { id },
      data: { status: BookingStatus.CANCELLED },
    });

    await ActivityLogService.log({
      actorId: req.user?.id,
      action: 'BOOKING_CANCEL',
      entityType: 'Booking',
      entityId: id,
      beforeData: booking,
      afterData: updated,
    });

    await NotificationService.create({
      recipientId: booking.bookedById,
      type: 'Booking Cancelled',
      title: 'Booking cancelled',
      message: `Your booking (${booking.purpose}) was cancelled.`,
      entityType: 'Booking',
      entityId: id,
    });

    return sendSuccess(res, updated, 'Booking cancelled successfully');
  } catch (err) {
    next(err);
  }
});

// PATCH /api/bookings/:id (reschedule)
router.patch('/:id', authenticateJWT, async (req, res, next) => {
  try {
    const { id } = req.params;
    const body = z.object({ startAt: z.string(), endAt: z.string() }).parse(req.body);
    const start = new Date(body.startAt);
    const end = new Date(body.endAt);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start >= end) {
      throw new BadRequestError('endAt must be strictly after startAt');
    }
    if (start < new Date()) {
      throw new BadRequestError('Cannot reschedule to a slot in the past');
    }

    const booking = await prisma.booking.findUnique({ where: { id } });
    if (!booking) throw new NotFoundError('Booking not found');

    const isOwner = booking.bookedById === req.user!.id;
    if (!isOwner && req.user!.role !== Role.ASSET_MANAGER) {
      throw new ForbiddenError('You may only reschedule your own bookings');
    }
    const currentStatus = deriveStatus(booking);
    if (currentStatus === BookingStatus.CANCELLED || currentStatus === BookingStatus.COMPLETED) {
      throw new ConflictError(`Cannot reschedule a booking that is already ${currentStatus.toLowerCase()}`);
    }

    const existing = await prisma.booking.findMany({
      where: { assetId: booking.assetId, status: { not: BookingStatus.CANCELLED }, id: { not: id } },
    });
    const overlap = existing.find((b) => start < b.endAt && end > b.startAt);
    if (overlap) {
      throw new BookingOverlapError('The new time slot overlaps with an existing booking');
    }

    const updated = await prisma.booking.update({ where: { id }, data: { startAt: start, endAt: end } });

    await ActivityLogService.log({
      actorId: req.user?.id,
      action: 'BOOKING_RESCHEDULE',
      entityType: 'Booking',
      entityId: id,
      beforeData: booking,
      afterData: updated,
    });

    return sendSuccess(res, updated, 'Booking rescheduled successfully');
  } catch (err) {
    next(err);
  }
});

export default router;
