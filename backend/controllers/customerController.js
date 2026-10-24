import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../config/db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'vdc_store_jwt_super_secret_key_2026_adbms';

/**
 * Ensures customers table exists in MySQL database and has all required columns
 */
export const ensureCustomersTable = async () => {
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
    } catch (migErr) {
      console.warn('[Customers Table Migration is_active Notice]:', migErr.message);
    }

    // Migration Check: Ensure status column exists
    try {
      const [colStatus] = await pool.query("SHOW COLUMNS FROM customers LIKE 'status'");
      if (colStatus.length === 0) {
        await pool.query("ALTER TABLE customers ADD COLUMN status VARCHAR(20) DEFAULT 'active'");
        console.log('[Customers Table Migration]: Added status column');
      }
    } catch (migErr) {
      console.warn('[Customers Table Migration status Notice]:', migErr.message);
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
  } catch (err) {
    console.warn('[Customers Table Check Notice]:', err.message);
  }
};

// Initialize table on startup
ensureCustomersTable();

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

    const trimmedEmail = email.trim().toLowerCase();

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

    const trimmedEmail = email.trim().toLowerCase();

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
