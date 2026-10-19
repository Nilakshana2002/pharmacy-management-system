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
  handleBatchAction,
  getStockMovements,
  getLowStockReport,
  getExpiringBatchesReport,
  getAuditLogs,
  getSuppliers,
  createSupplier,
  createSale,
  getSalesHistory,
  getDailySalesReport,
  getMonthlySalesReport,
  getBestSellingReport,
  getInventoryValuationReport,
  getUsers,
  createUser,
  updateUser,
  toggleUserStatus,
  createCategory,
  createBrand,
  updatePharmacySettings
} from '../controllers/adminController.js';

const router = express.Router();

// All staff/admin routes require valid JWT authentication
router.use(verifyToken);

// 1. Dashboard Overview
router.get('/dashboard', getDashboardStats);

// 2. POS Counter Sales & Transaction History
router.post('/sales', requireRoles('ADMIN', 'PHARMACIST'), createSale);
router.get('/sales', requireRoles('ADMIN', 'PHARMACIST'), getSalesHistory);

// 3. Medicine Formulary Management
router.get('/medicines', getAdminMedicines);
router.post('/medicines', requireRoles('ADMIN', 'PHARMACIST'), createMedicine);
router.put('/medicines/:id', requireRoles('ADMIN', 'PHARMACIST'), updateMedicine);

// 4. Batch Inventory & Stock Adjustments
router.get('/batches', getBatches);
router.post('/batches', requireRoles('ADMIN', 'PHARMACIST'), createBatch);
router.patch('/batches/:id/stock', requireRoles('ADMIN', 'PHARMACIST'), adjustBatchStock);
router.post('/batches/:id/action', requireRoles('ADMIN', 'PHARMACIST'), handleBatchAction);
router.get('/stock-movements', getStockMovements);

// 5. Suppliers Management
router.get('/suppliers', getSuppliers);
router.post('/suppliers', requireRoles('ADMIN'), createSupplier);

// 6. Advanced DBMS Reports
router.get('/reports/low-stock', getLowStockReport);
router.get('/reports/expiring', getExpiringBatchesReport);
router.get('/reports/daily-sales', getDailySalesReport);
router.get('/reports/monthly-sales', getMonthlySalesReport);
router.get('/reports/best-sellers', getBestSellingReport);
router.get('/reports/inventory-valuation', getInventoryValuationReport);
router.get('/audit-logs', requireRoles('ADMIN', 'PHARMACIST'), getAuditLogs);

// 7. Staff Account Management (ADMIN Only)
router.get('/users', requireRoles('ADMIN'), getUsers);
router.post('/users', requireRoles('ADMIN'), createUser);
router.put('/users/:id', requireRoles('ADMIN'), updateUser);
router.patch('/users/:id/status', requireRoles('ADMIN'), toggleUserStatus);

// 8. Categories & Brands Management (ADMIN Only)
router.post('/categories', requireRoles('ADMIN'), createCategory);
router.post('/brands', requireRoles('ADMIN'), createBrand);

// 9. Store Settings (ADMIN Only)
router.put('/settings', requireRoles('ADMIN'), updatePharmacySettings);

export default router;

