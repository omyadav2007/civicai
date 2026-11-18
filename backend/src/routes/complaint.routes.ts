import { Router } from 'express';
import {
  createComplaint,
  getComplaints,
  getMyComplaints,
  getComplaintById,
  getComplaintHistory,
} from '../controllers/complaint.controller';
import { authenticate } from '../middleware/auth.middleware';
import { upload } from '../middleware/upload.middleware';
import { validateUploadedImageMagicBytes } from '../middleware/image-validation.middleware';

const router = Router();

// Citizen-specific complaints & creation (with binary signature validation)
router.post(
  '/',
  authenticate,
  upload.array('images', 5),
  validateUploadedImageMagicBytes,
  createComplaint
);
router.get('/my', authenticate, getMyComplaints);

// General listings (requires auth for access control)
router.get('/', authenticate, getComplaints);
router.get('/:id', authenticate, getComplaintById);
router.get('/:id/history', authenticate, getComplaintHistory);

export default router;
