-- ============================================================
-- VDC STORE / MY PHARMACIST MANAGEMENT SYSTEM
-- Database Routines: Functions, Views, Procedures, Triggers & Events
-- Module: Advanced Database Management System (ADBMS) Coursework
-- Comprehensive Enterprise Roster: 
--   • 13 Stored Functions
--   • 14 Database Views
--   • 11 Stored Procedures
--   • 8 Database Triggers
--   • 8 Scheduled Events
-- ============================================================

USE pharmacy_db;

-- Enable MySQL Event Scheduler for scheduled background tasks
SET GLOBAL event_scheduler = ON;

-- ============================================================
-- SECTION 1: STORED FUNCTIONS (13 Functions)
-- Reusable scalar functions for stock, pricing & validation logic
-- ============================================================

DELIMITER $$

-- 1.1 Calculate current saleable stock for a medicine
DROP FUNCTION IF EXISTS fn_calculate_available_stock$$
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
END$$

-- 1.2 Determine availability status enum: 'In Stock', 'Low Stock', 'Out of Stock'
DROP FUNCTION IF EXISTS fn_get_availability_status$$
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
END$$

-- 1.3 Calculate Net Unit Price After Promotional Discount
DROP FUNCTION IF EXISTS fn_calculate_discounted_price$$
CREATE FUNCTION fn_calculate_discounted_price(p_unit_price DECIMAL(10,2), p_discount_percent DECIMAL(5,2))
RETURNS DECIMAL(10,2)
DETERMINISTIC
NO SQL
BEGIN
    IF p_unit_price IS NULL THEN RETURN 0.00; END IF;
    IF p_discount_percent IS NULL OR p_discount_percent <= 0 THEN RETURN p_unit_price; END IF;
    RETURN ROUND(p_unit_price * (1.00 - (p_discount_percent / 100.00)), 2);
END$$

-- 1.4 Calculate Remaining Days Until Expiration For a Batch
DROP FUNCTION IF EXISTS fn_calculate_batch_remaining_days$$
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
END$$

-- 1.5 Boolean Check: Is a Given Batch Expired?
DROP FUNCTION IF EXISTS fn_is_batch_expired$$
CREATE FUNCTION fn_is_batch_expired(p_batch_id INT)
RETURNS BOOLEAN
DETERMINISTIC
READS SQL DATA
BEGIN
    DECLARE v_exp DATE;
    SELECT expiry_date INTO v_exp FROM medicine_batches WHERE batch_id = p_batch_id;
    IF v_exp IS NULL THEN RETURN FALSE; END IF;
    RETURN (v_exp <= CURDATE());
END$$

-- 1.6 Count Active Batches for a Given Medicine
DROP FUNCTION IF EXISTS fn_get_medicine_total_batches$$
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
END$$

-- 1.7 Calculate Patient / Customer Lifetime Spend Value (CLV)
DROP FUNCTION IF EXISTS fn_calculate_customer_lifetime_value$$
CREATE FUNCTION fn_calculate_customer_lifetime_value(p_customer_id INT)
RETURNS DECIMAL(10,2)
DETERMINISTIC
READS SQL DATA
BEGIN
    DECLARE v_total DECIMAL(10,2) DEFAULT 0.00;
    SELECT COALESCE(SUM(total_amount), 0.00) INTO v_total 
    FROM sales 
    WHERE customer_id = p_customer_id AND payment_status = 'PAID';
    RETURN v_total;
END$$

-- 1.8 Total Completed Counter & Prescription Sales Count for a Customer
DROP FUNCTION IF EXISTS fn_get_customer_order_count$$
CREATE FUNCTION fn_get_customer_order_count(p_customer_id INT)
RETURNS INT
DETERMINISTIC
READS SQL DATA
BEGIN
    DECLARE v_cnt INT DEFAULT 0;
    SELECT COUNT(*) INTO v_cnt FROM sales WHERE customer_id = p_customer_id;
    RETURN v_cnt;
END$$

-- 1.9 Calculate Sales / Healthcare Tax Amount
DROP FUNCTION IF EXISTS fn_calculate_order_tax$$
CREATE FUNCTION fn_calculate_order_tax(p_subtotal DECIMAL(10,2), p_tax_rate DECIMAL(5,2))
RETURNS DECIMAL(10,2)
DETERMINISTIC
NO SQL
BEGIN
    IF p_subtotal IS NULL OR p_subtotal <= 0 THEN RETURN 0.00; END IF;
    IF p_tax_rate IS NULL OR p_tax_rate <= 0 THEN RETURN 0.00; END IF;
    RETURN ROUND(p_subtotal * (p_tax_rate / 100.00), 2);
END$$

-- 1.10 Calculate Inventory Markup / Profit Margin Percentage for a Batch
DROP FUNCTION IF EXISTS fn_get_batch_profit_margin$$
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
END$$

-- 1.11 Validate Sri Lankan National Identity Card (NIC) Format
DROP FUNCTION IF EXISTS fn_validate_nic_format$$
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
END$$

-- 1.12 Count Prescription Orders by Status
DROP FUNCTION IF EXISTS fn_get_prescriptions_count_by_status$$
CREATE FUNCTION fn_get_prescriptions_count_by_status(p_status VARCHAR(20))
RETURNS INT
DETERMINISTIC
READS SQL DATA
BEGIN
    DECLARE v_cnt INT DEFAULT 0;
    SELECT COUNT(*) INTO v_cnt FROM prescription_orders WHERE status = p_status;
    RETURN v_cnt;
END$$

-- 1.13 Calculate Pharmacist / Cashier Total Sales on a Specific Date
DROP FUNCTION IF EXISTS fn_get_pharmacist_total_sales$$
CREATE FUNCTION fn_get_pharmacist_total_sales(p_user_id INT, p_date DATE)
RETURNS DECIMAL(10,2)
DETERMINISTIC
READS SQL DATA
BEGIN
    DECLARE v_total DECIMAL(10,2) DEFAULT 0.00;
    SELECT COALESCE(SUM(total_amount), 0.00) INTO v_total 
    FROM sales 
    WHERE user_id = p_user_id AND DATE(sale_date) = p_date AND payment_status = 'PAID';
    RETURN v_total;
END$$

DELIMITER ;


-- ============================================================
-- SECTION 2: DATABASE VIEWS (14 Views)
-- Pre-aggregated, normalized and security-sanitized virtual tables
-- ============================================================

