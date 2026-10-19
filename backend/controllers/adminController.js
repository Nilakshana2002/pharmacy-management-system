import pool from '../config/db.js';
import bcrypt from 'bcryptjs';

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
        m.unit_price,
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
          WHEN b.stock_quantity = 0 THEN 'Depleted'
          WHEN b.status = 'recalled' THEN 'Recalled'
          WHEN b.status = 'quarantined' THEN 'Quarantined'
          WHEN b.expiry_date <= CURDATE() THEN 'Expired'
          ELSE 'Saleable'
        END AS usability_status,
        CASE WHEN b.expiry_date <= CURDATE() THEN 1 ELSE 0 END AS is_expired,
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
  const connection = await pool.getConnection();
  try {
    const batchId = parseInt(req.params.id, 10);
    const { 
      new_quantity, 
      movement_type = 'ADJUSTMENT', 
      reason = 'Manual stock adjustment',
      expiry_date,
      manufacture_date,
      status: requestedStatus
    } = req.body;

    if (new_quantity === undefined || new_quantity < 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid non-negative stock quantity is required.'
      });
    }

    // Normalize movement_type to match MySQL ENUM('RESTOCK', 'DISPENSED', 'ADJUSTMENT', 'RECALL', 'EXPIRED_DISCARD')
    let normalizedType = (movement_type || 'ADJUSTMENT').toUpperCase();
    if (normalizedType === 'DISPENSE') normalizedType = 'DISPENSED';
    if (!['RESTOCK', 'DISPENSED', 'ADJUSTMENT', 'RECALL', 'EXPIRED_DISCARD'].includes(normalizedType)) {
      normalizedType = 'ADJUSTMENT';
    }

    const cleanReason = String(reason || 'Manual stock adjustment').slice(0, 250);
    const performer = req.user ? req.user.fullName : 'Staff User';

    await connection.beginTransaction();

    const [batchRows] = await connection.query(
      'SELECT batch_id, stock_quantity, expiry_date, manufacture_date, status, batch_number FROM medicine_batches WHERE batch_id = ? FOR UPDATE',
      [batchId]
    );

    if (batchRows.length === 0) {
      throw new Error('Batch not found');
    }

    const currentBatch = batchRows[0];
    const newQty = parseInt(new_quantity, 10);
    const diff = newQty - currentBatch.stock_quantity;

    const finalExpiry = expiry_date || currentBatch.expiry_date;
    const finalMfg = manufacture_date || currentBatch.manufacture_date;

    // Determine target status
    let finalStatus = currentBatch.status;
    if (newQty === 0) {
      finalStatus = 'depleted';
    } else if (requestedStatus && ['active', 'quarantined', 'recalled', 'depleted'].includes(requestedStatus)) {
      finalStatus = requestedStatus;
    } else if (expiry_date) {
      // If user provided a new expiry date and it is in the future, automatically reactivate!
      const isFutureExpiry = new Date(expiry_date) > new Date();
      finalStatus = isFutureExpiry ? 'active' : 'quarantined';
    } else {
      const isExpiredNow = new Date(finalExpiry) <= new Date();
      if (isExpiredNow && currentBatch.status === 'active') {
        finalStatus = 'quarantined';
      } else if (currentBatch.status === 'depleted' && newQty > 0) {
        finalStatus = new Date(finalExpiry) > new Date() ? 'active' : 'quarantined';
      }
    }

    await connection.query(
      `UPDATE medicine_batches 
       SET stock_quantity = ?, 
           expiry_date = ?, 
           manufacture_date = ?, 
           status = ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE batch_id = ?`,
      [newQty, finalExpiry, finalMfg, finalStatus, batchId]
    );

    await connection.query(
      `INSERT INTO stock_movements (batch_id, movement_type, quantity_changed, reason, performed_by)
       VALUES (?, ?, ?, ?, ?)`,
      [batchId, normalizedType, diff, cleanReason, performer]
    );

    await connection.commit();

    res.status(200).json({
      success: true,
      message: 'Batch stock and schedule adjusted successfully.',
      data: {
        batch_id: batchId,
        stock_quantity: newQty,
        expiry_date: finalExpiry,
        manufacture_date: finalMfg,
        status: finalStatus
      }
    });
  } catch (error) {
    await connection.rollback();
    console.error('[Adjust Stock Error]:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to adjust batch stock.',
      error: error.message
    });
  } finally {
    connection.release();
  }
};

/**
 * POST /api/admin/batches/:id/action
 * Execute dedicated expiry / safety action on batch: QUARANTINE, DISPOSE, RETURN, ACTIVATE, or UPDATE_EXPIRY
 */
