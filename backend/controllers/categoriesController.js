import pool from '../config/db.js';

/**
 * GET /api/categories
 * Returns categories with active medicine counts and parent-child hierarchy (ADBMS Self-Referencing Relationship)
 */
export const getCategories = async (req, res) => {
  try {
    let rows;
    try {
      const [viewRows] = await pool.query('SELECT * FROM v_categories_summary');
      rows = viewRows;
    } catch {
      // Fallback query if view not yet created
      const [fallbackRows] = await pool.query(`
        SELECT 
          c.category_id,
          c.category_name,
          c.description,
          c.icon_name,
          c.image_url,
          c.parent_category_id,
          p.category_name AS parent_category_name,
          COUNT(m.medicine_id) AS medicine_count
        FROM medicine_categories c
        LEFT JOIN medicine_categories p ON c.parent_category_id = p.category_id
        LEFT JOIN medicines m ON c.category_id = m.category_id AND m.is_active = TRUE
        GROUP BY 
          c.category_id, 
          c.category_name, 
          c.description, 
          c.icon_name,
          c.image_url,
          c.parent_category_id,
          p.category_name
        ORDER BY 
          COALESCE(c.parent_category_id, c.category_id),
          c.parent_category_id IS NOT NULL,
          c.category_name ASC
      `);
      rows = fallbackRows;
    }

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
