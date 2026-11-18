import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const nodeEnv = process.env.NODE_ENV || 'development';
const isProduction = nodeEnv === 'production';

// Production configuration validation
if (isProduction) {
  if (!process.env.DATABASE_URL) {
    console.error('FATAL: DATABASE_URL environment variable is required in production.');
  }
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.includes('sprint1-change-in-prod')) {
    console.warn('SECURITY WARNING: JWT_SECRET is using a default or insecure value in production. Set a strong random secret.');
  }
}

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv,
  isProduction,
  jwtSecret: process.env.JWT_SECRET || 'civicai-super-secret-jwt-key-sprint1-change-in-prod',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  cookieMaxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
  clientUrl: process.env.CLIENT_URL || 'http://localhost:3000',
  uploadDir: path.resolve(__dirname, '../../uploads'),
  aiServiceUrl: process.env.AI_SERVICE_URL || 'http://localhost:8001',
};
