import pool from '../config/db.js';

/**
 * GET /api/admin/dashboard
 * Aggregated Inventory & Operational Metrics
 */
export const getDashboardStats = async (req, res) => {
  try {
    let summary;
    try {
      // Primary: call MySQL stored procedure
      const [result] = await pool.query('CALL sp_get_inventory_summary()');
      summary = result[0][0];
    } catch (procError) {
      // Fallback: direct aggregate query if stored procedure not yet imported
      const [rows] = await pool.query(`
        SELECT 
          (SELECT COUNT(*) FROM medicines WHERE is_active = TRUE) AS total_medicines,
          (SELECT COUNT(*) FROM brands) AS total_brands,
          (SELECT COUNT(*) FROM medicine_categories) AS total_categories,
          (SELECT COUNT(*) FROM medicine_batches WHERE status = 'active' AND expiry_date > CURDATE()) AS active_batches,
          (SELECT COUNT(*) FROM medicines m WHERE (
            SELECT COALESCE(SUM(b.stock_quantity - b.reserved_quantity), 0) 
            FROM medicine_batches b 
            WHERE b.medicine_id = m.medicine_id AND b.status = 'active' AND b.expiry_date > CURDATE()
          ) <= m.low_stock_threshold AND m.is_active = TRUE) AS low_stock_medicines,
          (SELECT COUNT(*) FROM medicines m WHERE (
            SELECT COALESCE(SUM(b.stock_quantity - b.reserved_quantity), 0) 
            FROM medicine_batches b 
            WHERE b.medicine_id = m.medicine_id AND b.status = 'active' AND b.expiry_date > CURDATE()
          ) = 0 AND m.is_active = TRUE) AS out_of_stock_medicines,
          (SELECT COUNT(*) FROM medicine_batches WHERE stock_quantity > 0 AND expiry_date <= DATE_ADD(CURDATE(), INTERVAL 90 DAY) AND status = 'active') AS expiring_batches_count
      `);
      summary = rows[0];
    }

    res.status(200).json({
      success: true,
      data: summary
    });
  } catch (error) {
    console.error('[Dashboard Stats Error]:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve inventory summary statistics.',
      error: error.message
    });
  }
};

/**
 * GET /api/admin/medicines
 * Admin Medicine Catalog with Full Internal Details
 */
export const getAdminMedicines = async (req, res) => {
  try {
    const sql = `
      SELECT 
        m.medicine_id,
        m.name,
        m.generic_name,
        m.dosage_form,
        m.strength,
        m.unit_price,
        m.is_public_price,
        m.low_stock_threshold,
        m.is_active,
        b.brand_id,
        b.brand_name,
        c.category_id,
        c.category_name,
        COALESCE((
          SELECT SUM(mb.stock_quantity - mb.reserved_quantity)
          FROM medicine_batches mb
          WHERE mb.medicine_id = m.medicine_id
            AND mb.expiry_date > CURDATE()
            AND mb.status = 'active'
        ), 0) AS total_saleable_stock,
        (SELECT COUNT(*) FROM medicine_batches WHERE medicine_id = m.medicine_id) AS total_batches
      FROM medicines m
      INNER JOIN brands b ON m.brand_id = b.brand_id
      INNER JOIN medicine_categories c ON m.category_id = c.category_id
      ORDER BY m.medicine_id DESC
    `;

    const [rows] = await pool.query(sql);

    res.status(200).json({
      success: true,
      count: rows.length,
      data: rows
    });
  } catch (error) {
    console.error('[Admin Medicines Error]:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve administrative medicine records.',
      error: error.message
    });
  }
};

/**
 * POST /api/admin/medicines
 * Create a new medicine
 */
export const createMedicine = async (req, res) => {
  try {
    const {
      name,
      generic_name,
      brand_id,
      category_id,
      dosage_form,
      strength,
      description,
      side_effects,
      usage_instructions,
      unit_price,
      is_public_price = true,
      low_stock_threshold = 20
    } = req.body;

    if (!name || !generic_name || !brand_id || !category_id || !dosage_form || !strength) {
      return res.status(400).json({
        success: false,
        message: 'Name, generic name, brand, category, dosage form, and strength are mandatory.'
      });
    }

    const sql = `
      INSERT INTO medicines (
        name, generic_name, brand_id, category_id, dosage_form, 
        strength, description, side_effects, usage_instructions, 
        unit_price, is_public_price, low_stock_threshold, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE)
    `;

    const [result] = await pool.query(sql, [
      name.trim(),
      generic_name.trim(),
      parseInt(brand_id, 10),
      parseInt(category_id, 10),
      dosage_form.trim(),
      strength.trim(),
      description || null,
      side_effects || null,
      usage_instructions || null,
      parseFloat(unit_price) || 0.0,
      Boolean(is_public_price),
      parseInt(low_stock_threshold, 10) || 20
    ]);

    res.status(201).json({
      success: true,
      message: 'Medicine successfully created.',
      medicine_id: result.insertId
    });
  } catch (error) {
    console.error('[Create Medicine Error]:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create medicine.',
      error: error.message
    });
  }
};

