import express from 'express';
import { verifyToken, requireRoles } from '../middleware/auth.js';
import {
  getDashboardStats,
  getAdminMedicines,
  createMedicine,
  updateMedicine,
  getBatches,
  createBatch,
  adjustBatchStock,
  getStockMovements,
  getLowStockReport,
  getExpiringBatchesReport,
  getAuditLogs,
  getSuppliers
} from '../controllers/adminController.js';

const router = express.Router();

// All admin routes require valid JWT authentication (Staff or Admin)
router.use(verifyToken);

// Dashboard overview
router.get('/dashboard', getDashboardStats);

// Medicine management
router.get('/medicines', getAdminMedicines);
router.post('/medicines', requireRoles('ADMIN'), createMedicine);
router.put('/medicines/:id', requireRoles('ADMIN', 'PHARMACIST'), updateMedicine);

// Batch & stock management
router.get('/batches', getBatches);
router.post('/batches', requireRoles('ADMIN', 'PHARMACIST'), createBatch);
router.patch('/batches/:id/stock', requireRoles('ADMIN', 'PHARMACIST'), adjustBatchStock);

// Suppliers (helper for batch entry)
router.get('/suppliers', getSuppliers);

// Reports & Audit views
router.get('/reports/low-stock', getLowStockReport);
router.get('/reports/expiring', getExpiringBatchesReport);
router.get('/stock-movements', getStockMovements);
router.get('/audit-logs', requireRoles('ADMIN'), getAuditLogs);

export default router;