export const handleBatchAction = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const batchId = parseInt(req.params.id, 10);
    const { action, reason, disposal_method, new_expiry_date, new_manufacture_date } = req.body;

    if (!['QUARANTINE', 'DISPOSE', 'RETURN', 'ACTIVATE', 'UPDATE_EXPIRY'].includes(action)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid action. Must be QUARANTINE, DISPOSE, RETURN, ACTIVATE, or UPDATE_EXPIRY.'
      });
    }

    const performer = req.user?.fullName || 'Staff User';

    await connection.beginTransaction();

    const [batchRows] = await connection.query(`
      SELECT b.batch_id, b.medicine_id, b.batch_number, b.stock_quantity, b.status, b.expiry_date, b.manufacture_date,
             m.name AS medicine_name, s.supplier_name
      FROM medicine_batches b
      INNER JOIN medicines m ON b.medicine_id = m.medicine_id
      INNER JOIN suppliers s ON b.supplier_id = s.supplier_id
      WHERE b.batch_id = ?
      FOR UPDATE
    `, [batchId]);

    if (batchRows.length === 0) {
      throw new Error('Batch lot not found.');
    }

    const batch = batchRows[0];
    const isPastExpiry = new Date(batch.expiry_date) <= new Date();
    let updatedStatus = batch.status;
    let qtyChanged = 0;
    let movementType = 'ADJUSTMENT';
    let movementReason = '';

    if (action === 'QUARANTINE') {
      updatedStatus = 'quarantined';
      movementType = 'RECALL';
      movementReason = reason?.trim() || `Quarantined batch ${batch.batch_number} (${batch.stock_quantity} units) due to expiration / safety protocol`;

      await connection.query('UPDATE medicine_batches SET status = ? WHERE batch_id = ?', [
        updatedStatus, batchId
      ]);

      await connection.query(`
        INSERT INTO stock_movements (batch_id, movement_type, quantity_changed, reason, performed_by)
        VALUES (?, ?, 0, ?, ?)
      `, [batchId, movementType, movementReason.slice(0, 240), performer]);

    } else if (action === 'DISPOSE') {
      const remaining = batch.stock_quantity;
      updatedStatus = 'depleted';
      movementType = 'EXPIRED_DISCARD';
      qtyChanged = -remaining;
      const methodNote = disposal_method ? ` via ${disposal_method}` : '';
      movementReason = reason?.trim() || `Certified disposal of ${remaining} units from expired lot ${batch.batch_number}${methodNote}`;

      await connection.query('UPDATE medicine_batches SET stock_quantity = 0, status = ? WHERE batch_id = ?', [
        updatedStatus, batchId
      ]);

      await connection.query(`
        INSERT INTO stock_movements (batch_id, movement_type, quantity_changed, reason, performed_by)
        VALUES (?, ?, ?, ?, ?)
      `, [batchId, movementType, qtyChanged, movementReason.slice(0, 240), performer]);

    } else if (action === 'RETURN') {
      const remaining = batch.stock_quantity;
      updatedStatus = 'depleted';
      movementType = 'RECALL';
      qtyChanged = -remaining;
      movementReason = reason?.trim() || `Returned ${remaining} units of lot ${batch.batch_number} to supplier ${batch.supplier_name} for credit/replacement`;

      await connection.query('UPDATE medicine_batches SET stock_quantity = 0, status = ? WHERE batch_id = ?', [
        updatedStatus, batchId
      ]);

      await connection.query(`
        INSERT INTO stock_movements (batch_id, movement_type, quantity_changed, reason, performed_by)
        VALUES (?, ?, ?, ?, ?)
      `, [batchId, movementType, qtyChanged, movementReason.slice(0, 240), performer]);

    } else if (action === 'UPDATE_EXPIRY') {
      if (!new_expiry_date) {
        throw new Error('New expiry date is required.');
      }
      const isFuture = new Date(new_expiry_date) > new Date();
      if (!isFuture) {
        throw new Error('New expiry date must be in the future to resolve lot expiration.');
      }
      updatedStatus = batch.stock_quantity === 0 ? 'depleted' : 'active';
      movementType = 'ADJUSTMENT';
      movementReason = reason?.trim() || `Updated expiry date to ${new_expiry_date} for lot ${batch.batch_number} and restored to active inventory`;

      await connection.query(
        `UPDATE medicine_batches 
         SET expiry_date = ?, 
             manufacture_date = COALESCE(?, manufacture_date),
             status = ?,
             updated_at = CURRENT_TIMESTAMP
         WHERE batch_id = ?`,
        [new_expiry_date, new_manufacture_date || null, updatedStatus, batchId]
      );

      await connection.query(`
        INSERT INTO stock_movements (batch_id, movement_type, quantity_changed, reason, performed_by)
        VALUES (?, ?, 0, ?, ?)
      `, [batchId, movementType, movementReason.slice(0, 240), performer]);

    } else if (action === 'ACTIVATE') {
      if (isPastExpiry) {
        throw new Error('Cannot restore an expired batch to active status without setting a future expiry date.');
      }
      updatedStatus = batch.stock_quantity === 0 ? 'depleted' : 'active';
      movementType = 'ADJUSTMENT';
      movementReason = reason?.trim() || `Batch ${batch.batch_number} restored to active status following verification`;

      await connection.query('UPDATE medicine_batches SET status = ? WHERE batch_id = ?', [
        updatedStatus, batchId
      ]);

      await connection.query(`
        INSERT INTO stock_movements (batch_id, movement_type, quantity_changed, reason, performed_by)
        VALUES (?, ?, 0, ?, ?)
      `, [batchId, movementType, movementReason.slice(0, 240), performer]);
    }

    await connection.commit();

    res.status(200).json({
      success: true,
      message: `Batch ${batch.batch_number} action '${action}' completed successfully.`,
      data: {
        batch_id: batchId,
        action,
        status: updatedStatus,
        stock_quantity: action === 'DISPOSE' || action === 'RETURN' ? 0 : batch.stock_quantity
      }
    });
  } catch (error) {
    await connection.rollback();
    console.error('[Batch Action Error]:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to process batch action.',
      error: error.message
    });
  } finally {
    connection.release();
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
    const [rows] = await pool.query(`
      SELECT 
        b.batch_id,
        b.batch_number,
        m.medicine_id,
        m.name AS medicine_name,
        m.generic_name,
        b.stock_quantity,
        b.expiry_date,
        DATEDIFF(b.expiry_date, CURDATE()) AS days_to_expiry,
        s.supplier_name,
        b.status,
        CASE
          WHEN b.status = 'quarantined' THEN 'Quarantined — Awaiting destruction or supplier credit'
          WHEN DATEDIFF(b.expiry_date, CURDATE()) <= 0 THEN 'EXPIRED — Immediate Quarantine & Disposal Required'
          WHEN DATEDIFF(b.expiry_date, CURDATE()) <= 30 THEN 'CRITICAL (30d) — Priority FEFO Dispense or Return'
          ELSE 'FEFO Watchlist (90d) — Shelf Stock Rotation'
        END AS action_required,
        CASE
          WHEN b.status = 'quarantined' THEN 'QUARANTINED'
          WHEN DATEDIFF(b.expiry_date, CURDATE()) <= 0 THEN 'EXPIRED'
          WHEN DATEDIFF(b.expiry_date, CURDATE()) <= 30 THEN 'CRITICAL'
          ELSE 'EXPIRING_SOON'
        END AS urgency_level
      FROM medicine_batches b
      INNER JOIN medicines m ON b.medicine_id = m.medicine_id
      INNER JOIN suppliers s ON b.supplier_id = s.supplier_id
      WHERE (b.stock_quantity > 0 AND b.expiry_date <= DATE_ADD(CURDATE(), INTERVAL 90 DAY))
         OR b.status = 'quarantined'
         OR (b.stock_quantity > 0 AND b.expiry_date <= CURDATE())
      ORDER BY b.expiry_date ASC
    `);

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
 * Optional query: startDate, endDate
 */
export const getAuditLogs = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    let whereClauses = [];
    let params = [];

    if (startDate) {
      whereClauses.push('timestamp >= ?');
      params.push(`${startDate} 00:00:00`);
    }
    if (endDate) {
      whereClauses.push('timestamp <= ?');
      params.push(`${endDate} 23:59:59`);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
    const sql = `SELECT * FROM audit_logs ${whereSql} ORDER BY timestamp DESC LIMIT 200`;

    const [rows] = await pool.query(sql, params);
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

/**
 * POST /api/admin/sales
 * Atomic POS Sale Transaction with Batch Allocation and Rollback Protection
 */
export const createSale = async (req, res) => {
  const {
    patient_name = 'Walk-in Customer',
    prescription_ref = 'OTC',
    medicine_id,
    batch_id,
    quantity,
    unit_price,
    packaging_desc = '1 Unit',
    payment_method = 'CASH',
    amount_paid
  } = req.body;

  if (!medicine_id || !batch_id || !quantity || quantity <= 0) {
    return res.status(400).json({
      success: false,
      message: 'Valid medicine ID, batch ID, and positive quantity are required.'
    });
  }

  const numericQty = parseInt(quantity, 10);
  const numericPrice = parseFloat(unit_price) || 0.0;
  const totalBill = numericQty * numericPrice;
  const numericPaid = parseFloat(amount_paid) !== undefined ? parseFloat(amount_paid) : totalBill;

  if (numericPaid < totalBill) {
    return res.status(400).json({
      success: false,
      message: `Amount paid (Rs. ${numericPaid.toFixed(2)}) is less than total bill (Rs. ${totalBill.toFixed(2)}).`
    });
  }

  const performer = req.user ? req.user.fullName : 'Staff Pharmacist';
  const userId = req.user ? req.user.userId : null;

  try {
    // Primary: Call atomic stored procedure
    let saleId, invoiceNumber;
    try {
      const spSql = 'CALL sp_create_pos_sale(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, @out_sale_id, @out_invoice_number)';
      await pool.query(spSql, [
        userId,
        patient_name.trim(),
        prescription_ref.trim(),
        parseInt(medicine_id, 10),
        parseInt(batch_id, 10),
        numericQty,
        numericPrice,
        packaging_desc.trim(),
        payment_method.toUpperCase(),
        numericPaid,
        performer
      ]);

      const [outRows] = await pool.query('SELECT @out_sale_id AS sale_id, @out_invoice_number AS invoice_number');
      saleId = outRows[0]?.sale_id;
      invoiceNumber = outRows[0]?.invoice_number;
    } catch (procErr) {
      // Direct transaction fallback if stored procedure not yet imported
      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();

        // 1. Lock batch row FOR UPDATE
        const [batchRows] = await connection.query(
          'SELECT stock_quantity, status, expiry_date FROM medicine_batches WHERE batch_id = ? FOR UPDATE',
          [parseInt(batch_id, 10)]
        );

        if (batchRows.length === 0) {
          throw new Error('Selected batch not found.');
        }

        const batch = batchRows[0];
        if (new Date(batch.expiry_date) <= new Date()) {
          throw new Error('Cannot dispense from an expired batch.');
        }
        if (batch.status !== 'active') {
          throw new Error('Selected batch is not active for dispensing.');
        }
        if (batch.stock_quantity < numericQty) {
          throw new Error(`Insufficient batch stock (${batch.stock_quantity} available, ${numericQty} requested).`);
        }

        // 2. Generate unique invoice number
        invoiceNumber = `INV-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(10000 + Math.random() * 90000)}`;

        // 3. Insert sales
        const [saleRes] = await connection.query(`
          INSERT INTO sales (
            invoice_number, user_id, patient_name, prescription_ref,
            subtotal, discount_amount, tax_amount, total_amount, payment_status, sale_date
          ) VALUES (?, ?, ?, ?, ?, 0.00, 0.00, ?, 'PAID', CURRENT_TIMESTAMP)
        `, [invoiceNumber, userId, patient_name.trim(), prescription_ref.trim(), totalBill, totalBill]);

        saleId = saleRes.insertId;

        // 4. Insert sale_items
        const [itemRes] = await connection.query(`
          INSERT INTO sale_items (sale_id, medicine_id, quantity, unit_price, subtotal, packaging_desc)
          VALUES (?, ?, ?, ?, ?, ?)
        `, [saleId, parseInt(medicine_id, 10), numericQty, numericPrice, totalBill, packaging_desc]);

        // 5. Insert sale_item_batches (3NF allocation)
        await connection.query(`
          INSERT INTO sale_item_batches (sale_item_id, batch_id, quantity_allocated)
          VALUES (?, ?, ?)
        `, [itemRes.insertId, parseInt(batch_id, 10), numericQty]);

        // 6. Insert payments
        const changeGiven = Math.max(0, numericPaid - totalBill);
        await connection.query(`
          INSERT INTO payments (sale_id, payment_method, amount_paid, change_given, reference_note)
          VALUES (?, ?, ?, ?, ?)
        `, [saleId, payment_method.toUpperCase(), numericPaid, changeGiven, `Counter POS Receipt #${invoiceNumber}`]);

        // 7. Deduct stock & update status
        const newStock = batch.stock_quantity - numericQty;
        const newStatus = newStock === 0 ? 'depleted' : 'active';
        await connection.query(
          'UPDATE medicine_batches SET stock_quantity = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE batch_id = ?',
          [newStock, newStatus, parseInt(batch_id, 10)]
        );

        // 8. Log stock movement
        await connection.query(`
          INSERT INTO stock_movements (batch_id, movement_type, quantity_changed, reason, performed_by)
          VALUES (?, 'DISPENSED', ?, ?, ?)
        `, [
          parseInt(batch_id, 10),
          -numericQty,
          `Sale ${invoiceNumber} to ${patient_name.trim()} (Rx: ${prescription_ref.trim()})`,
          performer
        ]);

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
      message: 'Prescription sale successfully finalized and inventory deducted.',
      data: {
        sale_id: saleId,
        invoice_number: invoiceNumber,
        total_amount: totalBill,
        amount_paid: numericPaid,
        change_given: Math.max(0, numericPaid - totalBill),
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('[Create Sale Error]:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to process POS sale transaction.',
      error: error.message
    });
  }
};

/**
 * GET /api/admin/sales/**
 * GET /api/admin/sales
 * Historical sales transactions with optional timeline filter
 */
export const getSalesHistory = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    let whereClauses = [];
    let params = [];

    if (startDate) {
      whereClauses.push('s.sale_date >= ?');
      params.push(`${startDate} 00:00:00`);
    }
    if (endDate) {
      whereClauses.push('s.sale_date <= ?');
      params.push(`${endDate} 23:59:59`);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const sql = `
      SELECT 
        s.sale_id,
        s.invoice_number,
        s.patient_name,
        s.prescription_ref,
        s.total_amount,
        s.payment_status,
        s.sale_date,
        u.full_name AS cashier_name,
        p.payment_method,
        p.amount_paid,
        (
          SELECT GROUP_CONCAT(CONCAT(m.name, ' (x', si.quantity, ')') SEPARATOR ', ')
          FROM sale_items si
          INNER JOIN medicines m ON si.medicine_id = m.medicine_id
          WHERE si.sale_id = s.sale_id
        ) AS items_summary
      FROM sales s
      LEFT JOIN users u ON s.user_id = u.user_id
      LEFT JOIN payments p ON s.sale_id = p.sale_id
      ${whereSql}
      ORDER BY s.sale_date DESC
      LIMIT 200
    `;

    const [rows] = await pool.query(sql, params);

    res.status(200).json({
      success: true,
      count: rows.length,
      data: rows
    });
  } catch (error) {
    console.error('[Sales History Error]:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve sales records.',
      error: error.message
    });
  }
};

/**
 * GET /api/admin/reports/daily-sales
 * Optional query: startDate, endDate
 */
export const getDailySalesReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    let whereClauses = [];
    let params = [];

    if (startDate) {
      whereClauses.push('sale_date >= ?');
      params.push(startDate);
    }
    if (endDate) {
      whereClauses.push('sale_date <= ?');
      params.push(endDate);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    let rows;
    try {
      const [viewRows] = await pool.query(`SELECT * FROM v_daily_sales ${whereSql} ORDER BY sale_date DESC LIMIT 90`, params);
      rows = viewRows;
    } catch (e) {
      const [fallback] = await pool.query(`
        SELECT 
          DATE(sale_date) AS sale_date,
          COUNT(sale_id) AS sale_count,
          COALESCE(SUM(total_amount), 0.00) AS gross_sales,
          0.00 AS total_tax,
          COALESCE(SUM(total_amount), 0.00) AS net_sales,
          COALESCE(SUM(CASE WHEN payment_method = 'CASH' THEN total_amount ELSE 0 END), 0.00) AS cash_sales,
          COALESCE(SUM(CASE WHEN payment_method = 'CARD' THEN total_amount ELSE 0 END), 0.00) AS card_sales
        FROM sales s
        LEFT JOIN payments p ON s.sale_id = p.sale_id
        ${whereClauses.length > 0 ? `WHERE ${whereClauses.map(w => 's.' + w).join(' AND ')}` : ''}
        GROUP BY DATE(sale_date)
        ORDER BY sale_date DESC
        LIMIT 90
      `, params);
      rows = fallback;
    }

    res.status(200).json({
      success: true,
      count: rows.length,
      data: rows
    });
  } catch (error) {
    console.error('[Daily Sales Error]:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve daily sales analytics.',
      error: error.message
    });
  }
};

