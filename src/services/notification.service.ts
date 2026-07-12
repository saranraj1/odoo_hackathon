import { Prisma } from '@prisma/client';
import { prisma } from '../config/db';
import { logger } from '../config/logger';

export interface CreateNotificationParams {
  recipientId: string;
  type: string;
  title: string;
  message: string;
  entityType?: string;
  entityId?: string;
  scheduledFor?: Date;
}

export class NotificationService {
  static async create(params: CreateNotificationParams, tx?: Prisma.TransactionClient) {
    const client = tx || prisma;
    try {
      const notification = await client.notification.create({
        data: {
          recipientId: params.recipientId,
          type: params.type,
          title: params.title,
          message: params.message,
          entityType: params.entityType,
          entityId: params.entityId,
          scheduledFor: params.scheduledFor,
        },
      });
      logger.info(`Notification created for User [${params.recipientId}]: ${params.title}`);
      return notification;
    } catch (err: any) {
      logger.error(`Failed to create notification: ${err.message}`);
    }
  }

  static async listForUser(recipientId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where: { recipientId },
        orderBy: { timestamp: 'desc' },
        skip,
        take: limit,
      }),
      prisma.notification.count({ where: { recipientId } }),
    ]);

    return {
      notifications,
      meta: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  }

  static async markAsRead(id: string, recipientId: string) {
    return prisma.notification.update({
      where: { id, recipientId },
      data: { readAt: new Date() },
    });
  }
}