-- 2.1 Public Medicine Catalog View
DROP VIEW IF EXISTS v_medicine_catalog;
CREATE VIEW v_medicine_catalog AS
SELECT 
    m.medicine_id,
    m.name AS medicine_name,
    m.generic_name,
    b.brand_id,
    b.brand_name,
    b.country_of_origin,
    c.category_id,
    c.category_name,
    c.parent_category_id,
    m.dosage_form,
    m.strength,
    m.description,
    m.side_effects,
    m.usage_instructions,
    m.unit_price,
    m.discount_percent,
    fn_calculate_discounted_price(m.unit_price, m.discount_percent) AS discounted_price,
    m.is_offer,
    m.rating,
    m.image_url,
    m.is_public_price,
    m.low_stock_threshold,
    fn_calculate_available_stock(m.medicine_id) AS available_stock,
    fn_get_availability_status(m.medicine_id) AS availability_status,
    m.is_active,
    m.created_at,
    m.updated_at
FROM medicines m
INNER JOIN brands b ON m.brand_id = b.brand_id
INNER JOIN medicine_categories c ON m.category_id = c.category_id
WHERE m.is_active = TRUE;


-- 2.2 Public Medicine Availability Summary View
DROP VIEW IF EXISTS v_medicine_availability;
CREATE VIEW v_medicine_availability AS
SELECT 
    m.medicine_id,
    m.name AS medicine_name,
    m.generic_name,
    b.brand_name,
    c.category_name,
    fn_calculate_available_stock(m.medicine_id) AS available_stock,
    fn_get_availability_status(m.medicine_id) AS availability_status,
    CASE 
        WHEN fn_calculate_available_stock(m.medicine_id) <= 0 
            THEN 'This medicine is currently out of stock. Please contact the pharmacy for further information.'
        WHEN fn_calculate_available_stock(m.medicine_id) <= m.low_stock_threshold 
            THEN 'Limited stock available at VDC Store. Please check in-store soon.'
        ELSE 'In stock and available for physical dispensing at VDC Store.'
    END AS availability_message
FROM medicines m
INNER JOIN brands b ON m.brand_id = b.brand_id
INNER JOIN medicine_categories c ON m.category_id = c.category_id
WHERE m.is_active = TRUE;


-- 2.3 Low Stock Alerts View (Pharmacist Dashboard)
DROP VIEW IF EXISTS v_low_stock_alerts;
CREATE VIEW v_low_stock_alerts AS
SELECT 
    m.medicine_id,
    m.name AS medicine_name,
    m.generic_name,
    b.brand_name,
    c.category_name,
    fn_calculate_available_stock(m.medicine_id) AS current_stock,
    m.low_stock_threshold,
    fn_get_availability_status(m.medicine_id) AS stock_status,
    (m.low_stock_threshold - fn_calculate_available_stock(m.medicine_id)) AS deficit_quantity
FROM medicines m
INNER JOIN brands b ON m.brand_id = b.brand_id
INNER JOIN medicine_categories c ON m.category_id = c.category_id
WHERE m.is_active = TRUE
  AND fn_calculate_available_stock(m.medicine_id) <= m.low_stock_threshold;


-- 2.4 Expiring & Quarantined Batches View (Risk Analysis)
DROP VIEW IF EXISTS v_expiring_batches;
CREATE VIEW v_expiring_batches AS
SELECT 
    b.batch_id,
    b.batch_number,
    m.medicine_id,
    m.name AS medicine_name,
    s.supplier_name,
    b.expiry_date,
    DATEDIFF(b.expiry_date, CURDATE()) AS days_until_expiry,
    b.stock_quantity,
    b.unit_cost,
    (b.stock_quantity * b.unit_cost) AS total_at_risk_value,
    b.status,
    CASE 
        WHEN b.expiry_date <= CURDATE() THEN 'EXPIRED'
        WHEN DATEDIFF(b.expiry_date, CURDATE()) <= 30 THEN 'CRITICAL (<= 30 Days)'
        WHEN DATEDIFF(b.expiry_date, CURDATE()) <= 60 THEN 'WARNING (<= 60 Days)'
        ELSE 'NOTICE (<= 90 Days)'
    END AS risk_level
FROM medicine_batches b
INNER JOIN medicines m ON b.medicine_id = m.medicine_id
INNER JOIN suppliers s ON b.supplier_id = s.supplier_id
WHERE b.stock_quantity > 0
  AND (b.expiry_date <= DATE_ADD(CURDATE(), INTERVAL 90 DAY) OR b.status = 'quarantined');


-- 2.5 Daily Sales Summary View
DROP VIEW IF EXISTS v_daily_sales;
CREATE VIEW v_daily_sales AS
SELECT 
    DATE(s.sale_date) AS sales_date,
    COUNT(s.sale_id) AS total_invoices,
    COALESCE(SUM(s.subtotal), 0.00) AS gross_sales,
    COALESCE(SUM(s.discount_amount), 0.00) AS total_discounts,
    COALESCE(SUM(s.tax_amount), 0.00) AS total_tax,
    COALESCE(SUM(s.total_amount), 0.00) AS net_sales
FROM sales s
WHERE s.payment_status = 'PAID'
GROUP BY DATE(s.sale_date);


-- 2.6 Monthly Sales Analytics View
DROP VIEW IF EXISTS v_monthly_sales;
CREATE VIEW v_monthly_sales AS
SELECT 
    YEAR(s.sale_date) AS sales_year,
    MONTH(s.sale_date) AS sales_month,
    MONTHNAME(s.sale_date) AS month_name,
    COUNT(s.sale_id) AS total_invoices,
    COALESCE(SUM(s.subtotal), 0.00) AS gross_sales,
    COALESCE(SUM(s.discount_amount), 0.00) AS total_discounts,
    COALESCE(SUM(s.total_amount), 0.00) AS net_revenue
FROM sales s
WHERE s.payment_status = 'PAID'
GROUP BY YEAR(s.sale_date), MONTH(s.sale_date), MONTHNAME(s.sale_date);


-- 2.7 Sales by Medicine View (Formulary Demand)
DROP VIEW IF EXISTS v_sales_by_medicine;
CREATE VIEW v_sales_by_medicine AS
SELECT 
    m.medicine_id,
    m.name AS medicine_name,
    m.generic_name,
    c.category_name,
    COALESCE(SUM(si.quantity), 0) AS total_units_sold,
    COALESCE(SUM(si.subtotal), 0.00) AS total_revenue_generated,
    COUNT(DISTINCT s.sale_id) AS times_dispensed