/**
 * GET /api/admin/reports/monthly-sales
 */
export const getMonthlySalesReport = async (req, res) => {
  try {
    let rows;
    try {
      const [viewRows] = await pool.query('SELECT * FROM v_monthly_sales LIMIT 12');
      rows = viewRows;
    } catch (e) {
      const [fallback] = await pool.query(`
        SELECT 
          DATE_FORMAT(sale_date, '%Y-%m') AS sale_month,
          COUNT(sale_id) AS total_transactions,
          COALESCE(SUM(total_amount), 0.00) AS total_revenue
        FROM sales
        WHERE payment_status = 'PAID'
        GROUP BY DATE_FORMAT(sale_date, '%Y-%m')
        ORDER BY sale_month DESC
        LIMIT 12
      `);
      rows = fallback;
    }

    res.status(200).json({
      success: true,
      count: rows.length,
      data: rows
    });
  } catch (error) {
    console.error('[Monthly Sales Error]:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve monthly sales analytics.',
      error: error.message
    });
  }
};

/**
 * GET /api/admin/reports/best-sellers
 * Optional query: startDate, endDate
 */
export const getBestSellingReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    let dateFilter = '';
    let params = [];

    if (startDate && endDate) {
      dateFilter = 'AND s.sale_date BETWEEN ? AND ?';
      params.push(`${startDate} 00:00:00`, `${endDate} 23:59:59`);
    } else if (startDate) {
      dateFilter = 'AND s.sale_date >= ?';
      params.push(`${startDate} 00:00:00`);
    } else if (endDate) {
      dateFilter = 'AND s.sale_date <= ?';
      params.push(`${endDate} 23:59:59`);
    }

    let rows;
    try {
      if (!startDate && !endDate) {
        const [viewRows] = await pool.query('SELECT * FROM v_sales_by_medicine LIMIT 25');
        rows = viewRows;
      } else {
        throw new Error('Use filtered query');
      }
    } catch (e) {
      const [fallback] = await pool.query(`
        SELECT 
          m.medicine_id,
          m.name AS medicine_name,
          m.generic_name,
          c.category_name,
          b.brand_name,
          COALESCE(SUM(si.quantity), 0) AS total_units_sold,
          COALESCE(SUM(si.subtotal), 0.00) AS total_revenue,
          COUNT(DISTINCT si.sale_id) AS transaction_count
        FROM sale_items si
        INNER JOIN medicines m ON si.medicine_id = m.medicine_id
        INNER JOIN medicine_categories c ON m.category_id = c.category_id
        INNER JOIN brands b ON m.brand_id = b.brand_id
        INNER JOIN sales s ON si.sale_id = s.sale_id
        WHERE s.payment_status = 'PAID' ${dateFilter}
        GROUP BY m.medicine_id, m.name, m.generic_name, c.category_name, b.brand_name
        ORDER BY total_units_sold DESC
        LIMIT 25
      `, params);
      rows = fallback;
    }

    res.status(200).json({
      success: true,
      count: rows.length,
      data: rows
    });
  } catch (error) {
    console.error('[Best Sellers Error]:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve best-selling medications.',
      error: error.message
    });
  }
};

