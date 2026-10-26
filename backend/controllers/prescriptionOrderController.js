import pool from '../config/db.js';
import { ensureSalesTables } from './adminController.js';
import { 
  sendOrderAcceptedEmail, 
  sendOrderRejectedEmail, 
  sendOrderSubmittedEmail,
  sendTestEmail,
  verifySmtpConnection,
  getMailOutbox 
} from '../services/simpleMailService.js';

let prescriptionOrdersTableEnsured = false;

/**
 * Prescription orders and prescription_files tables are managed via database/schema.sql
 */
export const ensurePrescriptionOrdersTable = async () => {
  if (prescriptionOrdersTableEnsured) return;
  prescriptionOrdersTableEnsured = true;
  try {
    const createSql = `
      CREATE TABLE IF NOT EXISTS prescription_orders (
        order_id VARCHAR(50) PRIMARY KEY,
        account_type ENUM('registered', 'guest') NOT NULL DEFAULT 'guest',
        customer_id INT NULL,
        your_name VARCHAR(150) NOT NULL,
        your_email VARCHAR(150) NOT NULL,
        patient_name VARCHAR(150) NULL,
        patient_age VARCHAR(50) NULL,
        contact_no VARCHAR(50) NULL,
        delivery_option VARCHAR(100) DEFAULT 'Dispensary Counter Pickup (Free)',
        files LONGTEXT,
        message TEXT,
        status ENUM('pending', 'accepted', 'rejected', 'dispensed') NOT NULL DEFAULT 'pending',
        pharmacist_name VARCHAR(150) NULL,
        reviewed_at DATETIME NULL,
        confirmation_message TEXT NULL,
        rejection_reason TEXT NULL,
        ready_time VARCHAR(100) NULL,
        email_sent TINYINT(1) DEFAULT 0,
        email_sent_at DATETIME NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_rx_email (your_email),
        INDEX idx_rx_status (status),
        INDEX idx_rx_created (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;
    await pool.query(createSql);

    // Ensure normalized 3NF child table prescription_files exists
    const createFilesSql = `
      CREATE TABLE IF NOT EXISTS prescription_files (
        file_id INT AUTO_INCREMENT PRIMARY KEY,
        order_id VARCHAR(50) NOT NULL,
        file_path VARCHAR(255) NULL,
        file_name VARCHAR(255) NULL,
        file_type VARCHAR(50) NULL,
        file_size INT NULL,
        file_data LONGTEXT NULL,
        uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_rx_files_order (order_id),
        CONSTRAINT fk_rx_files_order FOREIGN KEY (order_id)
          REFERENCES prescription_orders(order_id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;
    try {
      await pool.query(createFilesSql);
    } catch {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS prescription_files (
          file_id INT AUTO_INCREMENT PRIMARY KEY,
          order_id VARCHAR(50) NOT NULL,
          file_path VARCHAR(255) NULL,
          file_name VARCHAR(255) NULL,
          file_type VARCHAR(50) NULL,
          file_size INT NULL,
          file_data LONGTEXT NULL,
          uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_rx_files_order (order_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);
    }
  } catch {
    // Schema is managed via database/schema.sql; DDL is intentionally denied to app user under least-privilege
  }
};

/**
 * Helper to parse files and pharmacist_review
 */
const formatOrderRow = (row) => {
  let parsedFiles = [];
  try {
    if (typeof row.files === 'string') {
      parsedFiles = JSON.parse(row.files || '[]');
    } else if (Array.isArray(row.files)) {
      parsedFiles = row.files;
    }
  } catch (e) {
    parsedFiles = [];
  }

  let pharmacistReview = null;
  if (row.pharmacist_name || row.reviewed_at) {
    pharmacistReview = {
      pharmacist_name: row.pharmacist_name,
      reviewed_at: row.reviewed_at,
      confirmation_message: row.confirmation_message,
      rejection_reason: row.rejection_reason,
      ready_time: row.ready_time,
      email_sent: Boolean(row.email_sent),
      email_sent_at: row.email_sent_at
    };
  }

  const isRegistered = row.account_type === 'registered' || Boolean(row.registered_full_name) || Boolean(row.customer_id);

  return {
    order_id: row.order_id,
    account_type: isRegistered ? 'registered' : 'guest',
    customer_id: row.customer_id,
    your_name: row.your_name,
    your_email: row.your_email,
    patient_name: row.patient_name || row.your_name,
    patient_age: row.patient_age || '',
    contact_no: row.contact_no || 'Not provided',
    delivery_option: row.delivery_option,
    files: parsedFiles,
    message: row.message || '',
    status: row.status,
    created_at: row.created_at,
    pharmacist_review: pharmacistReview,
    customer_details: isRegistered ? {
      customer_id: row.customer_id,
      full_name: row.registered_full_name || row.your_name,
      email: row.registered_email || row.your_email,
      contact_no: row.registered_phone || row.contact_no || 'Not provided',
      nic: row.registered_nic || 'Verified Patient Account',
      address: row.registered_address || 'Registered Dispensary Patient',
      created_at: row.registered_member_since || row.created_at
    } : null
  };
};

/**
 * POST /api/prescription-orders
 * Public or Authenticated Patient submits a prescription order
 */
export const createPrescriptionOrder = async (req, res) => {
  try {
    await ensurePrescriptionOrdersTable();
    const {
      order_id,
      your_name,
      your_email,
      patient_name,
      patient_age,
      contact_no,
      delivery_option,
      files,
      message,
      customer_id,
      account_type
    } = req.body;

    const safeYourName = (your_name || '').trim();
    const safeYourEmail = (your_email || '').trim().toLowerCase();
    const safePatientName = (patient_name || safeYourName).trim();
    const safeContactNo = (contact_no || '').trim() || 'Not provided';

    if (!safeYourName || !safeYourEmail) {
      return res.status(400).json({
        success: false,
        message: 'Name and Email are required to receive your prescription order.'
      });
    }

    // System identification: Is user registered in the customers database?
    let resolvedAccountType = account_type === 'registered' ? 'registered' : 'guest';
    let resolvedCustomerId = null;

    // Validate if customer_id is a valid MySQL INT (<= 2,147,483,647) to avoid ER_WARN_DATA_OUT_OF_RANGE
    const rawCustomerId = customer_id ? parseInt(customer_id, 10) : null;
    const isValidIntId = rawCustomerId && !isNaN(rawCustomerId) && rawCustomerId > 0 && rawCustomerId <= 2147483647;

    try {
      let querySql = `
        SELECT customer_id, full_name, email, contact_no, nic, address, created_at
        FROM customers
        WHERE LOWER(TRIM(email)) = ?
      `;
      let queryParams = [safeYourEmail];

      if (isValidIntId) {
        querySql += ` OR customer_id = ?`;
        queryParams.push(rawCustomerId);
      }
      querySql += ` LIMIT 1`;

      const [custRows] = await pool.query(querySql, queryParams);

      if (custRows.length > 0) {
        resolvedAccountType = 'registered';
        resolvedCustomerId = custRows[0].customer_id;
      }
    } catch (e) {
      console.warn('[Check Registered Customer Error]:', e.message);
      resolvedCustomerId = null;
    }

    // Generate unique order ID: RX-2026-XXXX or use provided client order ID
    const finalOrderId = order_id || `RX-2026-${Math.floor(1000 + Math.random() * 9000)}`;

    const filesJson = JSON.stringify(files || []);

    await pool.query(`
      INSERT INTO prescription_orders (
        order_id, account_type, customer_id, your_name, your_email,
        patient_name, patient_age, contact_no, delivery_option,
        files, message, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
      ON DUPLICATE KEY UPDATE
        account_type = VALUES(account_type),
        customer_id = VALUES(customer_id),
        your_name = VALUES(your_name),
        your_email = VALUES(your_email),
        patient_name = VALUES(patient_name),
        patient_age = VALUES(patient_age),
        contact_no = VALUES(contact_no),
        files = VALUES(files),
        message = VALUES(message)
    `, [
      finalOrderId,
      resolvedAccountType,
      resolvedCustomerId,
      safeYourName,
      safeYourEmail,
      safePatientName,
      patient_age ? patient_age.trim() : null,
      safeContactNo,
      delivery_option || 'Dispensary Counter Pickup (Free)',
      filesJson,
      message ? message.trim() : null
    ]);

    // Insert into normalized 3NF child entity: prescription_files
    if (Array.isArray(files) && files.length > 0) {
      for (const f of files) {
        let filePath = null;
        let fileName = null;
        let fileType = null;
        let fileSize = null;
        let fileData = null;

        if (typeof f === 'string') {
          if (f.startsWith('data:')) {
            fileData = f;
            fileType = f.split(';')[0].replace('data:', '');
            fileSize = f.length;
            fileName = 'Prescription_Image';
          } else {
            filePath = f;
            fileName = f.split('/').pop();
          }
        } else if (typeof f === 'object' && f !== null) {
          fileName = f.name || f.fileName || 'Prescription_Document';
          fileType = f.type || f.fileType || null;
          fileSize = f.size || f.fileSize || null;
          filePath = f.path || f.url || f.file_path || null;
          fileData = f.data || f.fileData || (f.url && f.url.startsWith('data:') ? f.url : null);
        }

        try {
          await pool.query(`
            INSERT INTO prescription_files (order_id, file_path, file_name, file_type, file_size, file_data)
            VALUES (?, ?, ?, ?, ?, ?)
          `, [finalOrderId, filePath, fileName, fileType, fileSize, fileData]);
        } catch (fErr) {
          console.warn('[Prescription Files Insert Notice]:', fErr.message);
        }
      }
    }

    const newOrder = {
      order_id: finalOrderId,
      account_type: resolvedAccountType,
      customer_id: resolvedCustomerId,
      your_name: safeYourName,
      your_email: safeYourEmail,
      patient_name: safePatientName,
      patient_age: patient_age || '',
      contact_no: safeContactNo,
      delivery_option: delivery_option || 'Dispensary Counter Pickup (Free)',
      files: files || [],
      message: message || '',
      status: 'pending',
      created_at: new Date().toISOString(),
      pharmacist_review: null
    };

    console.log(`[Prescription Order]: Registered new order ${finalOrderId} for ${safeYourName} (${resolvedAccountType})`);

    // Non-blocking acknowledgment email to patient
    sendOrderSubmittedEmail({
      orderId: finalOrderId,
      customerEmail: safeYourEmail,
      customerName: safeYourName,
      patientName: safePatientName,
      deliveryOption: delivery_option
    }).catch(err => console.warn('[Prescription Order submission email warning]:', err.message));

    res.status(201).json({
      success: true,
      message: 'Prescription order received successfully by dispensary.',
      order: newOrder
    });
  } catch (error) {
    console.error('[Create Prescription Order Error]:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to submit prescription order.'
    });
  }
};

/**
 * GET /api/prescription-orders
 * List all prescription orders (for staff dashboard)
 */
export const getPrescriptionOrders = async (req, res) => {
  try {
    await ensurePrescriptionOrdersTable();

    let rows;
    try {
      const [vRows] = await pool.query('SELECT * FROM v_prescription_fulfillment_pipeline ORDER BY created_at DESC');
      rows = vRows;
    } catch {
      const [fallbackRows] = await pool.query(`
        SELECT 
          po.*,
          c.full_name AS registered_full_name,
          c.email AS registered_email,
          c.contact_no AS registered_phone,
          c.nic AS registered_nic,
          c.address AS registered_address,
          c.created_at AS registered_member_since
        FROM prescription_orders po
        LEFT JOIN customers c ON (po.customer_id = c.customer_id OR LOWER(TRIM(po.your_email)) = LOWER(TRIM(c.email)))
        ORDER BY po.created_at DESC
      `);
      rows = fallbackRows;
    }

    const formatted = rows.map(formatOrderRow);

    res.status(200).json({
      success: true,
      count: formatted.length,
      orders: formatted
    });
  } catch (error) {
    console.error('[Get Prescription Orders Error]:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to load prescription orders.'
    });
  }
};

/**
 * GET /api/prescription-orders/:orderId
 * Get specific prescription order details using Database View v_prescription_fulfillment_pipeline
 */
export const getPrescriptionOrderById = async (req, res) => {
  try {
    await ensurePrescriptionOrdersTable();
    const { orderId } = req.params;

    let rows;
    try {
      const [vRows] = await pool.query(
        'SELECT * FROM v_prescription_fulfillment_pipeline WHERE order_id = ? LIMIT 1',
        [orderId]
      );
      rows = vRows;
    } catch {
      const [fallbackRows] = await pool.query(`
        SELECT 
          po.*,
          c.full_name AS registered_full_name,
          c.email AS registered_email,
          c.contact_no AS registered_phone,
          c.nic AS registered_nic,
          c.address AS registered_address,
          c.created_at AS registered_member_since
        FROM prescription_orders po
        LEFT JOIN customers c ON (po.customer_id = c.customer_id OR LOWER(TRIM(po.your_email)) = LOWER(TRIM(c.email)))
        WHERE po.order_id = ?
        LIMIT 1
      `, [orderId]);
      rows = fallbackRows;
    }

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Order ${orderId} not found.`
      });
    }

    res.status(200).json({
      success: true,
      order: formatOrderRow(rows[0])
    });
  } catch (error) {
    console.error('[Get Order Details Error]:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to retrieve order details.'
    });
  }
};

/**
 * PUT /api/prescription-orders/:orderId/accept
 * Pharmacist accepts order and sends confirmation email to customer
 */
export const acceptPrescriptionOrder = async (req, res) => {
  try {
    await ensurePrescriptionOrdersTable();
    const { orderId } = req.params;
    const { pharmacistName, confirmationMessage, readyTime } = req.body;

    const [rows] = await pool.query('SELECT * FROM prescription_orders WHERE order_id = ?', [orderId]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    const order = rows[0];

    // Update database
    await pool.query(`
      UPDATE prescription_orders
      SET 
        status = 'accepted',
        pharmacist_name = ?,
        reviewed_at = NOW(),
        confirmation_message = ?,
        ready_time = ?,
        email_sent = 1,
        email_sent_at = NOW()
      WHERE order_id = ?
    `, [
      pharmacistName || 'Supervising Pharmacist',
      confirmationMessage || 'Prescription verified and prepared for pickup.',
      readyTime || '15 - 20 Minutes',
      orderId
    ]);

    // Send Confirmation Email
    let emailResult = null;
    try {
      emailResult = await sendOrderAcceptedEmail({
        orderId,
        customerEmail: order.your_email,
        customerName: order.your_name,
        patientName: order.patient_name,
        readyTime: readyTime || '15 - 20 Minutes',
        pharmacistName: pharmacistName || 'Supervising Pharmacist',
        confirmationMessage,
        deliveryOption: order.delivery_option
      });
    } catch (mailErr) {
      console.error('[Mail Send Error]:', mailErr.message);
    }

    // Return updated order
    const [updatedRows] = await pool.query(`
      SELECT po.*, c.full_name AS registered_full_name, c.email AS registered_email
      FROM prescription_orders po
      LEFT JOIN customers c ON po.customer_id = c.customer_id
      WHERE po.order_id = ?
    `, [orderId]);

    res.status(200).json({
      success: true,
      message: `Prescription order ${orderId} accepted successfully and confirmation email sent to ${order.your_email}.`,
      order: formatOrderRow(updatedRows[0]),
      emailResult
    });
  } catch (error) {
    console.error('[Accept Order Error]:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to accept prescription order.'
    });
  }
};

/**
 * PUT /api/prescription-orders/:orderId/reject
 * Pharmacist rejects prescription order and sends rejection notice email
 */
export const rejectPrescriptionOrder = async (req, res) => {
  try {
    await ensurePrescriptionOrdersTable();
    const { orderId } = req.params;
    const { pharmacistName, rejectionReason } = req.body;

    const [rows] = await pool.query('SELECT * FROM prescription_orders WHERE order_id = ?', [orderId]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    const order = rows[0];

    await pool.query(`
      UPDATE prescription_orders
      SET 
        status = 'rejected',
        pharmacist_name = ?,
        reviewed_at = NOW(),
        rejection_reason = ?,
        email_sent = 1,
        email_sent_at = NOW()
      WHERE order_id = ?
    `, [
      pharmacistName || 'Supervising Pharmacist',
      rejectionReason || 'Invalid prescription',
      orderId
    ]);

    // Send Rejection Notice Email
    let emailResult = null;
    try {
      emailResult = await sendOrderRejectedEmail({
        orderId,
        customerEmail: order.your_email,
        customerName: order.your_name,
        patientName: order.patient_name,
        rejectionReason,
        pharmacistName: pharmacistName || 'Supervising Pharmacist'
      });
    } catch (mailErr) {
      console.error('[Mail Send Error]:', mailErr.message);
    }

    const [updatedRows] = await pool.query(`
      SELECT po.*, c.full_name AS registered_full_name, c.email AS registered_email
      FROM prescription_orders po
      LEFT JOIN customers c ON po.customer_id = c.customer_id
      WHERE po.order_id = ?
    `, [orderId]);

    res.status(200).json({
      success: true,
      message: `Order ${orderId} rejected and notice email sent to ${order.your_email}.`,
      order: formatOrderRow(updatedRows[0]),
      emailResult
    });
  } catch (error) {
    console.error('[Reject Order Error]:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to reject prescription order.'
    });
  }
};

/**
 * PUT /api/prescription-orders/:orderId/dispense
 * Mark prescription order as dispensed / collected and register sale transaction in DB
 */
export const dispensePrescriptionOrder = async (req, res) => {
  try {
    await ensurePrescriptionOrdersTable();
    await ensureSalesTables();
    const { orderId } = req.params;
    const { pharmacistName, amount } = req.body;

    await pool.query(`
      UPDATE prescription_orders
      SET 
        status = 'dispensed',
        pharmacist_name = COALESCE(?, pharmacist_name),
        reviewed_at = COALESCE(reviewed_at, NOW())
      WHERE order_id = ?
    `, [pharmacistName || 'Supervising Pharmacist', orderId]);

    const [updatedRows] = await pool.query(`
      SELECT po.*, c.full_name AS registered_full_name, c.email AS registered_email
      FROM prescription_orders po
      LEFT JOIN customers c ON po.customer_id = c.customer_id
      WHERE po.order_id = ?
    `, [orderId]);

    if (updatedRows.length > 0) {
      const order = updatedRows[0];
      const invNum = `INV-RX-${orderId.replace(/[^a-zA-Z0-9-]/g, '')}`;

      // Check if already recorded in sales
      const [existingSale] = await pool.query(
        'SELECT sale_id FROM sales WHERE prescription_ref = ? OR invoice_number = ?',
        [orderId, invNum]
      );

      if (existingSale.length === 0) {
        const saleAmount = parseFloat(amount) || 1850.00;
        const patientName = order.patient_name || order.your_name || 'Prescription Patient';

        const [saleRes] = await pool.query(`
          INSERT INTO sales (
            invoice_number, user_id, patient_name, prescription_ref,
            subtotal, discount_amount, tax_amount, total_amount, payment_status, sale_date
          ) VALUES (?, NULL, ?, ?, ?, 0.00, 0.00, ?, 'PAID', CURRENT_TIMESTAMP)
        `, [invNum, patientName, orderId, saleAmount, saleAmount]);

        const saleId = saleRes.insertId;

        // Record payment
        await pool.query(`
          INSERT INTO payments (sale_id, payment_method, amount_paid, change_given, reference_note, payment_date)
          VALUES (?, 'CARD', ?, 0.00, ?, CURRENT_TIMESTAMP)
        `, [saleId, saleAmount, `Online Prescription Order (Card Settlement) ${orderId}`]);

        // Record line item
        const [medRows] = await pool.query('SELECT medicine_id, unit_price FROM medicines WHERE is_active = TRUE LIMIT 1');
        const medId = medRows[0]?.medicine_id || 1;
        await pool.query(`
          INSERT INTO sale_items (sale_id, medicine_id, quantity, unit_price, subtotal, packaging_desc)
          VALUES (?, ?, 1, ?, ?, 'Online Dispensed Rx Package')
        `, [saleId, medId, saleAmount, saleAmount]);

        // Record audit trail
        try {
          await pool.query(`
            INSERT INTO audit_logs (table_name, operation, record_id, old_value, new_value, performed_by, timestamp)
            VALUES ('sales', 'INSERT', ?, NULL, ?, ?, CURRENT_TIMESTAMP)
          `, [
            saleId,
            JSON.stringify({ invoice_number: invNum, total_amount: saleAmount, type: 'ONLINE_RX_DISPENSE' }),
            pharmacistName || 'Supervising Pharmacist'
          ]);
        } catch (auditErr) {
          // ignore non-fatal
        }

        console.log(`[Prescription Sale Committed]: Online Rx ${orderId} recorded as Sale #${invNum} for Rs. ${saleAmount}`);
      }
    }

    res.status(200).json({
      success: true,
      message: `Prescription order ${orderId} marked as dispensed at counter and financial transaction recorded.`,
      order: formatOrderRow(updatedRows[0])
    });
  } catch (error) {
    console.error('[Dispense Order Error]:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update order to dispensed.'
    });
  }
};

/**
 * GET /api/prescription-orders/outbox
 * View sent confirmation emails outbox
 */
export const getOutbox = async (req, res) => {
  try {
    const emails = getMailOutbox();
    res.status(200).json({
      success: true,
      count: emails.length,
      emails
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Could not load mail outbox.' });
  }
};

/**
 * GET /api/prescription-orders/test-smtp
 * Verify SMTP credentials and handshake with Gmail
 */
export const testSmtpStatus = async (req, res) => {
  try {
    const result = await verifySmtpConnection();
    res.status(result.ok ? 200 : 400).json(result);
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
};

/**
 * POST /api/prescription-orders/test-email
 * Dispatch a live test email to verified recipient or current user
 */
export const testDispatchEmail = async (req, res) => {
  try {
    const toEmail = req.body?.toEmail || req.query?.toEmail || process.env.SMTP_USER;
    const result = await sendTestEmail(toEmail);
    res.status(200).json({
      success: true,
      message: `Test email dispatched successfully to ${toEmail}.`,
      result
    });
  } catch (error) {
    console.error('[Test Email Error]:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to dispatch test email.'
    });
  }
};
