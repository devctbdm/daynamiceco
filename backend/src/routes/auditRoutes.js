import express from 'express';
import { getAuditLogs } from '../controllers/auditController.js';
import { protect, superAdminOnly } from '../middleware/auth.js';

const router = express.Router();
router.get('/', protect, superAdminOnly, getAuditLogs);
export default router;