FROM medicines m
INNER JOIN medicine_categories c ON m.category_id = c.category_id
LEFT JOIN sale_items si ON m.medicine_id = si.medicine_id
LEFT JOIN sales s ON si.sale_id = s.sale_id AND s.payment_status = 'PAID'
GROUP BY m.medicine_id, m.name, m.generic_name, c.category_name;


-- 2.8 Cashier Payment Breakdown View
DROP VIEW IF EXISTS v_payment_summary;
CREATE VIEW v_payment_summary AS
SELECT 
    p.payment_method,
    COUNT(p.payment_id) AS transaction_count,
    COALESCE(SUM(p.amount_paid), 0.00) AS total_collected,
    COALESCE(SUM(p.change_given), 0.00) AS total_change_returned,
    COALESCE(SUM(p.amount_paid - p.change_given), 0.00) AS net_received
FROM payments p
GROUP BY p.payment_method;


-- 2.9 Active Promotional Vouchers View
DROP VIEW IF EXISTS v_active_promotions;
CREATE VIEW v_active_promotions AS
SELECT 
    promotion_id,
    code,
    title,
    description,
    discount_type,
    discount_value,
    min_order_amount,
    badge,
    category,
    tag,
    valid_from,
    valid_until
FROM promotions
WHERE is_active = TRUE
  AND (valid_from IS NULL OR valid_from <= CURDATE())
  AND (valid_until IS NULL OR valid_until >= CURDATE());


-- 2.10 Approved Patient Testimonials View
DROP VIEW IF EXISTS v_approved_reviews;
CREATE VIEW v_approved_reviews AS
SELECT 
    r.review_id,
    r.patient_name,
    r.role_title,
    r.rating,
    r.comment,
    r.category,
    r.is_verified,
    r.helpful_count,
    r.avatar_color,
    m.name AS medicine_name,
    r.created_at
FROM customer_reviews r
LEFT JOIN medicines m ON r.medicine_id = m.medicine_id
WHERE r.is_approved = TRUE AND r.rating BETWEEN 4 AND 5;


-- 2.11 Customer Dispensation History View
DROP VIEW IF EXISTS v_customer_purchase_history;
CREATE VIEW v_customer_purchase_history AS
SELECT 
    c.customer_id,
    c.full_name AS customer_name,
    c.email AS customer_email,
    c.contact_no,
    s.sale_id,
    s.invoice_number,
    s.sale_date,
    s.total_amount,
    s.payment_status,
    si.medicine_id,
    m.name AS medicine_name,
    si.quantity,
    si.unit_price,
    si.subtotal AS item_subtotal
FROM customers c
INNER JOIN sales s ON c.customer_id = s.customer_id
INNER JOIN sale_items si ON s.sale_id = si.sale_id
INNER JOIN medicines m ON si.medicine_id = m.medicine_id;


-- 2.12 Supplier Wholesale Performance View
DROP VIEW IF EXISTS v_supplier_order_performance;
CREATE VIEW v_supplier_order_performance AS
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
GROUP BY s.supplier_id, s.supplier_name, s.contact_person, s.phone, s.email;


-- 2.13 Prescription Fulfillment Pipeline View
DROP VIEW IF EXISTS v_prescription_fulfillment_pipeline;
CREATE VIEW v_prescription_fulfillment_pipeline AS
SELECT 
    po.order_id,
    po.account_type,
    po.customer_id,
    po.your_name AS patient_name,
    po.your_email,
    po.contact_no,
    po.delivery_option,
    po.status,
    po.files_count,
    po.pharmacist_name,
    po.reviewed_at,
    po.confirmation_message,
    po.rejection_reason,
    po.ready_time,
    po.created_at,
    TIMESTAMPDIFF(MINUTE, po.created_at, COALESCE(po.reviewed_at, NOW())) AS processing_minutes
FROM prescription_orders po;


-- 2.15 Patient Inquiries & Consultations View
DROP VIEW IF EXISTS v_patient_inquiries;
CREATE VIEW v_patient_inquiries AS
SELECT 
    i.inquiry_id,
    i.reference_code,
    i.customer_id,
    i.name AS patient_name,
    i.email AS patient_email,
    i.phone,
    i.medicine_query,
    i.message,
    i.status,
    i.staff_notes,
    i.responded_by,
    i.responded_at,
    i.created_at
FROM inquiries i;


-- 2.14 Pharmacist Dispensing Workload View
DROP VIEW IF EXISTS v_pharmacist_dispensing_workload;
CREATE VIEW v_pharmacist_dispensing_workload AS
SELECT 
    u.user_id,
    u.username,
    u.full_name AS staff_name,
    u.role,
    COUNT(DISTINCT s.sale_id) AS total_sales_processed,
    COALESCE(SUM(s.total_amount), 0.00) AS total_sales_revenue,
    (SELECT COUNT(*) FROM prescription_orders po WHERE po.pharmacist_name = u.full_name) AS prescriptions_reviewed
FROM users u
LEFT JOIN sales s ON u.user_id = s.user_id
GROUP BY u.user_id, u.username, u.full_name, u.role;



-- ============================================================
-- SECTION 3: STORED PROCEDURES (11 Procedures)
-- ACID transactions & reusable operational database workflows
-- ============================================================

DELIMITER $$

-- 3.1 Update Batch Stock with Audit & Bounds Checking
DROP PROCEDURE IF EXISTS sp_update_batch_stock$$
CREATE PROCEDURE sp_update_batch_stock(
    IN p_batch_id INT,
    IN p_quantity_change INT,
    IN p_movement_type VARCHAR(20),
    IN p_reason VARCHAR(255),
    IN p_performed_by VARCHAR(100)
)
proc_label: BEGIN
    DECLARE v_current_stock INT;
    DECLARE v_new_stock INT;
    
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;

    SELECT stock_quantity INTO v_current_stock
    FROM medicine_batches
    WHERE batch_id = p_batch_id
    FOR UPDATE;

    IF v_current_stock IS NULL THEN
        ROLLBACK;
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Target physical inventory batch not found.';
    END IF;

    SET v_new_stock = v_current_stock + p_quantity_change;

    IF v_new_stock < 0 THEN
        ROLLBACK;
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Insufficient stock in batch. Stock quantity cannot be negative.';
    END IF;

    UPDATE medicine_batches
    SET stock_quantity = v_new_stock,
        status = CASE 
            WHEN v_new_stock = 0 THEN 'depleted'
            WHEN status = 'depleted' AND v_new_stock > 0 THEN 'active'
            ELSE status
        END,
        updated_at = CURRENT_TIMESTAMP
    WHERE batch_id = p_batch_id;

    INSERT INTO stock_movements (batch_id, movement_type, quantity_changed, reason, performed_by)
    VALUES (p_batch_id, p_movement_type, p_quantity_change, p_reason, p_performed_by);

    COMMIT;
