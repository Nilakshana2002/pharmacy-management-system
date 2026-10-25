import express from 'express';
import { getCategories } from '../controllers/categoriesController.js';

const router = express.Router();

// GET /api/categories — retrieve medicine categories with counts
router.get('/', getCategories);

export default router;
