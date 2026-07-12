import app from './app';
import { env } from './config/env';
import { logger } from './config/logger';
import { prisma } from './config/db';

const server = app.listen(env.PORT, () => {
  logger.info(`🚀 Server running in [${env.NODE_ENV}] mode on port ${env.PORT}`);
});

const shutdown = async () => {
  logger.info('Shutting down server gracefully...');
  server.close(async () => {
    logger.info('Express server closed.');
    await prisma.$disconnect();
    logger.info('Database client disconnected.');
    process.exit(0);
  });
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