END$$


-- 3.2 Inbound Wholesale Shipment Receipt & Lot Creation
DROP PROCEDURE IF EXISTS sp_receive_new_batch$$
CREATE PROCEDURE sp_receive_new_batch(
    IN p_medicine_id INT,
    IN p_supplier_id INT,
    IN p_batch_number VARCHAR(80),
    IN p_manufacture_date DATE,
    IN p_expiry_date DATE,
    IN p_quantity INT,
    IN p_unit_cost DECIMAL(10,2),
    IN p_received_by VARCHAR(100)
)
BEGIN
    DECLARE v_batch_id INT;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    IF p_expiry_date <= p_manufacture_date THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Batch expiry date must be strictly after manufacture date.';
    END IF;

    IF p_quantity <= 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Received batch quantity must be greater than zero.';
    END IF;

    START TRANSACTION;

    INSERT INTO medicine_batches (
        medicine_id, supplier_id, batch_number, manufacture_date,
        expiry_date, quantity_received, stock_quantity, reserved_quantity,
        unit_cost, status
    ) VALUES (
        p_medicine_id, p_supplier_id, p_batch_number, p_manufacture_date,
        p_expiry_date, p_quantity, p_quantity, 0,
        p_unit_cost, 'active'
    );

    SET v_batch_id = LAST_INSERT_ID();

    INSERT INTO stock_movements (batch_id, movement_type, quantity_changed, reason, performed_by)
    VALUES (v_batch_id, 'RESTOCK', p_quantity, CONCAT('New shipment received. Lot: ', p_batch_number), p_received_by);

    COMMIT;
    SELECT v_batch_id AS new_batch_id;
END$$


-- 3.3 High-Level Inventory Health Check
DROP PROCEDURE IF EXISTS sp_get_inventory_summary$$
CREATE PROCEDURE sp_get_inventory_summary()
BEGIN
    SELECT 
        (SELECT COUNT(*) FROM medicines WHERE is_active = TRUE) AS active_catalog_medicines,
        (SELECT COUNT(*) FROM medicine_batches WHERE status = 'active' AND expiry_date > CURDATE()) AS active_lots,
        (SELECT COUNT(*) FROM medicine_batches WHERE expiry_date <= CURDATE() AND stock_quantity > 0) AS expired_lots_holding_stock,
        (SELECT COUNT(*) FROM medicine_batches WHERE status = 'quarantined') AS quarantined_lots,
        (SELECT COUNT(*) FROM medicine_batches WHERE status = 'depleted') AS depleted_lots,
        (SELECT COUNT(*) FROM v_low_stock_alerts) AS critical_low_stock_medicines,
        (SELECT COALESCE(SUM(stock_quantity * unit_cost), 0.00) FROM medicine_batches WHERE status = 'active') AS total_valuation_at_cost;
END$$


-- 3.4 Atomic POS Counter Sale with Pessimistic Locking & FIFO Batch Deduction
DROP PROCEDURE IF EXISTS sp_create_pos_sale$$
CREATE PROCEDURE sp_create_pos_sale(
    IN p_invoice_number VARCHAR(60),
    IN p_user_id INT,
    IN p_customer_id INT,
    IN p_patient_name VARCHAR(150),
    IN p_prescription_ref VARCHAR(100),
    IN p_subtotal DECIMAL(10, 2),
    IN p_discount_amount DECIMAL(10, 2),
    IN p_tax_amount DECIMAL(10, 2),
    IN p_total_amount DECIMAL(10, 2),
    IN p_payment_method VARCHAR(20),
    IN p_amount_paid DECIMAL(10, 2),
    IN p_items_json JSON
)
BEGIN
    DECLARE v_sale_id INT;
    DECLARE v_change_given DECIMAL(10, 2) DEFAULT 0.00;
    DECLARE v_item_count INT;
    DECLARE i INT DEFAULT 0;
    
    DECLARE v_med_id INT;
    DECLARE v_req_qty INT;
    DECLARE v_unit_price DECIMAL(10, 2);
    DECLARE v_item_subtotal DECIMAL(10, 2);
    DECLARE v_packaging VARCHAR(100);
    DECLARE v_sale_item_id INT;
    
    DECLARE v_avail_stock INT;
    DECLARE v_remaining_to_deduct INT;
    DECLARE v_batch_id INT;
    DECLARE v_batch_stock INT;
    DECLARE v_alloc_qty INT;
    DECLARE v_done INT DEFAULT FALSE;
    
    DECLARE batch_cursor CURSOR FOR 
        SELECT batch_id, (stock_quantity - reserved_quantity) AS allocatable
        FROM medicine_batches
        WHERE medicine_id = v_med_id
          AND status = 'active'
          AND expiry_date > CURDATE()
          AND (stock_quantity - reserved_quantity) > 0
        ORDER BY expiry_date ASC, batch_id ASC
        FOR UPDATE;
        
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET v_done = TRUE;
    
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    IF p_amount_paid >= p_total_amount THEN
        SET v_change_given = p_amount_paid - p_total_amount;
    ELSE
        SET v_change_given = 0.00;
    END IF;

    START TRANSACTION;

    INSERT INTO sales (
        invoice_number, user_id, customer_id, patient_name, prescription_ref,
        subtotal, discount_amount, tax_amount, total_amount, payment_status
    ) VALUES (
        p_invoice_number, p_user_id, p_customer_id, p_patient_name, p_prescription_ref,
        p_subtotal, p_discount_amount, p_tax_amount, p_total_amount, 'PAID'
    );
    SET v_sale_id = LAST_INSERT_ID();

    INSERT INTO payments (sale_id, payment_method, amount_paid, change_given, reference_note)
    VALUES (v_sale_id, p_payment_method, p_amount_paid, v_change_given, CONCAT('POS Invoice: ', p_invoice_number));

    SET v_item_count = JSON_LENGTH(p_items_json);
    SET i = 0;

    WHILE i < v_item_count DO
        SET v_med_id = JSON_UNQUOTE(JSON_EXTRACT(p_items_json, CONCAT('$[', i, '].medicine_id')));
        SET v_req_qty = JSON_UNQUOTE(JSON_EXTRACT(p_items_json, CONCAT('$[', i, '].quantity')));
        SET v_unit_price = JSON_UNQUOTE(JSON_EXTRACT(p_items_json, CONCAT('$[', i, '].unit_price')));
        SET v_item_subtotal = JSON_UNQUOTE(JSON_EXTRACT(p_items_json, CONCAT('$[', i, '].subtotal')));
        SET v_packaging = COALESCE(JSON_UNQUOTE(JSON_EXTRACT(p_items_json, CONCAT('$[', i, '].packaging_desc'))), '1 Unit');

        SET v_avail_stock = fn_calculate_available_stock(v_med_id);
        IF v_avail_stock < v_req_qty THEN
            SIGNAL SQLSTATE '45000'
                SET MESSAGE_TEXT = 'Transaction aborted: Insufficient physical stock available for selected medicine.';
        END IF;

        INSERT INTO sale_items (sale_id, medicine_id, quantity, unit_price, subtotal, packaging_desc)
        VALUES (v_sale_id, v_med_id, v_req_qty, v_unit_price, v_item_subtotal, v_packaging);
        SET v_sale_item_id = LAST_INSERT_ID();

        SET v_remaining_to_deduct = v_req_qty;
        SET v_done = FALSE;
        OPEN batch_cursor;
        
        batch_loop: LOOP
            FETCH batch_cursor INTO v_batch_id, v_batch_stock;
            IF v_done OR v_remaining_to_deduct <= 0 THEN
                LEAVE batch_loop;
            END IF;

            IF v_batch_stock >= v_remaining_to_deduct THEN
                SET v_alloc_qty = v_remaining_to_deduct;
            ELSE
                SET v_alloc_qty = v_batch_stock;
            END IF;

            UPDATE medicine_batches
            SET stock_quantity = stock_quantity - v_alloc_qty,
                status = CASE WHEN (stock_quantity - v_alloc_qty) = 0 THEN 'depleted' ELSE status END
            WHERE batch_id = v_batch_id;

            INSERT INTO sale_item_batches (sale_item_id, batch_id, quantity_allocated)
            VALUES (v_sale_item_id, v_batch_id, v_alloc_qty);

            INSERT INTO stock_movements (batch_id, movement_type, quantity_changed, reason, performed_by)
            VALUES (v_batch_id, 'DISPENSED', -v_alloc_qty, CONCAT('POS Invoice: ', p_invoice_number), p_patient_name);

            SET v_remaining_to_deduct = v_remaining_to_deduct - v_alloc_qty;
        END LOOP batch_loop;
        
        CLOSE batch_cursor;

        IF v_remaining_to_deduct > 0 THEN
            SIGNAL SQLSTATE '45000'
                SET MESSAGE_TEXT = 'Batch allocation failure: Active unexpired batches could not satisfy requested quantity.';
        END IF;

        SET i = i + 1;
    END WHILE;

    COMMIT;
    SELECT v_sale_id AS sale_id, p_invoice_number AS invoice_number, v_change_given AS change_given;
