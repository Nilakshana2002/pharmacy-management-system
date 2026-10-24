import pool from '../config/db.js';

/**
 * GET /api/categories
 * Returns categories with active medicine counts and parent-child hierarchy (ADBMS Self-Referencing Relationship)
 */
export const getCategories = async (req, res) => {
  try {
    // Check available columns in medicine_categories
    const [cols] = await pool.query('SHOW COLUMNS FROM medicine_categories');
    const colNames = cols.map(c => c.Field);
    const hasImageCol = colNames.includes('image_url');
    const hasParentCol = colNames.includes('parent_category_id');

    const sql = `
      SELECT 
        c.category_id,
        c.category_name,
        c.description,
        c.icon_name,
        ${hasImageCol ? 'c.image_url,' : ''}
        ${hasParentCol ? 'c.parent_category_id, p.category_name AS parent_category_name,' : ''}
        COUNT(m.medicine_id) AS medicine_count
      FROM medicine_categories c
      ${hasParentCol ? 'LEFT JOIN medicine_categories p ON c.parent_category_id = p.category_id' : ''}
      LEFT JOIN medicines m ON c.category_id = m.category_id AND m.is_active = TRUE
      GROUP BY 
        c.category_id, 
        c.category_name, 
        c.description, 
        c.icon_name
        ${hasImageCol ? ', c.image_url' : ''}
        ${hasParentCol ? ', c.parent_category_id, p.category_name' : ''}
      ORDER BY 
        ${hasParentCol ? 'COALESCE(c.parent_category_id, c.category_id), c.parent_category_id IS NOT NULL, ' : ''}
        c.category_name ASC
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