/**
 * GET /api/admin/reports/inventory-valuation
 */
export const getInventoryValuationReport = async (req, res) => {
  try {
    const sql = `
      SELECT 
        COUNT(DISTINCT m.medicine_id) AS total_evaluated_formulations,
        COUNT(b.batch_id) AS total_evaluated_batches,
        COALESCE(SUM(b.stock_quantity), 0) AS total_stock_units,
        COALESCE(SUM(b.stock_quantity * b.unit_cost), 0.00) AS total_inventory_cost_value,
        COALESCE(SUM(b.stock_quantity * m.unit_price), 0.00) AS total_inventory_retail_value,
        COALESCE(SUM(b.stock_quantity * (m.unit_price - b.unit_cost)), 0.00) AS potential_gross_profit
      FROM medicine_batches b
      INNER JOIN medicines m ON b.medicine_id = m.medicine_id
      WHERE b.status = 'active' AND b.expiry_date > CURDATE()
    `;

    const [rows] = await pool.query(sql);

    res.status(200).json({
      success: true,
      data: rows[0]
    });
  } catch (error) {
    console.error('[Valuation Error]:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to calculate inventory valuation.',
      error: error.message
    });
  }
};

/**
 * Helper to ensure permissions column exists safely without throwing
 */
let permissionsColumnChecked = false;
async function ensurePermissionsColumn() {
  if (permissionsColumnChecked) return;
  try {
    await pool.query('ALTER TABLE users ADD COLUMN permissions TEXT NULL');
  } catch (e) {
    // Column already exists or table structure error
  }
  permissionsColumnChecked = true;
}

