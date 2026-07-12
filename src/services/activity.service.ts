import { Prisma } from '@prisma/client';
import { prisma } from '../config/db';
import { logger } from '../config/logger';

export interface LogParams {
  actorId?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  beforeData?: any;
  afterData?: any;
  ipAddress?: string;
  userAgent?: string;
}

export class ActivityLogService {
  static async log(params: LogParams, tx?: Prisma.TransactionClient) {
    const client = tx || prisma;
    try {
      const log = await client.activityLog.create({
        data: {
          actorId: params.actorId,
          action: params.action,
          entityType: params.entityType,
          entityId: params.entityId,
          beforeData: params.beforeData ? JSON.parse(JSON.stringify(params.beforeData)) : undefined,
          afterData: params.afterData ? JSON.parse(JSON.stringify(params.afterData)) : undefined,
          ipAddress: params.ipAddress,
          userAgent: params.userAgent,
        },
      });
      logger.info(`ActivityLog: [${params.action}] by actor [${params.actorId}] on [${params.entityType}:${params.entityId}]`);
      return log;
    } catch (err: any) {
      logger.error(`Failed to write ActivityLog: ${err.message}`);
    }
  }
}
