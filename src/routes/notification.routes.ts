import { Router } from 'express';
import { z } from 'zod';
import { sendSuccess } from '../utils/response';
import { authenticateJWT } from '../middleware/auth';
import { NotificationService } from '../services/notification.service';

const router = Router();

// GET /api/notifications
router.get('/', authenticateJWT, async (req, res, next) => {
  try {
    const page = parseInt(req.query.page as string || '1');
    const limit = parseInt(req.query.limit as string || '20');

    const result = await NotificationService.listForUser(req.user!.id, page, limit);
    return sendSuccess(res, result.notifications, 'Notifications fetched successfully');
  } catch (err) {
    next(err);
  }
});

// PATCH /api/notifications/:id (mark as read)
router.patch('/:id', authenticateJWT, async (req, res, next) => {
  try {
    const { id } = req.params;
    const notification = await NotificationService.markAsRead(id, req.user!.id);
    return sendSuccess(res, notification, 'Notification marked as read');
  } catch (err) {
    next(err);
  }
});

export default router;
