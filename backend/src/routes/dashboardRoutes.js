import express from 'express';
import { getDashboardStats } from '../controllers/dashboardController.js';
import { protect, adminOnly } from '../middleware/auth.js';

const router = express.Router();

// ---- Admin-only dashboard stats ----
router.get('/', protect, adminOnly, getDashboardStats);

export default router;
