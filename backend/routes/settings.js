import express from 'express';
import { getPublicSettings } from '../controllers/settingsController.js';

const router = express.Router();

// GET /api/settings/public — retrieve public pharmacy contact details and hours
router.get('/public', getPublicSettings);

export default router;
