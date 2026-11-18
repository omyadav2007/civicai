import { Router } from 'express';
import {
  getAdminDashboardStats,
  getAdminComplaints,
  getAdminComplaintById,
  updateComplaintStatus,
  assignDepartment,
  addAdminNote,
  triggerAiAnalysis,
  correctAiAnalysis,
  getAdminAnalytics,
  getAiInsights,
} from '../controllers/admin.controller';
import { authenticate, requireRole } from '../middleware/auth.middleware';
import { Role } from '@prisma/client';

const router = Router();

// Strictly enforce Admin RBAC for all routes under /api/admin
router.use(authenticate, requireRole([Role.ADMIN]));

router.get('/dashboard', getAdminDashboardStats);
router.get('/complaints', getAdminComplaints);
router.get('/complaints/:id', getAdminComplaintById);
router.patch('/complaints/:id/status', updateComplaintStatus);
router.patch('/complaints/:id/assign', assignDepartment);
router.post('/complaints/:id/notes', addAdminNote);
router.post('/complaints/:id/trigger-ai', triggerAiAnalysis);
router.patch('/complaints/:id/ai-correction', correctAiAnalysis);
router.get('/analytics', getAdminAnalytics);
router.get('/ai-insights', getAiInsights);

export default router;