/**
 * PUT /api/admin/medicines/:id
 * Update an existing medicine
 */
export const updateMedicine = async (req, res) => {
  try {
    const medicineId = parseInt(req.params.id, 10);
    const {
      name,
      generic_name,
      brand_id,
      category_id,
      dosage_form,
      strength,
      description,
      side_effects,
      usage_instructions,
      unit_price,
      is_public_price,
      low_stock_threshold,
      is_active
    } = req.body;

    const sql = `
      UPDATE medicines SET
        name = COALESCE(?, name),
        generic_name = COALESCE(?, generic_name),
        brand_id = COALESCE(?, brand_id),
        category_id = COALESCE(?, category_id),
        dosage_form = COALESCE(?, dosage_form),
        strength = COALESCE(?, strength),
        description = COALESCE(?, description),
        side_effects = COALESCE(?, side_effects),
        usage_instructions = COALESCE(?, usage_instructions),
        unit_price = COALESCE(?, unit_price),
        is_public_price = COALESCE(?, is_public_price),
        low_stock_threshold = COALESCE(?, low_stock_threshold),
        is_active = COALESCE(?, is_active)
      WHERE medicine_id = ?
    `;

    const [result] = await pool.query(sql, [
      name ? name.trim() : null,
      generic_name ? generic_name.trim() : null,
      brand_id ? parseInt(brand_id, 10) : null,
      category_id ? parseInt(category_id, 10) : null,
      dosage_form ? dosage_form.trim() : null,
      strength ? strength.trim() : null,
      description,
      side_effects,
      usage_instructions,
      unit_price !== undefined ? parseFloat(unit_price) : null,
      is_public_price !== undefined ? Boolean(is_public_price) : null,
      low_stock_threshold !== undefined ? parseInt(low_stock_threshold, 10) : null,
      is_active !== undefined ? Boolean(is_active) : null,
      medicineId
    ]);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Medicine not found.'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Medicine successfully updated.'
    });
  } catch (error) {
    console.error('[Update Medicine Error]:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update medicine record.',
      error: error.message
    });
  }
};

/**
 * GET /api/admin/batches
 * Retrieve all inventory batches
 */
export const getBatches = async (req, res) => {
  try {
    const sql = `
      SELECT 
        b.batch_id,
        b.batch_number,
        b.medicine_id,
        m.name AS medicine_name,
        m.generic_name,
        b.supplier_id,
        s.supplier_name,
        b.manufacture_date,
        b.expiry_date,
        b.quantity_received,
        b.stock_quantity,
        b.reserved_quantity,
        b.unit_cost,
        b.status,
        DATEDIFF(b.expiry_date, CURDATE()) AS days_to_expiry,
        CASE 
          WHEN b.expiry_date <= CURDATE() THEN 'Expired'
          WHEN b.status = 'recalled' THEN 'Recalled'
          WHEN b.status = 'quarantined' THEN 'Quarantined'
          WHEN b.stock_quantity = 0 THEN 'Depleted'
          ELSE 'Saleable'
        END AS usability_status,
        b.created_at
      FROM medicine_batches b
      INNER JOIN medicines m ON b.medicine_id = m.medicine_id
      INNER JOIN suppliers s ON b.supplier_id = s.supplier_id
      ORDER BY b.expiry_date ASC
    `;

    const [rows] = await pool.query(sql);

    res.status(200).json({
      success: true,
      count: rows.length,
      data: rows
    });
  } catch (error) {
    console.error('[Batches Error]:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve batch records.',
      error: error.message
    });
  }
};

/**
 * POST /api/admin/batches
 * Add a new batch (Uses Stored Procedure sp_receive_new_batch with direct fallback)
 */
