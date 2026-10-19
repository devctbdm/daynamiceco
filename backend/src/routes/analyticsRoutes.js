import express from 'express';
import { getAnalytics } from '../controllers/analyticsController.js';
import { protect, adminOnly } from '../middleware/auth.js';

const router = express.Router();

// ---- Admin-only analytics ----
router.get('/', protect, adminOnly, getAnalytics);

export default router;
