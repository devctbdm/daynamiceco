// backend/src/routes/paymentRoutes.js

import express from 'express';
import {
  initiatePayment,
  validatePayment,
  ipnListener,
  cancelPayment,
  queryTransaction,
} from '../controllers/paymentController.js';
import { protect, adminOnly } from '../middleware/auth.js';
import { requireSelling } from '../middleware/requireSelling.js';

const router = express.Router();

router.post('/initiate', protect, requireSelling, initiatePayment);
router.get('/validate', validatePayment);
router.post('/validate', validatePayment);
router.post('/ipn', ipnListener);
router.get('/transaction/:tran_id', protect, adminOnly, queryTransaction);
router.get('/cancel', cancelPayment);
router.post('/cancel', cancelPayment);

export default router;
