import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import { config } from './config';
import authRoutes from './routes/auth.routes';
import complaintRoutes from './routes/complaint.routes';
import adminRoutes from './routes/admin.routes';
import healthRoutes from './routes/health.routes';
import { errorHandler } from './middleware/error.middleware';

const app = express();

// Middleware
const clientUrls = config.clientUrl
  .split(',')
  .map((u) => u.trim().replace(/\/$/, ''))
  .filter(Boolean);

const allowedOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  ...clientUrls,
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, postman)
      if (!origin) {
        return callback(null, true);
      }

      const isAllowed =
        allowedOrigins.includes(origin) ||
        // Support Vercel deployment preview domains if production clientUrl matches vercel.app
        (config.isProduction &&
          clientUrls.some((u) => u.includes('vercel.app')) &&
          origin.endsWith('.vercel.app'));

      if (isAllowed || !config.isProduction) {
        callback(null, true);
      } else {
        callback(new Error(`Origin ${origin} not allowed by CORS`));
      }
    },
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Serve uploaded files statically
app.use('/uploads', express.static(config.uploadDir));

// Root route
app.get('/', (_req, res) => {
  res.json({
    name: 'CivicAI REST API',
    version: '1.0.0',
    description: 'AI-Powered Civic Issue Reporting and Management System',
    status: 'online',
    docs: '/api/docs',
    health: '/health',
  });
});

// Routes
app.use('/', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api/admin', adminRoutes);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found',
  });
});

// Centralized Error Handling
app.use(errorHandler);

const server = app.listen(config.port, '0.0.0.0', () => {
  console.log(`===============================================`);
  console.log(`CivicAI Backend Server started on port ${config.port}`);
  console.log(`Environment: ${config.nodeEnv}`);
  console.log(`Health check: http://localhost:${config.port}/health`);
  console.log(`API URL: http://localhost:${config.port}/api`);
  console.log(`Uploads URL: http://localhost:${config.port}/uploads`);
  console.log(`===============================================`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
  });
});

export default app;
