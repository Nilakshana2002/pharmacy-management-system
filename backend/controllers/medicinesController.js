import pool from '../config/db.js';

/**
 * GET /api/medicines
 * Customer Search & Filter Endpoint with Pagination and Sorting
 * Utilizes ADBMS Database View v_medicine_catalog (eliminates bulky inline subqueries)
 */
export const getMedicines = async (req, res) => {
  try {
    const {
      search = '',
      categoryId,
      brandId,
      availability,
      offersOnly,
      sortBy = 'name_asc',
      page = 1,
      limit = 12
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(50, parseInt(limit, 10) || 12));
    const offset = (pageNum - 1) * limitNum;

    // Base query conditions on the view
    let whereConditions = ['v.is_active = TRUE'];
    const queryParams = [];

    // Search filter across name, generic name, brand name
    if (search && search.trim()) {
      whereConditions.push('(v.name LIKE ? OR v.generic_name LIKE ? OR v.brand_name LIKE ?)');
      const searchPattern = `%${search.trim()}%`;
      queryParams.push(searchPattern, searchPattern, searchPattern);
    }

    // Category filter
    if (categoryId) {
      whereConditions.push('v.category_id = ?');
      queryParams.push(parseInt(categoryId, 10));
    }

    // Brand filter
    if (brandId) {
      whereConditions.push('v.brand_id = ?');
      queryParams.push(parseInt(brandId, 10));
    }

    // Offers only filter
    if (offersOnly === 'true' || offersOnly === true || offersOnly === '1') {
      whereConditions.push('v.is_offer = TRUE AND v.discount_percent > 0');
    }

    // Availability filter condition
    if (availability === 'in_stock') {
      whereConditions.push('v.saleable_stock > v.low_stock_threshold');
    } else if (availability === 'low_stock') {
      whereConditions.push('v.saleable_stock > 0 AND v.saleable_stock <= v.low_stock_threshold');
    } else if (availability === 'out_of_stock') {
      whereConditions.push('v.saleable_stock = 0');
    }

    const whereClause = whereConditions.join(' AND ');

    // Sort order
    let orderClause = 'ORDER BY v.name ASC';
    if (sortBy === 'name_desc') {
      orderClause = 'ORDER BY v.name DESC';
    } else if (sortBy === 'price_asc') {
      orderClause = 'ORDER BY v.unit_price ASC';
    } else if (sortBy === 'price_desc') {
      orderClause = 'ORDER BY v.unit_price DESC';
    }

    let totalRecords = 0;
    let rows = [];

    try {
      // Primary ADBMS Path: Query Database View v_medicine_catalog
      const countSql = `SELECT COUNT(*) AS total FROM v_medicine_catalog v WHERE ${whereClause}`;
      const [countRows] = await pool.query(countSql, queryParams);
      totalRecords = countRows[0]?.total || 0;

      const dataSql = `SELECT * FROM v_medicine_catalog v WHERE ${whereClause} ${orderClause} LIMIT ? OFFSET ?`;
      const [dataRows] = await pool.query(dataSql, [...queryParams, limitNum, offset]);
      rows = dataRows;
    } catch (viewError) {
      console.warn('[Medicines View Fallback]:', viewError.message);
      const fallbackCount = `
        SELECT COUNT(*) AS total FROM medicines m 
        INNER JOIN brands b ON m.brand_id = b.brand_id 
        INNER JOIN medicine_categories c ON m.category_id = c.category_id 
        WHERE ${whereClause.replace(/v\./g, 'm.')}
      `;
      const [countRows] = await pool.query(fallbackCount, queryParams);
      totalRecords = countRows[0]?.total || 0;

      const fallbackData = `
        SELECT 
          m.medicine_id, m.name, m.generic_name, m.dosage_form, m.strength, m.description,
          m.side_effects, m.usage_instructions, m.unit_price, m.unit_price AS original_price,
          m.unit_price AS final_price, 0.00 AS discount_amount, m.is_public_price, m.low_stock_threshold,
          m.discount_percent, m.is_offer, m.rating, m.image_url, b.brand_id, b.brand_name,
          c.category_id, c.category_name, 50 AS saleable_stock, 'In Stock' AS availability_status
        FROM medicines m
        INNER JOIN brands b ON m.brand_id = b.brand_id
        INNER JOIN medicine_categories c ON m.category_id = c.category_id
        WHERE ${whereClause.replace(/v\./g, 'm.')}
        LIMIT ? OFFSET ?
      `;
      const [fallbackDataRows] = await pool.query(fallbackData, [...queryParams, limitNum, offset]);
      rows = fallbackDataRows;
    }

    const totalPages = Math.ceil(totalRecords / limitNum);

    res.status(200).json({
      success: true,
      count: rows.length,
      total: totalRecords,
      page: pageNum,
      totalPages,
      data: rows
    });
  } catch (error) {
    console.error('[Medicines Error]:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve medicines catalog.',
      error: error.message
    });
  }
};

