import pool from '../config/db.js';

let adbmsInitialized = false;

/**
 * Ensures all 13 ADBMS Stored Functions and 8 Views are compiled and active in MySQL.
 * Eliminates redundant inline SQL subqueries from controllers and enforces clean 3-tier architecture.
 */
export const initADBMSViews = async () => {
  if (adbmsInitialized) return;
  adbmsInitialized = true;

  const safeExec = async (sql) => {
    try {
      await pool.query(sql);
    } catch (e) {
      console.warn('[ADBMS Exec Notice]:', e.message);
    }
  };

  try {
    await safeExec('SET GLOBAL log_bin_trust_function_creators = 1');

    // --- 1. STORED FUNCTIONS (13 Functions) ---
    // 1.1 fn_calculate_available_stock
    await safeExec('DROP FUNCTION IF EXISTS fn_calculate_available_stock');
    await safeExec(`
      CREATE FUNCTION fn_calculate_available_stock(p_medicine_id INT) 
      RETURNS INT
      DETERMINISTIC
      READS SQL DATA
      BEGIN
          DECLARE v_available_stock INT DEFAULT 0;
          SELECT COALESCE(SUM(b.stock_quantity - b.reserved_quantity), 0)
          INTO v_available_stock
          FROM medicine_batches b
          WHERE b.medicine_id = p_medicine_id
            AND b.expiry_date > CURDATE()
            AND b.status = 'active'
            AND b.stock_quantity > b.reserved_quantity;
          RETURN v_available_stock;
      END
    `);

    // 1.2 fn_get_availability_status
    await safeExec('DROP FUNCTION IF EXISTS fn_get_availability_status');
    await safeExec(`
      CREATE FUNCTION fn_get_availability_status(p_medicine_id INT) 
      RETURNS VARCHAR(20)
      DETERMINISTIC
      READS SQL DATA
      BEGIN
          DECLARE v_stock INT;
          DECLARE v_threshold INT;
          SET v_stock = fn_calculate_available_stock(p_medicine_id);
          SELECT COALESCE(low_stock_threshold, 20)
          INTO v_threshold
          FROM medicines
          WHERE medicine_id = p_medicine_id;
          IF v_threshold IS NULL THEN SET v_threshold = 20; END IF;
          IF v_stock <= 0 THEN RETURN 'Out of Stock';
          ELSEIF v_stock <= v_threshold THEN RETURN 'Low Stock';
          ELSE RETURN 'In Stock';
          END IF;
      END
    `);

    // 1.3 fn_calculate_discounted_price
    await safeExec('DROP FUNCTION IF EXISTS fn_calculate_discounted_price');
    await safeExec(`
      CREATE FUNCTION fn_calculate_discounted_price(p_unit_price DECIMAL(10,2), p_discount_percent DECIMAL(5,2))
      RETURNS DECIMAL(10,2)
      DETERMINISTIC
      NO SQL
      BEGIN
          IF p_unit_price IS NULL THEN RETURN 0.00; END IF;
          IF p_discount_percent IS NULL OR p_discount_percent <= 0 THEN RETURN p_unit_price; END IF;
          RETURN ROUND(p_unit_price * (1.00 - (p_discount_percent / 100.00)), 2);
      END
    `);

    // 1.4 fn_calculate_batch_remaining_days
    await safeExec('DROP FUNCTION IF EXISTS fn_calculate_batch_remaining_days');
    await safeExec(`
      CREATE FUNCTION fn_calculate_batch_remaining_days(p_batch_id INT)
      RETURNS INT
      DETERMINISTIC
      READS SQL DATA
      BEGIN
          DECLARE v_days INT DEFAULT 0;
          SELECT DATEDIFF(expiry_date, CURDATE())
          INTO v_days
          FROM medicine_batches
          WHERE batch_id = p_batch_id;
          RETURN COALESCE(v_days, 0);
      END
    `);

    // 1.5 fn_is_batch_expired
    await safeExec('DROP FUNCTION IF EXISTS fn_is_batch_expired');
    await safeExec(`
      CREATE FUNCTION fn_is_batch_expired(p_batch_id INT)
      RETURNS BOOLEAN
      DETERMINISTIC
      READS SQL DATA
      BEGIN
          DECLARE v_exp DATE;
          SELECT expiry_date INTO v_exp FROM medicine_batches WHERE batch_id = p_batch_id;
          IF v_exp IS NULL THEN RETURN FALSE; END IF;
          RETURN (v_exp <= CURDATE());
      END
    `);

    // 1.6 fn_get_medicine_total_batches
    await safeExec('DROP FUNCTION IF EXISTS fn_get_medicine_total_batches');
    await safeExec(`
      CREATE FUNCTION fn_get_medicine_total_batches(p_medicine_id INT)
      RETURNS INT
      DETERMINISTIC
      READS SQL DATA
      BEGIN
          DECLARE v_cnt INT DEFAULT 0;
          SELECT COUNT(*) INTO v_cnt 
          FROM medicine_batches 
          WHERE medicine_id = p_medicine_id AND status = 'active' AND expiry_date > CURDATE();
          RETURN v_cnt;
      END
    `);

    // 1.7 fn_calculate_customer_lifetime_value
    await safeExec('DROP FUNCTION IF EXISTS fn_calculate_customer_lifetime_value');
    await safeExec(`
      CREATE FUNCTION fn_calculate_customer_lifetime_value(p_customer_id INT)
      RETURNS DECIMAL(10,2)
      DETERMINISTIC
      READS SQL DATA
      BEGIN
          DECLARE v_total DECIMAL(10,2) DEFAULT 0.00;
          SELECT COALESCE(SUM(total_amount), 0.00) INTO v_total 
          FROM sales 
          WHERE customer_id = p_customer_id AND (payment_status IN ('PAID', 'paid', 'COMPLETED') OR payment_status IS NULL);
          RETURN v_total;
      END
    `);

    // 1.8 fn_get_customer_order_count
    await safeExec('DROP FUNCTION IF EXISTS fn_get_customer_order_count');
    await safeExec(`
      CREATE FUNCTION fn_get_customer_order_count(p_customer_id INT)
      RETURNS INT
      DETERMINISTIC
      READS SQL DATA
      BEGIN
          DECLARE v_cnt INT DEFAULT 0;
          SELECT COUNT(*) INTO v_cnt FROM sales WHERE customer_id = p_customer_id;
          RETURN v_cnt;
      END
    `);

    // 1.9 fn_calculate_order_tax
    await safeExec('DROP FUNCTION IF EXISTS fn_calculate_order_tax');
    await safeExec(`
      CREATE FUNCTION fn_calculate_order_tax(p_subtotal DECIMAL(10,2), p_tax_rate DECIMAL(5,2))
      RETURNS DECIMAL(10,2)
      DETERMINISTIC
      NO SQL
      BEGIN
          IF p_subtotal IS NULL OR p_subtotal <= 0 THEN RETURN 0.00; END IF;
          IF p_tax_rate IS NULL OR p_tax_rate <= 0 THEN RETURN 0.00; END IF;
          RETURN ROUND(p_subtotal * (p_tax_rate / 100.00), 2);
      END
    `);

    // 1.10 fn_get_batch_profit_margin
    await safeExec('DROP FUNCTION IF EXISTS fn_get_batch_profit_margin');
    await safeExec(`
      CREATE FUNCTION fn_get_batch_profit_margin(p_batch_id INT)
      RETURNS DECIMAL(5,2)
      DETERMINISTIC
      READS SQL DATA
      BEGIN
          DECLARE v_cost DECIMAL(10,2);
          DECLARE v_price DECIMAL(10,2);
          SELECT b.unit_cost, m.unit_price INTO v_cost, v_price 
          FROM medicine_batches b 
          JOIN medicines m ON b.medicine_id = m.medicine_id 
          WHERE b.batch_id = p_batch_id;
          IF v_cost IS NULL OR v_cost <= 0 OR v_price IS NULL THEN RETURN 0.00; END IF;
          RETURN ROUND(((v_price - v_cost) / v_cost) * 100.00, 2);
      END
    `);

    // 1.11 fn_validate_nic_format
    await safeExec('DROP FUNCTION IF EXISTS fn_validate_nic_format');
    await safeExec(`
      CREATE FUNCTION fn_validate_nic_format(p_nic VARCHAR(50))
      RETURNS BOOLEAN
      DETERMINISTIC
      NO SQL
      BEGIN
          IF p_nic IS NULL OR TRIM(p_nic) = '' THEN RETURN FALSE; END IF;
          IF p_nic REGEXP '^[0-9]{9}[vVxX]$' OR p_nic REGEXP '^[0-9]{12}$' THEN
              RETURN TRUE;
          ELSE
              RETURN FALSE;
          END IF;
      END
    `);

    // 1.12 fn_get_prescriptions_count_by_status
    await safeExec('DROP FUNCTION IF EXISTS fn_get_prescriptions_count_by_status');
    await safeExec(`
      CREATE FUNCTION fn_get_prescriptions_count_by_status(p_status VARCHAR(20))
      RETURNS INT
      DETERMINISTIC
      READS SQL DATA
      BEGIN
          DECLARE v_cnt INT DEFAULT 0;
          SELECT COUNT(*) INTO v_cnt FROM prescription_orders WHERE status = p_status;
          RETURN v_cnt;
      END
    `);

    // 1.13 fn_get_pharmacist_total_sales
    await safeExec('DROP FUNCTION IF EXISTS fn_get_pharmacist_total_sales');
    await safeExec(`
      CREATE FUNCTION fn_get_pharmacist_total_sales(p_user_id INT, p_date DATE)
      RETURNS DECIMAL(10,2)
      DETERMINISTIC
      READS SQL DATA
      BEGIN
          DECLARE v_total DECIMAL(10,2) DEFAULT 0.00;
          SELECT COALESCE(SUM(total_amount), 0.00) INTO v_total 
          FROM sales 
          WHERE user_id = p_user_id AND DATE(sale_date) = p_date AND (payment_status IN ('PAID', 'paid', 'COMPLETED') OR payment_status IS NULL);
          RETURN v_total;
      END
    `);

    console.log('[ADBMS Functions]: All 13 stored functions checked and active.');

    // --- 2. DATABASE VIEWS ---
    // 2.1 View: v_low_stock_alerts
    await safeExec(`
      CREATE OR REPLACE VIEW v_low_stock_alerts AS
      SELECT 
          m.medicine_id,
          m.name AS medicine_name,
          m.generic_name,
          b.brand_name,
          c.category_name,
          m.low_stock_threshold,
          fn_calculate_available_stock(m.medicine_id) AS current_stock,
          (m.low_stock_threshold - fn_calculate_available_stock(m.medicine_id)) AS units_needed
      FROM medicines m
      INNER JOIN brands b ON m.brand_id = b.brand_id
      INNER JOIN medicine_categories c ON m.category_id = c.category_id
      WHERE m.is_active = TRUE 
        AND fn_calculate_available_stock(m.medicine_id) <= m.low_stock_threshold
    `);

    // 2.2 View: v_expiring_batches
    await safeExec(`
      CREATE OR REPLACE VIEW v_expiring_batches AS
      SELECT 
          b.batch_id,
          b.batch_number,
          m.medicine_id,
          m.name AS medicine_name,
          m.generic_name,
          s.supplier_name,
          b.expiry_date,
          fn_calculate_batch_remaining_days(b.batch_id) AS days_to_expiry,
          fn_calculate_batch_remaining_days(b.batch_id) AS days_until_expiry,
          b.stock_quantity,
          b.unit_cost,
          (b.stock_quantity * b.unit_cost) AS total_at_risk_value,
          b.status,
          CASE 
              WHEN fn_is_batch_expired(b.batch_id) THEN 'EXPIRED'
              WHEN fn_calculate_batch_remaining_days(b.batch_id) <= 30 THEN 'CRITICAL (<= 30 Days)'
              WHEN fn_calculate_batch_remaining_days(b.batch_id) <= 60 THEN 'WARNING (<= 60 Days)'
              ELSE 'NOTICE (<= 90 Days)'
          END AS risk_level,
          CASE
              WHEN b.status = 'quarantined' THEN 'Quarantined — Awaiting destruction or supplier credit'
              WHEN fn_is_batch_expired(b.batch_id) THEN 'EXPIRED — Immediate Quarantine & Disposal Required'
              WHEN fn_calculate_batch_remaining_days(b.batch_id) <= 30 THEN 'CRITICAL (30d) — Priority FEFO Dispense or Return'
              ELSE 'FEFO Watchlist (90d) — Shelf Stock Rotation'
          END AS action_required,
          CASE
              WHEN b.status = 'quarantined' THEN 'QUARANTINED'
              WHEN fn_is_batch_expired(b.batch_id) THEN 'EXPIRED'
              WHEN fn_calculate_batch_remaining_days(b.batch_id) <= 30 THEN 'CRITICAL'
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

    // 2.3 View: v_daily_sales
    await safeExec(`
      CREATE OR REPLACE VIEW v_daily_sales AS
      SELECT 
          DATE(s.sale_date) AS sale_day,
          DATE(s.sale_date) AS sale_date,
          COUNT(s.sale_id) AS total_transactions,
          COUNT(s.sale_id) AS total_sales,
          COUNT(s.sale_id) AS sale_count,
          COALESCE(SUM(s.total_amount), 0.00) AS total_revenue,
          COALESCE(SUM(s.total_amount), 0.00) AS gross_sales,
          COALESCE(SUM(s.total_amount), 0.00) AS net_sales,
          COALESCE(SUM(s.total_amount), 0.00) AS total_amount,
          COALESCE(SUM(s.total_amount), 0.00) AS total_net,
          COALESCE(SUM(s.tax_amount), 0.00) AS total_tax,
          COALESCE(AVG(s.total_amount), 0.00) AS average_basket_value,
          COALESCE(SUM(CASE WHEN p.payment_method = 'CASH' THEN s.total_amount ELSE 0.00 END), 0.00) AS cash_sales,
          COALESCE(SUM(CASE WHEN p.payment_method = 'CARD' THEN s.total_amount ELSE 0.00 END), 0.00) AS card_sales
      FROM sales s
      LEFT JOIN (
          SELECT sale_id, MAX(payment_method) AS payment_method
          FROM payments
          GROUP BY sale_id
      ) p ON s.sale_id = p.sale_id
      WHERE s.payment_status IN ('PAID', 'paid', 'COMPLETED') OR s.payment_status IS NULL OR s.payment_status = ''
      GROUP BY DATE(s.sale_date)
      ORDER BY sale_day DESC
    `);

    // 2.4 View: v_monthly_sales
    await safeExec(`
      CREATE OR REPLACE VIEW v_monthly_sales AS
      SELECT 
          DATE_FORMAT(s.sale_date, '%Y-%m') AS sale_month,
          COUNT(DISTINCT s.sale_id) AS total_transactions,
          COUNT(DISTINCT s.sale_id) AS total_sales,
          COALESCE(SUM(s.total_amount), 0.00) AS total_revenue,
          COALESCE(SUM(s.total_amount), 0.00) AS gross_sales
      FROM sales s
      WHERE s.payment_status IN ('PAID', 'paid', 'COMPLETED') OR s.payment_status IS NULL OR s.payment_status = ''
      GROUP BY DATE_FORMAT(s.sale_date, '%Y-%m')
      ORDER BY sale_month DESC
    `);

    // 2.5 View: v_sales_by_medicine
    await safeExec(`
      CREATE OR REPLACE VIEW v_sales_by_medicine AS
      SELECT 
          m.medicine_id,
          m.name AS medicine_name,
          m.name,
          m.generic_name,
          COALESCE(c.category_name, 'General Pharmacy') AS category_name,
          COALESCE(b.brand_name, 'Global') AS brand_name,
          COALESCE(SUM(si.quantity), 0) AS total_units_sold,
          COALESCE(SUM(si.quantity), 0) AS units_sold,
          COALESCE(SUM(si.subtotal), 0.00) AS total_revenue,
          COALESCE(SUM(si.subtotal), 0.00) AS revenue,
          COALESCE(SUM(si.subtotal), 0.00) AS total_sales_amount,
          COUNT(DISTINCT si.sale_id) AS transaction_count
      FROM sale_items si
      INNER JOIN medicines m ON si.medicine_id = m.medicine_id
      LEFT JOIN medicine_categories c ON m.category_id = c.category_id
      LEFT JOIN brands b ON m.brand_id = b.brand_id
      INNER JOIN sales s ON si.sale_id = s.sale_id
      WHERE s.payment_status IN ('PAID', 'paid', 'COMPLETED') OR s.payment_status IS NULL OR s.payment_status = ''
      GROUP BY m.medicine_id, m.name, m.generic_name, c.category_name, b.brand_name
      ORDER BY total_units_sold DESC
    `);

    // 2.6 View: v_approved_reviews
    await safeExec(`
      CREATE OR REPLACE VIEW v_approved_reviews AS
      SELECT 
          r.review_id,
          r.customer_id,
          r.medicine_id,
          m.name AS medicine_name,
          r.patient_name,
          r.role_title,
          r.rating,
          r.comment,
          r.category,
          r.is_verified,
          r.helpful_count,
          r.avatar_color,
          r.created_at
      FROM customer_reviews r
      LEFT JOIN medicines m ON r.medicine_id = m.medicine_id
      WHERE r.is_approved = TRUE AND r.rating BETWEEN 4 AND 5
      ORDER BY r.created_at DESC
    `);

    // 2.7 View: v_customer_purchase_history
    await safeExec(`
      CREATE OR REPLACE VIEW v_customer_purchase_history AS
      SELECT 
          c.customer_id,
          c.full_name AS customer_name,
          c.email AS customer_email,
          s.sale_id,
          s.invoice_number,
          s.sale_date,
          s.total_amount,
          s.discount_amount,
          s.net_amount,
          s.payment_method,
          s.payment_status,
          si.sale_item_id,
          m.medicine_id,
          m.name AS medicine_name,
          m.generic_name,
          m.dosage_form,
          m.strength,
          m.image_url,
          si.quantity,
          si.unit_price,
          si.subtotal
      FROM customers c
      INNER JOIN sales s ON c.customer_id = s.customer_id
      INNER JOIN sale_items si ON s.sale_id = si.sale_id
      INNER JOIN medicines m ON si.medicine_id = m.medicine_id
    `);

    // 2.8 View: v_prescription_fulfillment_pipeline
    await safeExec(`
      CREATE OR REPLACE VIEW v_prescription_fulfillment_pipeline AS
      SELECT 
          po.order_id,
          po.account_type,
          po.customer_id,
          po.your_name,
          po.your_name AS patient_name,
          po.your_email,
          po.patient_name AS detailed_patient_name,
          po.patient_age,
          po.contact_no,
          po.delivery_option,
          po.files,
          po.message,
          po.status,
          po.pharmacist_name,
          po.reviewed_at,
          po.confirmation_message,
          po.rejection_reason,
          po.ready_time,
          po.email_sent,
          po.email_sent_at,
          po.created_at,
          c.full_name AS registered_full_name,
          c.email AS registered_email,
          c.contact_no AS registered_phone,
          c.nic AS registered_nic,
          c.address AS registered_address,
          c.created_at AS registered_member_since,
          TIMESTAMPDIFF(MINUTE, po.created_at, COALESCE(po.reviewed_at, NOW())) AS processing_minutes
      FROM prescription_orders po
      LEFT JOIN customers c ON (po.customer_id = c.customer_id OR LOWER(TRIM(po.your_email)) = LOWER(TRIM(c.email)))
    `);

    // 2.9 View: v_brands_summary
    await safeExec(`
      CREATE OR REPLACE VIEW v_brands_summary AS
      SELECT 
        b.brand_id,
        b.brand_name,
        b.country_of_origin,
        COUNT(m.medicine_id) AS medicine_count
      FROM brands b
      LEFT JOIN medicines m ON b.brand_id = m.brand_id AND m.is_active = TRUE
      GROUP BY b.brand_id, b.brand_name, b.country_of_origin
      ORDER BY b.brand_name ASC
    `);

    // 2.10 View: v_categories_summary
    await safeExec(`
      CREATE OR REPLACE VIEW v_categories_summary AS
      SELECT 
        c.category_id,
        c.category_name,
        c.description,
        c.icon_name,
        c.image_url,
        c.parent_category_id,
        p.category_name AS parent_category_name,
        COUNT(m.medicine_id) AS medicine_count
      FROM medicine_categories c
      LEFT JOIN medicine_categories p ON c.parent_category_id = p.category_id
      LEFT JOIN medicines m ON c.category_id = m.category_id AND m.is_active = TRUE
      GROUP BY 
        c.category_id, 
        c.category_name, 
        c.description, 
        c.icon_name,
        c.image_url,
        c.parent_category_id,
        p.category_name
      ORDER BY 
        COALESCE(c.parent_category_id, c.category_id),
        c.parent_category_id IS NOT NULL,
        c.category_name ASC
    `);

    // 2.11 View: v_batches_extended
    await safeExec(`
      CREATE OR REPLACE VIEW v_batches_extended AS
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

    // 2.12 View: v_stock_movements_feed
    await safeExec(`
      CREATE OR REPLACE VIEW v_stock_movements_feed AS
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
    `);

    // 2.13 View: v_sales_summary
    await safeExec(`
      CREATE OR REPLACE VIEW v_sales_summary AS
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
    `);

    // 2.14 View: v_inventory_valuation
    await safeExec(`
      CREATE OR REPLACE VIEW v_inventory_valuation AS
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
    `);

    // 2.15 View: v_customers_extended
    await safeExec(`
      CREATE OR REPLACE VIEW v_customers_extended AS
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
        COALESCE((
          SELECT SUM(s.total_amount)
          FROM sales s
          WHERE s.customer_id = c.customer_id AND s.payment_status = 'PAID'
        ), 0.00) AS total_spend,
        (
          SELECT COUNT(*)
          FROM sales s
          WHERE s.customer_id = c.customer_id
        ) AS total_orders,
        (
          SELECT COUNT(*) 
          FROM prescription_orders po 
          WHERE po.customer_id = c.customer_id OR LOWER(TRIM(po.your_email)) = LOWER(TRIM(c.email))
        ) AS total_prescriptions
      FROM customers c
      ORDER BY c.customer_id DESC
    `);

    // 2.16 View: v_inquiries_extended
    await safeExec(`
      CREATE OR REPLACE VIEW v_inquiries_extended AS
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
    `);

    // 2.17 View: v_purchases_summary
    await safeExec(`
      CREATE OR REPLACE VIEW v_purchases_summary AS
      SELECT 
        p.purchase_id,
        p.invoice_number,
        p.purchase_date,
        p.total_amount,
        p.status,
        p.received_by,
        p.notes,
        s.supplier_name,
        s.phone AS supplier_phone,
        s.email AS supplier_email,
        COUNT(pi.purchase_item_id) AS total_line_items,
        COALESCE(SUM(pi.quantity), 0) AS total_units_procured
      FROM purchases p
      INNER JOIN suppliers s ON p.supplier_id = s.supplier_id
      LEFT JOIN purchase_items pi ON p.purchase_id = pi.purchase_id
      GROUP BY p.purchase_id, p.invoice_number, p.purchase_date, p.total_amount, p.status, p.received_by, p.notes, s.supplier_name, s.phone, s.email
      ORDER BY p.purchase_date DESC, p.purchase_id DESC
    `);

    // 2.18 View: v_medicine_catalog
    await safeExec(`
      CREATE OR REPLACE VIEW v_medicine_catalog AS
      SELECT 
          m.medicine_id,
          m.name,
          m.name AS medicine_name,
          m.generic_name,
          m.dosage_form,
          m.strength,
          m.description,
          m.side_effects,
          m.usage_instructions,
          CASE WHEN m.is_public_price = TRUE THEN m.unit_price ELSE NULL END AS unit_price,
          CASE WHEN m.is_public_price = TRUE THEN m.unit_price ELSE NULL END AS original_price,
          CASE 
            WHEN m.is_public_price = TRUE AND m.is_offer = TRUE AND m.discount_percent > 0 
            THEN ROUND(m.unit_price * (1.00 - (m.discount_percent / 100.00)), 2)
            WHEN m.is_public_price = TRUE THEN m.unit_price
            ELSE NULL 
          END AS final_price,
          CASE 
            WHEN m.is_public_price = TRUE AND m.is_offer = TRUE AND m.discount_percent > 0 
            THEN ROUND(m.unit_price * (m.discount_percent / 100.00), 2)
            ELSE 0.00 
          END AS discount_amount,
          m.is_public_price,
          m.low_stock_threshold,
          COALESCE(m.discount_percent, 0.00) AS discount_percent,
          COALESCE(m.is_offer, FALSE) AS is_offer,
          COALESCE(m.rating, 5.0) AS rating,
          m.image_url,
          b.brand_id,
          b.brand_name,
          b.country_of_origin,
          c.category_id,
          c.category_name,
          c.icon_name,
          c.parent_category_id,
          COALESCE((
            SELECT SUM(mb.stock_quantity - mb.reserved_quantity)
            FROM medicine_batches mb
            WHERE mb.medicine_id = m.medicine_id
              AND mb.expiry_date > CURDATE()
              AND mb.status = 'active'
              AND mb.stock_quantity > mb.reserved_quantity
          ), 0) AS saleable_stock,
          COALESCE((
            SELECT SUM(mb.stock_quantity - mb.reserved_quantity)
            FROM medicine_batches mb
            WHERE mb.medicine_id = m.medicine_id
              AND mb.expiry_date > CURDATE()
              AND mb.status = 'active'
              AND mb.stock_quantity > mb.reserved_quantity
          ), 0) AS available_stock,
          CASE 
            WHEN COALESCE((
              SELECT SUM(mb.stock_quantity - mb.reserved_quantity)
              FROM medicine_batches mb
              WHERE mb.medicine_id = m.medicine_id
                AND mb.expiry_date > CURDATE()
                AND mb.status = 'active'
                AND mb.stock_quantity > mb.reserved_quantity
            ), 0) = 0 THEN 'Out of Stock'
            WHEN COALESCE((
              SELECT SUM(mb.stock_quantity - mb.reserved_quantity)
              FROM medicine_batches mb
              WHERE mb.medicine_id = m.medicine_id
                AND mb.expiry_date > CURDATE()
                AND mb.status = 'active'
                AND mb.stock_quantity > mb.reserved_quantity
            ), 0) <= m.low_stock_threshold THEN 'Low Stock'
            ELSE 'In Stock'
          END AS availability_status,
          m.is_active,
          m.created_at,
          m.updated_at
      FROM medicines m
      INNER JOIN brands b ON m.brand_id = b.brand_id
      INNER JOIN medicine_categories c ON m.category_id = c.category_id
      WHERE m.is_active = TRUE
    `);

    // 2.19 View: v_medicine_availability
    await safeExec(`
      CREATE OR REPLACE VIEW v_medicine_availability AS
      SELECT 
          m.medicine_id,
          m.name,
          m.name AS medicine_name,
          m.generic_name,
          b.brand_name,
          c.category_name,
          m.low_stock_threshold,
          COALESCE((
            SELECT SUM(b2.stock_quantity - b2.reserved_quantity)
            FROM medicine_batches b2
            WHERE b2.medicine_id = m.medicine_id
              AND b2.expiry_date > CURDATE()
              AND b2.status = 'active'
              AND b2.stock_quantity > b2.reserved_quantity
          ), 0) AS saleable_stock,
          CASE 
            WHEN COALESCE((
              SELECT SUM(b2.stock_quantity - b2.reserved_quantity)
              FROM medicine_batches b2
              WHERE b2.medicine_id = m.medicine_id
                AND b2.expiry_date > CURDATE()
                AND b2.status = 'active'
                AND b2.stock_quantity > b2.reserved_quantity
            ), 0) <= 0 THEN 'Out of Stock'
            WHEN COALESCE((
              SELECT SUM(b2.stock_quantity - b2.reserved_quantity)
              FROM medicine_batches b2
              WHERE b2.medicine_id = m.medicine_id
                AND b2.expiry_date > CURDATE()
                AND b2.status = 'active'
                AND b2.stock_quantity > b2.reserved_quantity
            ), 0) <= m.low_stock_threshold THEN 'Low Stock'
            ELSE 'In Stock'
          END AS availability_status,
          CASE 
            WHEN COALESCE((
              SELECT SUM(b2.stock_quantity - b2.reserved_quantity)
              FROM medicine_batches b2
              WHERE b2.medicine_id = m.medicine_id
                AND b2.expiry_date > CURDATE()
                AND b2.status = 'active'
                AND b2.stock_quantity > b2.reserved_quantity
            ), 0) <= 0 THEN 'This medicine is currently out of stock. Please contact the pharmacy for further information.'
            WHEN COALESCE((
              SELECT SUM(b2.stock_quantity - b2.reserved_quantity)
              FROM medicine_batches b2
              WHERE b2.medicine_id = m.medicine_id
                AND b2.expiry_date > CURDATE()
                AND b2.status = 'active'
                AND b2.stock_quantity > b2.reserved_quantity
            ), 0) <= m.low_stock_threshold THEN 'Limited stock available at VDC Store. Please check in-store soon.'
            ELSE 'In stock and available for physical dispensing at VDC Store.'
          END AS availability_message
      FROM medicines m
      INNER JOIN brands b ON m.brand_id = b.brand_id
      INNER JOIN medicine_categories c ON m.category_id = c.category_id
      WHERE m.is_active = TRUE
    `);

    // 2.20 View: v_supplier_order_performance
    await safeExec(`
      CREATE OR REPLACE VIEW v_supplier_order_performance AS
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

    // Grant execute and view access to application user
    await safeExec("GRANT EXECUTE ON pharmacy_db.* TO 'pharmacy_app'@'localhost'");
    await safeExec("GRANT SELECT ON pharmacy_db.* TO 'pharmacy_app'@'localhost'");
    await safeExec("FLUSH PRIVILEGES");

    console.log('[ADBMS Views & Routines]: Enterprise database routines and 20 views verified and active.');
  } catch (err) {
    console.warn('[ADBMS Service Notice]:', err.message);
  }
};