/**
 * GET /api/admin/users
 * Manage staff accounts (ADMIN only) with detailed permissions
 */
export const getUsers = async (req, res) => {
  try {
    await ensurePermissionsColumn();

    let rows;
    try {
      const [uRows] = await pool.query(`
        SELECT user_id, username, email, role, full_name, is_active, created_at, permissions
        FROM users
        ORDER BY user_id ASC
      `);
      rows = uRows;
    } catch {
      const [fallbackRows] = await pool.query(`
        SELECT user_id, username, email, role, full_name, is_active, created_at
        FROM users
        ORDER BY user_id ASC
      `);
      rows = fallbackRows;
    }

    const formatted = rows.map(u => {
      let perms = null;
      if (u.permissions) {
        try {
          perms = typeof u.permissions === 'string' ? JSON.parse(u.permissions) : u.permissions;
        } catch {
          perms = null;
        }
      }
      if (!perms) {
        if (u.role === 'ADMIN') {
          perms = {
            can_pos: true,
            can_manage_medicines: true,
            can_manage_batches: true,
            can_view_reports: true,
            can_view_audit: true,
            can_manage_users: true
          };
        } else {
          perms = {
            can_pos: true,
            can_manage_medicines: true,
            can_manage_batches: true,
            can_view_reports: false,
            can_view_audit: false,
            can_manage_users: false
          };
        }
      }
      return {
        ...u,
        permissions: perms
      };
    });

    res.status(200).json({
      success: true,
      count: formatted.length,
      data: formatted
    });
  } catch (error) {
    console.error('[Get Users Error]:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve staff users.',
      error: error.message
    });
  }
};