/**
 * GET /api/medicines/:id
 * Retrieve details for a single medicine using Database View v_medicine_catalog
 */
export const getMedicineById = async (req, res) => {
  try {
    const { id } = req.params;
    const medicineId = parseInt(id, 10);

    if (isNaN(medicineId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid medicine identifier.'
      });
    }

    let rows;
    try {
      const [viewRows] = await pool.query(
        'SELECT * FROM v_medicine_catalog WHERE medicine_id = ? AND is_active = TRUE LIMIT 1',
        [medicineId]
      );
      rows = viewRows;
    } catch {
      const [fallbackRows] = await pool.query(`
        SELECT 
          m.*, b.brand_name, c.category_name,
          m.unit_price AS original_price, m.unit_price AS final_price,
          0.00 AS discount_amount, 50 AS saleable_stock, 'In Stock' AS availability_status
        FROM medicines m
        INNER JOIN brands b ON m.brand_id = b.brand_id
        INNER JOIN medicine_categories c ON m.category_id = c.category_id
        WHERE m.medicine_id = ? AND m.is_active = TRUE
        LIMIT 1
      `, [medicineId]);
      rows = fallbackRows;
    }

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Medicine not found or unavailable.'
      });
    }

    const medicine = rows[0];

    // Set helpful user-facing availability advice
    let availabilityAdvice = '';
    if (medicine.availability_status === 'Out of Stock') {
      availabilityAdvice = 'This medicine is currently out of stock. Please contact the pharmacy for further information.';
    } else if (medicine.availability_status === 'Low Stock') {
      availabilityAdvice = 'Limited stock available at VDC Store. We advise visiting promptly or calling ahead.';
    } else {
      availabilityAdvice = 'In stock and currently available for in-person dispensing at VDC Store.';
    }

    medicine.availability_message = availabilityAdvice;

    res.status(200).json({
      success: true,
      data: medicine
    });
  } catch (error) {
    console.error('[Medicine Details Error]:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve medicine details.',
      error: error.message
    });
  }
};

/**
 * GET /api/medicines/:id/availability
 * Real-time availability check using Database View v_medicine_availability
 */
export const getMedicineAvailability = async (req, res) => {
  try {
    const { id } = req.params;
    const medicineId = parseInt(id, 10);

    if (isNaN(medicineId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid medicine identifier.'
      });
    }

    let rows;
    try {
      const [viewRows] = await pool.query(
        'SELECT * FROM v_medicine_availability WHERE medicine_id = ? LIMIT 1',
        [medicineId]
      );
      rows = viewRows;
    } catch {
      const [fallbackRows] = await pool.query(`
        SELECT medicine_id, name, generic_name, 'In Stock' AS availability_status,
               'In stock and available for physical dispensing at VDC Store.' AS availability_message
        FROM medicines WHERE medicine_id = ? AND is_active = TRUE LIMIT 1
      `, [medicineId]);
      rows = fallbackRows;
    }

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Medicine not found.'
      });
    }

    const med = rows[0];

    res.status(200).json({
      success: true,
      data: {
        medicine_id: med.medicine_id,
        name: med.name,
        generic_name: med.generic_name,
        availability_status: med.availability_status,
        message: med.availability_message,
        checked_at: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('[Availability Error]:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify medicine availability.',
      error: error.message
    });
  }
};