END$$


-- 3.5 Immediate Batch Quarantine / Drug Recall
DROP PROCEDURE IF EXISTS sp_quarantine_batch$$
CREATE PROCEDURE sp_quarantine_batch(
    IN p_batch_id INT,
    IN p_reason VARCHAR(255),
    IN p_performed_by VARCHAR(100)
)
BEGIN
    DECLARE v_stock INT;
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;
    SELECT stock_quantity INTO v_stock FROM medicine_batches WHERE batch_id = p_batch_id FOR UPDATE;
    IF v_stock IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Target batch not found.';
    END IF;

    UPDATE medicine_batches 
    SET status = 'quarantined', updated_at = CURRENT_TIMESTAMP 
    WHERE batch_id = p_batch_id;

    INSERT INTO stock_movements (batch_id, movement_type, quantity_changed, reason, performed_by)
    VALUES (p_batch_id, 'RECALL', 0, CONCAT('Quarantined: ', p_reason), p_performed_by);

    INSERT INTO audit_logs (table_name, operation, record_id, old_value, new_value, performed_by)
    VALUES ('medicine_batches', 'UPDATE', p_batch_id, JSON_OBJECT('status', 'active'), JSON_OBJECT('status', 'quarantined', 'reason', p_reason), p_performed_by);

    COMMIT;
    SELECT p_batch_id AS quarantined_batch_id, 'Batch successfully isolated and locked from dispensing.' AS message;
END$$


-- 3.6 Approve Prescription Order with Ready Time and Notification Log
DROP PROCEDURE IF EXISTS sp_approve_prescription_order$$
CREATE PROCEDURE sp_approve_prescription_order(
    IN p_order_id VARCHAR(50),
    IN p_pharmacist_name VARCHAR(150),
    IN p_ready_time VARCHAR(100),
    IN p_confirmation_message TEXT
)
BEGIN
    DECLARE v_email VARCHAR(150);
    DECLARE v_name VARCHAR(150);
    DECLARE v_customer_id INT;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;
    SELECT your_email, your_name, customer_id INTO v_email, v_name, v_customer_id 
    FROM prescription_orders WHERE order_id = p_order_id FOR UPDATE;

    IF v_email IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Prescription order not found.';
    END IF;

    UPDATE prescription_orders
    SET status = 'accepted',
        pharmacist_name = p_pharmacist_name,
        reviewed_at = NOW(),
        ready_time = p_ready_time,
        confirmation_message = p_confirmation_message
    WHERE order_id = p_order_id;

    INSERT INTO notification_logs (
        order_id, customer_id, recipient_email, recipient_name, subject, message_body, notification_type, status
    ) VALUES (
        p_order_id, v_customer_id, v_email, v_name,
        CONCAT('Prescription Order Confirmed [', p_order_id, '] — Ready for Pickup'),
        CONCAT('Dear ', v_name, ', your prescription has been approved by ', p_pharmacist_name, '. Ready time: ', p_ready_time, '. Note: ', COALESCE(p_confirmation_message, 'Please bring your original SLMC doctor prescription.')),
        'PRESCRIPTION_ACCEPTED', 'SENT'
    );

    COMMIT;
    SELECT p_order_id AS order_id, 'Prescription approved and patient notification queued.' AS result;
END$$


