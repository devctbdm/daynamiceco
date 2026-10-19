import express from 'express';
import {
  getAllReviews,
  getReviewStats,
  updateReview,
  deleteReview,
} from '../controllers/reviewController.js';
import { protect, adminOnly } from '../middleware/auth.js';

const router = express.Router();

router.use(protect, adminOnly);

router.get('/', getAllReviews);
router.get('/stats', getReviewStats);
router.patch('/:reviewId', updateReview);
router.delete('/:reviewId', deleteReview);

export default router;
