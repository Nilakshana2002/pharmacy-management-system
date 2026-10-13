import express from 'express';
import { getBrands } from '../controllers/brandsController.js';

const router = express.Router();

// GET /api/brands — retrieve pharmaceutical brands
router.get('/', getBrands);

export default router;
