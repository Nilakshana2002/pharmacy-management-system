import pool from '../config/db.js';

/**
 * GET /api/medicines
 * Customer Search & Filter Endpoint with Pagination and Sorting
 * Demonstrates: SQL JOINS, WHERE, ORDER BY, LIMIT/OFFSET, Subqueries
 * 100% compliant with MySQL 8.0 ONLY_FULL_GROUP_BY mode
 */
export const getMedicines = async (req, res) => {
  try {
    const {
      search = '',
      categoryId,
      brandId,
      availability,
      sortBy = 'name_asc',
      page = 1,
      limit = 12
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(50, parseInt(limit, 10) || 12));
    const offset = (pageNum - 1) * limitNum;

    // Base query conditions
    let whereConditions = ['m.is_active = TRUE'];
    const queryParams = [];

    // Search filter across name, generic name, brand name
    if (search && search.trim()) {
      whereConditions.push('(m.name LIKE ? OR m.generic_name LIKE ? OR b.brand_name LIKE ?)');
      const searchPattern = `%${search.trim()}%`;
      queryParams.push(searchPattern, searchPattern, searchPattern);
    }

    // Category filter
    if (categoryId) {
      whereConditions.push('m.category_id = ?');
      queryParams.push(parseInt(categoryId, 10));
    }

    // Brand filter
    if (brandId) {
      whereConditions.push('m.brand_id = ?');
      queryParams.push(parseInt(brandId, 10));
    }

    const whereClause = whereConditions.join(' AND ');

    // Subquery expression for saleable stock excluding expired, inactive, recalled batches
    const saleableStockExpr = `
      COALESCE((
        SELECT SUM(mb.stock_quantity - mb.reserved_quantity)
        FROM medicine_batches mb
        WHERE mb.medicine_id = m.medicine_id
          AND mb.expiry_date > CURDATE()
          AND mb.status = 'active'
          AND mb.stock_quantity > mb.reserved_quantity
      ), 0)
    `;

    // Availability filter condition applied on the subquery alias
    let availabilityFilter = '';
    if (availability === 'in_stock') {
      availabilityFilter = 'WHERE t.saleable_stock > t.low_stock_threshold';
    } else if (availability === 'low_stock') {
      availabilityFilter = 'WHERE t.saleable_stock > 0 AND t.saleable_stock <= t.low_stock_threshold';
    } else if (availability === 'out_of_stock') {
      availabilityFilter = 'WHERE t.saleable_stock = 0';
    }

    // Sort order
    let orderClause = 'ORDER BY t.name ASC';
    if (sortBy === 'name_desc') {
      orderClause = 'ORDER BY t.name DESC';
    } else if (sortBy === 'price_asc') {
      orderClause = 'ORDER BY t.unit_price ASC';
    } else if (sortBy === 'price_desc') {
      orderClause = 'ORDER BY t.unit_price DESC';
    }

    // Total Count Query using clean subquery wrapper
    const countSql = `
      SELECT COUNT(*) AS total
      FROM (
        SELECT 
          m.medicine_id,
          m.low_stock_threshold,
          ${saleableStockExpr} AS saleable_stock
        FROM medicines m
        INNER JOIN brands b ON m.brand_id = b.brand_id
        INNER JOIN medicine_categories c ON m.category_id = c.category_id
        WHERE ${whereClause}
      ) AS t
      ${availabilityFilter}
    `;

    const [countRows] = await pool.query(countSql, queryParams);
    const totalRecords = countRows[0]?.total || 0;
    const totalPages = Math.ceil(totalRecords / limitNum);

    // Main Catalog Query wrapped in subquery to prevent ONLY_FULL_GROUP_BY issues
    const dataSql = `
      SELECT * FROM (
        SELECT 
          m.medicine_id,
          m.name,
          m.generic_name,
          m.dosage_form,
          m.strength,
          m.description,
          m.side_effects,
          m.usage_instructions,
          CASE WHEN m.is_public_price = TRUE THEN m.unit_price ELSE NULL END AS unit_price,
          m.is_public_price,
          m.low_stock_threshold,
          b.brand_id,
          b.brand_name,
          b.country_of_origin,
          c.category_id,
          c.category_name,
          c.icon_name,
          ${saleableStockExpr} AS saleable_stock,
          CASE 
            WHEN ${saleableStockExpr} = 0 THEN 'Out of Stock'
            WHEN ${saleableStockExpr} <= m.low_stock_threshold THEN 'Low Stock'
            ELSE 'In Stock'
          END AS availability_status
        FROM medicines m
        INNER JOIN brands b ON m.brand_id = b.brand_id
        INNER JOIN medicine_categories c ON m.category_id = c.category_id
        WHERE ${whereClause}
      ) AS t
      ${availabilityFilter}
      ${orderClause}
      LIMIT ? OFFSET ?
    `;

    const dataParams = [...queryParams, limitNum, offset];
    const [rows] = await pool.query(dataSql, dataParams);

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
 * Retrieve details for a single medicine
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

    const saleableStockExpr = `
      COALESCE((
        SELECT SUM(mb.stock_quantity - mb.reserved_quantity)
        FROM medicine_batches mb
        WHERE mb.medicine_id = m.medicine_id
          AND mb.expiry_date > CURDATE()
          AND mb.status = 'active'
          AND mb.stock_quantity > mb.reserved_quantity
      ), 0)
    `;

    const sql = `
      SELECT 
        m.medicine_id,
        m.name,
        m.generic_name,
        m.dosage_form,
        m.strength,
        m.description,
        m.side_effects,
        m.usage_instructions,
        CASE WHEN m.is_public_price = TRUE THEN m.unit_price ELSE NULL END AS unit_price,
        m.is_public_price,
        m.low_stock_threshold,
        b.brand_id,
        b.brand_name,
        b.country_of_origin,
        c.category_id,
        c.category_name,
        c.icon_name,
        ${saleableStockExpr} AS saleable_stock,
        CASE 
          WHEN ${saleableStockExpr} = 0 THEN 'Out of Stock'
          WHEN ${saleableStockExpr} <= m.low_stock_threshold THEN 'Low Stock'
          ELSE 'In Stock'
        END AS availability_status
      FROM medicines m
      INNER JOIN brands b ON m.brand_id = b.brand_id
      INNER JOIN medicine_categories c ON m.category_id = c.category_id
      WHERE m.medicine_id = ? AND m.is_active = TRUE
    `;

    const [rows] = await pool.query(sql, [medicineId]);

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
 * Real-time availability check endpoint for customers
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

    const sql = `
      SELECT 
        m.medicine_id,
        m.name,
        m.generic_name,
        m.low_stock_threshold,
        COALESCE((
          SELECT SUM(b.stock_quantity - b.reserved_quantity)
          FROM medicine_batches b
          WHERE b.medicine_id = m.medicine_id
            AND b.expiry_date > CURDATE()
            AND b.status = 'active'
            AND b.stock_quantity > b.reserved_quantity
        ), 0) AS saleable_stock
      FROM medicines m
      WHERE m.medicine_id = ? AND m.is_active = TRUE
    `;

    const [rows] = await pool.query(sql, [medicineId]);

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Medicine not found.'
      });
    }

    const med = rows[0];
    const stock = Number(med.saleable_stock);
    const threshold = med.low_stock_threshold;

    let status = 'In Stock';
    let message = 'Available in stock at VDC Store dispensary.';

    if (stock <= 0) {
      status = 'Out of Stock';
      message = 'This medicine is currently out of stock. Please contact the pharmacy for further information.';
    } else if (stock <= threshold) {
      status = 'Low Stock';
      message = 'Low stock remaining at the pharmacy counter. Please verify in-store.';
    }

    res.status(200).json({
      success: true,
      data: {
        medicine_id: med.medicine_id,
        name: med.name,
        generic_name: med.generic_name,
        availability_status: status,
        message,
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
