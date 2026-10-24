import pool from '../config/db.js';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ensureCustomersTable } from './customerController.js';

/**
 * GET /api/admin/dashboard
 * Aggregated Inventory & Operational Metrics
 */
/**
 * Sales, items, batches, payments, stock movements, promotions, reviews, and logs 
 * are all fully managed via database/schema.sql and seed.sql
 */
export const ensureSalesTables = async () => {
  if (salesTablesChecked) return;
  salesTablesChecked = true;
  try {
    // 1. Ensure sales table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS sales (
        sale_id INT AUTO_INCREMENT PRIMARY KEY,
        invoice_number VARCHAR(60) NOT NULL UNIQUE,
        user_id INT NULL,
        patient_name VARCHAR(150) NOT NULL DEFAULT 'Walk-in Customer',
        prescription_ref VARCHAR(100) NOT NULL DEFAULT 'OTC',
        subtotal DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
        discount_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
        tax_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
        total_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
        payment_status ENUM('PAID', 'PARTIAL', 'REFUNDED') NOT NULL DEFAULT 'PAID',
        sale_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_sales_date (sale_date),
        INDEX idx_sales_invoice (invoice_number)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 2. Ensure sale_items table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS sale_items (
        sale_item_id INT AUTO_INCREMENT PRIMARY KEY,
        sale_id INT NOT NULL,
        medicine_id INT NOT NULL,
        quantity INT NOT NULL,
        unit_price DECIMAL(10, 2) NOT NULL,
        subtotal DECIMAL(10, 2) NOT NULL,
        packaging_desc VARCHAR(100) DEFAULT '1 Unit',
        INDEX idx_sale_items_sale (sale_id),
        INDEX idx_sale_items_medicine (medicine_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 3. Ensure sale_item_batches table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS sale_item_batches (
        allocation_id INT AUTO_INCREMENT PRIMARY KEY,
        sale_item_id INT NOT NULL,
        batch_id INT NOT NULL,
        quantity_allocated INT NOT NULL,
        INDEX idx_alloc_sale_item (sale_item_id),
        INDEX idx_alloc_batch (batch_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 4. Ensure payments table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS payments (
        payment_id INT AUTO_INCREMENT PRIMARY KEY,
        sale_id INT NOT NULL,
        payment_method ENUM('CASH', 'CARD', 'ONLINE', 'INSURANCE') NOT NULL DEFAULT 'CASH',
        amount_paid DECIMAL(10, 2) NOT NULL,
        change_given DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
        reference_note VARCHAR(150),
        payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_payments_sale (sale_id),
        INDEX idx_payments_method (payment_method)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 5. Ensure stock_movements table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS stock_movements (
        movement_id INT AUTO_INCREMENT PRIMARY KEY,
        batch_id INT NOT NULL,
        movement_type ENUM('RESTOCK', 'DISPENSED', 'ADJUSTMENT', 'RECALL', 'EXPIRED_DISCARD') NOT NULL,
        quantity_changed INT NOT NULL,
        reason VARCHAR(255),
        performed_by VARCHAR(100) DEFAULT 'System',
        movement_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_movements_batch (batch_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 6. Ensure audit_logs table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        log_id INT AUTO_INCREMENT PRIMARY KEY,
        table_name VARCHAR(50) NOT NULL,
        operation ENUM('INSERT', 'UPDATE', 'DELETE') NOT NULL,
        record_id INT NOT NULL,
        old_value JSON,
        new_value JSON,
        performed_by VARCHAR(100) DEFAULT 'System Trigger',
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_audit_table (table_name)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Ensure customer_id column in sales table for patient foreign key relationship
    try {
      const [colCust] = await pool.query("SHOW COLUMNS FROM sales LIKE 'customer_id'");
      if (colCust.length === 0) {
        await pool.query("ALTER TABLE sales ADD COLUMN customer_id INT NULL");
        console.log('[Admin Service Migration]: Added customer_id foreign key attribute to sales table');
      }
    } catch (migErr) {
      console.warn('[Sales Migration customer_id Notice]:', migErr.message);
    }

    // 7. Ensure promotions table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS promotions (
        promotion_id INT AUTO_INCREMENT PRIMARY KEY,
        code VARCHAR(50) NOT NULL UNIQUE,
        title VARCHAR(150) NOT NULL,
        description TEXT,
        discount_type ENUM('PERCENT', 'FIXED', 'FREE_DELIVERY') NOT NULL DEFAULT 'PERCENT',
        discount_value DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
        min_order_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
        badge VARCHAR(50) DEFAULT 'SPECIAL OFFER',
        category VARCHAR(100) DEFAULT 'General',
        tag VARCHAR(100) DEFAULT 'Active Deal',
        is_active BOOLEAN DEFAULT TRUE,
        valid_from DATE NULL,
        valid_until DATE NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_promotions_code (code)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 8. Ensure customer_reviews table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS customer_reviews (
        review_id INT AUTO_INCREMENT PRIMARY KEY,
        customer_id INT NULL,
        medicine_id INT NULL,
        patient_name VARCHAR(150) NOT NULL,
        role_title VARCHAR(100) DEFAULT 'Verified Patient',
        rating INT NOT NULL,
        comment TEXT NOT NULL,
        category VARCHAR(100) DEFAULT 'General Healthcare',
        is_verified BOOLEAN DEFAULT TRUE,
        helpful_count INT DEFAULT 0,
        is_approved BOOLEAN DEFAULT TRUE,
        avatar_color VARCHAR(100) DEFAULT 'from-blue-600 to-indigo-600',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_reviews_approved (is_approved, created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 9. Ensure inquiries table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS inquiries (
        inquiry_id INT AUTO_INCREMENT PRIMARY KEY,
        reference_code VARCHAR(50) NOT NULL UNIQUE,
        customer_id INT NULL,
        name VARCHAR(150) NOT NULL,
        phone VARCHAR(50),
        email VARCHAR(150),
        medicine_query VARCHAR(200),
        message TEXT NOT NULL,
        status ENUM('NEW', 'IN_REVIEW', 'RESOLVED') NOT NULL DEFAULT 'NEW',
        staff_notes TEXT NULL,
        responded_by VARCHAR(100) NULL,
        responded_at DATETIME NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_inquiries_ref (reference_code),
        INDEX idx_inquiries_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 10. Ensure notification_logs table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS notification_logs (
        notification_id INT AUTO_INCREMENT PRIMARY KEY,
        order_id VARCHAR(50) NULL,
        customer_id INT NULL,
        recipient_email VARCHAR(150) NOT NULL,
        recipient_name VARCHAR(150),
        subject VARCHAR(255) NOT NULL,
        message_body TEXT NOT NULL,
        notification_type ENUM('PRESCRIPTION_ACCEPTED', 'PRESCRIPTION_REJECTED', 'PRESCRIPTION_RECEIVED', 'INQUIRY_RECEIVED', 'PROMOTIONAL', 'SYSTEM') DEFAULT 'SYSTEM',
        status ENUM('SENT', 'FAILED', 'PENDING') DEFAULT 'SENT',
        error_message TEXT NULL,
        sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_notif_order (order_id),
        INDEX idx_notif_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 7. Check if sales table has records; if empty, seed baseline historical sales
    const [salesCount] = await pool.query('SELECT COUNT(*) AS cnt FROM sales');
    if (salesCount[0].cnt === 0) {
      console.log('[Admin Service] Seeding initial sales transactions for reports & analytics...');
      await pool.query(`
        INSERT INTO sales (sale_id, invoice_number, user_id, patient_name, prescription_ref, subtotal, discount_amount, tax_amount, total_amount, payment_status, sale_date) VALUES
        (1, 'INV-2026-1001', NULL, 'Mrs. Champa Wickramasinghe', 'RX-SLMC-4921', 1850.00, 0.00, 0.00, 1850.00, 'PAID', DATE_SUB(NOW(), INTERVAL 3 DAY)),
        (2, 'INV-2026-1002', NULL, 'Mr. Roshan De Silva', 'OTC-Walk-in', 150.00, 0.00, 0.00, 150.00, 'PAID', DATE_SUB(NOW(), INTERVAL 2 DAY)),
        (3, 'INV-2026-1003', NULL, 'Dr. Samantha Perera', 'RX-SLMC-8812', 3450.00, 0.00, 0.00, 3450.00, 'PAID', DATE_SUB(NOW(), INTERVAL 1 DAY)),
        (4, 'INV-2026-1004', NULL, 'Mr. Nuwan Jayasuriya', 'RX-SLMC-1204', 1280.00, 0.00, 0.00, 1280.00, 'PAID', NOW()),
        (5, 'INV-2026-1005', NULL, 'Walk-in Customer', 'OTC-Walk-in', 420.00, 0.00, 0.00, 420.00, 'PAID', NOW())
        ON DUPLICATE KEY UPDATE sale_id = VALUES(sale_id);
      `);

      const [medRows] = await pool.query('SELECT medicine_id FROM medicines LIMIT 2');
      const med1 = medRows[0]?.medicine_id || 1;
      const med2 = medRows[1]?.medicine_id || med1;

      await pool.query(`
        INSERT IGNORE INTO sale_items (sale_item_id, sale_id, medicine_id, quantity, unit_price, subtotal, packaging_desc) VALUES
        (1, 1, ?, 10, 185.00, 1850.00, '1 Card (10 Tablets)'),
        (2, 2, ?, 20, 7.50, 150.00, '2 Cards (20 Tablets)'),
        (3, 3, ?, 2, 1250.00, 2500.00, '2 Canisters (Inhalers)'),
        (4, 3, ?, 10, 7.50, 75.00, '1 Card (10 Tablets)'),
        (5, 3, ?, 4, 185.00, 740.00, '4 Loose Tablets'),
        (6, 4, ?, 20, 64.00, 1280.00, '2 Cards (20 Tablets)'),
        (7, 5, ?, 10, 42.00, 420.00, '1 Card (10 Capsules)');
      `, [med1, med2, med1, med2, med1, med2, med1]);

      await pool.query(`
        INSERT IGNORE INTO payments (payment_id, sale_id, payment_method, amount_paid, change_given, reference_note, payment_date) VALUES
        (1, 1, 'CASH', 2000.00, 150.00, 'Counter POS Cash Receipt #INV-2026-1001', DATE_SUB(NOW(), INTERVAL 3 DAY)),
        (2, 2, 'CASH', 200.00, 50.00, 'Counter POS Cash Receipt #INV-2026-1002', DATE_SUB(NOW(), INTERVAL 2 DAY)),
        (3, 3, 'CARD', 3450.00, 0.00, 'POS Visa Auth #984210 #INV-2026-1003', DATE_SUB(NOW(), INTERVAL 1 DAY)),
        (4, 4, 'CARD', 1280.00, 0.00, 'POS Master Auth #441920 #INV-2026-1004', NOW()),
        (5, 5, 'CASH', 500.00, 80.00, 'Counter POS Cash Receipt #INV-2026-1005', NOW());
      `);
    }

    // Auto-sync any orphaned POS transactions from previous migrations or fallback executions
    await syncOrphanedPosMovements();

    salesTablesChecked = true;
    console.log('[Admin Service] Sales & reporting database tables verified and operational.');
  } catch (err) {
    console.warn('[Admin Service Table Check Notice]:', err.message);
  }
};

/**
 * Automatically detects and synchronizes any POS dispensations that were recorded in stock_movements
 * during previous table migrations or connection retries, ensuring 100% data integrity in sales reporting.
 */
export const syncOrphanedPosMovements = async () => {
  try {
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
      const invNum = `INV-POS-${mov.movement_id}`;
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

    // Fast, resilient aggregate query capturing formulary inventory AND live financial analytics
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
        (SELECT COUNT(*) FROM medicine_batches WHERE stock_quantity > 0 AND expiry_date <= DATE_ADD(CURDATE(), INTERVAL 90 DAY) AND status = 'active') AS expiring_batches_count,
        (SELECT COUNT(*) FROM customers WHERE is_active = TRUE) AS total_customers,
        (SELECT COUNT(*) FROM prescription_orders WHERE status = 'pending') AS pending_prescriptions,
        (SELECT COUNT(*) FROM inquiries WHERE status = 'NEW') AS new_inquiries,
        (SELECT COUNT(*) FROM promotions WHERE is_active = TRUE) AS active_promotions,
        -- Financial & Transactional Analytics
        (SELECT COUNT(*) FROM sales WHERE DATE(sale_date) = CURDATE() AND (payment_status = 'PAID' OR payment_status = 'paid' OR payment_status = 'COMPLETED' OR payment_status IS NULL OR payment_status = '')) AS today_sales_count,
        (SELECT COALESCE(SUM(total_amount), 0.00) FROM sales WHERE DATE(sale_date) = CURDATE() AND (payment_status = 'PAID' OR payment_status = 'paid' OR payment_status = 'COMPLETED' OR payment_status IS NULL OR payment_status = '')) AS today_revenue,
        (SELECT COALESCE(SUM(total_amount), 0.00) FROM sales WHERE MONTH(sale_date) = MONTH(CURDATE()) AND YEAR(sale_date) = YEAR(CURDATE()) AND (payment_status = 'PAID' OR payment_status = 'paid' OR payment_status = 'COMPLETED' OR payment_status IS NULL OR payment_status = '')) AS monthly_revenue,
        (SELECT COUNT(*) FROM sales WHERE (payment_status = 'PAID' OR payment_status = 'paid' OR payment_status = 'COMPLETED' OR payment_status IS NULL OR payment_status = '')) AS total_sales_count,
        (SELECT COALESCE(SUM(total_amount), 0.00) FROM sales WHERE (payment_status = 'PAID' OR payment_status = 'paid' OR payment_status = 'COMPLETED' OR payment_status IS NULL OR payment_status = '')) AS total_revenue
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
        CASE 
          WHEN m.is_offer = TRUE AND m.discount_percent > 0 
          THEN ROUND(m.unit_price * (1.00 - (m.discount_percent / 100.00)), 2)
          ELSE m.unit_price 
        END AS final_price,
        CASE 
          WHEN m.is_offer = TRUE AND m.discount_percent > 0 
          THEN ROUND(m.unit_price * (m.discount_percent / 100.00), 2)
          ELSE 0.00 
        END AS discount_amount,
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
    amount_paid
  } = req.body;

  if (!medicine_id || !batch_id || !quantity || parseInt(quantity, 10) <= 0) {
    return res.status(400).json({
      success: false,
      message: 'Valid medicine ID, batch ID, and positive quantity are required.'
    });
  }

  const numericQty = parseInt(quantity, 10);
  let effectivePrice = parseFloat(unit_price) || 0.0;
  if (effectivePrice <= 0) {
    try {
      const [mRows] = await pool.query('SELECT unit_price FROM medicines WHERE medicine_id = ? LIMIT 1', [parseInt(medicine_id, 10)]);
      if (mRows.length > 0 && mRows[0].unit_price) {
        effectivePrice = parseFloat(mRows[0].unit_price);
      }
    } catch (e) {}
  }
  const totalBill = parseFloat((numericQty * effectivePrice).toFixed(2));
  const numericPaid = amount_paid !== undefined ? parseFloat(parseFloat(amount_paid).toFixed(2)) : totalBill;

  if (numericPaid < totalBill) {
    return res.status(400).json({
      success: false,
      message: `Amount paid (Rs. ${numericPaid.toFixed(2)}) cannot be less than total bill (Rs. ${totalBill.toFixed(2)}).`
    });
  }

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
  // Guarantees ACID concurrency control, row-level pessimistic locking (FOR UPDATE)
  let procedureSucceeded = false;
  let saleId = null;
  let invoiceNumber = null;

  try {
    await pool.query(
      'CALL sp_create_pos_sale(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, @out_sale_id, @out_inv_no)',
      [
        validUserId,
        validCustomerId,
        (patient_name || 'Walk-in Customer').trim(),
        (prescription_ref || 'OTC').trim(),
        parseInt(medicine_id, 10),
        parseInt(batch_id, 10),
        numericQty,
        effectivePrice,
        packaging_desc || '1 Unit',
        (payment_method || 'CASH').toUpperCase(),
        numericPaid,
        performer
      ]
    );

    const [outRows] = await pool.query('SELECT @out_sale_id AS sale_id, @out_inv_no AS invoice_number');
    if (outRows && outRows.length > 0 && outRows[0].sale_id) {
      saleId = outRows[0].sale_id;
      invoiceNumber = outRows[0].invoice_number;
      procedureSucceeded = true;
      console.log(`[ADBMS Stored Procedure Success]: CALL sp_create_pos_sale executed -> Sale #${saleId}, Invoice #${invoiceNumber} (Patient: ${patient_name}, Customer FK: ${validCustomerId})`);
    }
  } catch (spErr) {
    console.warn('[ADBMS Stored Procedure Notice]: sp_create_pos_sale execution warning, checking fallback:', spErr.message);
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
        timestamp: new Date().toISOString()
      }
    });
  }

  // 3. FALLBACK PATH: Transactional Query Execution with Pessimistic Locking
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [batchRows] = await connection.query(
      'SELECT batch_id, medicine_id, batch_number, stock_quantity, status, expiry_date FROM medicine_batches WHERE batch_id = ? FOR UPDATE',
      [parseInt(batch_id, 10)]
    );

    if (batchRows.length === 0) {
      throw new Error(`Inventory batch lot #${batch_id} not found.`);
    }

    const batch = batchRows[0];
    if (batch.stock_quantity < numericQty) {
      throw new Error(`Insufficient batch stock. Available: ${batch.stock_quantity} units, Requested: ${numericQty} units.`);
    }

    const dateSegment = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randSegment = Math.floor(10000 + Math.random() * 90000);
    invoiceNumber = `INV-${dateSegment}-${randSegment}`;

    const [saleRes] = await connection.query(`
      INSERT INTO sales (
        invoice_number, user_id, customer_id, patient_name, prescription_ref,
        subtotal, discount_amount, tax_amount, total_amount, payment_status, sale_date
      ) VALUES (?, ?, ?, ?, ?, 0.00, 0.00, ?, 'PAID', CURRENT_TIMESTAMP)
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

    const [itemRes] = await connection.query(`
      INSERT INTO sale_items (sale_id, medicine_id, quantity, unit_price, subtotal, packaging_desc)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [
      saleId,
      parseInt(medicine_id, 10),
      numericQty,
      effectivePrice,
      totalBill,
      packaging_desc || '1 Unit'
    ]);

    try {
      await connection.query(`
        INSERT INTO sale_item_batches (sale_item_id, batch_id, quantity_allocated)
        VALUES (?, ?, ?)
      `, [itemRes.insertId, parseInt(batch_id, 10), numericQty]);
    } catch (allocErr) {}

    await connection.query(`
      INSERT INTO payments (sale_id, payment_method, amount_paid, change_given, reference_note, payment_date)
      VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `, [
      saleId,
      (payment_method || 'CASH').toUpperCase(),
      numericPaid,
      changeGiven,
      `Counter POS Receipt #${invoiceNumber}`
    ]);

    const newStock = batch.stock_quantity - numericQty;
    const newStatus = newStock === 0 ? 'depleted' : batch.status;
    await connection.query(
      'UPDATE medicine_batches SET stock_quantity = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE batch_id = ?',
      [newStock, newStatus, parseInt(batch_id, 10)]
    );

    await connection.query(`
      INSERT INTO stock_movements (batch_id, movement_type, quantity_changed, reason, performed_by, movement_date)
      VALUES (?, 'DISPENSED', ?, ?, ?, CURRENT_TIMESTAMP)
    `, [
      parseInt(batch_id, 10),
      -numericQty,
      `Sale ${invoiceNumber} to ${(patient_name || 'Walk-in').trim()} (Rx: ${(prescription_ref || 'OTC').trim()})`,
      performer
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

    const sql = `
      SELECT 
        s.sale_id,
        s.invoice_number,
        s.customer_id,
        s.patient_name,
        COALESCE(c.full_name, s.patient_name) AS customer_name,
        c.email AS customer_email,
        s.prescription_ref,
        s.total_amount,
        s.payment_status,
        s.payment_status AS status,
        s.sale_date,
        COALESCE(u.full_name, 'Staff Pharmacist') AS cashier_name,
        COALESCE(p.payment_method, 'CASH') AS payment_method,
        COALESCE(p.amount_paid, s.total_amount) AS amount_paid,
        (
          SELECT COALESCE(GROUP_CONCAT(CONCAT(m.name, ' (x', si.quantity, ')') SEPARATOR ', '), '1 Unit Dispensed')
          FROM sale_items si
          LEFT JOIN medicines m ON si.medicine_id = m.medicine_id
          WHERE si.sale_id = s.sale_id
        ) AS items_summary,
        (
          SELECT COALESCE(SUM(si.quantity), 1)
          FROM sale_items si
          WHERE si.sale_id = s.sale_id
        ) AS item_count
      FROM sales s
      LEFT JOIN users u ON s.user_id = u.user_id
      LEFT JOIN customers c ON s.customer_id = c.customer_id
      LEFT JOIN (
        SELECT sale_id, MAX(payment_method) AS payment_method, SUM(amount_paid) AS amount_paid
        FROM payments
        GROUP BY sale_id
      ) p ON s.sale_id = p.sale_id
      ${whereSql}
      ORDER BY s.sale_date DESC
      LIMIT 200
    `;

    const [rows] = await pool.query(sql, params);

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

    const [saleRows] = await pool.query(`
      SELECT 
        s.sale_id,
        s.invoice_number,
        s.customer_id,
        s.patient_name,
        COALESCE(c.full_name, s.patient_name) AS customer_name,
        c.email AS customer_email,
        c.phone AS customer_phone,
        s.prescription_ref,
        s.subtotal,
        s.discount_amount,
        s.tax_amount,
        s.total_amount,
        s.payment_status,
        s.payment_status AS status,
        s.sale_date,
        COALESCE(u.full_name, 'Staff Pharmacist') AS cashier_name,
        COALESCE(p.payment_method, 'CASH') AS payment_method,
        COALESCE(p.amount_paid, s.total_amount) AS amount_paid,
        COALESCE(p.change_given, 0.00) AS change_given,
        p.reference_note
      FROM sales s
      LEFT JOIN users u ON s.user_id = u.user_id
      LEFT JOIN customers c ON s.customer_id = c.customer_id
      LEFT JOIN payments p ON s.sale_id = p.sale_id
      WHERE s.sale_id = ? OR s.invoice_number = ?
      LIMIT 1
    `, [id, id]);

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

    const whereSql = whereClauses.length > 0 ? `AND ${whereClauses.join(' AND ')}` : '';

    const sql = `
      SELECT 
        DATE(s.sale_date) AS sale_date,
        DATE(s.sale_date) AS sale_day,
        COUNT(s.sale_id) AS sale_count,
        COUNT(s.sale_id) AS total_sales,
        COUNT(s.sale_id) AS total_transactions,
        COALESCE(SUM(s.total_amount), 0.00) AS gross_sales,
        COALESCE(SUM(s.tax_amount), 0.00) AS total_tax,
        COALESCE(SUM(s.total_amount), 0.00) AS net_sales,
        COALESCE(SUM(s.total_amount), 0.00) AS total_net,
        COALESCE(SUM(s.total_amount), 0.00) AS total_amount,
        COALESCE(SUM(s.total_amount), 0.00) AS total_revenue,
        COALESCE(SUM(CASE WHEN p.payment_method = 'CASH' THEN s.total_amount ELSE 0.00 END), 0.00) AS cash_sales,
        COALESCE(SUM(CASE WHEN p.payment_method = 'CARD' THEN s.total_amount ELSE 0.00 END), 0.00) AS card_sales
      FROM (
        SELECT sale_id, total_amount, tax_amount, payment_status, sale_date
        FROM sales s
        WHERE (s.payment_status = 'PAID' OR s.payment_status = 'paid' OR s.payment_status = 'COMPLETED' OR s.payment_status IS NULL OR s.payment_status = '') ${whereSql}
      ) s
      LEFT JOIN (
        SELECT sale_id, MAX(payment_method) AS payment_method
        FROM payments
        GROUP BY sale_id
      ) p ON s.sale_id = p.sale_id
      GROUP BY DATE(s.sale_date)
      ORDER BY DATE(s.sale_date) DESC
      LIMIT 90
    `;

    const [rows] = await pool.query(sql, params);

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
    const sql = `
      SELECT 
        DATE_FORMAT(s.sale_date, '%Y-%m') AS sale_month,
        COUNT(DISTINCT s.sale_id) AS total_transactions,
        COALESCE(SUM(s.total_amount), 0.00) AS total_revenue
      FROM sales s
      WHERE (s.payment_status = 'PAID' OR s.payment_status = 'paid' OR s.payment_status = 'COMPLETED' OR s.payment_status IS NULL OR s.payment_status = '')
      GROUP BY DATE_FORMAT(s.sale_date, '%Y-%m')
      ORDER BY sale_month DESC
      LIMIT 12
    `;

    const [rows] = await pool.query(sql);

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

    const whereSql = whereClauses.length > 0 ? `AND ${whereClauses.join(' AND ')}` : '';

    const sql = `
      SELECT 
        m.medicine_id,
        m.name AS medicine_name,
        m.name,
        m.generic_name,
        COALESCE(c.category_name, 'General Pharmacy') AS category_name,
        COALESCE(b.brand_name, 'Global') AS brand_name,
        COALESCE(SUM(si.quantity), 0) AS total_units_sold,
        COALESCE(SUM(si.quantity), 0) AS units_sold,
        COALESCE(SUM(si.subtotal), 0.00) AS total_sales_amount,
        COALESCE(SUM(si.subtotal), 0.00) AS total_revenue,
        COALESCE(SUM(si.subtotal), 0.00) AS revenue,
        COUNT(DISTINCT si.sale_id) AS transaction_count
      FROM sale_items si
      INNER JOIN medicines m ON si.medicine_id = m.medicine_id
      LEFT JOIN medicine_categories c ON m.category_id = c.category_id
      LEFT JOIN brands b ON m.brand_id = b.brand_id
      INNER JOIN sales s ON si.sale_id = s.sale_id
      WHERE (s.payment_status = 'PAID' OR s.payment_status = 'paid' OR s.payment_status = 'COMPLETED' OR s.payment_status IS NULL OR s.payment_status = '') ${whereSql}
      GROUP BY m.medicine_id, m.name, m.generic_name, c.category_name, b.brand_name
      ORDER BY total_units_sold DESC
      LIMIT 25
    `;

    const [rows] = await pool.query(sql, params);

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
    await ensureSalesTables();
    const sql = `
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
        ROUND(
          CASE 
            WHEN SUM(b.stock_quantity * m.unit_price) > 0 
            THEN ((SUM(b.stock_quantity * (m.unit_price - b.unit_cost)) / SUM(b.stock_quantity * m.unit_price)) * 100)
            ELSE 0 
          END, 
          1
        ) AS margin_percentage
      FROM medicine_batches b
      INNER JOIN medicines m ON b.medicine_id = m.medicine_id
      WHERE b.status = 'active' AND b.expiry_date > CURDATE()
    `;

    const [rows] = await pool.query(sql);

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
      const [rows] = await pool.query(`
        SELECT 
          c.customer_id, 
          c.full_name, 
          c.email, 
          c.contact_no, 
          c.patient_age, 
          c.nic, 
          c.address, 
          COALESCE(c.is_active, 1) AS is_active,
          COALESCE(c.status, 'active') AS status,
          c.created_at,
          (
            SELECT COUNT(*) 
            FROM prescription_orders po 
            WHERE po.customer_id = c.customer_id OR po.patient_email = c.email
          ) AS total_prescriptions
        FROM customers c
        ORDER BY c.customer_id DESC
      `);
      customers = rows;
    } catch {
      const [fallbackRows] = await pool.query(`
        SELECT 
          customer_id, 
          full_name, 
          email, 
          contact_no, 
          patient_age, 
          nic, 
          address, 
          COALESCE(is_active, 1) AS is_active,
          COALESCE(status, 'active') AS status,
          created_at,
          0 AS total_prescriptions
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
    const { status } = req.query;
    let sql = `
      SELECT 
        i.inquiry_id,
        i.reference_code,
        i.customer_id,
        i.name,
        i.phone,
        i.email,
        i.medicine_query,
        i.message,
        i.status,
        i.staff_notes,
        i.responded_by,
        i.responded_at,
        i.created_at,
        c.full_name AS registered_patient_name
      FROM inquiries i
      LEFT JOIN customers c ON i.customer_id = c.customer_id
    `;
    const params = [];
    if (status) {
      sql += ' WHERE i.status = ?';
      params.push(status);
    }
    sql += ' ORDER BY i.created_at DESC LIMIT 100';

    const [rows] = await pool.query(sql, params);
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



