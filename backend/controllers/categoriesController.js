import pool from '../config/db.js';

/**
 * GET /api/categories
 * Returns categories with active medicine counts (GROUP BY aggregate query)
 */
export const getCategories = async (req, res) => {
  try {
    const sql = `
      SELECT 
        c.category_id,
        c.category_name,
        c.description,
        c.icon_name,
        COUNT(m.medicine_id) AS medicine_count
      FROM medicine_categories c
      LEFT JOIN medicines m ON c.category_id = m.category_id AND m.is_active = TRUE
      GROUP BY c.category_id, c.category_name, c.description, c.icon_name
      ORDER BY c.category_name ASC
    `;

    const [rows] = await pool.query(sql);

    res.status(200).json({
      success: true,
      count: rows.length,
      data: rows
    });
  } catch (error) {
    console.error('[Categories Error]:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve medicine categories.',
      error: error.message
    });
  }
};
