import pool from '../config/db.js';

/**
 * GET /api/brands
 * Retrieves all brands with associated medicine count
 */
export const getBrands = async (req, res) => {
  try {
    let rows;
    try {
      const [viewRows] = await pool.query('SELECT * FROM v_brands_summary');
      rows = viewRows;
    } catch {
      const [fallbackRows] = await pool.query(`
        SELECT 
          b.brand_id,
          b.brand_name,
          b.country_of_origin,
          COUNT(m.medicine_id) AS medicine_count
        FROM brands b
        LEFT JOIN medicines m ON b.brand_id = m.brand_id AND m.is_active = TRUE
        GROUP BY b.brand_id, b.brand_name, b.country_of_origin
        ORDER BY b.brand_name ASC
      `);
      rows = fallbackRows;
    }

    res.status(200).json({
      success: true,
      count: rows.length,
      data: rows
    });
  } catch (error) {
    console.error('[Brands Error]:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve pharmaceutical brands.',
      error: error.message
    });
  }
};