-- 3.7 Reject Prescription Order with Audit and Notification
DROP PROCEDURE IF EXISTS sp_reject_prescription_order$$
CREATE PROCEDURE sp_reject_prescription_order(
    IN p_order_id VARCHAR(50),
    IN p_pharmacist_name VARCHAR(150),
    IN p_rejection_reason TEXT
)
BEGIN
    DECLARE v_email VARCHAR(150);
    DECLARE v_name VARCHAR(150);
    DECLARE v_customer_id INT;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;
    SELECT your_email, your_name, customer_id INTO v_email, v_name, v_customer_id 
    FROM prescription_orders WHERE order_id = p_order_id FOR UPDATE;

    IF v_email IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Prescription order not found.';
    END IF;

    UPDATE prescription_orders
    SET status = 'rejected',
        pharmacist_name = p_pharmacist_name,
        reviewed_at = NOW(),
        rejection_reason = p_rejection_reason
    WHERE order_id = p_order_id;

    INSERT INTO notification_logs (
        order_id, customer_id, recipient_email, recipient_name, subject, message_body, notification_type, status
    ) VALUES (
        p_order_id, v_customer_id, v_email, v_name,
        CONCAT('Prescription Order Update [', p_order_id, '] — Verification Notice'),
        CONCAT('Dear ', v_name, ', your prescription could not be fulfilled as submitted. Reason: ', p_rejection_reason, '. Please contact VDC Store pharmacist for clinical support.'),
        'PRESCRIPTION_REJECTED', 'SENT'
    );

    COMMIT;
    SELECT p_order_id AS order_id, 'Prescription rejected and notice logged.' AS result;
END$$


-- 3.8 Mark Prescription as Fully Dispensed
DROP PROCEDURE IF EXISTS sp_dispense_prescription_order$$
CREATE PROCEDURE sp_dispense_prescription_order(
    IN p_order_id VARCHAR(50),
    IN p_pharmacist_name VARCHAR(150),
    IN p_invoice_number VARCHAR(60)
)
BEGIN
    UPDATE prescription_orders
    SET status = 'dispensed',
        pharmacist_name = COALESCE(p_pharmacist_name, pharmacist_name),
        confirmation_message = CONCAT(COALESCE(confirmation_message, ''), ' [Dispensed under invoice: ', p_invoice_number, ']')
    WHERE order_id = p_order_id;

    SELECT p_order_id AS order_id, 'Prescription marked as dispensed to patient.' AS result;
END$$


-- 3.9 Register Patient Profile with Duplicate Protection
DROP PROCEDURE IF EXISTS sp_register_patient_customer$$
CREATE PROCEDURE sp_register_patient_customer(
    IN p_full_name VARCHAR(150),
    IN p_email VARCHAR(150),
    IN p_password_hash VARCHAR(255),
    IN p_contact_no VARCHAR(50),
    IN p_patient_age VARCHAR(50),
    IN p_nic VARCHAR(50),
    IN p_address TEXT,
    OUT p_customer_id INT,
    OUT p_success BOOLEAN,
    OUT p_message VARCHAR(255)
)
BEGIN
    DECLARE v_existing INT DEFAULT 0;
    SELECT COUNT(*) INTO v_existing FROM customers WHERE email = LOWER(TRIM(p_email));
    
    IF v_existing > 0 THEN
        SET p_customer_id = NULL;
        SET p_success = FALSE;
        SET p_message = 'An account with this email address already exists.';
    ELSE
        INSERT INTO customers (full_name, email, password_hash, contact_no, patient_age, nic, address, is_active)
        VALUES (TRIM(p_full_name), LOWER(TRIM(p_email)), p_password_hash, p_contact_no, p_patient_age, p_nic, p_address, TRUE);
        SET p_customer_id = LAST_INSERT_ID();
        SET p_success = TRUE;
        SET p_message = 'Customer registered successfully.';
    END IF;
END$$


-- 3.10 Validate & Apply Promotional Voucher Coupon
DROP PROCEDURE IF EXISTS sp_apply_promotional_coupon$$
CREATE PROCEDURE sp_apply_promotional_coupon(
    IN p_coupon_code VARCHAR(50),
    IN p_order_subtotal DECIMAL(10,2),
    OUT p_discount_amount DECIMAL(10,2),
    OUT p_is_valid BOOLEAN,
    OUT p_message VARCHAR(255)
)
BEGIN
    DECLARE v_type ENUM('PERCENT', 'FIXED', 'FREE_DELIVERY');
    DECLARE v_val DECIMAL(10,2);
    DECLARE v_min DECIMAL(10,2);
    DECLARE v_active BOOLEAN;
    DECLARE v_from DATE;
    DECLARE v_until DATE;

    SELECT discount_type, discount_value, min_order_amount, is_active, valid_from, valid_until
    INTO v_type, v_val, v_min, v_active, v_from, v_until
    FROM promotions
    WHERE code = UPPER(TRIM(p_coupon_code));

    IF v_val IS NULL THEN
        SET p_discount_amount = 0.00;
        SET p_is_valid = FALSE;
        SET p_message = 'Coupon code does not exist.';
    ELSEIF v_active = FALSE THEN
        SET p_discount_amount = 0.00;
        SET p_is_valid = FALSE;
        SET p_message = 'This promotional coupon has expired or is inactive.';
    ELSEIF v_from IS NOT NULL AND v_from > CURDATE() THEN
        SET p_discount_amount = 0.00;
        SET p_is_valid = FALSE;
        SET p_message = 'This promotion has not started yet.';
    ELSEIF v_until IS NOT NULL AND v_until < CURDATE() THEN
        SET p_discount_amount = 0.00;
        SET p_is_valid = FALSE;
        SET p_message = 'This promotion has expired.';
    ELSEIF p_order_subtotal < v_min THEN
        SET p_discount_amount = 0.00;
        SET p_is_valid = FALSE;
        SET p_message = CONCAT('Minimum subtotal of Rs. ', v_min, ' required to apply this coupon.');
    ELSE
        IF v_type = 'PERCENT' THEN
            SET p_discount_amount = ROUND(p_order_subtotal * (v_val / 100.00), 2);
        ELSEIF v_type = 'FIXED' THEN
            SET p_discount_amount = LEAST(v_val, p_order_subtotal);
        ELSE
            SET p_discount_amount = 350.00; -- Standard courier fee waiver
        END IF;
        SET p_is_valid = TRUE;
        SET p_message = 'Coupon applied successfully.';
    END IF;
END$$


-- 3.11 Resolve Patient Clinical Counseling Inquiry
DROP PROCEDURE IF EXISTS sp_process_inquiry_response$$
CREATE PROCEDURE sp_process_inquiry_response(
    IN p_inquiry_id INT,
    IN p_staff_name VARCHAR(100),
    IN p_response_notes TEXT,
    IN p_new_status VARCHAR(20)
)
BEGIN
    UPDATE inquiries
    SET staff_notes = p_response_notes,
        responded_by = p_staff_name,
        responded_at = NOW(),
        status = CASE WHEN p_new_status IN ('NEW', 'IN_REVIEW', 'RESOLVED') THEN p_new_status ELSE 'RESOLVED' END
    WHERE inquiry_id = p_inquiry_id;

    SELECT p_inquiry_id AS inquiry_id, 'Inquiry successfully updated with staff response.' AS result;
