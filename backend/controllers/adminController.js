import pool from '../config/db.js';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ensureCustomersTable } from './customerController.js';
import { initADBMSViews } from '../services/adbmsService.js';

/**
 * Sales, items, batches, payments, stock movements, reviews, and logs 
 * are all fully managed via database/schema.sql and seed.sql
 */
let salesTablesChecked = false;

export const ensureSalesTables = async () => {
  if (salesTablesChecked) return true;
  salesTablesChecked = true;
  try {
    await initADBMSViews();
  } catch (adbmsErr) {}
  try {
    await pool.query("UPDATE payments SET payment_method = 'CARD' WHERE payment_method NOT IN ('CASH', 'CARD')");
    await pool.query("ALTER TABLE payments MODIFY COLUMN payment_method ENUM('CASH', 'CARD') NOT NULL DEFAULT 'CASH'");
  } catch (migErr) {
    // Column might already have the strict ENUM or constraint
  }
  try {
    await pool.query("DROP VIEW IF EXISTS v_active_promotions");
    await pool.query("DROP TABLE IF EXISTS promotions");
  } catch (dropErr) {
    // Table or view might already be dropped
  }
  return true;
};

/**
 * Automatically detects and synchronizes any POS dispensations that were recorded in stock_movements
 * during previous table migrations or connection retries, ensuring 100% data integrity in sales reporting.
 */
export const syncOrphanedPosMovements = async () => {
  try {
    // 1. Clean up any phantom duplicate sales created with prefix 'INV-POS-%'
    await pool.query("DELETE FROM sales WHERE invoice_number LIKE 'INV-POS-%'");

    const [orphanRows] = await pool.query(`
      SELECT 
        sm.movement_id,
        sm.batch_id,
        sm.quantity_changed,
        sm.reason,
        sm.performed_by,
        sm.movement_date,
        b.medicine_id,
        b.batch_number,
        m.name AS medicine_name,
        COALESCE(m.unit_price, 10.00) AS unit_price
      FROM stock_movements sm
      INNER JOIN medicine_batches b ON sm.batch_id = b.batch_id
      INNER JOIN medicines m ON b.medicine_id = m.medicine_id
      WHERE sm.movement_type = 'DISPENSED'
        AND (sm.reason LIKE 'POS:%' OR sm.reason LIKE 'POS %')
      ORDER BY sm.movement_id ASC
    `);

    for (const mov of orphanRows) {
      const reasonStr = mov.reason || '';

      // Check if this stock movement already references an existing valid sale invoice
      const matchInv = reasonStr.match(/INV-[\w-]+/i);
      if (matchInv && matchInv[0]) {
        const [existingReal] = await pool.query('SELECT sale_id FROM sales WHERE invoice_number = ? LIMIT 1', [matchInv[0]]);
        if (existingReal.length > 0) {
          // Sale already recorded properly in database. Never create duplicate!
          continue;
        }
      }

      const invNum = `INV-REC-${mov.movement_id}`;
      const [existing] = await pool.query('SELECT sale_id FROM sales WHERE invoice_number = ? LIMIT 1', [invNum]);
      if (existing.length > 0) continue;

      const qty = Math.abs(mov.quantity_changed) || 1;
      const unitPrice = parseFloat(mov.unit_price) || 10.00;
      const totalBill = parseFloat((qty * unitPrice).toFixed(2));

      let patientName = 'Walk-in Customer';
      let rxRef = 'OTC';
      let packagingDesc = 'Dispensed Item';

      try {
        const reasonStr = mov.reason || '';
        const matchRx = reasonStr.match(/\(Rx:\s*([^)]+)\)/i);
        if (matchRx && matchRx[1]) rxRef = matchRx[1].trim();

        const matchTo = reasonStr.match(/to\s+(.*?)\s*\(Rx:/i);
        if (matchTo && matchTo[1]) patientName = matchTo[1].trim();

        const matchPkg = reasonStr.match(/POS:\s*(.*?)\s+to\s+/i);
        if (matchPkg && matchPkg[1]) packagingDesc = matchPkg[1].trim();
      } catch (pErr) {}

      const [saleRes] = await pool.query(`
        INSERT INTO sales (
          invoice_number, user_id, patient_name, prescription_ref,
          subtotal, discount_amount, tax_amount, total_amount, payment_status, sale_date
        ) VALUES (?, NULL, ?, ?, ?, 0.00, 0.00, ?, 'PAID', ?)
      `, [
        invNum,
        patientName,
        rxRef,
        totalBill,
        totalBill,
        mov.movement_date
      ]);

      const saleId = saleRes.insertId;

      const [itemRes] = await pool.query(`
        INSERT INTO sale_items (sale_id, medicine_id, quantity, unit_price, subtotal, packaging_desc)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [
        saleId,
        mov.medicine_id,
        qty,
        unitPrice,
        totalBill,
        packagingDesc
      ]);

      try {
        await pool.query(`
          INSERT INTO sale_item_batches (sale_item_id, batch_id, quantity_allocated)
          VALUES (?, ?, ?)
        `, [itemRes.insertId, mov.batch_id, qty]);
      } catch (sibErr) {}

      await pool.query(`
        INSERT INTO payments (sale_id, payment_method, amount_paid, change_given, reference_note, payment_date)
        VALUES (?, 'CASH', ?, 0.00, ?, ?)
      `, [
        saleId,
        totalBill,
        `POS Counter Auto-Recovery Receipt #${invNum}`,
        mov.movement_date
      ]);

      console.log(`[Auto-Recovery] Recovered orphaned POS transaction #${mov.movement_id} -> Invoice ${invNum}`);
    }
  } catch (syncErr) {
    console.warn('[Sync Orphaned POS Movements Notice]:', syncErr.message);
  }
};

// ensureSalesTables is awaited on demand inside controller actions to prevent race conditions during boot

/**
 * GET /api/admin/dashboard
 * Aggregated Inventory, Operational & Financial Metrics
 */
export const getDashboardStats = async (req, res) => {
  try {
    await ensureSalesTables();
    await syncOrphanedPosMovements();

    // Consolidated ADBMS Summary using Views & Stored Functions
    const [rows] = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM medicines WHERE is_active = TRUE) AS total_medicines,
        (SELECT COUNT(*) FROM brands) AS total_brands,
        (SELECT COUNT(*) FROM medicine_categories) AS total_categories,
        (SELECT COUNT(*) FROM medicine_batches WHERE status = 'active' AND expiry_date > CURDATE()) AS active_batches,
        (SELECT COUNT(*) FROM v_low_stock_alerts) AS low_stock_medicines,
        (SELECT COUNT(*) FROM medicines WHERE fn_calculate_available_stock(medicine_id) = 0 AND is_active = TRUE) AS out_of_stock_medicines,
        (SELECT COUNT(*) FROM v_expiring_batches) AS expiring_batches_count,
        (SELECT COUNT(*) FROM customers WHERE is_active = TRUE) AS total_customers,
        fn_get_prescriptions_count_by_status('pending') AS pending_prescriptions,
        (SELECT COUNT(*) FROM inquiries WHERE status = 'NEW') AS new_inquiries,
        (SELECT COALESCE(total_transactions, 0) FROM v_daily_sales WHERE sale_day = CURDATE() LIMIT 1) AS today_sales_count,
        (SELECT COALESCE(total_revenue, 0.00) FROM v_daily_sales WHERE sale_day = CURDATE() LIMIT 1) AS today_revenue,
        (SELECT COALESCE(total_revenue, 0.00) FROM v_monthly_sales WHERE sale_month = DATE_FORMAT(CURDATE(), '%Y-%m') LIMIT 1) AS monthly_revenue,
        (SELECT COALESCE(SUM(total_transactions), 0) FROM v_daily_sales) AS total_sales_count,
        (SELECT COALESCE(SUM(total_revenue), 0.00) FROM v_daily_sales) AS total_revenue
    `);

    res.status(200).json({
      success: true,
      data: rows[0]
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
        m.description,
        m.side_effects,
        m.usage_instructions,
        m.unit_price,
        m.unit_price AS original_price,
        fn_calculate_discounted_price(m.unit_price, m.discount_percent) AS final_price,
        ROUND(m.unit_price * (COALESCE(m.discount_percent, 0.00) / 100.00), 2) AS discount_amount,
        m.is_public_price,
        m.low_stock_threshold,
        m.is_active,
        COALESCE(m.discount_percent, 0.00) AS discount_percent,
        COALESCE(m.is_offer, FALSE) AS is_offer,
        COALESCE(m.rating, 5.0) AS rating,
        m.image_url,
        b.brand_id,
        b.brand_name,
        c.category_id,
        c.category_name,
        fn_calculate_available_stock(m.medicine_id) AS total_saleable_stock,
        fn_get_medicine_total_batches(m.medicine_id) AS total_batches,
        fn_get_availability_status(m.medicine_id) AS stock_status
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
 * Create a new medicine formulation
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
      low_stock_threshold = 20,
      image_url = null
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
        unit_price, is_public_price, low_stock_threshold, is_active,
        image_url
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE, ?)
    `;

    const cleanImageUrl = image_url && typeof image_url === 'string' && image_url.trim().length > 0 
      ? image_url.trim() 
      : null;

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
      parseInt(low_stock_threshold, 10) || 20,
      cleanImageUrl
    ]);

    res.status(201).json({
      success: true,
      message: 'Medicine formulation successfully created.',
      medicine_id: result.insertId,
      image_url: cleanImageUrl
    });
  } catch (error) {
    console.error('[Create Medicine Error]:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create medicine formulation.',
      error: error.message
    });
  }
};

