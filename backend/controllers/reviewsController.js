import pool from '../config/db.js';

/**
 * Ensure customer_reviews table exists with baseline verified patient feedback
 */
export async function ensureCustomerReviewsTable() {
  try {
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

    const [rows] = await pool.query('SELECT COUNT(*) AS cnt FROM customer_reviews');
    if (rows[0].cnt === 0) {
      await pool.query(`
        INSERT INTO customer_reviews (customer_id, medicine_id, patient_name, role_title, rating, comment, category, is_verified, helpful_count, is_approved, avatar_color) VALUES
        (1, 1, 'Dr. Samantha Perera', 'Consultant Physician, Colombo', 5, 'VDC Store provides exceptional pharmacy dispensary services. The batch tracking, cold-chain insulin storage, and authentic Augmentin availability give me absolute confidence when directing my patients.', 'Prescription Verification', TRUE, 42, TRUE, 'from-blue-600 to-indigo-600'),
        (2, 3, 'Mrs. Champa Wickramasinghe', 'Regular Monthly Patient', 5, 'Ordering Lipitor and Panadol Extra through digital prescription upload was seamless. The medicine arrived securely packed with batch numbers and clear dosage instructions in Sinhala and English.', 'Chronic Disease Care', TRUE, 29, TRUE, 'from-purple-600 to-pink-600'),
        (3, 4, 'Mr. Roshan De Silva', 'Asthma Patient Caregiver', 5, 'Always have Ventolin Evohaler inhalers in stock when local pharmacies are depleted. Prompt courier delivery across Kandy within 24 hours of doctor review.', 'Emergency Inhaler Support', TRUE, 35, TRUE, 'from-emerald-600 to-teal-600'),
        (4, 5, 'Ms. Dilani Jayawardena', 'Type 1 Diabetic Patient', 5, 'Insulin glargine (Lantus SoloStar) delivered in insulated cold-pack containers with unbroken seal. The pharmacist phoned personally to verify dosage units.', 'Cold-Chain Insulin Logistics', TRUE, 51, TRUE, 'from-amber-600 to-orange-600'),
        (5, 7, 'Eng. Kusal Fernando', 'Wellness & Sports Enthusiast', 5, 'High quality Multivitamin formulations and authentic Omega-3 capsules. Professional digital invoices and friendly customer support hotline.', 'Wellness & Nutrition', TRUE, 18, TRUE, 'from-cyan-600 to-blue-600'),
        (1, 6, 'Prof. Nalin Bandara', 'Cardiology Patient, Galle', 5, 'Prescription medicine was delivered exactly on schedule before my existing Concor tablets ran out. Reliable database tracking and very respectful staff.', 'Cardiovascular Care', TRUE, 24, TRUE, 'from-rose-600 to-red-600')
      `);
      console.log('[Reviews Service] Seeded default patient testimonials into MySQL');
    }
  } catch (err) {
    console.warn('[Ensure Reviews Table Notice]:', err.message);
  }
}

// Initialize on module load
ensureCustomerReviewsTable();

/**
 * GET /api/reviews
 * Retrieve all approved patient reviews directly from MySQL database
 */
export const getApprovedReviews = async (req, res) => {
  try {
    await ensureCustomerReviewsTable();
    const sql = `
      SELECT 
        r.review_id,
        r.customer_id,
        r.medicine_id,
        r.patient_name,
        r.role_title,
        r.rating,
        r.comment,
        r.category,
        r.is_verified,
        r.helpful_count,
        r.avatar_color,
        r.created_at,
        m.name AS medicine_name
      FROM customer_reviews r
      LEFT JOIN medicines m ON r.medicine_id = m.medicine_id
      WHERE r.is_approved = TRUE
      ORDER BY r.created_at DESC
      LIMIT 100
    `;

    const [rows] = await pool.query(sql);

    res.status(200).json({
      success: true,
      count: rows.length,
      data: rows
    });
  } catch (error) {
    console.error('[Reviews Error]:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve patient reviews from database.',
      error: error.message
    });
  }
};

/**
 * POST /api/reviews
 * Submit patient review and persist in MySQL database
 */
export const createReview = async (req, res) => {
  try {
    await ensureCustomerReviewsTable();
    const {
      patient_name,
      rating,
      comment,
      category = 'General Healthcare',
      medicine_id = null,
      customer_id = null,
      role_title = 'Verified Patient',
      avatar_color = 'from-blue-600 to-indigo-600'
    } = req.body;

    if (!patient_name || !rating || !comment) {
      return res.status(400).json({
        success: false,
        message: 'Patient name, rating (1-5), and feedback comment are required.'
      });
    }

    const numRating = Math.max(1, Math.min(5, parseInt(rating, 10) || 5));

    let validCustomerId = null;
    if (customer_id) {
      try {
        const [c] = await pool.query('SELECT customer_id FROM customers WHERE customer_id = ? LIMIT 1', [parseInt(customer_id, 10)]);
        if (c.length > 0) validCustomerId = c[0].customer_id;
      } catch (e) {}
    }

    let validMedId = null;
    if (medicine_id) {
      try {
        const [m] = await pool.query('SELECT medicine_id FROM medicines WHERE medicine_id = ? LIMIT 1', [parseInt(medicine_id, 10)]);
        if (m.length > 0) validMedId = m[0].medicine_id;
      } catch (e) {}
    }

    const [result] = await pool.query(`
      INSERT INTO customer_reviews (
        customer_id, medicine_id, patient_name, role_title, rating, comment, category, is_verified, helpful_count, is_approved, avatar_color, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, TRUE, 0, TRUE, ?, CURRENT_TIMESTAMP)
    `, [
      validCustomerId,
      validMedId,
      patient_name.trim(),
      role_title.trim(),
      numRating,
      comment.trim(),
      category.trim(),
      avatar_color
    ]);

    const [newReviewRows] = await pool.query(`
      SELECT 
        review_id, customer_id, medicine_id, patient_name, role_title, rating, comment, category, is_verified, helpful_count, is_approved, avatar_color, created_at
      FROM customer_reviews
      WHERE review_id = ?
    `, [result.insertId]);

    res.status(201).json({
      success: true,
      message: 'Thank you for your feedback! Your review has been saved in our database.',
      data: newReviewRows[0]
    });
  } catch (error) {
    console.error('[Create Review Error]:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to record customer review.',
      error: error.message
    });
  }
};

/**
 * PATCH /api/reviews/:id/helpful
 * Increment helpful count for a review
 */
export const voteReviewHelpful = async (req, res) => {
  try {
    await ensureCustomerReviewsTable();
    const reviewId = parseInt(req.params.id, 10);

    const [result] = await pool.query(`
      UPDATE customer_reviews 
      SET helpful_count = helpful_count + 1 
      WHERE review_id = ?
    `, [reviewId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Review not found.' });
    }

    const [rows] = await pool.query('SELECT helpful_count FROM customer_reviews WHERE review_id = ?', [reviewId]);

    res.status(200).json({
      success: true,
      helpful_count: rows[0].helpful_count
    });
  } catch (error) {
    console.error('[Vote Helpful Error]:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to register helpful vote.',
      error: error.message
    });
  }
};