END$$

DELIMITER ;



-- ============================================================
-- SECTION 4: DATABASE TRIGGERS (8 Triggers)
-- Event-driven data integrity, auditing & automated cascades
-- ============================================================

DELIMITER $$

-- 4.1 Audit Log Trigger on Physical Batch Changes
DROP TRIGGER IF EXISTS trg_after_batch_stock_update$$
CREATE TRIGGER trg_after_batch_stock_update
AFTER UPDATE ON medicine_batches
FOR EACH ROW
BEGIN
    IF (OLD.stock_quantity <> NEW.stock_quantity) OR 
       (OLD.reserved_quantity <> NEW.reserved_quantity) OR 
       (OLD.status <> NEW.status) THEN
       
        INSERT INTO audit_logs (
            table_name, operation, record_id, old_value, new_value, performed_by
        ) VALUES (
            'medicine_batches', 'UPDATE', NEW.batch_id,
            JSON_OBJECT(
                'stock_quantity', OLD.stock_quantity,
                'reserved_quantity', OLD.reserved_quantity,
                'status', OLD.status
            ),
            JSON_OBJECT(
                'stock_quantity', NEW.stock_quantity,
                'reserved_quantity', NEW.reserved_quantity,
                'status', NEW.status
            ),
            'System Trigger'
        );
    END IF;
END$$

-- 4.2 Data Integrity Gatekeeper on Batch Insertion
DROP TRIGGER IF EXISTS trg_before_batch_insert$$
CREATE TRIGGER trg_before_batch_insert
BEFORE INSERT ON medicine_batches
FOR EACH ROW
BEGIN
    IF NEW.expiry_date <= NEW.manufacture_date THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Integrity violation: Batch expiry date must be strictly later than manufacture date.';
    END IF;
    IF NEW.stock_quantity < 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Integrity violation: Initial physical batch stock cannot be negative.';
    END IF;
END$$

-- 4.3 Automatic Batch Depletion Flag Trigger
DROP TRIGGER IF EXISTS trg_before_batch_update_depleted$$
CREATE TRIGGER trg_before_batch_update_depleted
BEFORE UPDATE ON medicine_batches
FOR EACH ROW
BEGIN
    IF NEW.stock_quantity = 0 AND NEW.status = 'active' THEN
        SET NEW.status = 'depleted';
    END IF;
END$$

-- 4.4 Automated Counter Sale Transaction Audit Trigger
DROP TRIGGER IF EXISTS trg_after_sale_insert_log$$
CREATE TRIGGER trg_after_sale_insert_log
AFTER INSERT ON sales
FOR EACH ROW
BEGIN
    INSERT INTO audit_logs (
        table_name, operation, record_id, old_value, new_value, performed_by
    ) VALUES (
        'sales', 'INSERT', NEW.sale_id,
        NULL,
        JSON_OBJECT(
            'invoice_number', NEW.invoice_number,
            'total_amount', NEW.total_amount,
            'patient_name', NEW.patient_name,
            'user_id', NEW.user_id
        ),
        'Counter POS Cashier'
    );
END$$

-- 4.5 Medicine Pricing & Discount Bounds Integrity Trigger
DROP TRIGGER IF EXISTS trg_before_medicine_price_check$$
CREATE TRIGGER trg_before_medicine_price_check
BEFORE UPDATE ON medicines
FOR EACH ROW
BEGIN
    IF NEW.unit_price < 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Integrity violation: Medicine unit price cannot be negative.';
    END IF;
    IF NEW.discount_percent < 0 OR NEW.discount_percent > 100 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Integrity violation: Medicine discount percent must be between 0 and 100.';
    END IF;
END$$

-- 4.6 Prescription Status Transition Audit Trigger
DROP TRIGGER IF EXISTS trg_after_prescription_status_audit$$
CREATE TRIGGER trg_after_prescription_status_audit
AFTER UPDATE ON prescription_orders
FOR EACH ROW
BEGIN
    IF OLD.status <> NEW.status THEN
        INSERT INTO audit_logs (
            table_name, operation, record_id, old_value, new_value, performed_by
        ) VALUES (
            'prescription_orders', 'UPDATE', 0,
            JSON_OBJECT('order_id', OLD.order_id, 'status', OLD.status),
            JSON_OBJECT('order_id', NEW.order_id, 'status', NEW.status, 'pharmacist', NEW.pharmacist_name),
            COALESCE(NEW.pharmacist_name, 'Dispensary Pharmacist')
        );
    END IF;
END$$

-- 4.7 Customer Registration Input Normalization Trigger
DROP TRIGGER IF EXISTS trg_before_customer_insert_sanitize$$
CREATE TRIGGER trg_before_customer_insert_sanitize
BEFORE INSERT ON customers
FOR EACH ROW
BEGIN
    SET NEW.email = LOWER(TRIM(NEW.email));
    SET NEW.full_name = TRIM(NEW.full_name);
END$$

-- 4.8 Automatic Recalculation of Wholesale Purchase Invoice Total
DROP TRIGGER IF EXISTS trg_after_purchase_item_insert$$
CREATE TRIGGER trg_after_purchase_item_insert
AFTER INSERT ON purchase_items
FOR EACH ROW
BEGIN
    UPDATE purchases 
    SET total_amount = (SELECT COALESCE(SUM(subtotal), 0.00) FROM purchase_items WHERE purchase_id = NEW.purchase_id)
    WHERE purchase_id = NEW.purchase_id;
END$$

DELIMITER ;



-- ============================================================
-- SECTION 5: SCHEDULED EVENTS (8 Events)
-- Automated MySQL cron events for maintenance, safety & risk control
-- ============================================================

DELIMITER $$

-- 5.1 Daily Quarantine of Expired Physical Lots & Promotion Deactivation
DROP EVENT IF EXISTS ev_daily_quarantine_expired_batches$$
CREATE EVENT ev_daily_quarantine_expired_batches
ON SCHEDULE EVERY 1 DAY
STARTS (TIMESTAMP(CURDATE()) + INTERVAL 1 DAY)
COMMENT 'Automatically quarantines expired physical drug lots and deactivates expired promotions at midnight'
DO
BEGIN
    UPDATE medicine_batches
    SET status = 'quarantined'
    WHERE expiry_date <= CURDATE()
      AND status = 'active';

    UPDATE promotions
    SET is_active = FALSE
    WHERE valid_until < CURDATE()
      AND is_active = TRUE;
