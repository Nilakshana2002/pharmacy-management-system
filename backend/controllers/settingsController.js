import pool from '../config/db.js';

/**
 * GET /api/settings/public
 * Returns public store configurations (phone, hours, address, name)
 */
export const getPublicSettings = async (req, res) => {
  try {
    const sql = `
      SELECT setting_key, setting_value, description
      FROM pharmacy_settings
      WHERE is_public = TRUE
    `;

    const [rows] = await pool.query(sql);

    // Convert array of key-value rows to an object
    const settingsObj = {};
    rows.forEach(item => {
      settingsObj[item.setting_key] = item.setting_value;
    });

    res.status(200).json({
      success: true,
      data: settingsObj
    });
  } catch (error) {
    console.error('[Settings Error]:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve pharmacy contact configurations.',
      error: error.message
    });
  }
};
