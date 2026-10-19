import express from 'express';
import { getCustomers, getCustomerById, deleteCustomer } from '../controllers/customerController.js';
import { protect, adminOnly, superAdminOnly } from '../middleware/auth.js';

const router = express.Router();

router.get('/', protect, adminOnly, getCustomers);
router.get('/:id', protect, adminOnly, getCustomerById);
router.delete('/:id', protect, superAdminOnly, deleteCustomer);

export default router;
