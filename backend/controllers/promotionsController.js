import pool from '../config/db.js';

/**
 * Promotions table and seed data are managed strictly in database/schema.sql and database/seed.sql
 */
export async function ensurePromotionsTable() {
  return true;
}

/**
 * GET /api/promotions
 * Promotions feature removed: returns empty active deals
 */
export const getActivePromotions = async (req, res) => {
  return res.status(200).json({
    success: true,
    count: 0,
    data: []
  });
};

/**
 * POST /api/promotions/validate
 * Promotions feature removed
 */
export const validatePromotion = async (req, res) => {
  return res.status(404).json({
    success: false,
    message: 'Promotions and discount voucher system has been disabled.'
  });
};
