import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import { prisma } from './config/db';
import { sendSuccess, sendError } from './utils/response';
import { errorHandler } from './middleware/error';
import authRoutes from './routes/auth.routes';
import departmentRoutes from './routes/department.routes';
import categoryRoutes from './routes/category.routes';
import employeeRoutes from './routes/employee.routes';
import notificationRoutes from './routes/notification.routes';

const app = express();

// Middlewares
app.use(cors({
  origin: true,
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

// Routes Mount
app.use('/api/auth', authRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/notifications', notificationRoutes);

// Health Check
app.get('/health', async (req, res) => {
  try {
    // Run basic query to check DB connection
    await prisma.$queryRaw`SELECT 1`;
    return res.status(200).json({
      success: true,
      status: 'UP',
      database: 'CONNECTED',
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return res.status(503).json({
      success: false,
      status: 'DOWN',
      database: 'DISCONNECTED',
      error: err.message,
    });
  }
});

// Error handling middleware
app.use(errorHandler);

export default app;
