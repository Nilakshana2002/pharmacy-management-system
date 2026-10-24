import pool from '../config/db.js';

/**
 * Promotions table and seed data are managed strictly in database/schema.sql and database/seed.sql
 */
export async function ensurePromotionsTable() {
  return true;
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
