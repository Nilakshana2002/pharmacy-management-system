import express from 'express';
import {
  createPrescriptionOrder,
  getPrescriptionOrders,
  getPrescriptionOrderById,
  acceptPrescriptionOrder,
  rejectPrescriptionOrder,
  dispensePrescriptionOrder,
  getOutbox,
  testSmtpStatus,
  testDispatchEmail
} from '../controllers/prescriptionOrderController.js';

const router = express.Router();

// POST /api/prescription-orders — Patient submits new prescription order
router.post('/', createPrescriptionOrder);

// GET /api/prescription-orders — Staff retrieves all prescription orders
router.get('/', getPrescriptionOrders);

// GET /api/prescription-orders/outbox — Staff reviews sent emails log
router.get('/outbox', getOutbox);

// GET /api/prescription-orders/test-smtp — Verify live SMTP handshake
router.get('/test-smtp', testSmtpStatus);

// POST /api/prescription-orders/test-email — Dispatch live test email
router.post('/test-email', testDispatchEmail);

// GET /api/prescription-orders/:orderId — Specific order details
router.get('/:orderId', getPrescriptionOrderById);

// PUT /api/prescription-orders/:orderId/accept — Accept & Send Confirmation Email
router.put('/:orderId/accept', acceptPrescriptionOrder);

// PUT /api/prescription-orders/:orderId/reject — Reject & Send Notice Email
router.put('/:orderId/reject', rejectPrescriptionOrder);

// PUT /api/prescription-orders/:orderId/dispense — Mark as dispensed
router.put('/:orderId/dispense', dispensePrescriptionOrder);

export default router;
