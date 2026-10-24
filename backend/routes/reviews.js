import express from 'express';
import { getApprovedReviews, createReview, voteReviewHelpful } from '../controllers/reviewsController.js';

const router = express.Router();

// GET /api/reviews - Fetch verified patient reviews
router.get('/', getApprovedReviews);

// POST /api/reviews - Submit a new review
router.post('/', createReview);

// PATCH /api/reviews/:id/helpful - Upvote review
router.patch('/:id/helpful', voteReviewHelpful);

export default router;