/**
 * POST /api/admin/users
 * Register a new staff user (ADMIN only) with specific permissions
 */
export const createUser = async (req, res) => {
  try {
    await ensurePermissionsColumn();
    const { username, email, password, full_name, role = 'PHARMACIST', permissions } = req.body;

    if (!username || !email || !password || !full_name) {
      return res.status(400).json({
        success: false,
        message: 'Username, email, password, and full name are required.'
      });
    }

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);
    const assignedRole = role.toUpperCase() === 'ADMIN' ? 'ADMIN' : 'PHARMACIST';
    const permissionsJson = permissions ? JSON.stringify(permissions) : JSON.stringify({
      can_pos: true,
      can_manage_medicines: assignedRole === 'ADMIN',
      can_manage_batches: assignedRole === 'ADMIN',
      can_view_reports: assignedRole === 'ADMIN',
      can_view_audit: assignedRole === 'ADMIN',
      can_manage_users: assignedRole === 'ADMIN'
    });

    let result;
    try {
      const sql = `
        INSERT INTO users (username, email, password_hash, role, full_name, is_active, permissions)
        VALUES (?, ?, ?, ?, ?, TRUE, ?)
      `;
      [result] = await pool.query(sql, [
        username.trim().toLowerCase(),
        email.trim().toLowerCase(),
        passwordHash,
        assignedRole,
        full_name.trim(),
        permissionsJson
      ]);
    } catch (insertErr) {
      // Fallback without permissions column
      const sql = `
        INSERT INTO users (username, email, password_hash, role, full_name, is_active)
        VALUES (?, ?, ?, ?, ?, TRUE)
      `;
      [result] = await pool.query(sql, [
        username.trim().toLowerCase(),
        email.trim().toLowerCase(),
        passwordHash,
        assignedRole,
        full_name.trim()
      ]);
    }

    res.status(201).json({
      success: true,
      message: `User '${username}' successfully created with role ${assignedRole}.`,
      user_id: result.insertId
    });
  } catch (error) {
    console.error('[Create User Error]:', error);
    res.status(500).json({
      success: false,
      message: error.code === 'ER_DUP_ENTRY' ? 'Username or email already in use.' : 'Failed to register staff account.',
      error: error.message
    });
  }
};

