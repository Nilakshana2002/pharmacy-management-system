import pool from '../config/db.js';

/**
 * GET /api/reviews
 * Retrieve all approved patient reviews using Database View v_approved_reviews
 */
export const getApprovedReviews = async (req, res) => {
  try {
    let rows;
    try {
      const [viewRows] = await pool.query('SELECT * FROM v_approved_reviews LIMIT 100');
      rows = viewRows;
    } catch {
      const [fallbackRows] = await pool.query(`
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
        WHERE r.is_approved = TRUE AND r.rating BETWEEN 4 AND 5
        ORDER BY r.created_at DESC
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
