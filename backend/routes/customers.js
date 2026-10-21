import express from 'express';
import { registerCustomer, loginCustomer, getCustomerProfile } from '../controllers/customerController.js';

const router = express.Router();

// POST /api/customers/register — Patient registration
router.post('/register', registerCustomer);

// POST /api/customers/login — Patient login
router.post('/login', loginCustomer);

// GET /api/customers/profile — Current patient profile
router.get('/profile', getCustomerProfile);

export default router;