export const createBatch = async (req, res) => {
  try {
    const {
      medicine_id,
      supplier_id,
      batch_number,
      manufacture_date,
      expiry_date,
      quantity,
      unit_cost
    } = req.body;

    if (!medicine_id || !supplier_id || !batch_number || !manufacture_date || !expiry_date || !quantity) {
      return res.status(400).json({
        success: false,
        message: 'All batch fields are required.'
      });
    }

    const performer = req.user ? req.user.fullName : 'Admin Staff';
    let newBatchId;

    try {
      const sql = `CALL sp_receive_new_batch(?, ?, ?, ?, ?, ?, ?, ?, @new_batch_id)`;
      await pool.query(sql, [
        parseInt(medicine_id, 10),
        parseInt(supplier_id, 10),
        batch_number.trim(),
        manufacture_date,
        expiry_date,
        parseInt(quantity, 10),
        parseFloat(unit_cost) || 0.0,
        performer
      ]);
      const [outRows] = await pool.query('SELECT @new_batch_id AS batch_id');
      newBatchId = outRows[0]?.batch_id;
    } catch (procErr) {
      // Direct transactional insert fallback
      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();
        const [insertRes] = await connection.query(`
          INSERT INTO medicine_batches (
            medicine_id, supplier_id, batch_number, manufacture_date, 
            expiry_date, quantity_received, stock_quantity, reserved_quantity, unit_cost, status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, 'active')
        `, [
          parseInt(medicine_id, 10),
          parseInt(supplier_id, 10),
          batch_number.trim(),
          manufacture_date,
          expiry_date,
          parseInt(quantity, 10),
          parseInt(quantity, 10),
          parseFloat(unit_cost) || 0.0
        ]);
        newBatchId = insertRes.insertId;

        await connection.query(`
          INSERT INTO stock_movements (batch_id, movement_type, quantity_changed, reason, performed_by)
          VALUES (?, 'RESTOCK', ?, ?, ?)
        `, [newBatchId, parseInt(quantity, 10), `Initial batch: ${batch_number.trim()}`, performer]);

        await connection.commit();
      } catch (txErr) {
        await connection.rollback();
        throw txErr;
      } finally {
        connection.release();
      }
    }

    res.status(201).json({
      success: true,
      message: 'New batch received and recorded.',
      batch_id: newBatchId
    });
  } catch (error) {
    console.error('[Create Batch Error]:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create inventory batch.',
      error: error.message
    });
  }
};

/**
 * PATCH /api/admin/batches/:id/stock
 * Adjust batch stock (Stored Procedure with transaction fallback)
 */
export const adjustBatchStock = async (req, res) => {
  try {
    const batchId = parseInt(req.params.id, 10);
    const { new_quantity, movement_type = 'ADJUSTMENT', reason = 'Manual stock adjustment' } = req.body;

    if (new_quantity === undefined || new_quantity < 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid non-negative stock quantity is required.'
      });
    }

    const performer = req.user ? req.user.fullName : 'Staff User';

    try {
      await pool.query('CALL sp_update_batch_stock(?, ?, ?, ?, ?)', [
        batchId,
        parseInt(new_quantity, 10),
        movement_type,
        reason,
        performer
      ]);
    } catch (procErr) {
      // Transaction fallback
      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();
        const [batchRows] = await connection.query('SELECT stock_quantity FROM medicine_batches WHERE batch_id = ? FOR UPDATE', [batchId]);
        if (batchRows.length === 0) {
          throw new Error('Batch not found');
        }
        const diff = parseInt(new_quantity, 10) - batchRows[0].stock_quantity;
        const newStatus = parseInt(new_quantity, 10) === 0 ? 'depleted' : 'active';

        await connection.query('UPDATE medicine_batches SET stock_quantity = ?, status = ? WHERE batch_id = ?', [
          parseInt(new_quantity, 10),
          newStatus,
          batchId
        ]);

        await connection.query(`
          INSERT INTO stock_movements (batch_id, movement_type, quantity_changed, reason, performed_by)
          VALUES (?, ?, ?, ?, ?)
        `, [batchId, movement_type, diff, reason, performer]);

        await connection.commit();
      } catch (txErr) {
        await connection.rollback();
        throw txErr;
      } finally {
        connection.release();
      }
    }

    res.status(200).json({
      success: true,
      message: 'Batch stock adjusted successfully.'
    });
  } catch (error) {
    console.error('[Adjust Stock Error]:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to adjust batch stock.',
      error: error.message
    });
  }
};

/**
 * GET /api/admin/stock-movements
 */
