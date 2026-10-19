import express from 'express';
import {
  getPaymentGateways,
  getActivePaymentGateways,
  updatePaymentGateway,
} from '../controllers/paymentSettingsController.js';
import { protect, adminOnly } from '../middleware/auth.js';

const router = express.Router();

router.get('/active', getActivePaymentGateways);
router.get('/', protect, adminOnly, getPaymentGateways);
router.put('/:id', protect, adminOnly, updatePaymentGateway);

export default router;
