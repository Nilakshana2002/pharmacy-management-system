import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pool, { testConnection } from './config/db.js';

// Route imports
import medicinesRoutes from './routes/medicines.js';
import categoriesRoutes from './routes/categories.js';
import brandsRoutes from './routes/brands.js';
import settingsRoutes from './routes/settings.js';
import authRoutes from './routes/auth.js';
import adminRoutes from './routes/admin.js';
import customersRoutes from './routes/customers.js';
import prescriptionOrdersRoutes from './routes/prescriptionOrders.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Mount Customer & Public Endpoints
app.use('/api/medicines', medicinesRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/brands', brandsRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/customers', customersRoutes);
app.use('/api/prescription-orders', prescriptionOrdersRoutes);

// Mount Authentication & Admin Management Endpoints
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);

// Health Endpoint
app.get('/api/health', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT 1 + 1 AS result');
    res.status(200).json({
      status: 'ok',
      service: 'VDC Store Pharmacy Management System API',
      database: rows[0].result === 2 ? 'connected' : 'disconnected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      service: 'VDC Store Pharmacy Management System API',
      database: 'disconnected',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Endpoint ${req.method} ${req.originalUrl} not found on VDC Store API.`
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[Unhandled Server Error]:', err);
  res.status(500).json({
    success: false,
    message: 'An internal server error occurred.',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

import { initializeDatabaseCatalog } from './scripts/initWellnessCatalog.js';

// Start Server
app.listen(PORT, async () => {
  console.log(`[VDC Store Server] Express running on port ${PORT}`);
  await testConnection();
  await initializeDatabaseCatalog();
});

export default app;
