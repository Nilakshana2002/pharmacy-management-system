import express from 'express';
import {
  getMedicines,
  getMedicineById,
  getMedicineAvailability
} from '../controllers/medicinesController.js';

const router = express.Router();

// GET /api/medicines — search, filter, sort, and paginate medicines
router.get('/', getMedicines);

// GET /api/medicines/:id — retrieve medicine details
router.get('/:id', getMedicineById);

// GET /api/medicines/:id/availability — check current real-time availability
router.get('/:id/availability', getMedicineAvailability);

export default router;