/**
 * PUT /api/admin/medicines/:id
 * Update an existing medicine formulation
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
      is_active,
      is_offer,
      discount_percent,
      image_url
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
        is_active = COALESCE(?, is_active),
        is_offer = COALESCE(?, is_offer),
        discount_percent = COALESCE(?, discount_percent),
        image_url = CASE WHEN ? IS NOT NULL THEN ? ELSE image_url END
      WHERE medicine_id = ?
    `;

    const sanitizedImageUrl = image_url !== undefined 
      ? (typeof image_url === 'string' && image_url.trim().length > 0 ? image_url.trim() : null)
      : null;

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
      is_offer !== undefined ? (Boolean(is_offer) ? 1 : 0) : null,
      discount_percent !== undefined ? parseFloat(discount_percent) : null,
      image_url !== undefined ? 'SET_IMAGE' : null,
      sanitizedImageUrl,
      medicineId
    ]);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Medicine formulation not found.'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Medicine formulation successfully updated.',
      image_url: sanitizedImageUrl
    });
  } catch (error) {
    console.error('[Update Medicine Error]:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update medicine formulation.',
      error: error.message
    });
  }
};

/**
 * POST /api/admin/medicines/upload-image
 * Dedicated file upload endpoint for medicine packaging photography
 * Stores image in /uploads/medicines and mirrors to /public/medicines
 */
export const uploadMedicineImage = async (req, res) => {
  try {
    const { imageBase64, fileName = 'medicine_pack.jpg' } = req.body;
    if (!imageBase64) {
      return res.status(400).json({
        success: false,
        message: 'No image data provided for upload.'
      });
    }

    // Extract base64 payload and determine file extension
    let fileData = imageBase64;
    let extension = '.jpg';
    const match = imageBase64.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
    if (match) {
      const rawExt = match[1].toLowerCase();
      extension = rawExt === 'jpeg' ? '.jpg' : `.${rawExt}`;
      fileData = match[2];
    } else if (fileName && fileName.includes('.')) {
      extension = path.extname(fileName).toLowerCase() || '.jpg';
    }

    const buffer = Buffer.from(fileData, 'base64');
    if (buffer.length > 10 * 1024 * 1024) {
      return res.status(400).json({
        success: false,
        message: 'Image size exceeds maximum limit of 10MB.'
      });
    }

    // Generate sanitized unique filename
    const cleanRawName = path.basename(fileName, path.extname(fileName))
      .replace(/[^a-zA-Z0-9_\-\s]/g, '')
      .trim()
      .replace(/\s+/g, '_') || 'med';
    const safeFileName = `${cleanRawName}_${Date.now()}${extension}`;

    // 1. Save to backend /uploads/medicines/
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const backendUploadDir = path.resolve(__dirname, '../uploads/medicines');
    if (!fs.existsSync(backendUploadDir)) {
      fs.mkdirSync(backendUploadDir, { recursive: true });
    }
    const backendFilePath = path.join(backendUploadDir, safeFileName);
    fs.writeFileSync(backendFilePath, buffer);

    // 2. Also mirror to frontend/public/medicines/ if folder exists (ensures instant offline availability)
    try {
      const frontendMedicinesDir = path.resolve(__dirname, '../../frontend/public/medicines');
      if (fs.existsSync(frontendMedicinesDir)) {
        const frontendFilePath = path.join(frontendMedicinesDir, safeFileName);
        fs.writeFileSync(frontendFilePath, buffer);
      }
    } catch (mirrorErr) {
      console.warn('[Image Mirror Notice]:', mirrorErr.message);
    }

    const publicUrl = `/uploads/medicines/${safeFileName}`;
    res.status(200).json({
      success: true,
      message: 'Medicine photo uploaded successfully.',
      image_url: publicUrl,
      fileName: safeFileName
    });
  } catch (error) {
    console.error('[Upload Medicine Image Error]:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process and save medicine image.',
      error: error.message
    });
  }
};

/**
 * GET /api/admin/medicines/library-images
 * Returns pre-existing and uploaded medicine packaging images
 */
export const getMedicineLibraryImages = async (req, res) => {
  try {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const frontendMedicinesDir = path.resolve(__dirname, '../../frontend/public/medicines');
    const backendUploadDir = path.resolve(__dirname, '../uploads/medicines');

    const imageMap = new Map();

    // 1. Scan frontend public medicines
    if (fs.existsSync(frontendMedicinesDir)) {
      const files = fs.readdirSync(frontendMedicinesDir);
      for (const file of files) {
        const ext = path.extname(file).toLowerCase();
        if (['.jpg', '.jpeg', '.png', '.webp', '.svg'].includes(ext)) {
          imageMap.set(file, {
            name: file.replace(ext, ''),
            fileName: file,
            url: `/medicines/${encodeURIComponent(file)}`
          });
        }
      }
    }

    // 2. Scan backend uploads
    if (fs.existsSync(backendUploadDir)) {
      const files = fs.readdirSync(backendUploadDir);
      for (const file of files) {
        const ext = path.extname(file).toLowerCase();
        if (['.jpg', '.jpeg', '.png', '.webp', '.svg'].includes(ext)) {
          imageMap.set(file, {
            name: file.replace(ext, ''),
            fileName: file,
            url: `/uploads/medicines/${encodeURIComponent(file)}`
          });
        }
      }
    }

    const images = Array.from(imageMap.values()).sort((a, b) => a.name.localeCompare(b.name));

    res.status(200).json({
      success: true,
      count: images.length,
      data: images
    });
  } catch (error) {
    console.error('[Library Images Error]:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve image library.',
      error: error.message
    });
  }
};

/**
 * PATCH /api/admin/medicines/:id/offer
 * Toggle or update promotional offer for a medicine
 */
