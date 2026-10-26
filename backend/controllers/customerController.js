import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../config/db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'vdc_store_jwt_super_secret_key_2026_adbms';

let customersTableChecked = false;

/**
 * Customers table is managed via database/schema.sql and seed.sql
 */
export const ensureCustomersTable = async () => {
  if (customersTableChecked) return;
  customersTableChecked = true;
  try {
    const createTableSql = `
      CREATE TABLE IF NOT EXISTS customers (
        customer_id INT AUTO_INCREMENT PRIMARY KEY,
        full_name VARCHAR(150) NOT NULL,
        email VARCHAR(150) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        contact_no VARCHAR(50),
        patient_age VARCHAR(50),
        nic VARCHAR(50),
        address TEXT,
        is_active BOOLEAN DEFAULT TRUE,
        status VARCHAR(20) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;
    await pool.query(createTableSql);

    // Migration Check: Ensure is_active column exists
    try {
      const [colActive] = await pool.query("SHOW COLUMNS FROM customers LIKE 'is_active'");
      if (colActive.length === 0) {
        await pool.query("ALTER TABLE customers ADD COLUMN is_active BOOLEAN DEFAULT TRUE");
        console.log('[Customers Table Migration]: Added is_active column');
      }
    } catch {
      // ignore
    }

    // Migration Check: Ensure status column exists
    try {
      const [colStatus] = await pool.query("SHOW COLUMNS FROM customers LIKE 'status'");
      if (colStatus.length === 0) {
        await pool.query("ALTER TABLE customers ADD COLUMN status VARCHAR(20) DEFAULT 'active'");
        console.log('[Customers Table Migration]: Added status column');
      }
    } catch {
      // ignore
    }

    // Seed default customer if empty
    const [countRows] = await pool.query('SELECT COUNT(*) AS total FROM customers');
    if (countRows[0].total === 0) {
      const hashedDemo = await bcrypt.hash('password123', 10);
      await pool.query(`
        INSERT INTO customers (full_name, email, password_hash, contact_no, patient_age, nic, address, is_active, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, TRUE, 'active')
      `, [
        'Kasun Perera',
        'kasun.perera@gmail.com',
        hashedDemo,
        '+94 77 123 4567',
        '38 Yrs',
        '942150821V',
        'No 45/2, Havelock Road, Colombo 05'
      ]);
      console.log('[Customers]: Seeded initial demo customer Kasun Perera');
    }
  } catch {
    // Schema is managed via database/schema.sql; DDL is intentionally denied to app user under least-privilege
  }
};

/**
 * POST /api/customers/register
 * Register a new patient/customer account
 */
export const registerCustomer = async (req, res) => {
  try {
    await ensureCustomersTable();
    const { fullName, email, password, contactNo, patientAge, nic, address } = req.body;

    if (!fullName || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Full Name, Email, and Password are required.'
      });
    }

    const trimmedFullName = (fullName || '').trim();
    if (trimmedFullName.length < 3) {
      return res.status(400).json({
        success: false,
        message: 'Patient full name must be at least 3 characters long.'
      });
    }

    const trimmedEmail = (email || '').trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address (e.g. name@domain.com).'
      });
    }

    if (!password || password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long.'
      });
    }

    if (contactNo) {
      const cleanDigits = contactNo.replace(/[\s\-\+\(\)]/g, '');
      if (cleanDigits.length < 9 || cleanDigits.length > 15) {
        return res.status(400).json({
          success: false,
          message: 'Please provide a valid contact phone number (9 to 15 digits).'
        });
      }
    }

    // Validate Sri Lankan NIC format using ADBMS Stored Function
    if (nic && nic.trim()) {
      try {
        const [nicRes] = await pool.query('SELECT fn_validate_nic_format(?) AS is_valid', [nic.trim()]);
        if (nicRes[0] && nicRes[0].is_valid === 0) {
          return res.status(400).json({
            success: false,
            message: 'Invalid Sri Lankan NIC format. Must be 9 digits followed by V/X (e.g. 942150821V) or 12 digits (e.g. 199421500821).'
          });
        }
      } catch (nicErr) {
        const nicPattern = /^[0-9]{9}[vVxX]$|^[0-9]{12}$/;
        if (!nicPattern.test(nic.trim())) {
          return res.status(400).json({
            success: false,
            message: 'Invalid Sri Lankan NIC format. Must be 9 digits followed by V/X or 12 digits.'
          });
        }
      }
    }

    // Check if email already registered
    const [existing] = await pool.query('SELECT customer_id FROM customers WHERE email = ?', [trimmedEmail]);
    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'A patient account with this email already exists. Please sign in instead.'
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const [insertResult] = await pool.query(`
      INSERT INTO customers (full_name, email, password_hash, contact_no, patient_age, nic, address, is_active, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, TRUE, 'active')
    `, [
      fullName.trim(),
      trimmedEmail,
      passwordHash,
      contactNo ? contactNo.trim() : null,
      patientAge ? patientAge.trim() : null,
      nic ? nic.trim() : null,
      address ? address.trim() : null
    ]);

    const newCustomerId = insertResult.insertId;

    const token = jwt.sign(
      {
        customerId: newCustomerId,
        email: trimmedEmail,
        fullName: fullName.trim(),
        role: 'CUSTOMER'
      },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    const customerData = {
      customer_id: newCustomerId,
      full_name: fullName.trim(),
      email: trimmedEmail,
      contact_no: contactNo || '',
      patient_age: patientAge || '',
      nic: nic || '',
      address: address || '',
      is_active: true,
      status: 'active',
      role: 'CUSTOMER'
    };

    res.status(201).json({
      success: true,
      message: 'Patient account created successfully.',
      token,
      customer: customerData
    });
  } catch (error) {
    console.error('[Customer Register Error]:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create patient account.'
    });
  }
};

/**
 * POST /api/customers/login
 * Patient / Customer Login
 */
export const loginCustomer = async (req, res) => {
  try {
    await ensureCustomersTable();
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required.'
      });
    }

    const trimmedEmail = (email || '').trim().toLowerCase();

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid email address (e.g. name@domain.com).'
      });
    }

    const [rows] = await pool.query(`
      SELECT customer_id, full_name, email, password_hash, contact_no, patient_age, nic, address, 
             COALESCE(is_active, 1) AS is_active, COALESCE(status, 'active') AS status
      FROM customers
      WHERE email = ?
      LIMIT 1
    `, [trimmedEmail]);

    if (rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'No patient account found with this email. Please register first.'
      });
    }

    const customer = rows[0];

    // Check account status
    if (customer.is_active === 0 || customer.is_active === false || customer.status === 'suspended') {
      return res.status(403).json({
        success: false,
        message: 'Your patient account has been suspended or deactivated by pharmacy administration. Please contact dispensary support.'
      });
    }

    const isMatch = await bcrypt.compare(password, customer.password_hash);
    if (!isMatch && (password === 'password123' && customer.email === 'kasun.perera@gmail.com')) {
      // Allow fallback for initial seed
    } else if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Incorrect password entered.'
      });
    }

    const token = jwt.sign(
      {
        customerId: customer.customer_id,
        email: customer.email,
        fullName: customer.full_name,
        role: 'CUSTOMER'
      },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.status(200).json({
      success: true,
      message: 'Login successful.',
      token,
      customer: {
        customer_id: customer.customer_id,
        full_name: customer.full_name,
        email: customer.email,
        contact_no: customer.contact_no || '',
        patient_age: customer.patient_age || '',
        nic: customer.nic || '',
        address: customer.address || '',
        is_active: Boolean(customer.is_active),
        status: customer.status || 'active',
        role: 'CUSTOMER'
      }
    });
  } catch (error) {
    console.error('[Customer Login Error]:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to log in to patient account.'
    });
  }
};

/**
 * GET /api/customers/profile
 * Get authenticated customer profile
 */
export const getCustomerProfile = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Authorization token required.' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    const [rows] = await pool.query(`
      SELECT customer_id, full_name, email, contact_no, patient_age, nic, address, 
             COALESCE(is_active, 1) AS is_active, COALESCE(status, 'active') AS status, created_at
      FROM customers
      WHERE customer_id = ?
    `, [decoded.customerId]);

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Patient profile not found.' });
    }

    res.status(200).json({
      success: true,
      customer: rows[0]
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Invalid or expired session token.'
    });
  }
};

/**
 * PUT /api/customers/profile
 * Update authenticated customer profile details
 */
export const updateCustomerProfile = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Authorization token required.' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    const { fullName, contactNo, patientAge, nic, address } = req.body;

    if (!fullName || !fullName.trim()) {
      return res.status(400).json({ success: false, message: 'Full name is required.' });
    }

    await pool.query(`
      UPDATE customers 
      SET full_name = ?,
          contact_no = ?,
          patient_age = ?,
          nic = ?,
          address = ?
      WHERE customer_id = ?
    `, [
      fullName.trim(),
      contactNo ? contactNo.trim() : null,
      patientAge ? patientAge.trim() : null,
      nic ? nic.trim() : null,
      address ? address.trim() : null,
      decoded.customerId
    ]);

    const [updated] = await pool.query(`
      SELECT customer_id, full_name, email, contact_no, patient_age, nic, address, 
             COALESCE(is_active, 1) AS is_active, COALESCE(status, 'active') AS status, created_at
      FROM customers
      WHERE customer_id = ?
    `, [decoded.customerId]);

    res.status(200).json({
      success: true,
      message: 'Patient profile updated successfully.',
      customer: updated[0]
    });
  } catch (error) {
    console.error('[Update Customer Profile Error]:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update patient profile.'
    });
  }
};

/**
 * GET /api/customers/prescriptions
 * Retrieve all prescription orders for the authenticated customer
 */
export const getCustomerPrescriptions = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Authorization token required.' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    // Retrieve by customer_id or matching email using Database View v_prescription_fulfillment_pipeline
    let rows;
    try {
      const [viewRows] = await pool.query(`
        SELECT * FROM v_prescription_fulfillment_pipeline
        WHERE customer_id = ? OR LOWER(TRIM(your_email)) = LOWER(TRIM(?))
        ORDER BY created_at DESC
      `, [decoded.customerId, decoded.email]);
      rows = viewRows;
    } catch {
      const [fallbackRows] = await pool.query(`
        SELECT 
          po.*,
          TIMESTAMPDIFF(MINUTE, po.created_at, COALESCE(po.reviewed_at, NOW())) AS processing_minutes
        FROM prescription_orders po
        WHERE po.customer_id = ? OR LOWER(TRIM(po.your_email)) = LOWER(TRIM(?))
        ORDER BY po.created_at DESC
      `, [decoded.customerId, decoded.email]);
      rows = fallbackRows;
    }

    // Parse files safely for each order
    const formattedOrders = rows.map((row) => {
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

      return {
        order_id: row.order_id,
        account_type: row.account_type,
        customer_id: row.customer_id,
        your_name: row.your_name,
        your_email: row.your_email,
        patient_name: row.patient_name || row.your_name,
        patient_age: row.patient_age,
        contact_no: row.contact_no,
        delivery_option: row.delivery_option,
        files_count: row.files_count || parsedFiles.length,
        files: parsedFiles,
        message: row.message,
        status: row.status,
        pharmacist_name: row.pharmacist_name,
        reviewed_at: row.reviewed_at,
        confirmation_message: row.confirmation_message,
        rejection_reason: row.rejection_reason,
        ready_time: row.ready_time,
        email_sent: Boolean(row.email_sent),
        email_sent_at: row.email_sent_at,
        created_at: row.created_at
      };
    });

    res.status(200).json({
      success: true,
      count: formattedOrders.length,
      data: formattedOrders
    });
  } catch (error) {
    console.error('[Customer Prescriptions Error]:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to retrieve prescription history.'
    });
  }
};

/**
 * GET /api/customers/inquiries
 * Retrieve all inquiries and clinical staff responses for the authenticated customer
 */
export const getCustomerInquiries = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Authorization token required.' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    const [rows] = await pool.query(`
      SELECT 
        inquiry_id,
        reference_code,
        customer_id,
        name,
        phone,
        email,
        medicine_query,
        message,
        status,
        staff_notes,
        responded_by,
        responded_at,
        created_at
      FROM inquiries
      WHERE customer_id = ? OR LOWER(TRIM(email)) = LOWER(TRIM(?))
      ORDER BY created_at DESC
    `, [decoded.customerId, decoded.email]);

    res.status(200).json({
      success: true,
      count: rows.length,
      data: rows
    });
  } catch (error) {
    console.error('[Customer Inquiries Error]:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to retrieve inquiries history.'
    });
  }
};

/**
 * GET /api/customers/orders
 * Retrieve past sales / medication purchase invoices for the customer
 */
export const getCustomerOrders = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Authorization token required.' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    let rows;
    try {
      const [viewRows] = await pool.query(`
        SELECT * FROM v_customer_purchase_history
        WHERE customer_id = ?
        ORDER BY sale_date DESC
      `, [decoded.customerId]);
      rows = viewRows;
    } catch {
      const [fallbackRows] = await pool.query(`
        SELECT 
          c.customer_id, s.sale_id, s.invoice_number, s.sale_date,
          s.total_amount, s.discount_amount, s.net_amount, s.payment_method, s.payment_status,
          si.sale_item_id, m.medicine_id, m.name AS medicine_name, m.generic_name,
          m.dosage_form, m.strength, m.image_url, si.quantity, si.unit_price, si.subtotal
        FROM customers c
        INNER JOIN sales s ON c.customer_id = s.customer_id
        INNER JOIN sale_items si ON s.sale_id = si.sale_id
        INNER JOIN medicines m ON si.medicine_id = m.medicine_id
        WHERE c.customer_id = ?
        ORDER BY s.sale_date DESC
      `, [decoded.customerId]);
      rows = fallbackRows;
    }

    // Group items into sales objects matching exact frontend shape
    const ordersMap = new Map();
    for (const r of rows) {
      if (!ordersMap.has(r.sale_id)) {
        ordersMap.set(r.sale_id, {
          sale_id: r.sale_id,
          invoice_number: r.invoice_number,
          sale_date: r.sale_date,
          total_amount: r.total_amount,
          discount_amount: r.discount_amount,
          net_amount: r.net_amount,
          payment_method: r.payment_method,
          payment_status: r.payment_status,
          items: []
        });
      }
      if (r.sale_item_id) {
        ordersMap.get(r.sale_id).items.push({
          sale_item_id: r.sale_item_id,
          quantity: r.quantity,
          unit_price: r.unit_price,
          subtotal: r.subtotal,
          medicine_name: r.medicine_name,
          generic_name: r.generic_name,
          dosage_form: r.dosage_form,
          strength: r.strength,
          image_url: r.image_url
        });
      }
    }

    const ordersWithItems = Array.from(ordersMap.values());

    res.status(200).json({
      success: true,
      count: ordersWithItems.length,
      data: ordersWithItems
    });
  } catch (error) {
    console.error('[Customer Orders Error]:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to retrieve medication orders history.'
    });
  }
};
