import pool from '../config/db.js';

let promotionsTableChecked = false;

/**
 * Promotions table and seed data are managed strictly in database/schema.sql and database/seed.sql
 */
export async function ensurePromotionsTable() {
  if (promotionsTableChecked) return;
  promotionsTableChecked = true;
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS promotions (
        promotion_id INT AUTO_INCREMENT PRIMARY KEY,
        code VARCHAR(50) NOT NULL UNIQUE,
        title VARCHAR(150) NOT NULL,
        description TEXT,
        discount_type ENUM('PERCENT', 'FIXED', 'FREE_DELIVERY') NOT NULL DEFAULT 'PERCENT',
        discount_value DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
        min_order_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
        badge VARCHAR(50) DEFAULT 'SPECIAL OFFER',
        category VARCHAR(100) DEFAULT 'General',
        tag VARCHAR(100) DEFAULT 'Active Deal',
        is_active BOOLEAN DEFAULT TRUE,
        valid_from DATE NULL,
        valid_until DATE NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_promotions_code (code)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    const [rows] = await pool.query('SELECT COUNT(*) AS cnt FROM promotions');
    if (rows[0].cnt === 0) {
      await pool.query(`
        INSERT INTO promotions (code, title, description, discount_type, discount_value, min_order_amount, badge, category, tag, is_active, valid_from, valid_until) VALUES
        ('IMMUNE15', '15% Off Immunity & Daily Vitamins', 'Applicable on multivitamins, Vitamin C, zinc and herbal immune supplements.', 'PERCENT', 15.00, 1500.00, 'BESTSELLER', 'Food Supplements', 'Immune Support', TRUE, '2026-01-01', '2026-12-31'),
        ('CARE50', 'LKR 500 Flat Off Total Order', 'Valid on comprehensive prescription medications and monthly refills over Rs. 4,000.', 'FIXED', 500.00, 4000.00, 'VALUED PATIENT', 'Prescriptions', 'Family Wellness', TRUE, '2026-01-01', '2026-12-31'),
        ('HYGIENE20', '20% Off Personal & Oral Hygiene', 'Includes antiseptic mouthwashes, dental floss, sanitizers and medicated soaps.', 'PERCENT', 20.00, 1200.00, 'SPECIAL OFFER', 'Personal Care', 'Daily Essentials', TRUE, '2026-01-01', '2026-12-31')
      `);
      console.log('[Promotions Service] Seeded default promotional vouchers into MySQL');
    }
  } catch (err) {
    console.warn('[Ensure Promotions Table Notice]:', err.message);
  }
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