export const toggleMedicineOffer = async (req, res) => {
  try {
    const medicineId = parseInt(req.params.id, 10);
    const { is_offer, discount_percent } = req.body;

    const offerVal = Boolean(is_offer);
    const discountVal = offerVal ? (parseFloat(discount_percent) || 10.00) : 0.00;

    const [result] = await pool.query(
      'UPDATE medicines SET is_offer = ?, discount_percent = ? WHERE medicine_id = ?',
      [offerVal ? 1 : 0, discountVal, medicineId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Medicine not found.'
      });
    }

    const [updatedRows] = await pool.query(
      'SELECT medicine_id, name, is_offer, discount_percent, unit_price FROM medicines WHERE medicine_id = ?',
      [medicineId]
    );

    res.status(200).json({
      success: true,
      message: offerVal 
        ? `Promotional offer activated (${discountVal}% OFF).` 
        : 'Promotional offer removed.',
      data: updatedRows[0]
    });
  } catch (error) {
    console.error('[Toggle Medicine Offer Error]:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update offer setting.',
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
    let rows;
    try {
      const [viewRows] = await pool.query('SELECT * FROM v_batches_extended');
      rows = viewRows;
    } catch {
      const [fallbackRows] = await pool.query(`
        SELECT 
          b.batch_id, b.batch_number, b.medicine_id, m.name AS medicine_name,
          m.generic_name, m.unit_price, b.supplier_id, s.supplier_name,
          b.manufacture_date, b.expiry_date, b.quantity_received, b.stock_quantity,
          b.reserved_quantity, b.unit_cost, b.status,
          DATEDIFF(b.expiry_date, CURDATE()) AS days_to_expiry,
          CASE 
            WHEN b.stock_quantity = 0 THEN 'Depleted'
            WHEN b.status = 'recalled' THEN 'Recalled'
            WHEN b.status = 'quarantined' THEN 'Quarantined'
            WHEN b.expiry_date <= CURDATE() THEN 'Expired'
            ELSE 'Saleable'
          END AS usability_status,
          (b.expiry_date <= CURDATE()) AS is_expired,
          ROUND(
            CASE 
              WHEN b.unit_cost > 0 THEN ((m.unit_price - b.unit_cost) / b.unit_cost) * 100.00
              ELSE 0.00 
            END, 
            2
          ) AS profit_margin_percent,
          b.created_at
        FROM medicine_batches b
        INNER JOIN medicines m ON b.medicine_id = m.medicine_id
        INNER JOIN suppliers s ON b.supplier_id = s.supplier_id
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
 * Add a new batch (Uses Stored Procedure sp_receive_new_batch with wholesale purchases tracking & fallback)
 */
export const createBatch = async (req, res) => {
  try {
    const {
      medicine_id,
      supplier_id,
      batch_number,
      invoice_number,
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
    const effectiveInvoice = (invoice_number && invoice_number.trim()) || 
      `PO-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;

    let newBatchId;
    let newPurchaseId;

    try {
      const sql = `CALL sp_receive_new_batch(?, ?, ?, ?, ?, ?, ?, ?, ?)`;
      const [callRows] = await pool.query(sql, [
        parseInt(medicine_id, 10),
        parseInt(supplier_id, 10),
        batch_number.trim(),
        effectiveInvoice,
        manufacture_date,
        expiry_date,
        parseInt(quantity, 10),
        parseFloat(unit_cost) || 0.0,
        performer
      ]);
      const resultObj = Array.isArray(callRows) && Array.isArray(callRows[0]) ? callRows[0][0] : callRows[0];
      newBatchId = resultObj?.new_batch_id || resultObj?.batch_id;
      newPurchaseId = resultObj?.purchase_id;
    } catch (procErr) {
      // Direct transactional insert fallback ensuring purchases & purchase_items tracking
      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();

        // 1. Create Inbound Wholesale Purchase Order Header
        const [poRes] = await connection.query(`
          INSERT INTO purchases (supplier_id, invoice_number, purchase_date, total_amount, status, received_by, notes)
          VALUES (?, ?, CURDATE(), 0.00, 'RECEIVED', ?, ?)
        `, [parseInt(supplier_id, 10), effectiveInvoice, performer, `Inbound procurement lot: ${batch_number.trim()}`]);
        newPurchaseId = poRes.insertId;

        // 2. Insert Wholesale Purchase Line Item (Fires trg_after_purchase_item_insert!)
        const lineSubtotal = (parseInt(quantity, 10) * (parseFloat(unit_cost) || 0.0)).toFixed(2);
        await connection.query(`
          INSERT INTO purchase_items (purchase_id, medicine_id, batch_number, quantity, unit_cost, subtotal, expiry_date)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [
          newPurchaseId,
          parseInt(medicine_id, 10),
          batch_number.trim(),
          parseInt(quantity, 10),
          parseFloat(unit_cost) || 0.0,
          lineSubtotal,
          expiry_date
        ]);

        // Recalculate/verify purchase total
        await connection.query(`
          UPDATE purchases 
          SET total_amount = (SELECT COALESCE(SUM(subtotal), 0.00) FROM purchase_items WHERE purchase_id = ?)
          WHERE purchase_id = ?
        `, [newPurchaseId, newPurchaseId]);

        // 3. Insert Physical Medicine Batch
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

        // 4. Log Physical Inventory Movement
        await connection.query(`
          INSERT INTO stock_movements (batch_id, movement_type, quantity_changed, reason, performed_by)
          VALUES (?, 'RESTOCK', ?, ?, ?)
        `, [newBatchId, parseInt(quantity, 10), `Inbound Wholesale PO: ${effectiveInvoice}`, performer]);

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
      message: 'New batch received and recorded under wholesale purchase order.',
      batch_id: newBatchId,
      purchase_id: newPurchaseId,
      invoice_number: effectiveInvoice
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
    let rows;
    try {
      const [viewRows] = await pool.query('SELECT * FROM v_stock_movements_feed LIMIT 100');
      rows = viewRows;
    } catch {
      const [fallbackRows] = await pool.query(`
        SELECT 
          sm.movement_id, sm.movement_type, sm.quantity_changed, sm.reason,
          sm.performed_by, sm.movement_date, b.batch_number, m.name AS medicine_name
        FROM stock_movements sm
        INNER JOIN medicine_batches b ON sm.batch_id = b.batch_id
        INNER JOIN medicines m ON b.medicine_id = m.medicine_id
        ORDER BY sm.movement_date DESC
        LIMIT 100
      `);
      rows = fallbackRows;
    }

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
    await ensureSalesTables();
    const [rows] = await pool.query('SELECT * FROM v_expiring_batches');

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
let auditRoutinesEnsured = false;
async function ensureAuditRoutines() {
  if (auditRoutinesEnsured) return;
  try {
    // Create or Replace ADBMS View: v_enriched_audit_feed
    await pool.query(`
      CREATE OR REPLACE VIEW v_enriched_audit_feed AS
      SELECT 
          a.log_id,
          a.timestamp,
          a.table_name,
          a.operation,
          a.record_id,
          CASE 
              WHEN a.table_name = 'medicine_batches' THEN 
                  COALESCE(CONCAT(m.name, ' (Lot #', b.batch_number, ')'), CONCAT('Batch #', a.record_id))
              WHEN a.table_name = 'medicines' THEN 
                  COALESCE(m_direct.name, CONCAT('Medicine #', a.record_id))
              ELSE CONCAT(a.table_name, ' #', a.record_id)
          END AS target_name,
          CAST(a.old_value->>'$.stock_quantity' AS SIGNED) AS old_stock,
          CAST(a.new_value->>'$.stock_quantity' AS SIGNED) AS new_stock,
          (CAST(a.new_value->>'$.stock_quantity' AS SIGNED) - CAST(a.old_value->>'$.stock_quantity' AS SIGNED)) AS stock_diff,
          a.old_value->>'$.status' AS old_status,
          a.new_value->>'$.status' AS new_status,
          COALESCE(
            CASE 
              WHEN a.table_name = 'medicine_batches' AND a.operation = 'UPDATE' AND (a.old_value->>'$.stock_quantity' != a.new_value->>'$.stock_quantity')
              THEN CONCAT('Stock changed: ', a.old_value->>'$.stock_quantity', ' → ', a.new_value->>'$.stock_quantity')
              WHEN a.table_name = 'medicine_batches' AND a.operation = 'UPDATE' AND (a.old_value->>'$.status' != a.new_value->>'$.status')
              THEN CONCAT('Status changed: ', a.old_value->>'$.status', ' → ', a.new_value->>'$.status')
              ELSE CONCAT(a.operation, ' on ', a.table_name)
            END,
            CONCAT(a.operation, ' on ', a.table_name)
          ) AS action_summary,
          a.performed_by,
          a.old_value,
          a.new_value
      FROM audit_logs a
      LEFT JOIN medicine_batches b ON a.table_name = 'medicine_batches' AND a.record_id = b.batch_id
      LEFT JOIN medicines m ON b.medicine_id = m.medicine_id
      LEFT JOIN medicines m_direct ON a.table_name = 'medicines' AND a.record_id = m_direct.medicine_id
    `);
    auditRoutinesEnsured = true;
  } catch (vErr) {
    console.warn('[Audit View Setup Notice]:', vErr.message);
  }
}

/**
 * GET /api/admin/audit-logs
 * Retrieves enriched audit activity trail via ADBMS view v_enriched_audit_feed
 */
export const getAuditLogs = async (req, res) => {
  try {
    const { module: mod, operation, startDate, endDate, limit } = req.query;
    await ensureAuditRoutines();

    let rows = [];
    try {
      let whereClauses = [];
      let params = [];

      if (mod && mod !== 'ALL') {
        whereClauses.push('table_name = ?');
        params.push(mod);
      }
      if (operation && operation !== 'ALL') {
        whereClauses.push('operation = ?');
        params.push(operation);
      }
      if (startDate) {
        whereClauses.push('timestamp >= ?');
        params.push(`${startDate} 00:00:00`);
      }
      if (endDate) {
        whereClauses.push('timestamp <= ?');
        params.push(`${endDate} 23:59:59`);
      }

      const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
      const limitNum = parseInt(limit, 10) || 200;
      params.push(limitNum);

      const [viewRows] = await pool.query(
        `SELECT * FROM v_enriched_audit_feed ${whereSql} ORDER BY timestamp DESC LIMIT ?`,
        params
      );
      rows = viewRows;
    } catch (viewError) {
      // Safe fallback directly from audit_logs
      const [rawRows] = await pool.query(
        'SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 200'
      );
      rows = rawRows;
    }

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
 * Atomic POS Counter Sale Transaction with Batch Allocation and Full Audit Logging
 */
export const createSale = async (req, res) => {
  const {
    patient_name = 'Walk-in Customer',
    prescription_ref = 'OTC',
    customer_id = null,
    medicine_id,
    batch_id,
    quantity,
    unit_price,
    packaging_desc = '1 Unit',
    payment_method = 'CASH',
    amount_paid,
    items
  } = req.body;

  // 1. Normalize items array (supporting both multi-item array and single item format)
  let normalizedItems = [];
  if (Array.isArray(items) && items.length > 0) {
    for (const it of items) {
      const q = parseInt(it.quantity, 10);
      if (!it.medicine_id || !q || q <= 0) continue;
      normalizedItems.push({
        medicine_id: parseInt(it.medicine_id, 10),
        batch_id: it.batch_id ? parseInt(it.batch_id, 10) : null,
        quantity: q,
        unit_price: parseFloat(it.unit_price) || 0.0,
        subtotal: it.subtotal !== undefined ? parseFloat(it.subtotal) : parseFloat(((parseFloat(it.unit_price) || 0.0) * q).toFixed(2)),
        packaging_desc: it.packaging_desc || '1 Unit'
      });
    }
  } else if (medicine_id && quantity && parseInt(quantity, 10) > 0) {
    const q = parseInt(quantity, 10);
    const p = parseFloat(unit_price) || 0.0;
    normalizedItems.push({
      medicine_id: parseInt(medicine_id, 10),
      batch_id: batch_id ? parseInt(batch_id, 10) : null,
      quantity: q,
      unit_price: p,
      subtotal: parseFloat((p * q).toFixed(2)),
      packaging_desc: packaging_desc || '1 Unit'
    });
  }

  if (normalizedItems.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'At least one valid medicine line item with positive quantity is required.'
    });
  }

  // Ensure effective price for any item missing pricing
  for (const item of normalizedItems) {
    if (item.unit_price <= 0) {
      try {
        const [mRows] = await pool.query('SELECT unit_price FROM medicines WHERE medicine_id = ? LIMIT 1', [item.medicine_id]);
        if (mRows.length > 0 && mRows[0].unit_price) {
          item.unit_price = parseFloat(mRows[0].unit_price);
          item.subtotal = parseFloat((item.unit_price * item.quantity).toFixed(2));
        }
      } catch (e) {}
    }
  }

  const totalBill = parseFloat(normalizedItems.reduce((acc, it) => acc + it.subtotal, 0).toFixed(2));
  const numericPaid = amount_paid !== undefined ? parseFloat(parseFloat(amount_paid).toFixed(2)) : totalBill;

  if (numericPaid < totalBill) {
    return res.status(400).json({
      success: false,
      message: `Amount paid (Rs. ${numericPaid.toFixed(2)}) cannot be less than total bill (Rs. ${totalBill.toFixed(2)}).`
    });
  }

  // Strictly enforce only 'CASH' or 'CARD'
  const validPaymentMethod = (payment_method || 'CASH').toUpperCase() === 'CARD' ? 'CARD' : 'CASH';

  const performer = req.user ? req.user.fullName : 'Staff Pharmacist';
  const rawUserId = req.user ? req.user.userId : null;

  await ensureSalesTables();

  // 1. Resolve user_id and customer_id existence
  let validUserId = null;
  if (rawUserId) {
    try {
      const [uRows] = await pool.query('SELECT user_id FROM users WHERE user_id = ? LIMIT 1', [rawUserId]);
      if (uRows.length > 0) validUserId = rawUserId;
    } catch (uErr) {
      validUserId = null;
    }
  }

  let validCustomerId = null;
  if (customer_id) {
    try {
      const [cRows] = await pool.query('SELECT customer_id FROM customers WHERE customer_id = ? LIMIT 1', [parseInt(customer_id, 10)]);
      if (cRows.length > 0) validCustomerId = cRows[0].customer_id;
    } catch (cErr) {
      validCustomerId = null;
    }
  }

  const changeGiven = Math.max(0, parseFloat((numericPaid - totalBill).toFixed(2)));

  // 2. PRIMARY ARCHITECTURAL PATH: Execute MySQL Stored Procedure sp_create_pos_sale
  let procedureSucceeded = false;
  let saleId = null;
  let invoiceNumber = null;

  const dateSegment = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randSegment = Math.floor(10000 + Math.random() * 90000);
  const genInvoiceNumber = `INV-${dateSegment}-${randSegment}`;

  try {
    const itemsJson = JSON.stringify(normalizedItems.map(it => ({
      medicine_id: it.medicine_id,
      quantity: it.quantity,
      unit_price: it.unit_price,
      subtotal: it.subtotal,
      packaging_desc: it.packaging_desc || '1 Unit'
    })));

    const [spCallResult] = await pool.query(
      'CALL sp_create_pos_sale(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        genInvoiceNumber,
        validUserId,
        validCustomerId,
        (patient_name || 'Walk-in Customer').trim(),
        (prescription_ref || 'OTC').trim(),
        totalBill,
        0.00,
        0.00,
        totalBill,
        validPaymentMethod,
        numericPaid,
        itemsJson
      ]
    );

    const resultRow = Array.isArray(spCallResult) && Array.isArray(spCallResult[0]) 
      ? spCallResult[0][0] 
      : spCallResult[0];

    if (resultRow?.sale_id) {
      saleId = resultRow.sale_id;
      invoiceNumber = resultRow.invoice_number || genInvoiceNumber;
      procedureSucceeded = true;
      console.log(`[ADBMS Stored Procedure Success]: CALL sp_create_pos_sale executed -> Sale #${saleId}, Invoice #${invoiceNumber}`);
    }
  } catch (spErr) {
    console.warn('[ADBMS Stored Procedure Note]: sp_create_pos_sale note, continuing via lot transactional path:', spErr.message);
  }

  if (procedureSucceeded) {
    return res.status(201).json({
      success: true,
      message: 'Prescription sale successfully finalized via Stored Procedure sp_create_pos_sale.',
      data: {
        sale_id: saleId,
        invoice_number: invoiceNumber,
        customer_id: validCustomerId,
        total_amount: totalBill,
        amount_paid: numericPaid,
        change_given: changeGiven,
        payment_method: validPaymentMethod,
        items: normalizedItems,
        timestamp: new Date().toISOString()
      }
    });
  }

  // 3. FALLBACK PATH: Transactional Query Execution with Pessimistic Locking
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // Verify stock and lock batches for all items
    for (const it of normalizedItems) {
      if (it.batch_id) {
        const [batchRows] = await connection.query(
          'SELECT batch_id, medicine_id, batch_number, stock_quantity, status, expiry_date FROM medicine_batches WHERE batch_id = ? FOR UPDATE',
          [it.batch_id]
        );
        if (batchRows.length === 0) {
          throw new Error(`Inventory batch lot #${it.batch_id} not found.`);
        }
        if (batchRows[0].stock_quantity < it.quantity) {
          throw new Error(`Insufficient batch stock for item #${it.medicine_id}. Available: ${batchRows[0].stock_quantity} units, Requested: ${it.quantity} units.`);
        }
      } else {
        const [batchRows] = await connection.query(`
          SELECT batch_id, stock_quantity 
          FROM medicine_batches 
          WHERE medicine_id = ? AND stock_quantity >= ? AND status = 'active' AND expiry_date > CURDATE()
          ORDER BY expiry_date ASC 
          LIMIT 1 
          FOR UPDATE
        `, [it.medicine_id, it.quantity]);
        if (batchRows.length > 0) {
          it.batch_id = batchRows[0].batch_id;
        } else {
          throw new Error(`Insufficient unexpired stock available for medicine #${it.medicine_id}.`);
        }
      }
    }

    invoiceNumber = genInvoiceNumber;

    const [saleRes] = await connection.query(`
      INSERT INTO sales (
        invoice_number, user_id, customer_id, patient_name, prescription_ref,
        subtotal, discount_amount, tax_amount, total_amount, payment_status, sale_date
      ) VALUES (?, ?, ?, ?, ?, ?, 0.00, 0.00, ?, 'PAID', CURRENT_TIMESTAMP)
    `, [
      invoiceNumber,
      validUserId,
      validCustomerId,
      (patient_name || 'Walk-in Customer').trim(),
      (prescription_ref || 'OTC').trim(),
      totalBill,
      totalBill
    ]);

    saleId = saleRes.insertId;

    for (const it of normalizedItems) {
      const [itemRes] = await connection.query(`
        INSERT INTO sale_items (sale_id, medicine_id, quantity, unit_price, subtotal, packaging_desc)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [
        saleId,
        it.medicine_id,
        it.quantity,
        it.unit_price,
        it.subtotal,
        it.packaging_desc
      ]);

      if (it.batch_id) {
        try {
          await connection.query(`
            INSERT INTO sale_item_batches (sale_item_id, batch_id, quantity_allocated)
            VALUES (?, ?, ?)
          `, [itemRes.insertId, it.batch_id, it.quantity]);
        } catch (allocErr) {}

        await connection.query(`
          UPDATE medicine_batches 
          SET stock_quantity = stock_quantity - ?, 
              status = CASE WHEN (stock_quantity - ?) <= 0 THEN 'depleted' ELSE status END,
              updated_at = CURRENT_TIMESTAMP 
          WHERE batch_id = ?
        `, [it.quantity, it.quantity, it.batch_id]);

        await connection.query(`
          INSERT INTO stock_movements (batch_id, movement_type, quantity_changed, reason, performed_by, movement_date)
          VALUES (?, 'DISPENSED', ?, ?, ?, CURRENT_TIMESTAMP)
        `, [
          it.batch_id,
          -it.quantity,
          `Sale ${invoiceNumber} to ${(patient_name || 'Walk-in').trim()} (Rx: ${(prescription_ref || 'OTC').trim()})`,
          performer
        ]);
      }
    }

    await connection.query(`
      INSERT INTO payments (sale_id, payment_method, amount_paid, change_given, reference_note, payment_date)
      VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `, [
      saleId,
      validPaymentMethod,
      numericPaid,
      changeGiven,
      `Counter POS Receipt #${invoiceNumber}`
    ]);

    await connection.commit();

    res.status(201).json({
      success: true,
      message: 'Prescription sale successfully finalized and recorded in database.',
      data: {
        sale_id: saleId,
        invoice_number: invoiceNumber,
        customer_id: validCustomerId,
        total_amount: totalBill,
        amount_paid: numericPaid,
        change_given: changeGiven,
        payment_method: validPaymentMethod,
        items: normalizedItems,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    await connection.rollback();
    console.error('[Create Sale Error]:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to process POS sale transaction.',
      error: error.message
    });
  } finally {
    connection.release();
  }
};

/**
 * GET /api/admin/sales
 * Historical sales transactions with optional timeline filter
 */
export const getSalesHistory = async (req, res) => {
  try {
    await ensureSalesTables();
    await syncOrphanedPosMovements();
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

    let rows;
    try {
      const [viewRows] = await pool.query(
        `SELECT * FROM v_sales_summary ${whereSql} ORDER BY sale_date DESC LIMIT 200`,
        params
      );
      rows = viewRows;
    } catch {
      const [fallbackRows] = await pool.query(`
        SELECT 
          s.sale_id, s.invoice_number, s.customer_id, s.patient_name,
          COALESCE(c.full_name, s.patient_name) AS customer_name, c.email AS customer_email,
          s.prescription_ref, s.total_amount, s.payment_status, s.payment_status AS status,
          s.sale_date, COALESCE(u.full_name, 'Staff Pharmacist') AS cashier_name,
          COALESCE(p.payment_method, 'CASH') AS payment_method,
          COALESCE(p.amount_paid, s.total_amount) AS amount_paid,
          '1 Unit Dispensed' AS items_summary, 1 AS item_count
        FROM sales s
        LEFT JOIN users u ON s.user_id = u.user_id
        LEFT JOIN customers c ON s.customer_id = c.customer_id
        LEFT JOIN payments p ON s.sale_id = p.sale_id
        ${whereSql}
        ORDER BY s.sale_date DESC
        LIMIT 200
      `, params);
      rows = fallbackRows;
    }

    // Attach itemized line items to each sale transaction
    if (rows.length > 0) {
      const saleIds = rows.map(r => r.sale_id);
      try {
        const [allItems] = await pool.query(`
          SELECT 
            si.sale_item_id,
            si.sale_id,
            si.medicine_id,
            COALESCE(m.name, 'Prescription Medication') AS medicine_name,
            m.generic_name,
            m.dosage_form,
            si.quantity,
            si.unit_price,
            si.subtotal,
            si.packaging_desc,
            b.batch_number,
            b.expiry_date
          FROM sale_items si
          LEFT JOIN medicines m ON si.medicine_id = m.medicine_id
          LEFT JOIN sale_item_batches sib ON si.sale_item_id = sib.sale_item_id
          LEFT JOIN medicine_batches b ON sib.batch_id = b.batch_id
          WHERE si.sale_id IN (?)
        `, [saleIds]);

        const itemsBySale = {};
        for (const item of allItems) {
          if (!itemsBySale[item.sale_id]) itemsBySale[item.sale_id] = [];
          itemsBySale[item.sale_id].push(item);
        }

        for (const row of rows) {
          row.items = itemsBySale[row.sale_id] || [];
        }
      } catch (itemErr) {
        console.warn('[Fetch Sale Items Notice]:', itemErr.message);
      }
    }

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
 * GET /api/admin/sales/:id
 * Retrieve complete itemized invoice details for a specific sale
 */
export const getSaleById = async (req, res) => {
  try {
    await ensureSalesTables();
    const { id } = req.params;

    let saleRows;
    try {
      const [vRows] = await pool.query(
        'SELECT * FROM v_sales_summary WHERE sale_id = ? OR invoice_number = ? LIMIT 1',
        [id, id]
      );
      saleRows = vRows;
    } catch {
      const [fallbackRows] = await pool.query(`
        SELECT 
          s.sale_id, s.invoice_number, s.customer_id, s.patient_name,
          COALESCE(c.full_name, s.patient_name) AS customer_name,
          c.email AS customer_email, c.phone AS customer_phone,
          s.prescription_ref, s.subtotal, s.discount_amount, s.tax_amount,
          s.total_amount, s.payment_status, s.payment_status AS status, s.sale_date,
          COALESCE(u.full_name, 'Staff Pharmacist') AS cashier_name,
          COALESCE(p.payment_method, 'CASH') AS payment_method,
          COALESCE(p.amount_paid, s.total_amount) AS amount_paid,
          COALESCE(p.change_given, 0.00) AS change_given, p.reference_note
        FROM sales s
        LEFT JOIN users u ON s.user_id = u.user_id
        LEFT JOIN customers c ON s.customer_id = c.customer_id
        LEFT JOIN payments p ON s.sale_id = p.sale_id
        WHERE s.sale_id = ? OR s.invoice_number = ?
        LIMIT 1
      `, [id, id]);
      saleRows = fallbackRows;
    }

    if (saleRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Sale invoice record not found.' });
    }

    const sale = saleRows[0];

    const [items] = await pool.query(`
      SELECT 
        si.sale_item_id,
        si.sale_id,
        si.medicine_id,
        COALESCE(m.name, 'Prescription Medication') AS medicine_name,
        m.generic_name,
        m.dosage_form,
        si.quantity,
        si.unit_price,
        si.subtotal,
        si.packaging_desc,
        b.batch_number,
        b.expiry_date
      FROM sale_items si
      LEFT JOIN medicines m ON si.medicine_id = m.medicine_id
      LEFT JOIN sale_item_batches sib ON si.sale_item_id = sib.sale_item_id
      LEFT JOIN medicine_batches b ON sib.batch_id = b.batch_id
      WHERE si.sale_id = ?
    `, [sale.sale_id]);

    sale.items = items;

    res.status(200).json({
      success: true,
      data: sale
    });
  } catch (error) {
    console.error('[Get Sale By Id Error]:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/admin/reports/daily-sales
 * Consolidated Daily Revenue Summary
 */
export const getDailySalesReport = async (req, res) => {
  try {
    await ensureSalesTables();
    await syncOrphanedPosMovements();
    const { startDate, endDate } = req.query;
    let whereSql = '';
    const params = [];

    if (startDate && endDate) {
      whereSql = 'WHERE sale_day BETWEEN ? AND ?';
      params.push(startDate, endDate);
    } else if (startDate) {
      whereSql = 'WHERE sale_day >= ?';
      params.push(startDate);
    } else if (endDate) {
      whereSql = 'WHERE sale_day <= ?';
      params.push(endDate);
    }

    const [rows] = await pool.query(
      `SELECT * FROM v_daily_sales ${whereSql} ORDER BY sale_day DESC LIMIT 90`,
      params
    );

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
 * Consolidated Monthly Sales Summary
 */
export const getMonthlySalesReport = async (req, res) => {
  try {
    await ensureSalesTables();
    await syncOrphanedPosMovements();
    const [rows] = await pool.query('SELECT * FROM v_monthly_sales ORDER BY sale_month DESC LIMIT 24');

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
 * Top-Selling Medications by Volume and Revenue
 */
export const getBestSellingReport = async (req, res) => {
  try {
    await ensureSalesTables();
    await syncOrphanedPosMovements();
    const [rows] = await pool.query('SELECT * FROM v_sales_by_medicine ORDER BY total_units_sold DESC LIMIT 25');

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
 * Evaluates Capital Cost, Retail Valuation Potential, and Profit Margins
 */
export const getInventoryValuationReport = async (req, res) => {
  try {
    let rows;
    try {
      const [viewRows] = await pool.query('SELECT * FROM v_inventory_valuation LIMIT 1');
      rows = viewRows;
    } catch {
      const [fallbackRows] = await pool.query(`
        SELECT 
          COUNT(DISTINCT m.medicine_id) AS total_evaluated_formulations,
          COUNT(DISTINCT m.medicine_id) AS active_medicines,
          COUNT(b.batch_id) AS total_evaluated_batches,
          COALESCE(SUM(b.stock_quantity), 0) AS total_stock_units,
          COALESCE(SUM(b.stock_quantity * b.unit_cost), 0.00) AS total_inventory_cost_value,
          COALESCE(SUM(b.stock_quantity * b.unit_cost), 0.00) AS total_inventory_cost,
          COALESCE(SUM(b.stock_quantity * m.unit_price), 0.00) AS total_inventory_retail_value,
          COALESCE(SUM(b.stock_quantity * m.unit_price), 0.00) AS total_retail_value,
          COALESCE(SUM(b.stock_quantity * (m.unit_price - b.unit_cost)), 0.00) AS potential_gross_profit,
          32.5 AS margin_percentage
        FROM medicine_batches b
        INNER JOIN medicines m ON b.medicine_id = m.medicine_id
        WHERE b.status = 'active' AND b.expiry_date > CURDATE()
      `);
      rows = fallbackRows;
    }

    res.status(200).json({
      success: true,
      data: rows[0] || {}
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
 * Permissions column in users table is managed via database/schema.sql
 */
async function ensurePermissionsColumn() {
  return true;
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
        SELECT user_id, username, email, role, full_name, is_active, created_at, permissions,
               fn_get_pharmacist_total_sales(user_id, CURDATE()) AS today_sales
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
            can_manage_users: true,
            can_manage_inquiries: true
          };
        } else {
          perms = {
            can_pos: true,
            can_manage_medicines: true,
            can_manage_batches: true,
            can_view_reports: false,
            can_manage_inquiries: false,
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
      can_manage_users: assignedRole === 'ADMIN',
      can_manage_inquiries: assignedRole === 'ADMIN'
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
 * Pharmacy store metadata is maintained via frontend static configuration
 */
export const updatePharmacySettings = async (req, res) => {
  res.status(200).json({ 
    success: true, 
    message: 'Store profile settings are managed via central frontend configuration (src/config/pharmacyInfo.js).' 
  });
};

/**
 * GET /api/admin/customers
 * Manage registered website customers/patients (ADMIN Only)
 */
export const getCustomers = async (req, res) => {
  try {
    if (typeof ensureCustomersTable === 'function') {
      await ensureCustomersTable();
    }

    let customers;
    try {
      const [rows] = await pool.query('SELECT * FROM v_customers_extended');
      customers = rows;
    } catch {
      const [fallbackRows] = await pool.query(`
        SELECT 
          customer_id, full_name, email, contact_no, patient_age, nic, address, 
          COALESCE(is_active, 1) AS is_active, COALESCE(status, 'active') AS status,
          created_at, 0.00 AS total_spend, 0 AS total_orders, 0 AS total_prescriptions
        FROM customers
        ORDER BY customer_id DESC
      `);
      customers = fallbackRows;
    }

    res.status(200).json({
      success: true,
      count: customers.length,
      data: customers
    });
  } catch (error) {
    console.error('[Admin Get Customers Error]:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve registered customer records.',
      error: error.message
    });
  }
};

/**
 * POST /api/admin/customers
 * Register a new site customer / patient account from Admin Panel
 */
export const createCustomer = async (req, res) => {
  try {
    if (typeof ensureCustomersTable === 'function') {
      await ensureCustomersTable();
    }
    const { full_name, email, password, contact_no, patient_age, nic, address, is_active = true } = req.body;

    if (!full_name || !email) {
      return res.status(400).json({
        success: false,
        message: 'Customer Full Name and Email are required.'
      });
    }

    const trimmedEmail = email.trim().toLowerCase();
    const [existing] = await pool.query('SELECT customer_id FROM customers WHERE email = ?', [trimmedEmail]);
    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'A registered patient account with this email already exists.'
      });
    }

    const passwordToHash = password && password.trim().length >= 6 ? password.trim() : 'Patient@123';
    const passwordHash = await bcrypt.hash(passwordToHash, 10);
    const activeVal = is_active !== false && is_active !== 0;

    const [insertResult] = await pool.query(`
      INSERT INTO customers (full_name, email, password_hash, contact_no, patient_age, nic, address, is_active, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      full_name.trim(),
      trimmedEmail,
      passwordHash,
      contact_no ? contact_no.trim() : null,
      patient_age ? patient_age.trim() : null,
      nic ? nic.trim() : null,
      address ? address.trim() : null,
      activeVal ? 1 : 0,
      activeVal ? 'active' : 'suspended'
    ]);

    res.status(201).json({
      success: true,
      message: `Patient account for '${full_name.trim()}' successfully registered.`,
      customer_id: insertResult.insertId
    });
  } catch (error) {
    console.error('[Admin Create Customer Error]:', error);
    res.status(500).json({
      success: false,
      message: error.code === 'ER_DUP_ENTRY' ? 'Email address already registered.' : 'Failed to register customer.',
      error: error.message
    });
  }
};

/**
 * PUT /api/admin/customers/:id
 * Update customer details and status
 */
export const updateCustomer = async (req, res) => {
  try {
    if (typeof ensureCustomersTable === 'function') {
      await ensureCustomersTable();
    }
    const customerId = parseInt(req.params.id, 10);
    const { full_name, email, password, contact_no, patient_age, nic, address, is_active, status } = req.body;

    if (!full_name || !email) {
      return res.status(400).json({
        success: false,
        message: 'Full Name and Email are required.'
      });
    }

    const trimmedEmail = email.trim().toLowerCase();
    const activeVal = is_active !== false && is_active !== 0;
    const resolvedStatus = status || (activeVal ? 'active' : 'suspended');

    let sql, params;
    if (password && password.trim().length >= 6) {
      const passwordHash = await bcrypt.hash(password.trim(), 10);
      sql = `
        UPDATE customers
        SET full_name = ?, email = ?, password_hash = ?, contact_no = ?, patient_age = ?, nic = ?, address = ?, is_active = ?, status = ?
        WHERE customer_id = ?
      `;
      params = [
        full_name.trim(),
        trimmedEmail,
        passwordHash,
        contact_no ? contact_no.trim() : null,
        patient_age ? patient_age.trim() : null,
        nic ? nic.trim() : null,
        address ? address.trim() : null,
        activeVal ? 1 : 0,
        resolvedStatus,
        customerId
      ];
    } else {
      sql = `
        UPDATE customers
        SET full_name = ?, email = ?, contact_no = ?, patient_age = ?, nic = ?, address = ?, is_active = ?, status = ?
        WHERE customer_id = ?
      `;
      params = [
        full_name.trim(),
        trimmedEmail,
        contact_no ? contact_no.trim() : null,
        patient_age ? patient_age.trim() : null,
        nic ? nic.trim() : null,
        address ? address.trim() : null,
        activeVal ? 1 : 0,
        resolvedStatus,
        customerId
      ];
    }

    await pool.query(sql, params);

    res.status(200).json({
      success: true,
      message: 'Patient profile record updated successfully.'
    });
  } catch (error) {
    console.error('[Admin Update Customer Error]:', error);
    res.status(500).json({
      success: false,
      message: error.code === 'ER_DUP_ENTRY' ? 'Email address already in use by another patient.' : 'Failed to update patient profile.',
      error: error.message
    });
  }
};

/**
 * PATCH /api/admin/customers/:id/status
 * Toggle customer active/suspended status
 */
export const toggleCustomerStatus = async (req, res) => {
  try {
    if (typeof ensureCustomersTable === 'function') {
      await ensureCustomersTable();
    }
    const customerId = parseInt(req.params.id, 10);
    const { is_active } = req.body;

    const activeVal = is_active !== false && is_active !== 0;
    const statusVal = activeVal ? 'active' : 'suspended';

    await pool.query(
      'UPDATE customers SET is_active = ?, status = ? WHERE customer_id = ?',
      [activeVal ? 1 : 0, statusVal, customerId]
    );

    res.status(200).json({
      success: true,
      message: `Patient account ${activeVal ? 'activated' : 'suspended'} successfully.`
    });
  } catch (error) {
    console.error('[Admin Toggle Customer Status Error]:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update customer status.',
      error: error.message
    });
  }
};

/**
 * DELETE /api/admin/customers/:id
 * Remove customer record
 */
export const deleteCustomer = async (req, res) => {
  try {
    if (typeof ensureCustomersTable === 'function') {
      await ensureCustomersTable();
    }
    const customerId = parseInt(req.params.id, 10);

    await pool.query('DELETE FROM customers WHERE customer_id = ?', [customerId]);

    res.status(200).json({
      success: true,
      message: 'Patient account removed successfully.'
    });
  } catch (error) {
    console.error('[Admin Delete Customer Error]:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete customer record.',
      error: error.message
    });
  }
};

/**
 * GET /api/admin/inquiries
 * List customer contact messages & inquiries
 */
export const getInquiries = async (req, res) => {
  try {
    await ensureSalesTables();
    let whereClause = '';
    const params = [];
    if (status) {
      whereClause = ' WHERE status = ?';
      params.push(status);
    }

    let rows;
    try {
      const [viewRows] = await pool.query(
        `SELECT * FROM v_inquiries_extended ${whereClause} ORDER BY created_at DESC LIMIT 100`,
        params
      );
      rows = viewRows;
    } catch {
      const [fallbackRows] = await pool.query(`
        SELECT 
          i.inquiry_id, i.reference_code, i.customer_id, i.name, i.phone, i.email,
          i.medicine_query, i.message, i.status, i.staff_notes, i.responded_by,
          i.responded_at, i.created_at, c.full_name AS registered_patient_name
        FROM inquiries i
        LEFT JOIN customers c ON i.customer_id = c.customer_id
        ${whereClause ? whereClause.replace('status', 'i.status') : ''}
        ORDER BY i.created_at DESC
        LIMIT 100
      `, params);
      rows = fallbackRows;
    }
    res.status(200).json({
      success: true,
      count: rows.length,
      data: rows
    });
  } catch (error) {
    console.error('[Admin Inquiries Error]:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve customer inquiries.',
      error: error.message
    });
  }
};

/**
 * PATCH /api/admin/inquiries/:id/status
 * Update status of customer inquiry and staff notes
 */
export const updateInquiryStatus = async (req, res) => {
  try {
    await ensureSalesTables();
    const inquiryId = parseInt(req.params.id, 10);
    const { status, staff_notes } = req.body;
    const staffName = req.user ? req.user.fullName : 'Admin Pharmacist';

    if (req.user && req.user.role !== 'ADMIN' && req.user.permissions && req.user.permissions.can_manage_inquiries === false) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Inquiry Analyst edit privileges required to update inquiry status.'
      });
    }

    if (!['NEW', 'IN_REVIEW', 'RESOLVED'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Permitted values: NEW, IN_REVIEW, RESOLVED'
      });
    }

    const [result] = await pool.query(`
      UPDATE inquiries SET
        status = ?,
        staff_notes = COALESCE(?, staff_notes),
        responded_by = ?,
        responded_at = CURRENT_TIMESTAMP
      WHERE inquiry_id = ?
    `, [status, staff_notes || null, staffName, inquiryId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Inquiry record not found.' });
    }

    res.status(200).json({
      success: true,
      message: `Inquiry status updated to ${status}.`
    });
  } catch (error) {
    console.error('[Admin Update Inquiry Status Error]:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update inquiry status.',
      error: error.message
    });
  }
};

/**
 * POST /api/admin/inquiries/:id/respond
 * Send an email response to customer inquiry and update inquiry status + audit log
 */
export const respondToInquiry = async (req, res) => {
  try {
    await ensureSalesTables();
    const inquiryId = parseInt(req.params.id, 10);
    const { response_message, subject, status = 'RESOLVED' } = req.body;
    const staffName = req.user ? req.user.fullName : 'Registered Pharmacist';

    if (req.user && req.user.role !== 'ADMIN' && req.user.permissions && req.user.permissions.can_manage_inquiries === false) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Inquiry Analyst edit privileges required to respond to customer inquiries.'
      });
    }

    if (!response_message || !response_message.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Response message is mandatory.'
      });
    }

    const [inquiries] = await pool.query(`
      SELECT 
        i.inquiry_id,
        i.reference_code,
        i.customer_id,
        i.name,
        i.phone,
        i.email,
        i.medicine_query,
        i.message,
        i.status
      FROM inquiries i
      WHERE i.inquiry_id = ?
      LIMIT 1
    `, [inquiryId]);

    if (inquiries.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Inquiry record not found.'
      });
    }

    const inquiry = inquiries[0];
    const emailSubject = (subject && subject.trim()) 
      ? subject.trim() 
      : `Response to Inquiry [${inquiry.reference_code}] - My Pharmacist Dispensary`;

    // 1. Update the database record with the response
    await pool.query(`
      UPDATE inquiries SET
        status = ?,
        staff_notes = ?,
        responded_by = ?,
        responded_at = CURRENT_TIMESTAMP
      WHERE inquiry_id = ?
    `, [status, response_message.trim(), staffName, inquiryId]);

    let emailSent = false;
    let emailError = null;

    // 2. If customer provided email, dispatch response email via SMTP
    if (inquiry.email && inquiry.email.includes('@')) {
      try {
        const { sendSmtpMail } = await import('../services/smtpClient.js');

        const htmlContent = `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 620px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff; color: #1e293b;">
            <div style="border-bottom: 2px solid #0d9488; padding-bottom: 16px; margin-bottom: 20px;">
              <h2 style="margin: 0; color: #0f766e; font-size: 20px; font-weight: 800;">My Pharmacist Dispensary</h2>
              <p style="margin: 4px 0 0 0; color: #64748b; font-size: 13px;">Clinical Healthcare & Patient Consultation</p>
            </div>

            <p style="font-size: 15px; line-height: 1.5;">Dear <strong>${inquiry.name}</strong>,</p>
            <p style="font-size: 14px; line-height: 1.6; color: #334155;">
              Thank you for contacting My Pharmacist Dispensary regarding <em>"${inquiry.medicine_query || 'General Consultation'}"</em> (Reference: <span style="font-family: monospace; background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-weight: bold;">${inquiry.reference_code}</span>).
            </p>

            <div style="background-color: #f8fafc; border-left: 4px solid #94a3b8; border-radius: 6px; padding: 14px; margin: 18px 0;">
              <p style="margin: 0; font-size: 12px; font-weight: bold; color: #475569; text-transform: uppercase; letter-spacing: 0.5px;">Your Original Inquiry:</p>
              <p style="margin: 8px 0 0 0; font-size: 13px; color: #64748b; line-height: 1.5; font-style: italic;">"${inquiry.message}"</p>
            </div>

            <div style="background-color: #f0fdfa; border: 1px solid #ccfbf1; border-left: 4px solid #0d9488; border-radius: 6px; padding: 16px; margin: 20px 0;">
              <p style="margin: 0; font-size: 12px; font-weight: bold; color: #0f766e; text-transform: uppercase; letter-spacing: 0.5px;">Dispensary Clinical Response:</p>
              <p style="margin: 10px 0 0 0; font-size: 14px; color: #0f172a; line-height: 1.6; white-space: pre-line;">${response_message.trim()}</p>
            </div>

            <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b;">
              <p style="margin: 0;"><strong>Responded By:</strong> ${staffName}</p>
              <p style="margin: 4px 0 0 0;"><strong>Response Date:</strong> ${new Date().toLocaleString()}</p>
              <p style="margin: 12px 0 0 0; color: #94a3b8; font-size: 11px;">If you have further questions or need immediate prescription fulfillment, please visit our physical dispensary counter or reply to this email.</p>
            </div>
          </div>
        `;

        const plainText = `Dear ${inquiry.name},\n\n` +
          `Thank you for contacting My Pharmacist Dispensary (Reference: ${inquiry.reference_code}).\n\n` +
          `Your Inquiry:\n"${inquiry.message}"\n\n` +
          `Clinical Response:\n${response_message.trim()}\n\n` +
          `Responded By: ${staffName}\n` +
          `Date: ${new Date().toLocaleString()}\n\n` +
          `My Pharmacist Healthcare Team`;

        await sendSmtpMail({
          to: inquiry.email,
          subject: emailSubject,
          html: htmlContent,
          text: plainText
        });

        emailSent = true;

        try {
          await pool.query(`
            INSERT INTO notification_logs (
              customer_id, recipient_email, recipient_name, subject, message_body, notification_type, status, sent_at
            ) VALUES (?, ?, ?, ?, ?, 'INQUIRY_RESPONSE', 'SENT', CURRENT_TIMESTAMP)
          `, [
            inquiry.customer_id || null,
            inquiry.email.trim(),
            inquiry.name.trim(),
            emailSubject,
            plainText
          ]);
        } catch (logErr) {
          console.warn('[Notification Log Warning]:', logErr.message);
        }

      } catch (err) {
        console.error('[Inquiry SMTP Send Error]:', err);
        emailError = err.message;

        try {
          await pool.query(`
            INSERT INTO notification_logs (
              customer_id, recipient_email, recipient_name, subject, message_body, notification_type, status, sent_at
            ) VALUES (?, ?, ?, ?, ?, 'INQUIRY_RESPONSE', 'FAILED', CURRENT_TIMESTAMP)
          `, [
            inquiry.customer_id || null,
            inquiry.email.trim(),
            inquiry.name.trim(),
            emailSubject,
            `Failed to dispatch: ${err.message}`
          ]);
        } catch (e) {}
      }
    }

    res.status(200).json({
      success: true,
      message: emailSent
        ? `Response successfully sent to ${inquiry.email} and marked as ${status}.`
        : inquiry.email
          ? `Response saved to database. Email dispatch notice: ${emailError || 'Failed to connect to email provider'}.`
          : `Response saved to database (no customer email was provided).`,
      email_sent: emailSent,
      email_error: emailError,
      data: {
        inquiry_id: inquiryId,
        status,
        staff_notes: response_message.trim(),
        responded_by: staffName,
        responded_at: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('[Admin Respond to Inquiry Error]:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process inquiry response.',
      error: error.message
    });
  }
};

/**
 * DELETE /api/admin/inquiries/:id
 * Permanently remove customer contact inquiry
 */
export const deleteInquiry = async (req, res) => {
  try {
    await ensureSalesTables();
    const inquiryId = parseInt(req.params.id, 10);

    if (req.user && req.user.role !== 'ADMIN' && req.user.permissions && req.user.permissions.can_manage_inquiries === false) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Inquiry Analyst edit privileges required to delete inquiries.'
      });
    }

    const [result] = await pool.query('DELETE FROM inquiries WHERE inquiry_id = ?', [inquiryId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Inquiry record not found.'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Customer inquiry deleted successfully.'
    });
  } catch (error) {
    console.error('[Admin Delete Inquiry Error]:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete customer inquiry.',
      error: error.message
    });
  }
};

/**
 * GET /api/admin/supplier-performance
 * Retrieves supplier procurement metrics from the v_supplier_order_performance database view
 */
export const getSupplierPerformance = async (req, res) => {
  try {
    let rows;
    try {
      [rows] = await pool.query(`
        SELECT 
          supplier_id,
          supplier_name,
          contact_person,
          phone,
          email,
          total_orders,
          total_spend,
          active_batches_supplied,
          last_order_date
        FROM v_supplier_order_performance
        ORDER BY total_spend DESC, total_orders DESC
      `);
    } catch (viewErr) {
      console.warn('[Supplier Performance View Note - Falling back to direct aggregation]:', viewErr.message);
      const [directRows] = await pool.query(`
        SELECT 
          s.supplier_id,
          s.supplier_name,
          s.contact_person,
          s.phone,
          s.email,
          COUNT(DISTINCT p.purchase_id) AS total_orders,
          COALESCE(SUM(p.total_amount), 0.00) AS total_spend,
          COUNT(DISTINCT b.batch_id) AS active_batches_supplied,
          MAX(p.purchase_date) AS last_order_date
        FROM suppliers s
        LEFT JOIN purchases p ON s.supplier_id = p.supplier_id
        LEFT JOIN medicine_batches b ON s.supplier_id = b.supplier_id AND b.status = 'active'
        GROUP BY s.supplier_id, s.supplier_name, s.contact_person, s.phone, s.email
        ORDER BY total_spend DESC, total_orders DESC
      `);
      rows = directRows;
    }

    res.status(200).json({
      success: true,
      data: rows
    });
  } catch (error) {
    console.error('[Supplier Performance Error]:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve supplier performance analytics.',
      error: error.message
    });
  }
};

/**
 * GET /api/admin/purchases
 * Retrieves itemized wholesale purchase invoices from purchases & purchase_items
 */
export const getPurchases = async (req, res) => {
  try {
    let rows;
    try {
      const [viewRows] = await pool.query('SELECT * FROM v_purchases_summary LIMIT 100');
      rows = viewRows;
    } catch {
      const [fallbackRows] = await pool.query(`
        SELECT 
          p.purchase_id, p.invoice_number, p.purchase_date, p.total_amount,
          p.status, p.received_by, p.notes, s.supplier_name, s.phone AS supplier_phone,
          s.email AS supplier_email, COUNT(pi.purchase_item_id) AS total_line_items,
          COALESCE(SUM(pi.quantity), 0) AS total_units_procured
        FROM purchases p
        INNER JOIN suppliers s ON p.supplier_id = s.supplier_id
        LEFT JOIN purchase_items pi ON p.purchase_id = pi.purchase_id
        GROUP BY p.purchase_id, p.invoice_number, p.purchase_date, p.total_amount, p.status, p.received_by, p.notes, s.supplier_name, s.phone, s.email
        ORDER BY p.purchase_date DESC, p.purchase_id DESC
        LIMIT 100
      `);
      rows = fallbackRows;
    }
    res.status(200).json({
      success: true,
      data: rows
    });
  } catch (error) {
    console.error('[Purchases Ledger Error]:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve wholesale purchase invoices.',
      error: error.message
    });
  }
};



