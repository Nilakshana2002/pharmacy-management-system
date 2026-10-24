import pool from '../config/db.js';
import crypto from 'crypto';

let inquiriesTableChecked = false;

/**
 * Inquiries and notification_logs tables are managed via database/schema.sql
 */
export async function ensureInquiriesTable() {
  if (inquiriesTableChecked) return;
  inquiriesTableChecked = true;
  try {
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
  } catch (err) {
    console.warn('[Ensure Inquiries Table Notice]:', err.message);
  }
}

/**
 * POST /api/inquiries
 * Submit customer contact message or medicine inquiry into MySQL database
 */
export const createInquiry = async (req, res) => {
  try {
    await ensureInquiriesTable();
    const {
      name,
      phone,
      email,
      medicine_query,
      message,
      customer_id = null
    } = req.body;

    if (!name || (!phone && !email) || !message) {
      return res.status(400).json({
        success: false,
        message: 'Name, contact detail (email or phone), and message are mandatory.'
      });
    }

    // Generate unique reference code: INQ-XXXXXX
    const randomHex = crypto.randomBytes(3).toString('hex').toUpperCase();
    const refCode = `INQ-${randomHex}`;

    let validCustomerId = null;
    if (customer_id) {
      try {
        const [c] = await pool.query('SELECT customer_id FROM customers WHERE customer_id = ? LIMIT 1', [parseInt(customer_id, 10)]);
        if (c.length > 0) validCustomerId = c[0].customer_id;
      } catch (e) {}
    }

    if (!validCustomerId && email) {
      try {
        const [c] = await pool.query('SELECT customer_id FROM customers WHERE LOWER(TRIM(email)) = LOWER(TRIM(?)) LIMIT 1', [email.trim()]);
        if (c.length > 0) validCustomerId = c[0].customer_id;
      } catch (e) {}
    }

    const [result] = await pool.query(`
      INSERT INTO inquiries (
        reference_code, customer_id, name, phone, email, medicine_query, message, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'NEW', CURRENT_TIMESTAMP)
    `, [
      refCode,
      validCustomerId,
      name.trim(),
      phone ? phone.trim() : null,
      email ? email.trim() : null,
      medicine_query ? medicine_query.trim() : null,
      message.trim()
    ]);

    // Also record receipt notification in notification_logs table (relational audit trail)
    if (email) {
      try {
        await pool.query(`
          INSERT INTO notification_logs (
            customer_id, recipient_email, recipient_name, subject, message_body, notification_type, status, sent_at
          ) VALUES (?, ?, ?, ?, ?, 'INQUIRY_RECEIVED', 'SENT', CURRENT_TIMESTAMP)
        `, [
          validCustomerId,
          email.trim(),
          name.trim(),
          `Inquiry Confirmation [${refCode}] - VDC Store Pharmacy`,
          `Dear ${name},\n\nWe have received your pharmaceutical inquiry regarding "${medicine_query || 'general consultation'}". Our registered pharmacists are reviewing your message and will respond promptly.\n\nYour Reference Code: ${refCode}\n\nWarm regards,\nVDC Store Pharmacy Team`
        ]);
      } catch (notifErr) {
        console.warn('[Inquiry Notification Log Warning]:', notifErr.message);
      }
    }

    res.status(201).json({
      success: true,
      message: 'Your inquiry has been submitted and registered in our database.',
      reference_code: refCode,
      inquiry_id: result.insertId
    });
  } catch (error) {
    console.error('[Create Inquiry Error]:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to record your inquiry.',
      error: error.message
    });
  }
};

/**
 * GET /api/inquiries/:ref
 * Track inquiry status by reference code
 */
export const getInquiryByRef = async (req, res) => {
  try {
    await ensureInquiriesTable();
    const { ref } = req.params;

    const [rows] = await pool.query(`
      SELECT 
        inquiry_id,
        reference_code,
        name,
        email,
        phone,
        medicine_query,
        message,
        status,
        staff_notes,
        responded_by,
        responded_at,
        created_at
      FROM inquiries
      WHERE UPPER(reference_code) = ?
      LIMIT 1
    `, [ref.trim().toUpperCase()]);

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Inquiry with reference code '${ref}' was not found.`
      });
    }

    res.status(200).json({
      success: true,
      data: rows[0]
    });
  } catch (error) {
    console.error('[Get Inquiry Error]:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve inquiry record.',
      error: error.message
    });
  }
};
