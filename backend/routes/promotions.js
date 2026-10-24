import express from 'express';
import { getActivePromotions, validatePromotion } from '../controllers/promotionsController.js';

const router = express.Router();

// GET /api/promotions - List all active vouchers and deals
router.get('/', getActivePromotions);

// POST /api/promotions/validate - Validate a coupon code at checkout
router.post('/validate', validatePromotion);

export default router;