/**
 * PUT /api/admin/users/:id
 * Update staff details, privileges & optional password reset (ADMIN only)
 */
export const updateUser = async (req, res) => {
  try {
    await ensurePermissionsColumn();
    const userId = parseInt(req.params.id, 10);
    const { full_name, email, role, password, permissions, is_active } = req.body;

    if (!full_name || !email) {
      return res.status(400).json({
        success: false,
        message: 'Full name and email are required.'
      });
    }

    const assignedRole = role?.toUpperCase() === 'ADMIN' ? 'ADMIN' : 'PHARMACIST';
    const permissionsJson = typeof permissions === 'object' ? JSON.stringify(permissions) : (permissions || null);

    let sql, params;
    if (password && password.trim().length >= 6) {
      const passwordHash = await bcrypt.hash(password.trim(), 10);
      sql = `
        UPDATE users 
        SET full_name = ?, email = ?, role = ?, password_hash = ?, is_active = ?, permissions = ?
        WHERE user_id = ?
      `;
      params = [full_name.trim(), email.trim().toLowerCase(), assignedRole, passwordHash, is_active !== undefined ? Boolean(is_active) : true, permissionsJson, userId];
    } else {
      sql = `
        UPDATE users 
        SET full_name = ?, email = ?, role = ?, is_active = ?, permissions = ?
        WHERE user_id = ?
      `;
      params = [full_name.trim(), email.trim().toLowerCase(), assignedRole, is_active !== undefined ? Boolean(is_active) : true, permissionsJson, userId];
    }

    try {
      await pool.query(sql, params);
    } catch (colErr) {
      // Fallback if permissions column doesn't exist
      if (password && password.trim().length >= 6) {
        const passwordHash = await bcrypt.hash(password.trim(), 10);
        await pool.query(
          'UPDATE users SET full_name = ?, email = ?, role = ?, password_hash = ?, is_active = ? WHERE user_id = ?',
          [full_name.trim(), email.trim().toLowerCase(), assignedRole, passwordHash, is_active !== undefined ? Boolean(is_active) : true, userId]
        );
      } else {
        await pool.query(
          'UPDATE users SET full_name = ?, email = ?, role = ?, is_active = ? WHERE user_id = ?',
          [full_name.trim(), email.trim().toLowerCase(), assignedRole, is_active !== undefined ? Boolean(is_active) : true, userId]
        );
      }
    }

    res.status(200).json({
      success: true,
      message: `Staff member details and privileges updated successfully.`
    });
  } catch (error) {
    console.error('[Update User Error]:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user details and privileges.',
      error: error.message
    });
  }
};