END$$


-- 5.2 Weekly Maintenance: Purge Stale Sent Notification Logs
DROP EVENT IF EXISTS ev_weekly_system_maintenance$$
CREATE EVENT ev_weekly_system_maintenance
ON SCHEDULE EVERY 1 WEEK
STARTS (TIMESTAMP(CURDATE()) + INTERVAL 1 DAY + INTERVAL 2 HOUR)
COMMENT 'Weekly Sunday maintenance purging transient notification logs older than 90 days'
DO
BEGIN
    DELETE FROM notification_logs
    WHERE status = 'SENT'
      AND sent_at < DATE_SUB(NOW(), INTERVAL 90 DAY);
END$$


-- 5.3 Daily Morning Low Stock Alert Generation (08:00 AM)
DROP EVENT IF EXISTS ev_daily_low_stock_notification$$
CREATE EVENT ev_daily_low_stock_notification
ON SCHEDULE EVERY 1 DAY
STARTS (TIMESTAMP(CURDATE()) + INTERVAL 8 HOUR)
COMMENT 'Scans inventory for depleted or low stock medicines and generates urgent dispensary alerts'
DO
BEGIN
    INSERT INTO notification_logs (
        recipient_email, recipient_name, subject, message_body, notification_type, status
    )
    SELECT 
        'pharmacist@vdcstore.lk', 'Dispensary Staff',
        CONCAT('Daily Inventory Alert: Low Stock on ', m.name),
        CONCAT('Attention: Medicine ', m.name, ' (ID: ', m.medicine_id, ') has fallen below threshold. Current saleable stock is: ', fn_calculate_available_stock(m.medicine_id)),
        'SYSTEM', 'SENT'
    FROM medicines m
    WHERE m.is_active = TRUE
      AND fn_calculate_available_stock(m.medicine_id) <= m.low_stock_threshold
    LIMIT 10;
END$$


-- 5.4 Daily Expiry Risk Warning Audit (08:30 AM)
DROP EVENT IF EXISTS ev_daily_expiry_warning_audit$$
CREATE EVENT ev_daily_expiry_warning_audit
ON SCHEDULE EVERY 1 DAY
STARTS (TIMESTAMP(CURDATE()) + INTERVAL 8 HOUR + INTERVAL 30 MINUTE)
COMMENT 'Audits batches expiring in <= 30 days and logs entries for head pharmacist'
DO
BEGIN
    INSERT INTO audit_logs (
        table_name, operation, record_id, old_value, new_value, performed_by
    )
    SELECT 
        'medicine_batches', 'UPDATE', b.batch_id,
        JSON_OBJECT('batch_number', b.batch_number, 'days_left', DATEDIFF(b.expiry_date, CURDATE())),
        JSON_OBJECT('alert', 'Batch expires within 30 days', 'action', 'Initiate supplier return or price clearance'),
        'Scheduled Event Scheduler'
    FROM medicine_batches b
    WHERE b.status = 'active'
      AND b.stock_quantity > 0
      AND b.expiry_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY);
END$$


-- 5.5 Hourly Stale Reservation Cleanup
DROP EVENT IF EXISTS ev_hourly_stale_reservation_cleanup$$
CREATE EVENT ev_hourly_stale_reservation_cleanup
ON SCHEDULE EVERY 1 HOUR
COMMENT 'Releases stuck reserved stock quantities on inactive dispensary carts'
DO
BEGIN
    UPDATE medicine_batches
    SET reserved_quantity = 0
    WHERE reserved_quantity > 0
      AND status = 'active'
      AND updated_at < DATE_SUB(NOW(), INTERVAL 2 HOUR);
END$$


-- 5.6 Monthly Financial Archive & Summary Logging (1st of Month at 01:00 AM)
DROP EVENT IF EXISTS ev_monthly_sales_summary_archive$$
CREATE EVENT ev_monthly_sales_summary_archive
ON SCHEDULE EVERY 1 MONTH
STARTS (TIMESTAMP(DATE_SUB(CURRENT_DATE, INTERVAL DAY(CURRENT_DATE)-1 DAY)) + INTERVAL 1 MONTH + INTERVAL 1 HOUR)
COMMENT 'Archives monthly gross sales and volumes into audit ledger on the 1st of every month'
DO
BEGIN
    INSERT INTO audit_logs (
        table_name, operation, record_id, old_value, new_value, performed_by
    )
    SELECT 
        'sales', 'INSERT', 0,
        NULL,
        JSON_OBJECT(
            'archive_month', DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL 1 MONTH), '%Y-%m'),
            'total_sales_invoices', COUNT(*),
            'gross_revenue', COALESCE(SUM(total_amount), 0.00)
        ),
        'Monthly Financial Event Daemon'
    FROM sales
    WHERE sale_date >= DATE_SUB(CURDATE(), INTERVAL 1 MONTH)
      AND sale_date < CURDATE()
      AND payment_status = 'PAID';
END$$


-- 5.7 Daily Auto-Resolution of Stale Inquiries (23:00 PM)
DROP EVENT IF EXISTS ev_daily_auto_resolve_stale_inquiries$$
CREATE EVENT ev_daily_auto_resolve_stale_inquiries
ON SCHEDULE EVERY 1 DAY
STARTS (TIMESTAMP(CURDATE()) + INTERVAL 23 HOUR)
COMMENT 'Auto-resolves patient inquiries in review with staff notes older than 14 days'
DO
BEGIN
    UPDATE inquiries
    SET status = 'RESOLVED'
    WHERE status = 'IN_REVIEW'
      AND staff_notes IS NOT NULL
      AND responded_at < DATE_SUB(NOW(), INTERVAL 14 DAY);
END$$


-- 5.8 Daily Security Lock Reset & Maintenance (04:00 AM)
DROP EVENT IF EXISTS ev_daily_reset_brute_force_locks$$
CREATE EVENT ev_daily_reset_brute_force_locks
ON SCHEDULE EVERY 1 DAY
STARTS (TIMESTAMP(CURDATE()) + INTERVAL 4 HOUR)
COMMENT 'Re-evaluates security locks for administration and auditor service accounts'
DO
BEGIN
    ALTER USER IF EXISTS 'pharmacy_admin'@'localhost' ACCOUNT UNLOCK;
    ALTER USER IF EXISTS 'pharmacy_auditor'@'localhost' ACCOUNT UNLOCK;
END$$

DELIMITER ;
