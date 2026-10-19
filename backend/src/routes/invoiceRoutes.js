// backend/src/routes/invoiceRoutes.js

import express from 'express';
import {
  getAllInvoices,
  getInvoiceStats,
  getInvoiceById,
  generateFromOrder,
  syncInvoicesFromOrders,
  updateInvoice,
  deleteInvoice,
} from '../controllers/invoiceController.js';
import { protect, adminOnly } from '../middleware/auth.js';

const router = express.Router();

// ---- Admin-only routes ----
router.get('/stats', protect, adminOnly, getInvoiceStats); // invoice statistics
router.get('/:id', protect, adminOnly, getInvoiceById); // get single invoice
router.put('/:id', protect, adminOnly, updateInvoice); // edit invoice (anything)
router.delete('/:id', protect, adminOnly, deleteInvoice); // delete invoice
router.post('/order/:orderId', protect, adminOnly, generateFromOrder); // generate from order
router.post('/sync', protect, adminOnly, syncInvoicesFromOrders); // sync from all orders
router.get('/', protect, adminOnly, getAllInvoices); // list all invoices

export default router;
