import express from 'express';
import { 
  registerCustomer, 
  loginCustomer, 
  getCustomerProfile,
  updateCustomerProfile,
  getCustomerPrescriptions,
  getCustomerInquiries,
  getCustomerOrders
} from '../controllers/customerController.js';

const router = express.Router();

// POST /api/customers/register — Patient registration
router.post('/register', registerCustomer);

// POST /api/customers/login — Patient login
router.post('/login', loginCustomer);

// GET /api/customers/profile — Current patient profile
router.get('/profile', getCustomerProfile);

// PUT /api/customers/profile — Update patient profile details
router.put('/profile', updateCustomerProfile);

// GET /api/customers/prescriptions — Patient's prescription orders history & status
router.get('/prescriptions', getCustomerPrescriptions);

// GET /api/customers/inquiries — Patient's inquiries & clinical responses
router.get('/inquiries', getCustomerInquiries);

// GET /api/customers/orders — Patient's past medication purchases / invoices
router.get('/orders', getCustomerOrders);

export default router;