export const getStockMovements = async (req, res) => {
  try {
    const sql = `
      SELECT 
        sm.movement_id,
        sm.movement_type,
        sm.quantity_changed,
        sm.reason,
        sm.performed_by,
        sm.movement_date,
        b.batch_number,
        m.name AS medicine_name
      FROM stock_movements sm
      INNER JOIN medicine_batches b ON sm.batch_id = b.batch_id
      INNER JOIN medicines m ON b.medicine_id = m.medicine_id
      ORDER BY sm.movement_date DESC
      LIMIT 100
    `;

    const [rows] = await pool.query(sql);

    res.status(200).json({
      success: true,
      count: rows.length,
      data: rows
    });
  } catch (error) {
    console.error('[Stock Movements Error]:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve stock movements.',
      error: error.message
    });
  }
};

/**
 * GET /api/admin/reports/low-stock
 */
export const getLowStockReport = async (req, res) => {
  try {
    let rows;
    try {
      const [viewRows] = await pool.query('SELECT * FROM v_low_stock_alerts ORDER BY current_stock ASC');
      rows = viewRows;
    } catch (viewErr) {
      // Fallback query if view not yet created
      const [fallbackRows] = await pool.query(`
        SELECT 
          m.medicine_id,
          m.name AS medicine_name,
          m.generic_name,
          b.brand_name,
          c.category_name,
          m.low_stock_threshold,
          COALESCE((
            SELECT SUM(mb.stock_quantity - mb.reserved_quantity)
            FROM medicine_batches mb
            WHERE mb.medicine_id = m.medicine_id AND mb.expiry_date > CURDATE() AND mb.status = 'active'
          ), 0) AS current_stock,
          (m.low_stock_threshold - COALESCE((
            SELECT SUM(mb.stock_quantity - mb.reserved_quantity)
            FROM medicine_batches mb
            WHERE mb.medicine_id = m.medicine_id AND mb.expiry_date > CURDATE() AND mb.status = 'active'
          ), 0)) AS units_needed
        FROM medicines m
        INNER JOIN brands b ON m.brand_id = b.brand_id
        INNER JOIN medicine_categories c ON m.category_id = c.category_id
        WHERE m.is_active = TRUE
        HAVING current_stock <= m.low_stock_threshold
        ORDER BY current_stock ASC
      `);
      rows = fallbackRows;
    }

    res.status(200).json({
      success: true,
      count: rows.length,
      data: rows
    });
  } catch (error) {
    console.error('[Low Stock Report Error]:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve low-stock report.',
      error: error.message
    });
  }
};

/**
 * GET /api/admin/reports/expiring
 */
export const getExpiringBatchesReport = async (req, res) => {
  try {
    let rows;
    try {
      const [viewRows] = await pool.query('SELECT * FROM v_expiring_batches');
      rows = viewRows;
    } catch (viewErr) {
      // Fallback query if view not yet created
      const [fallbackRows] = await pool.query(`
        SELECT 
          b.batch_id,
          b.batch_number,
          m.medicine_id,
          m.name AS medicine_name,
          b.stock_quantity,
          b.expiry_date,
          DATEDIFF(b.expiry_date, CURDATE()) AS days_to_expiry,
          s.supplier_name,
          b.status
        FROM medicine_batches b
        INNER JOIN medicines m ON b.medicine_id = m.medicine_id
        INNER JOIN suppliers s ON b.supplier_id = s.supplier_id
        WHERE b.stock_quantity > 0 
          AND b.expiry_date <= DATE_ADD(CURDATE(), INTERVAL 90 DAY)
          AND b.status = 'active'
        ORDER BY b.expiry_date ASC
      `);
      rows = fallbackRows;
    }

    res.status(200).json({
      success: true,
      count: rows.length,
      data: rows
    });
  } catch (error) {
    console.error('[Expiring Batches Error]:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve expiring batches.',
      error: error.message
    });
  }
};

/**
 * GET /api/admin/audit-logs
 */
export const getAuditLogs = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 50');
    res.status(200).json({
      success: true,
      count: rows.length,
      data: rows
    });
  } catch (error) {
    console.error('[Audit Logs Error]:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve system audit logs.',
      error: error.message
    });
  }
};

/**
 * GET /api/admin/suppliers
 */
export const getSuppliers = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT supplier_id, supplier_name, contact_person, phone, email FROM suppliers WHERE is_active = TRUE ORDER BY supplier_name ASC');
    res.status(200).json({
      success: true,
      count: rows.length,
      data: rows
    });
  } catch (error) {
    console.error('[Suppliers Error]:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve suppliers.',
      error: error.message
    });
  }
};