/**
 * PATCH /api/admin/users/:id/status
 * Toggle staff active/deactivated status (ADMIN only)
 */
export const toggleUserStatus = async (req, res) => {
  try {
    const userId = parseInt(req.params.id, 10);
    const { is_active } = req.body;

    if (req.user && req.user.userId === userId) {
      return res.status(400).json({
        success: false,
        message: 'Self-deactivation is not permitted.'
      });
    }

    await pool.query('UPDATE users SET is_active = ? WHERE user_id = ?', [Boolean(is_active), userId]);

    res.status(200).json({
      success: true,
      message: `User status successfully updated.`
    });
  } catch (error) {
    console.error('[Toggle User Error]:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user status.',
      error: error.message
    });
  }
};

/**
 * POST /api/admin/categories
 */
export const createCategory = async (req, res) => {
  try {
    const { category_name, description, icon_name = 'Pill' } = req.body;
    if (!category_name) {
      return res.status(400).json({ success: false, message: 'Category name is required.' });
    }

    const [result] = await pool.query(
      'INSERT INTO medicine_categories (category_name, description, icon_name) VALUES (?, ?, ?)',
      [category_name.trim(), description || null, icon_name.trim()]
    );

    res.status(201).json({
      success: true,
      message: 'Category created.',
      category_id: result.insertId
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/admin/brands
 */
export const createBrand = async (req, res) => {
  try {
    const { brand_name, country_of_origin = 'Global' } = req.body;
    if (!brand_name) {
      return res.status(400).json({ success: false, message: 'Brand name is required.' });
    }

    const [result] = await pool.query(
      'INSERT INTO brands (brand_name, country_of_origin) VALUES (?, ?, ?)',
      [brand_name.trim(), country_of_origin.trim()]
    );

    res.status(201).json({
      success: true,
      message: 'Brand registered.',
      brand_id: result.insertId
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/admin/suppliers
 */
export const createSupplier = async (req, res) => {
  try {
    const { supplier_name, contact_person, phone, email, address } = req.body;
    if (!supplier_name) {
      return res.status(400).json({ success: false, message: 'Supplier name is required.' });
    }

    const [result] = await pool.query(
      'INSERT INTO suppliers (supplier_name, contact_person, phone, email, address, is_active) VALUES (?, ?, ?, ?, ?, TRUE)',
      [supplier_name.trim(), contact_person || null, phone || null, email || null, address || null]
    );

    res.status(201).json({
      success: true,
      message: 'Supplier registered.',
      supplier_id: result.insertId
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * PUT /api/admin/settings
 */
export const updatePharmacySettings = async (req, res) => {
  try {
    const settings = req.body;
    for (const [key, value] of Object.entries(settings)) {
      await pool.query(
        'INSERT INTO pharmacy_settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = ?',
        [key, String(value), String(value)]
      );
    }
    res.status(200).json({ success: true, message: 'Pharmacy settings updated.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

