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
 * Retrieve all active promotions and voucher codes directly from MySQL
 */
export const getActivePromotions = async (req, res) => {
  try {
    await ensurePromotionsTable();
    const sql = `
      SELECT 
        promotion_id,
        code,
        title,
        description,
        discount_type,
        discount_value,
        min_order_amount,
        badge,
        category,
        tag,
        valid_from,
        valid_until
      FROM promotions
      WHERE is_active = TRUE
        AND (valid_until IS NULL OR valid_until >= CURDATE())
      ORDER BY promotion_id ASC
    `;

    const [rows] = await pool.query(sql);

    res.status(200).json({
      success: true,
      count: rows.length,
      data: rows
    });
  } catch (error) {
    console.error('[Promotions Error]:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve promotional offers from database.',
      error: error.message
    });
  }
};

/**
 * POST /api/promotions/validate
 * Validate voucher code and compute effective discount
 */
export const validatePromotion = async (req, res) => {
  try {
    await ensurePromotionsTable();
    const { code, order_amount = 0 } = req.body;

    if (!code || typeof code !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Promotional code is required.'
      });
    }

    const cleanCode = code.trim().toUpperCase();
    const [rows] = await pool.query(`
      SELECT * FROM promotions
      WHERE UPPER(code) = ?
        AND is_active = TRUE
        AND (valid_until IS NULL OR valid_until >= CURDATE())
      LIMIT 1
    `, [cleanCode]);

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Voucher code '${cleanCode}' is invalid or expired.`
      });
    }

    const promo = rows[0];
    const orderTotal = parseFloat(order_amount) || 0;

    if (orderTotal < parseFloat(promo.min_order_amount)) {
      return res.status(400).json({
        success: false,
        message: `Code '${promo.code}' requires a minimum order of LKR ${parseFloat(promo.min_order_amount).toFixed(2)}. Current subtotal: LKR ${orderTotal.toFixed(2)}.`
      });
    }

    let discount = 0;
    if (promo.discount_type === 'PERCENT') {
      discount = (orderTotal * parseFloat(promo.discount_value)) / 100;
    } else if (promo.discount_type === 'FIXED') {
      discount = Math.min(orderTotal, parseFloat(promo.discount_value));
    }

    discount = parseFloat(discount.toFixed(2));
    const finalAmount = Math.max(0, parseFloat((orderTotal - discount).toFixed(2)));

    res.status(200).json({
      success: true,
      message: `Voucher code '${promo.code}' applied successfully!`,
      data: {
        code: promo.code,
        title: promo.title,
        discount_type: promo.discount_type,
        discount_value: promo.discount_value,
        calculated_discount: discount,
        new_total: finalAmount
      }
    });
  } catch (error) {
    console.error('[Validate Promotion Error]:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to validate promotional code.',
      error: error.message
    });
  }
};
