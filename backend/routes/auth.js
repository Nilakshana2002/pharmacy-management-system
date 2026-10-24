import express from 'express';
import { login, getProfile } from '../controllers/authController.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

// POST /api/auth/login — Staff/Admin login
router.post('/login', login);

// GET /api/auth/profile — Current user details
router.get('/profile', verifyToken, getProfile);

export default router;
