-- ============================================================
-- VDC STORE / MY PHARMACIST MANAGEMENT SYSTEM
-- Consolidated Monolithic Database Importer (MySQL 8.0+)
-- Module: Advanced Database Management System (ADBMS)
-- Single-file deployment for phpMyAdmin, MySQL Workbench & CLI
-- ============================================================

CREATE DATABASE IF NOT EXISTS pharmacy_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE pharmacy_db;

-- ============================================================
-- SECTION 1: DATA DEFINITION LANGUAGE (DDL)
-- All 22 Normalized Relational Tables & Integrity Constraints
-- ============================================================

-- 1. BRANDS TABLE
CREATE TABLE IF NOT EXISTS brands (
    brand_id INT AUTO_INCREMENT PRIMARY KEY,
    brand_name VARCHAR(150) NOT NULL UNIQUE,
    country_of_origin VARCHAR(100) DEFAULT 'Global',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 2. MEDICINE CATEGORIES TABLE (With Self-referencing Hierarchy)
CREATE TABLE IF NOT EXISTS medicine_categories (
    category_id INT AUTO_INCREMENT PRIMARY KEY,
    parent_category_id INT NULL,
    category_name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    icon_name VARCHAR(50) DEFAULT 'Pill',
    image_url VARCHAR(500) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_categories_parent FOREIGN KEY (parent_category_id)
        REFERENCES medicine_categories(category_id) ON DELETE SET NULL,
    INDEX idx_categories_parent (parent_category_id)
) ENGINE=InnoDB;

-- 3. SUPPLIERS TABLE
CREATE TABLE IF NOT EXISTS suppliers (
    supplier_id INT AUTO_INCREMENT PRIMARY KEY,
    supplier_name VARCHAR(150) NOT NULL,
    contact_person VARCHAR(100),
    phone VARCHAR(30),
    email VARCHAR(100),
    address TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 4. MEDICINES TABLE (Master Formulary in 3NF)
CREATE TABLE IF NOT EXISTS medicines (
    medicine_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    generic_name VARCHAR(200) NOT NULL,
    brand_id INT NOT NULL,
    category_id INT NOT NULL,
    dosage_form VARCHAR(50) NOT NULL,
    strength VARCHAR(50) NOT NULL,
    description TEXT,
    side_effects TEXT,
    usage_instructions TEXT,
    unit_price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    discount_percent DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
    is_offer BOOLEAN NOT NULL DEFAULT FALSE,
    rating DECIMAL(2, 1) NOT NULL DEFAULT 5.0,
    image_url VARCHAR(500) NULL,
    is_public_price BOOLEAN DEFAULT TRUE,
    low_stock_threshold INT NOT NULL DEFAULT 20,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_medicines_brand FOREIGN KEY (brand_id) 
        REFERENCES brands(brand_id) ON DELETE RESTRICT,
    CONSTRAINT fk_medicines_category FOREIGN KEY (category_id) 
        REFERENCES medicine_categories(category_id) ON DELETE RESTRICT,
    INDEX idx_medicines_name (name),
    INDEX idx_medicines_generic_name (generic_name),
    INDEX idx_medicines_brand (brand_id),
    INDEX idx_medicines_category (category_id),
    INDEX idx_medicines_search (name, generic_name),
    INDEX idx_medicines_offer (is_offer)
) ENGINE=InnoDB;

-- 5. MEDICINE BATCHES TABLE (Physical Inventory Lots)
CREATE TABLE IF NOT EXISTS medicine_batches (
    batch_id INT AUTO_INCREMENT PRIMARY KEY,
    medicine_id INT NOT NULL,
    supplier_id INT NOT NULL,
    batch_number VARCHAR(80) NOT NULL UNIQUE,
    manufacture_date DATE NOT NULL,
    expiry_date DATE NOT NULL,
    quantity_received INT NOT NULL,
    stock_quantity INT NOT NULL,
    reserved_quantity INT NOT NULL DEFAULT 0,
    unit_cost DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    status ENUM('active', 'quarantined', 'recalled', 'depleted') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT chk_quantity_received CHECK (quantity_received >= 0),
    CONSTRAINT chk_stock_quantity CHECK (stock_quantity >= 0),
    CONSTRAINT chk_reserved_quantity CHECK (reserved_quantity >= 0 AND reserved_quantity <= stock_quantity),
    CONSTRAINT chk_batch_dates CHECK (expiry_date > manufacture_date),
    CONSTRAINT fk_batches_medicine FOREIGN KEY (medicine_id) 
        REFERENCES medicines(medicine_id) ON DELETE CASCADE,
    CONSTRAINT fk_batches_supplier FOREIGN KEY (supplier_id) 
        REFERENCES suppliers(supplier_id) ON DELETE RESTRICT,
    INDEX idx_batches_availability (medicine_id, status, expiry_date, stock_quantity),
    INDEX idx_batches_expiry (expiry_date)
) ENGINE=InnoDB;

-- 6. STOCK MOVEMENTS TABLE
CREATE TABLE IF NOT EXISTS stock_movements (
    movement_id INT AUTO_INCREMENT PRIMARY KEY,
    batch_id INT NOT NULL,
    movement_type ENUM('RESTOCK', 'DISPENSED', 'ADJUSTMENT', 'RECALL', 'EXPIRED_DISCARD') NOT NULL,
    quantity_changed INT NOT NULL,
    reason VARCHAR(255),
    performed_by VARCHAR(100) DEFAULT 'System',
    movement_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_movements_batch FOREIGN KEY (batch_id) 
        REFERENCES medicine_batches(batch_id) ON DELETE CASCADE,
    INDEX idx_movements_batch (batch_id)
) ENGINE=InnoDB;

-- 7. USERS TABLE (Internal Staff RBAC)
CREATE TABLE IF NOT EXISTS users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('ADMIN', 'PHARMACIST') NOT NULL DEFAULT 'PHARMACIST',
    full_name VARCHAR(100) NOT NULL,
    permissions TEXT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 8. PHARMACY SETTINGS TABLE
CREATE TABLE IF NOT EXISTS pharmacy_settings (
    setting_key VARCHAR(50) PRIMARY KEY,
    setting_value TEXT NOT NULL,
    description VARCHAR(255),
    is_public BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 9. AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS audit_logs (
    log_id INT AUTO_INCREMENT PRIMARY KEY,
    table_name VARCHAR(50) NOT NULL,
    operation ENUM('INSERT', 'UPDATE', 'DELETE') NOT NULL,
    record_id INT NOT NULL,
    old_value JSON,
    new_value JSON,
    performed_by VARCHAR(100) DEFAULT 'System Trigger',
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_audit_table (table_name),
    INDEX idx_audit_time (timestamp)
) ENGINE=InnoDB;

-- 10. PURCHASES TABLE
CREATE TABLE IF NOT EXISTS purchases (
    purchase_id INT AUTO_INCREMENT PRIMARY KEY,
    supplier_id INT NOT NULL,
    invoice_number VARCHAR(80) NOT NULL UNIQUE,
    purchase_date DATE NOT NULL,
    total_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    status ENUM('RECEIVED', 'PENDING', 'CANCELLED') NOT NULL DEFAULT 'RECEIVED',
    received_by VARCHAR(100) DEFAULT 'Staff Pharmacist',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_purchases_supplier FOREIGN KEY (supplier_id)
        REFERENCES suppliers(supplier_id) ON DELETE RESTRICT,
    INDEX idx_purchases_supplier (supplier_id),
    INDEX idx_purchases_date (purchase_date)
) ENGINE=InnoDB;

-- 11. PURCHASE ITEMS TABLE
CREATE TABLE IF NOT EXISTS purchase_items (
    purchase_item_id INT AUTO_INCREMENT PRIMARY KEY,
    purchase_id INT NOT NULL,
    medicine_id INT NOT NULL,
    batch_number VARCHAR(80) NOT NULL,
    quantity INT NOT NULL,
    unit_cost DECIMAL(10, 2) NOT NULL,
    subtotal DECIMAL(10, 2) NOT NULL,
    expiry_date DATE NOT NULL,
    CONSTRAINT chk_purchase_qty CHECK (quantity > 0),
    CONSTRAINT chk_purchase_cost CHECK (unit_cost >= 0),
    CONSTRAINT fk_purchase_items_purchase FOREIGN KEY (purchase_id)
        REFERENCES purchases(purchase_id) ON DELETE CASCADE,
    CONSTRAINT fk_purchase_items_medicine FOREIGN KEY (medicine_id)
        REFERENCES medicines(medicine_id) ON DELETE RESTRICT,
    INDEX idx_purchase_items_medicine (medicine_id)
) ENGINE=InnoDB;

-- 12. CUSTOMERS TABLE (Registered Patients & Dispensary Clients)
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
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_customers_email (email)
) ENGINE=InnoDB;

-- 13. SALES TABLE (Counter POS Transactions linked to Staff & Customers)
CREATE TABLE IF NOT EXISTS sales (
    sale_id INT AUTO_INCREMENT PRIMARY KEY,
    invoice_number VARCHAR(60) NOT NULL UNIQUE,
    user_id INT NULL,
    customer_id INT NULL,
    patient_name VARCHAR(150) NOT NULL DEFAULT 'Walk-in Customer',
    prescription_ref VARCHAR(100) NOT NULL DEFAULT 'OTC',
    subtotal DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    discount_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    tax_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    total_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    payment_status ENUM('PAID', 'PARTIAL', 'REFUNDED') NOT NULL DEFAULT 'PAID',
    sale_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_sales_total CHECK (total_amount >= 0),
    CONSTRAINT fk_sales_user FOREIGN KEY (user_id)
        REFERENCES users(user_id) ON DELETE SET NULL,
    CONSTRAINT fk_sales_customer FOREIGN KEY (customer_id)
        REFERENCES customers(customer_id) ON DELETE SET NULL,
    INDEX idx_sales_date (sale_date),
    INDEX idx_sales_invoice (invoice_number),
    INDEX idx_sales_customer (customer_id)
) ENGINE=InnoDB;

-- 14. SALE ITEMS TABLE
CREATE TABLE IF NOT EXISTS sale_items (
    sale_item_id INT AUTO_INCREMENT PRIMARY KEY,
    sale_id INT NOT NULL,
    medicine_id INT NOT NULL,
    quantity INT NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL,
    subtotal DECIMAL(10, 2) NOT NULL,
    packaging_desc VARCHAR(100) DEFAULT '1 Unit',
    CONSTRAINT chk_sale_item_qty CHECK (quantity > 0),
    CONSTRAINT chk_sale_item_price CHECK (unit_price >= 0),
    CONSTRAINT fk_sale_items_sale FOREIGN KEY (sale_id)
        REFERENCES sales(sale_id) ON DELETE CASCADE,
    CONSTRAINT fk_sale_items_medicine FOREIGN KEY (medicine_id)
        REFERENCES medicines(medicine_id) ON DELETE RESTRICT,
    INDEX idx_sale_items_sale (sale_id),
    INDEX idx_sale_items_medicine (medicine_id)
) ENGINE=InnoDB;

-- 15. SALE ITEM BATCH ALLOCATIONS TABLE (3NF Bridge)
CREATE TABLE IF NOT EXISTS sale_item_batches (
    allocation_id INT AUTO_INCREMENT PRIMARY KEY,
    sale_item_id INT NOT NULL,
    batch_id INT NOT NULL,
    quantity_allocated INT NOT NULL,
    CONSTRAINT chk_allocation_qty CHECK (quantity_allocated > 0),
    CONSTRAINT fk_alloc_sale_item FOREIGN KEY (sale_item_id)
        REFERENCES sale_items(sale_item_id) ON DELETE CASCADE,
    CONSTRAINT fk_alloc_batch FOREIGN KEY (batch_id)
        REFERENCES medicine_batches(batch_id) ON DELETE RESTRICT,
    INDEX idx_alloc_sale_item (sale_item_id),
    INDEX idx_alloc_batch (batch_id)
) ENGINE=InnoDB;

-- 16. PAYMENTS TABLE
CREATE TABLE IF NOT EXISTS payments (
    payment_id INT AUTO_INCREMENT PRIMARY KEY,
    sale_id INT NOT NULL,
    payment_method ENUM('CASH', 'CARD', 'ONLINE', 'INSURANCE') NOT NULL DEFAULT 'CASH',
    amount_paid DECIMAL(10, 2) NOT NULL,
    change_given DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    reference_note VARCHAR(150),
    payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_payment_amount CHECK (amount_paid >= 0),
    CONSTRAINT fk_payments_sale FOREIGN KEY (sale_id)
        REFERENCES sales(sale_id) ON DELETE CASCADE,
    INDEX idx_payments_sale (sale_id),
    INDEX idx_payments_method (payment_method)
) ENGINE=InnoDB;

-- 17. PRESCRIPTION ORDERS TABLE
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
    files_count INT DEFAULT 0,
    files LONGTEXT NULL,
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
    CONSTRAINT fk_prescription_orders_customer FOREIGN KEY (customer_id)
        REFERENCES customers(customer_id) ON DELETE SET NULL,
    INDEX idx_rx_email (your_email),
    INDEX idx_rx_status (status),
    INDEX idx_rx_created (created_at),
    INDEX idx_rx_customer (customer_id)
) ENGINE=InnoDB;

-- 18. PRESCRIPTION FILES TABLE (3NF Normalization)
CREATE TABLE IF NOT EXISTS prescription_files (
    file_id INT AUTO_INCREMENT PRIMARY KEY,
    order_id VARCHAR(50) NOT NULL,
    file_path VARCHAR(255) NULL,
    file_name VARCHAR(255) NULL,
    file_type VARCHAR(50) NULL,
    file_size INT NULL,
    file_data LONGTEXT NULL,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_rx_files_order FOREIGN KEY (order_id)
        REFERENCES prescription_orders(order_id) ON DELETE CASCADE,
    INDEX idx_rx_files_order (order_id)
) ENGINE=InnoDB;

-- 19. PROMOTIONS / COUPONS TABLE
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
    INDEX idx_promotions_code (code),
    INDEX idx_promotions_active (is_active)
) ENGINE=InnoDB;

-- 20. CUSTOMER REVIEWS TABLE
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
    CONSTRAINT chk_review_rating CHECK (rating >= 1 AND rating <= 5),
    CONSTRAINT fk_reviews_customer FOREIGN KEY (customer_id)
        REFERENCES customers(customer_id) ON DELETE SET NULL,
    CONSTRAINT fk_reviews_medicine FOREIGN KEY (medicine_id)
        REFERENCES medicines(medicine_id) ON DELETE SET NULL,
    INDEX idx_reviews_approved (is_approved, created_at),
    INDEX idx_reviews_medicine (medicine_id)
) ENGINE=InnoDB;

-- 21. INQUIRIES TABLE
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
    CONSTRAINT fk_inquiries_customer FOREIGN KEY (customer_id)
        REFERENCES customers(customer_id) ON DELETE SET NULL,
    INDEX idx_inquiries_ref (reference_code),
    INDEX idx_inquiries_status (status)
) ENGINE=InnoDB;

-- 22. NOTIFICATION LOGS TABLE
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
    CONSTRAINT fk_notif_order FOREIGN KEY (order_id)
        REFERENCES prescription_orders(order_id) ON DELETE SET NULL,
    CONSTRAINT fk_notif_customer FOREIGN KEY (customer_id)
        REFERENCES customers(customer_id) ON DELETE SET NULL,
    INDEX idx_notif_order (order_id),
    INDEX idx_notif_recipient (recipient_email),
    INDEX idx_notif_status (status)
) ENGINE=InnoDB;


-- ============================================================
-- SECTION 2: PROCEDURAL ROUTINES (FUNCTIONS, VIEWS, PROCEDURES, TRIGGERS, EVENTS)
-- Module: Advanced Database Management System (ADBMS) Coursework
-- Comprehensive Enterprise Roster: 
--   • 13 Stored Functions
--   • 14 Database Views
--   • 11 Stored Procedures
--   • 8 Database Triggers
--   • 8 Scheduled Events
-- ============================================================

-- Enable MySQL Event Scheduler for scheduled background tasks
SET GLOBAL event_scheduler = ON;

-- ============================================================
-- 2.1 STORED FUNCTIONS (13 Functions)
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

-- View 1: Public Medicine Catalog
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

-- View 2: Public Availability Summary
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

-- View 3: Low Stock Alerts
DROP VIEW IF EXISTS v_low_stock_alerts;
CREATE VIEW v_low_stock_alerts AS
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
  AND fn_calculate_available_stock(m.medicine_id) <= m.low_stock_threshold;

-- View 4: Expiring Batches Monitor
DROP VIEW IF EXISTS v_expiring_batches;
CREATE VIEW v_expiring_batches AS
SELECT 
    b.batch_id,
    b.batch_number,
    m.medicine_id,
    m.name AS medicine_name,
    b.stock_quantity,
    b.expiry_date,
    DATEDIFF(b.expiry_date, CURDATE()) AS days_to_expiry,
    s.supplier_name,
    b.status
FROM medicine_batches b
INNER JOIN medicines m ON b.medicine_id = m.medicine_id
INNER JOIN suppliers s ON b.supplier_id = s.supplier_id
WHERE b.stock_quantity > 0 
  AND b.expiry_date <= DATE_ADD(CURDATE(), INTERVAL 90 DAY)
  AND b.status = 'active'
ORDER BY b.expiry_date ASC;

-- View 5: Daily Sales Analytics
DROP VIEW IF EXISTS v_daily_sales;
CREATE VIEW v_daily_sales AS
SELECT 
    DATE(s.sale_date) AS sale_day,
    COUNT(DISTINCT s.sale_id) AS total_transactions,
    COALESCE(SUM(s.total_amount), 0.00) AS total_revenue,
    COALESCE(AVG(s.total_amount), 0.00) AS average_basket_value,
    COALESCE(SUM(si.quantity), 0) AS total_units_dispensed
FROM sales s
LEFT JOIN sale_items si ON s.sale_id = si.sale_id
WHERE s.payment_status = 'PAID'
GROUP BY DATE(s.sale_date)
ORDER BY sale_day DESC;

-- View 6: Monthly Sales Performance
DROP VIEW IF EXISTS v_monthly_sales;
CREATE VIEW v_monthly_sales AS
SELECT 
    DATE_FORMAT(s.sale_date, '%Y-%m') AS sale_month,
    COUNT(DISTINCT s.sale_id) AS total_transactions,
    COALESCE(SUM(s.total_amount), 0.00) AS total_revenue,
    COALESCE(SUM(si.quantity), 0) AS total_units_dispensed
FROM sales s
LEFT JOIN sale_items si ON s.sale_id = si.sale_id
WHERE s.payment_status = 'PAID'
GROUP BY DATE_FORMAT(s.sale_date, '%Y-%m')
ORDER BY sale_month DESC;

-- View 7: Best Selling Medicines
DROP VIEW IF EXISTS v_sales_by_medicine;
CREATE VIEW v_sales_by_medicine AS
SELECT 
    m.medicine_id,
    m.name AS medicine_name,
    m.generic_name,
    c.category_name,
    b.brand_name,
    COALESCE(SUM(si.quantity), 0) AS total_units_sold,
    COALESCE(SUM(si.subtotal), 0.00) AS total_revenue,
    COUNT(DISTINCT si.sale_id) AS transaction_count
FROM sale_items si
INNER JOIN medicines m ON si.medicine_id = m.medicine_id
INNER JOIN medicine_categories c ON m.category_id = c.category_id
INNER JOIN brands b ON m.brand_id = b.brand_id
INNER JOIN sales s ON si.sale_id = s.sale_id
WHERE s.payment_status = 'PAID'
GROUP BY m.medicine_id, m.name, m.generic_name, c.category_name, b.brand_name
ORDER BY total_units_sold DESC;

-- View 8: Payment Methods Breakdown
DROP VIEW IF EXISTS v_payment_summary;
CREATE VIEW v_payment_summary AS
SELECT 
    p.payment_method,
    COUNT(p.payment_id) AS payment_count,
    COALESCE(SUM(p.amount_paid), 0.00) AS total_collected
FROM payments p
INNER JOIN sales s ON p.sale_id = s.sale_id
WHERE s.payment_status = 'PAID'
GROUP BY p.payment_method;

-- View 9: Active Promotional Vouchers
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

-- View 10: Approved Patient Reviews
DROP VIEW IF EXISTS v_approved_reviews;
CREATE VIEW v_approved_reviews AS
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
ORDER BY r.created_at DESC;

-- View 11: Customer Purchase History
DROP VIEW IF EXISTS v_customer_purchase_history;
CREATE VIEW v_customer_purchase_history AS
SELECT 
    c.customer_id,
    c.full_name AS customer_name,
    c.email AS customer_email,
    s.sale_id,
    s.invoice_number,
    s.sale_date,
    s.payment_status,
    si.sale_item_id,
    m.medicine_id,
    m.name AS medicine_name,
    m.generic_name,
    si.quantity,
    si.unit_price,
    si.subtotal
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
    po.your_name AS patient_name,
    po.your_email,
    po.contact_no,
    po.delivery_option,
    po.status,
    po.files_count,
    po.pharmacist_name,
    po.reviewed_at,
    po.created_at,
    TIMESTAMPDIFF(MINUTE, po.created_at, COALESCE(po.reviewed_at, NOW())) AS processing_minutes
FROM prescription_orders po;


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
-- SECTION 2.3: STORED PROCEDURES (11 Procedures)
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
-- SECTION 2.4: DATABASE TRIGGERS (8 Triggers)
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
-- SECTION 2.5: SCHEDULED DATABASE EVENTS (8 Events)
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


-- ============================================================
-- SECTION 3: SEED PRODUCTION SAMPLE DATA
-- Populates all 22 tables with verified clinical and sales records
-- ============================================================

-- 1. SEED BRANDS
INSERT INTO brands (brand_id, brand_name, country_of_origin) VALUES
(1, 'Pfizer Inc.', 'United States'),
(2, 'GlaxoSmithKline (GSK)', 'United Kingdom'),
(3, 'Novartis Pharmaceuticals', 'Switzerland'),
(4, 'Sanofi S.A.', 'France'),
(5, 'AstraZeneca plc', 'United Kingdom / Sweden'),
(6, 'Johnson & Johnson', 'United States'),
(7, 'Bayer AG', 'Germany'),
(8, 'Cipla Ltd.', 'India'),
(9, '3M Littmann', 'United States'),
(10, 'Omron Healthcare', 'Japan'),
(11, 'SafeCare Medical', 'Sri Lanka'),
(12, 'Roche Accu-Chek', 'Switzerland'),
(13, 'Optimum Nutrition', 'United States'),
(14, 'CeraVe Skincare', 'United States'),
(15, 'La Roche-Posay', 'France'),
(16, 'Sebamed Germany', 'Germany'),
(17, 'Reckitt Dettol', 'United Kingdom'),
(18, 'Vitabiotics UK', 'United Kingdom'),
(19, 'Siddhalepa Ayurveda', 'Sri Lanka')
ON DUPLICATE KEY UPDATE brand_name = VALUES(brand_name);

-- 2. SEED MEDICINE CATEGORIES
INSERT INTO medicine_categories (category_id, parent_category_id, category_name, description, icon_name, image_url) VALUES
(1, NULL, 'Antibiotics & Antimicrobials', 'Medicines that fight bacterial infections in humans and animals.', 'ShieldAlert', 'https://images.unsplash.com/photo-1471864190281-a93a3070b6de?auto=format&fit=crop&w=600&q=80'),
(2, NULL, 'Analgesics & Pain Relief', 'Medications designed specifically to relieve acute and chronic pain.', 'Activity', 'https://images.unsplash.com/photo-1584017911766-d451b3d0e843?auto=format&fit=crop&w=600&q=80'),
(3, NULL, 'Cardiovascular & Blood Pressure', 'Medications for hypertension, cholesterol, angina, and heart health.', 'Heart', 'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?auto=format&fit=crop&w=600&q=80'),
(4, NULL, 'Respiratory & Allergy', 'Inhalers, antihistamines, and bronchodilators for asthma and breathing conditions.', 'Wind', 'https://images.unsplash.com/photo-1584362917165-526a968579e8?auto=format&fit=crop&w=600&q=80'),
(5, NULL, 'Gastrointestinal & Antacids', 'Remedies for acid reflux, ulcers, digestion, nausea, and gut flora.', 'Stomach', 'https://images.unsplash.com/photo-1550572017-edd951aa8f72?auto=format&fit=crop&w=600&q=80'),
(6, NULL, 'Endocrine & Antidiabetic', 'Insulin therapies and oral medications for blood glucose regulation.', 'Zap', 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=600&q=80'),
(7, NULL, 'Vitamins & Dietary Supplements', 'Essential micronutrients, immune support supplements, and mineral formulations.', 'Sun', 'https://images.unsplash.com/photo-1577401239170-897942555fb3?auto=format&fit=crop&w=600&q=80'),
(8, NULL, 'Dermatology & Skin Care', 'Topical ointments, corticosteroids, and antibacterial creams.', 'Sparkles', 'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=600&q=80'),
(9, NULL, 'Diet & Nutrition', 'Protein powders, dietary food supplements, weight management, and energy formulations.', 'Apple', 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=600&q=80'),
(10, NULL, 'Beauty Care & Cosmetics', 'Dermatological skincare, cleansers, serums, sunscreens, and medical-grade cosmetics.', 'Sparkles', 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=600&q=80'),
(11, NULL, 'Personal Care & Hygiene', 'Everyday hygiene essentials, adult care, antiseptic washes, and personal wellness.', 'Shield', 'https://images.unsplash.com/photo-1583947215259-38e31be8751f?auto=format&fit=crop&w=600&q=80'),
(12, NULL, 'Baby & Mother Care', 'Pediatric care, baby lotion, gentle baby baths, hypoallergenic wipes, and baby nutrition.', 'Heart', 'https://images.unsplash.com/photo-1519689680058-324335c77eba?auto=format&fit=crop&w=600&q=80'),
(13, NULL, 'Medical Devices & Equipment', 'Blood pressure monitors, diagnostic stethoscopes, nebulizers, thermometers, and glucometers.', 'Activity', 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=600&q=80'),
(14, NULL, 'Ayurvedic & Herbal Care', 'Natural herbal remedies, herbal eye drops, gastro teas, and certified herbal wellness.', 'Leaf', 'https://images.unsplash.com/photo-1617791160505-6f00504e3519?auto=format&fit=crop&w=600&q=80')
ON DUPLICATE KEY UPDATE category_name = VALUES(category_name), image_url = VALUES(image_url);

-- 3. SEED SUPPLIERS
INSERT INTO suppliers (supplier_id, supplier_name, contact_person, phone, email, address, is_active) VALUES
(1, 'Apex Pharma Distributors', 'Dr. Sunil Jayawardena', '+94 11 234 5678', 'orders@apexpharma.lk', '45 Hospital Road, Colombo 07', TRUE),
(2, 'Global Healthcare Logistics', 'Ms. Anusha Fernando', '+94 11 789 0123', 'supply@globalhealth.com', '12 Industrial Zone, Biyagama', TRUE),
(3, 'MedSupply Ceylon Ltd.', 'Mr. K. Perera', '+94 81 223 4455', 'sales@medsupplyceylon.com', '88 Kandy Road, Peradeniya', TRUE),
(4, 'BioTech Prime Wholesalers', 'Mr. David Silva', '+94 91 222 3344', 'contact@biotechprime.lk', '34 Galle Road, Galle', TRUE),
(5, 'VDC Central Depot', 'Logistics Director', '+94 11 555 9900', 'depot@vdcstore.lk', '01 Main Street, Colombo 01', TRUE)
ON DUPLICATE KEY UPDATE supplier_name = VALUES(supplier_name);

-- 4. SEED MEDICINES
INSERT INTO medicines (
    medicine_id, name, generic_name, brand_id, category_id, 
    dosage_form, strength, description, side_effects, 
    usage_instructions, unit_price, discount_percent, is_offer, rating, image_url,
    is_public_price, low_stock_threshold, is_active
) VALUES
(1, 'Augmentin 625mg', 'Amoxicillin + Clavulanate Potassium', 2, 1, 'Tablet', '625mg', 'Broad-spectrum antibiotic used to treat bacterial infections of the respiratory tract, urinary tract, ear, and skin.', 'Mild diarrhea, nausea, skin rash. Consult doctor if severe.', 'Take with a meal or light snack to reduce stomach discomfort every 12 hours as prescribed.', 185.00, 0.00, FALSE, 5.0, '/medicines/Augmentin 625mg.webp', TRUE, 25, TRUE),
(2, 'Amoxil 500mg', 'Amoxicillin Trihydrate', 2, 1, 'Capsule', '500mg', 'Penicillin antibiotic used to treat a wide variety of bacterial infections including chest infections and dental abscesses.', 'Nausea, allergic reaction, headache.', 'Swallow whole with water every 8 hours. Complete full course.', 95.00, 0.00, FALSE, 5.0, '/medicines/Amoxil 500mg.jpg', TRUE, 30, TRUE),
(3, 'Ciprobay 500mg', 'Ciprofloxacin Hydrochloride', 7, 1, 'Tablet', '500mg', 'Fluoroquinolone antibiotic used for severe bacterial infections, complicated UTIs, and abdominal infections.', 'Dizziness, tendon discomfort, photosensitivity.', 'Drink plenty of water. Do not take with dairy products simultaneously.', 240.00, 0.00, FALSE, 5.0, '/medicines/Ciprobay 500mg.webp', TRUE, 20, TRUE),
(4, 'Zithromax 250mg', 'Azithromycin Dihydrate', 1, 1, 'Capsule', '250mg', 'Macrolide antibiotic commonly prescribed for sinus, respiratory, and soft tissue infections.', 'Abdominal cramps, loose stools.', 'Take once daily either 1 hour before or 2 hours after meals.', 320.00, 0.00, FALSE, 5.0, '/medicines/Zithromax 250mg.webp', TRUE, 20, TRUE),
(5, 'Panadol Extra', 'Paracetamol + Caffeine', 2, 2, 'Tablet', '500mg / 65mg', 'Enhanced pain reliever for tough headaches, migraines, muscular aches, and fever.', 'Insomnia, restlessness if taken late in evening.', '1 to 2 tablets every 4 to 6 hours as required. Do not exceed 8 tablets in 24 hours.', 45.00, 0.00, FALSE, 5.0, '/medicines/Panadol Extra.jpg', TRUE, 50, TRUE),
(6, 'Panadol Children Drops', 'Paracetamol', 2, 2, 'Drops', '100mg/ml', 'Gentle and effective relief of fever and pain for infants and toddlers.', 'Rare when given within recommended pediatric dosage.', 'Administer using calibrated dropper strictly according to child weight.', 350.00, 0.00, FALSE, 5.0, '/medicines/Panadol Children Drops.jpg', TRUE, 15, TRUE),
(7, 'Brufen 400mg', 'Ibuprofen', 8, 2, 'Tablet', '400mg', 'Non-steroidal anti-inflammatory drug (NSAID) for inflammatory pain, arthritis, toothache, and menstrual cramps.', 'Heartburn, mild stomach upset.', 'Always take with food or immediately after a meal.', 65.00, 0.00, FALSE, 5.0, '/medicines/Brufen 400mg.jpg', TRUE, 35, TRUE),
(8, 'Celebrex 200mg', 'Celecoxib', 1, 2, 'Capsule', '200mg', 'Selective COX-2 inhibitor for osteoarthritis, rheumatoid arthritis, and acute pain.', 'Fluid retention, indigestion.', 'Take once or twice daily with food as instructed by physician.', 410.00, 0.00, FALSE, 5.0, '/medicines/Celebrex 200mg.jpg', TRUE, 15, TRUE),
(9, 'Lipitor 20mg', 'Atorvastatin Calcium', 1, 3, 'Tablet', '20mg', 'HMG-CoA reductase inhibitor (statin) used to lower LDL cholesterol and triglyceride levels.', 'Muscle aches, mild liver enzyme variation.', 'Take once daily in the evening with or without food.', 160.00, 0.00, FALSE, 5.0, '/medicines/Lipitor 20mg.jpg', TRUE, 25, TRUE),
(10, 'Norvasc 5mg', 'Amlodipine Besylate', 1, 3, 'Tablet', '5mg', 'Calcium channel blocker prescribed for hypertension and chronic stable angina.', 'Peripheral edema (ankle swelling), flushing, dizziness.', 'Take once daily in the morning with a glass of water.', 110.00, 0.00, FALSE, 5.0, '/medicines/Norvasc 5mg.jpg', TRUE, 30, TRUE),
(11, 'Cozaar 50mg', 'Losartan Potassium', 3, 3, 'Tablet', '50mg', 'Angiotensin II receptor antagonist (ARB) for blood pressure control and kidney protection in diabetic patients.', 'Dizziness, low blood pressure on standing.', 'Take consistently once daily at the same time.', 145.00, 0.00, FALSE, 5.0, '/medicines/Cozaar 50mg.jpg', TRUE, 20, TRUE),
(12, 'Betaloc 25mg', 'Metoprolol Tartrate', 5, 3, 'Tablet', '25mg', 'Beta-blocker used to regulate cardiac rhythm, treat high blood pressure, and prevent heart complications.', 'Slow heart rate, fatigue, cold extremities.', 'Take during or immediately following a meal.', 90.00, 0.00, FALSE, 5.0, '/medicines/Betaloc 25mg.jpg', TRUE, 20, TRUE),
(13, 'Ventolin Evohaler', 'Salbutamol Sulfate', 2, 4, 'Inhaler', '100mcg/dose', 'Rapid-acting bronchodilator for prompt relief of bronchospasm in asthma and COPD.', 'Fine tremor, transient palpitations, nervousness.', 'Inhale 1 to 2 puffs during acute wheezing or 15 mins prior to exercise.', 750.00, 0.00, FALSE, 5.0, '/medicines/Ventolin Evohaler.jpg', TRUE, 20, TRUE),
(14, 'Singulair 10mg', 'Montelukast Sodium', 3, 4, 'Tablet', '10mg', 'Leukotriene receptor antagonist for maintenance asthma therapy and seasonal allergic rhinitis.', 'Headache, vivid dreams, upper respiratory symptoms.', 'Take one tablet orally every evening before sleep.', 280.00, 0.00, FALSE, 5.0, '/medicines/Singulair 10mg.jpg', TRUE, 20, TRUE),
(15, 'Zyrtec 10mg', 'Cetirizine Hydrochloride', 6, 4, 'Tablet', '10mg', 'Second-generation antihistamine for relief of hay fever, urticaria (hives), and runny nose.', 'Mild drowsiness, dry mouth.', 'Take one tablet once daily with water.', 55.00, 0.00, FALSE, 5.0, '/medicines/Zyrtec 10mg.jpg', TRUE, 40, TRUE),
(16, 'Flixonase Aqueous Spray', 'Fluticasone Propionate', 2, 4, 'Nasal Spray', '50mcg/spray', 'Topical nasal corticosteroid for preventive relief of allergic rhinitis and nasal congestion.', 'Nose irritation, occasional dryness.', 'Administer 1 to 2 sprays in each nostril once daily in the morning.', 1250.00, 0.00, FALSE, 5.0, '/medicines/Flixonase Aqueous Spray.jpg', TRUE, 15, TRUE),
(17, 'Nexium 40mg', 'Esomeprazole Magnesium', 5, 5, 'Tablet', '40mg', 'Proton pump inhibitor (PPI) for healing erosive esophagitis and treating gastroesophageal reflux disease (GERD).', 'Headache, constipation, abdominal pain.', 'Take at least 1 hour before breakfast with a glass of water.', 220.00, 0.00, FALSE, 5.0, '/medicines/Nexium 40mg.jpg', TRUE, 30, TRUE),
(18, 'Controloc 40mg', 'Pantoprazole Sodium', 7, 5, 'Tablet', '40mg', 'Acid-suppressive medication for gastric and duodenal ulcers, and acid hypersecretion.', 'Nausea, flatulence.', 'Swallow tablet whole; do not chew or crush before meals.', 175.00, 0.00, FALSE, 5.0, '/medicines/Controloc 40mg.jpg', TRUE, 25, TRUE),
(19, 'Motilium 10mg', 'Domperidone', 6, 5, 'Tablet', '10mg', 'Dopamine antagonist antiemetic used to relieve nausea, vomiting, and feelings of fullness.', 'Dry mouth, rarely drowsiness.', 'Take 15 to 30 minutes before meals.', 50.00, 0.00, FALSE, 5.0, '/medicines/Motilium 10mg.jpg', TRUE, 25, TRUE),
(20, 'Gaviscon Double Action', 'Sodium Alginate + Potassium Bicarbonate', 2, 5, 'Suspension', '10ml sachet', 'Fast-acting raft-forming liquid for quick suppression of heartburn and indigestion.', 'Occasional bloating if overused.', 'Take 10ml to 20ml after meals and at bedtime.', 90.00, 0.00, FALSE, 5.0, '/medicines/Gaviscon Double Action.jpg', TRUE, 40, TRUE),
(21, 'Glucophage 500mg', 'Metformin Hydrochloride', 4, 6, 'Tablet', '500mg', 'First-line biguanide oral antihyperglycemic for Type 2 diabetes mellitus management.', 'Metallic taste, gastrointestinal disturbances.', 'Take with or immediately after meals to reduce stomach upset.', 35.00, 0.00, FALSE, 5.0, '/medicines/Glucophage 500mg.jpg', TRUE, 50, TRUE),
(22, 'Amaryl 2mg', 'Glimepiride', 4, 6, 'Tablet', '2mg', 'Sulfonylurea oral hypoglycemic agent stimulating insulin release from beta cells.', 'Hypoglycemia (low blood sugar), weight gain.', 'Take immediately before or during the first main meal of the day.', 120.00, 0.00, FALSE, 5.0, '/medicines/Amaryl 2mg.jpg', TRUE, 20, TRUE),
(23, 'Lantus SoloStar', 'Insulin Glargine', 4, 6, 'Injection', '100 IU/ml (3ml pen)', 'Long-acting basal insulin analog providing steady 24-hour glucose regulation.', 'Hypoglycemia, local injection site reaction.', 'Subcutaneous injection once daily at the same time every day. Keep refrigerated.', 2850.00, 0.00, FALSE, 5.0, '/medicines/Lantus SoloStar.jpg', TRUE, 10, TRUE),
(24, 'Cevit 500mg Chewable', 'Ascorbic Acid (Vitamin C)', 8, 7, 'Tablet', '500mg', 'Essential antioxidant vitamin for immune system resilience, collagen synthesis, and iron absorption.', 'Stomach irritation with extremely high doses.', 'Chew or dissolve in mouth 1 tablet daily after food.', 25.00, 0.00, FALSE, 5.0, '/medicines/Cevit 500mg Chewable.jpg', TRUE, 60, TRUE),
(25, 'Ostocalcium D3', 'Calcium + Vitamin D3 (Cholecalciferol)', 2, 7, 'Tablet', '500mg / 400 IU', 'Bone density support supplement for prevention and treatment of calcium and vitamin D deficiency.', 'Mild constipation in sensitive individuals.', 'Take 1 tablet twice daily with food.', 40.00, 0.00, FALSE, 5.0, '/medicines/Ostocalcium D3.jpg', TRUE, 45, TRUE),
(26, 'Neurobion Forte', 'Vitamin B1 + B6 + B12', 3, 7, 'Tablet', 'Combination', 'Neurotropic B-vitamin complex for peripheral neuropathy, nerve health, and cellular metabolism.', 'Bright yellow urine (normal harmless riboflavin excretion).', 'Take 1 tablet daily after main meal.', 65.00, 0.00, FALSE, 5.0, '/medicines/Neurobion Forte.jpg', TRUE, 30, TRUE),
(27, 'Fucidin Cream 2%', 'Sodium Fusidate', 1, 8, 'Cream', '15g Tube', 'Potent topical antibacterial agent for localized skin infections including impetigo and infected dermatitis.', 'Mild stinging at site of application.', 'Apply thinly to affected area 2 to 3 times daily.', 680.00, 0.00, FALSE, 5.0, '/medicines/Fucidin Cream 2.jpg', TRUE, 15, TRUE),

-- Wellness Catalog Items
(28, '3M Littmann Classic III Stethoscope (Smoke / Black Tube)', 'Dual Frequency Medical Acoustic Stethoscope', 9, 13, 'Medical Device', '27-inch', 'High acoustic sensitivity for performing general physical assessments. Tunable diaphragms on both adult and pediatric sides.', 'Non-invasive diagnostic device. No physiological side effects.', 'Place headset comfortably into ear canals pointing forward. Position diaphragm gently on chest or back.', 70750.00, 10.00, TRUE, 5.0, '/medicines/3M Littmann Classic III Stethoscope Smoke_Black Tube.jpg', TRUE, 5, TRUE),
(29, 'Omron 2-in-1 Max Blood Glucose & BP Monitor', 'Automatic Digital Diagnostic System', 10, 13, 'Diagnostic Device', 'Digital', 'Clinical accuracy with Intellisense technology for comfortable, controlled inflation and high precision glucose readings.', 'Temporary cuff tightness during inflation.', 'Sit comfortably with feet flat. Wrap cuff around upper arm at heart level and press Start.', 4750.00, 15.00, TRUE, 5.0, '/medicines/Omron 2-in-1 Max Blood Glucose & BP Monitor.jpg', TRUE, 10, TRUE),
(30, 'Certified 3-Ply Protective Face Masks (Box of 50)', 'Fluid Resistant Bacterial Filtration Masks', 11, 11, 'Protective Wear', '50 Pieces', 'High BFE >= 98% particulate filtration with soft elastic ear loops and moldable nose clip for snug respiratory protection.', 'Hypoallergenic. Single use only.', 'Fit nose clip over nasal bridge. Secure ear loops and expand pleats to cover chin fully.', 75.00, 20.00, TRUE, 5.0, '/medicines/Certified 3-Ply Protective Face Masks (Box of 50).jpg', TRUE, 20, TRUE),
(31, 'Accu-Chek Active Blood Glucose Test Strips (50 Strips)', 'Electrochemical Biosensor Glucose Strips', 12, 13, 'Diagnostic Strips', '50 Strips Pack', 'Hassle-free accurate blood sugar measurement in 5 seconds. Easy-to-handle test strips designed for home and hospital monitoring.', 'None. For in-vitro diagnostic use.', 'Insert strip into Accu-Chek meter, touch blood droplet to green target area.', 4505.00, 0.00, FALSE, 5.0, '/medicines/Accu-Chek Active Blood Glucose Test Strips (50 Strips).jpg', TRUE, 15, TRUE),
(32, 'Optimum Nutrition Gold Standard 100% Whey (2 lbs)', 'Whey Protein Isolate & Peptides Formula', 13, 9, 'Powder', '907g Chocolate', 'Provides 24g of all-whey protein per serving with 5.5g of naturally occurring BCAAs to support muscle recovery and nutrition.', 'Contains milk and soy derivatives. Not recommended for galactosemic individuals.', 'Mix 1 rounded scoop with 6-8 fl oz of cold water or milk 30-60 minutes post workout.', 18500.00, 15.00, TRUE, 5.0, '/medicines/Optimum Nutrition Gold Standard 100 Whey (2 lbs).jpg', TRUE, 10, TRUE),
(33, 'CeraVe Hydrating Facial Cleanser for Normal to Dry Skin', 'Ceramides 1, 3, 6-II + Hyaluronic Acid Cleanser', 14, 10, 'Lotion Cleanser', '473ml Dispenser', 'Non-comedogenic, fragrance-free dermatologist-formulated wash that cleanses and hydrates without disrupting the protective skin barrier.', 'Very mild tingling on hypersensitive skin.', 'Wet skin with lukewarm water. Massage cleanser into skin in a gentle circular motion, then rinse.', 8900.00, 10.00, TRUE, 5.0, '/medicines/CeraVe Hydrating Facial Cleanser for Normal to Dry Skin.jpg', TRUE, 15, TRUE),
(34, 'La Roche-Posay Anthelios UVMune 400 Invisible Fluid SPF 50+', 'Mexoryl 400 Broad Spectrum UV Protection', 15, 10, 'Sunscreen Fluid', '50ml', 'Ultimate broad-spectrum defense against ultra-long UVA rays with high water, sweat, and sand resistance for sensitive skin.', 'Avoid direct eye contact.', 'Shake vigorously before use. Apply liberally 20 minutes before sun exposure; reapply every 2 hours.', 9500.00, 14.00, TRUE, 5.0, '/medicines/La Roche-Posay Anthelios UVMune 400 Invisible Fluid SPF 50.jpg', TRUE, 12, TRUE),
(35, 'Sebamed Baby Wash Extra Soft 200ml', 'pH 5.5 Tear-Free Pediatric Bath Formula', 16, 12, 'Baby Wash', '200ml', 'Specially formulated with squalane and allantoin to support natural acid mantle development and protect delicate newborn skin from dryness.', 'Dermatologically tested. Tear-free.', 'Put a couple of drops into baby bath water or apply gently on wet body, lather lightly, and rinse.', 3650.00, 0.00, FALSE, 5.0, '/medicines/Sebamed Baby Wash Extra Soft 200ml.jpg', TRUE, 15, TRUE),
(36, 'Dettol Antiseptic Disinfectant Liquid 750ml', 'Chloroxylenol 4.8% Antiseptic Solution', 17, 11, 'Antiseptic Solution', '750ml Hospital Grade', 'Proven effective against viruses and germs for wound cleansing, antibacterial skin hygiene, and personal protection.', 'For external use only. Dilute before applying to skin.', 'Dilute 1 capful in 400ml water for antiseptic skin cleansing and minor wound care.', 1850.00, 12.00, TRUE, 5.0, '/medicines/Dettol Antiseptic Disinfectant Liquid 750ml.jpg', TRUE, 25, TRUE),
(37, 'Wellman 50+ Comprehensive Multivitamin & Minerals (30 Tablets)', 'Bio-Active Nutrients & Siberian Ginseng + Co-Q10', 18, 7, 'Tablet', '30 Tablets Box', 'Expert nutrition formula including vitamins B6, B12, iron, and zinc to support active vitality, heart function, and immune defense.', 'Take with main meal to prevent stomach sensitivity.', 'One tablet per day with your main meal. Swallow with water or a cold drink. Do not chew.', 4200.00, 12.00, TRUE, 5.0, '/medicines/Wellman 50+ Comprehensive Multivitamin & Minerals (30 Tablets).jpg', TRUE, 20, TRUE),
(38, 'Siddhalepa Herbal Balm 50g Original Ayur Formula', 'Eucalyptus, Cinnamon & Herbal Ayurvedic Extract', 19, 14, 'Herbal Balm', '50g Glass Jar', 'Traditional time-tested Sri Lankan herbal formula providing natural soothing comfort for headaches, joint pains, and cold symptoms.', 'Warm soothing sensation on skin.', 'Foment the affected area with warm water and apply balm gently. Repeat two to three times daily.', 450.00, 10.00, TRUE, 5.0, '/medicines/Siddhalepa Herbal Balm 50g Original Ayur Formula.jpg', TRUE, 30, TRUE)
ON DUPLICATE KEY UPDATE 
    name = VALUES(name),
    unit_price = VALUES(unit_price),
    discount_percent = VALUES(discount_percent),
    is_offer = VALUES(is_offer),
    rating = VALUES(rating),
    image_url = VALUES(image_url);

-- 5. SEED MEDICINE BATCHES
INSERT INTO medicine_batches (
    batch_id, medicine_id, supplier_id, batch_number, 
    manufacture_date, expiry_date, quantity_received, 
    stock_quantity, reserved_quantity, unit_cost, status
) VALUES
(1, 1, 1, 'AUG-2025-01', '2025-01-10', '2027-06-30', 100, 80, 0, 140.00, 'active'),
(2, 1, 2, 'AUG-2025-02', '2025-03-01', '2027-08-31', 60, 40, 0, 142.00, 'active'),
(3, 1, 1, 'AUG-2023-EX', '2023-01-01', '2024-01-01', 50, 20, 0, 120.00, 'active'),
(4, 2, 1, 'AMX-2025-A1', '2025-02-15', '2027-04-15', 200, 150, 0, 70.00, 'active'),
(5, 3, 3, 'CIP-2025-09', '2025-01-05', '2027-01-05', 50, 12, 0, 190.00, 'active'),
(6, 4, 2, 'ZIT-2024-04', '2024-05-10', '2026-11-10', 40, 0, 0, 260.00, 'depleted'),
(7, 4, 2, 'ZIT-2025-RC', '2025-02-01', '2027-05-01', 50, 45, 0, 260.00, 'recalled'),
(8, 5, 1, 'PAN-2025-01', '2025-02-01', '2028-02-01', 400, 350, 0, 32.00, 'active'),
(9, 6, 1, 'PND-2025-DR', '2025-03-01', '2027-09-01', 30, 8, 0, 260.00, 'active'),
(10, 7, 4, 'BRU-2025-88', '2025-01-20', '2027-12-20', 120, 95, 0, 45.00, 'active'),
(11, 8, 2, 'CEL-2025-C1', '2025-02-10', '2027-03-10', 25, 6, 0, 320.00, 'active'),
(12, 9, 2, 'LIP-2025-77', '2025-01-15', '2027-06-15', 100, 70, 0, 115.00, 'active'),
(13, 10, 2, 'NOR-2025-11', '2025-02-20', '2027-08-20', 100, 85, 0, 78.00, 'active'),
(14, 11, 3, 'COZ-2024-55', '2024-03-01', '2026-09-01', 50, 0, 0, 105.00, 'depleted'),
(15, 12, 4, 'BET-2025-22', '2025-01-10', '2027-05-10', 80, 60, 0, 65.00, 'active'),
(16, 13, 1, 'VEN-2025-V1', '2025-03-05', '2027-07-05', 50, 40, 0, 580.00, 'active'),
(17, 14, 3, 'SNG-2025-44', '2025-02-12', '2027-02-12', 30, 9, 0, 210.00, 'active'),
(18, 15, 2, 'ZYR-2025-Z1', '2025-01-25', '2028-01-25', 150, 110, 0, 38.00, 'active'),
(19, 16, 1, 'FLX-2024-99', '2024-06-15', '2026-06-15', 25, 0, 0, 950.00, 'depleted'),
(20, 17, 4, 'NEX-2025-N4', '2025-03-01', '2027-09-01', 80, 65, 0, 165.00, 'active'),
(21, 18, 4, 'CTL-2025-C4', '2025-02-18', '2027-04-18', 60, 50, 0, 130.00, 'active'),
(22, 19, 2, 'MOT-2025-M1', '2025-01-30', '2027-03-30', 40, 10, 0, 36.00, 'active'),
(23, 20, 1, 'GAV-2025-G2', '2025-02-10', '2027-08-10', 100, 85, 0, 68.00, 'active'),
(24, 21, 3, 'GLU-2025-G5', '2025-01-08', '2028-01-08', 250, 220, 0, 24.00, 'active'),
(25, 22, 3, 'AMA-2025-A2', '2025-02-14', '2027-05-14', 40, 14, 0, 85.00, 'active'),
(26, 23, 3, 'LAN-2025-LS', '2025-03-01', '2027-12-01', 15, 4, 0, 2200.00, 'active'),
(27, 24, 4, 'CEV-2025-C5', '2025-02-01', '2028-02-01', 350, 300, 0, 16.00, 'active'),
(28, 25, 1, 'OST-2025-D3', '2025-01-20', '2027-07-20', 150, 120, 0, 28.00, 'active'),
(29, 26, 2, 'NEU-2025-NF', '2025-02-15', '2027-08-15', 100, 80, 0, 48.00, 'active'),
(30, 27, 1, 'FUC-2025-FC', '2025-01-12', '2027-01-12', 20, 5, 0, 490.00, 'active'),
(31, 28, 1, 'LOT-3M-2026', '2025-01-10', '2028-12-31', 35, 35, 0, 58000.00, 'active'),
(32, 29, 2, 'LOT-OMR-2026', '2025-02-10', '2028-12-31', 50, 50, 0, 3800.00, 'active'),
(33, 30, 3, 'LOT-SCM-2026', '2025-01-05', '2028-12-31', 120, 120, 0, 50.00, 'active'),
(34, 31, 2, 'LOT-ROCH-2026', '2025-03-01', '2027-09-30', 60, 60, 0, 3600.00, 'active'),
(35, 32, 4, 'LOT-ON-2026', '2025-02-20', '2027-10-31', 45, 45, 0, 14500.00, 'active'),
(36, 33, 4, 'LOT-CRV-2026', '2025-01-15', '2027-12-31', 40, 40, 0, 6900.00, 'active'),
(37, 34, 4, 'LOT-LRP-2026', '2025-03-01', '2027-12-31', 38, 38, 0, 7200.00, 'active'),
(38, 35, 2, 'LOT-SBM-2026', '2025-01-20', '2027-12-31', 55, 55, 0, 2800.00, 'active'),
(39, 36, 1, 'LOT-DTL-2026', '2025-02-01', '2028-02-01', 90, 90, 0, 1350.00, 'active'),
(40, 37, 4, 'LOT-WM-2026', '2025-01-10', '2027-08-31', 70, 70, 0, 3100.00, 'active'),
(41, 38, 5, 'LOT-SDH-2026', '2025-02-15', '2028-02-15', 150, 150, 0, 320.00, 'active')
ON DUPLICATE KEY UPDATE stock_quantity = VALUES(stock_quantity);

-- 6. SEED STOCK MOVEMENTS
INSERT INTO stock_movements (batch_id, movement_type, quantity_changed, reason, performed_by) VALUES
(1, 'RESTOCK', 100, 'Initial wholesale warehouse stock delivery', 'Administrator'),
(1, 'DISPENSED', -20, 'Internal counter physical dispensation', 'Pharmacist'),
(4, 'RESTOCK', 200, 'Routine quarterly stock delivery', 'Administrator'),
(4, 'DISPENSED', -50, 'Prescription fulfillment', 'Pharmacist'),
(5, 'RESTOCK', 50, 'Emergency distributor replenishment', 'Administrator'),
(5, 'DISPENSED', -38, 'Routine walk-in dispensary sales', 'Pharmacist'),
(6, 'RESTOCK', 40, 'Initial batch receipt', 'Administrator'),
(6, 'DISPENSED', -40, 'Final stock depleted through dispensary', 'Pharmacist'),
(7, 'RECALL', -5, 'Manufacturer quality safety check recall', 'Quality Auditor');

-- 7. SEED USERS
INSERT INTO users (user_id, username, email, password_hash, role, full_name, is_active) VALUES
(1, 'admin', 'admin@vdcstore.lk', '$2a$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQmG6Fe60E8A23d6aSTOm', 'ADMIN', 'Chief Pharmacy Administrator', TRUE),
(2, 'pharmacist', 'pharmacist@vdcstore.lk', '$2a$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQmG6Fe60E8A23d6aSTOm', 'PHARMACIST', 'Licensed Staff Pharmacist', TRUE)
ON DUPLICATE KEY UPDATE full_name = VALUES(full_name);

-- 8. SEED CUSTOMERS
INSERT INTO customers (customer_id, full_name, email, password_hash, contact_no, patient_age, nic, address, is_active, status) VALUES
(1, 'Kasun Perera', 'kasun.perera@gmail.com', '$2a$10$7R53Yl5bX79d8y0/Hn86kO94kK2tQzV1Uu5w8r3.Yj8T9G1uM8tKy', '+94 77 123 4567', '34', '199012345678', '45 Temple Road, Nugegoda', TRUE, 'active'),
(2, 'Mrs. Champa Wickramasinghe', 'champa.w@gmail.com', '$2a$10$7R53Yl5bX79d8y0/Hn86kO94kK2tQzV1Uu5w8r3.Yj8T9G1uM8tKy', '+94 71 987 6543', '58', '196654321098', '12 Lake Drive, Colombo 05', TRUE, 'active'),
(3, 'Dr. Samantha Perera', 'samantha.perera@health.gov.lk', '$2a$10$7R53Yl5bX79d8y0/Hn86kO94kK2tQzV1Uu5w8r3.Yj8T9G1uM8tKy', '+94 76 555 4321', '46', '197822446688', '78 Kynsey Road, Colombo 08', TRUE, 'active'),
(4, 'Mr. Roshan De Silva', 'roshan.desilva@gmail.com', '$2a$10$7R53Yl5bX79d8y0/Hn86kO94kK2tQzV1Uu5w8r3.Yj8T9G1uM8tKy', '+94 72 333 8899', '42', '198233445566', '23 Baseline Road, Colombo 09', TRUE, 'active'),
(5, 'Amanda Rodrigo', 'amanda.rodrigo@outlook.com', '$2a$10$7R53Yl5bX79d8y0/Hn86kO94kK2tQzV1Uu5w8r3.Yj8T9G1uM8tKy', '+94 70 444 1122', '28', '199611223344', '56 Beach Road, Mount Lavinia', TRUE, 'active')
ON DUPLICATE KEY UPDATE full_name = VALUES(full_name);

-- 9. SEED PHARMACY SETTINGS
INSERT INTO pharmacy_settings (setting_key, setting_value, description, is_public) VALUES
('store_name', 'My Pharmacist / VDC Store Pharmacy', 'Official legal pharmacy name', TRUE),
('tagline', 'Your Trusted Community Healthcare & Medicine Information Partner', 'Pharmacy branding slogan', TRUE),
('phone_primary', '+94 11 234 5678', 'Main dispensary telephone helpline', TRUE),
('phone_hotline', '+94 77 123 4567', '24/7 Pharmacist emergency inquiry hotline', TRUE),
('email', 'info@vdcstore.lk', 'General inquiries email address', TRUE),
('address_street', '124 Galle Road, Bambalapitiya', 'Physical premises address', TRUE),
('address_city', 'Colombo 04, Sri Lanka', 'City and district', TRUE),
('hours_weekday', '8:00 AM – 10:00 PM', 'Monday to Friday opening schedule', TRUE),
('hours_saturday', '8:30 AM – 9:00 PM', 'Saturday opening schedule', TRUE),
('hours_sunday', '9:00 AM – 6:00 PM', 'Sunday and Poya day opening schedule', TRUE),
('announcement', 'Welcome to My Pharmacist. Licensed dispensary with cold-chain verified pharmaceutical stock.', 'Public alert banner', TRUE),
('default_low_stock_threshold', '20', 'Internal stock alarm trigger level', FALSE),
('system_version', '2.0.0-ADBMS', 'Software release identification', FALSE)
ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value);

-- 10. SEED PURCHASES & PURCHASE ITEMS
INSERT INTO purchases (purchase_id, supplier_id, invoice_number, purchase_date, total_amount, status, received_by, notes) VALUES
(1, 1, 'PO-2026-001', DATE_SUB(CURDATE(), INTERVAL 14 DAY), 45000.00, 'RECEIVED', 'Chief Administrator', 'Quarterly antibiotic restock'),
(2, 2, 'PO-2026-002', DATE_SUB(CURDATE(), INTERVAL 7 DAY), 62500.00, 'RECEIVED', 'Chief Administrator', 'Analgesics & cardiovascular formulations'),
(3, 3, 'PO-2026-003', DATE_SUB(CURDATE(), INTERVAL 2 DAY), 28400.00, 'RECEIVED', 'Licensed Pharmacist', 'Vitamins & Respiratory replenishment')
ON DUPLICATE KEY UPDATE invoice_number = VALUES(invoice_number);

INSERT INTO purchase_items (purchase_item_id, purchase_id, medicine_id, batch_number, quantity, unit_cost, subtotal, expiry_date) VALUES
(1, 1, 1, 'AUG-2026-01', 100, 140.00, 14000.00, DATE_ADD(CURDATE(), INTERVAL 365 DAY)),
(2, 1, 2, 'AMX-2026-01', 120, 32.00, 3840.00, DATE_ADD(CURDATE(), INTERVAL 400 DAY)),
(3, 2, 5, 'PAN-2026-01', 200, 4.50, 900.00, DATE_ADD(CURDATE(), INTERVAL 500 DAY)),
(4, 2, 9, 'LIP-2026-01', 80, 52.00, 4160.00, DATE_ADD(CURDATE(), INTERVAL 300 DAY)),
(5, 3, 13, 'VNT-2026-01', 30, 920.00, 27600.00, DATE_ADD(CURDATE(), INTERVAL 450 DAY))
ON DUPLICATE KEY UPDATE quantity = VALUES(quantity);

-- 11. SEED COUNTER SALES (With Foreign Key to Customers)
INSERT INTO sales (sale_id, invoice_number, user_id, customer_id, patient_name, prescription_ref, subtotal, discount_amount, tax_amount, total_amount, payment_status, sale_date) VALUES
(1, 'INV-2026-1001', 2, 2, 'Mrs. Champa Wickramasinghe', 'RX-SLMC-4921', 1850.00, 0.00, 0.00, 1850.00, 'PAID', DATE_SUB(NOW(), INTERVAL 3 DAY)),
(2, 'INV-2026-1002', 2, 4, 'Mr. Roshan De Silva', 'OTC-Walk-in', 150.00, 0.00, 0.00, 150.00, 'PAID', DATE_SUB(NOW(), INTERVAL 2 DAY)),
(3, 'INV-2026-1003', 2, 3, 'Dr. Samantha Perera', 'RX-SLMC-8812', 3450.00, 0.00, 0.00, 3450.00, 'PAID', DATE_SUB(NOW(), INTERVAL 1 DAY)),
(4, 'INV-2026-1004', 2, 1, 'Mr. Kasun Perera', 'RX-SLMC-1204', 1280.00, 0.00, 0.00, 1280.00, 'PAID', NOW()),
(5, 'INV-2026-1005', 2, NULL, 'Walk-in Customer', 'OTC-Walk-in', 420.00, 0.00, 0.00, 420.00, 'PAID', NOW())
ON DUPLICATE KEY UPDATE invoice_number = VALUES(invoice_number);

INSERT INTO sale_items (sale_item_id, sale_id, medicine_id, quantity, unit_price, subtotal, packaging_desc) VALUES
(1, 1, 1, 10, 185.00, 1850.00, '1 Card (10 Tablets)'),
(2, 2, 5, 20, 7.50, 150.00, '2 Cards (20 Tablets)'),
(3, 3, 13, 2, 1250.00, 2500.00, '2 Canisters (Inhalers)'),
(4, 3, 5, 10, 7.50, 75.00, '1 Card (10 Tablets)'),
(5, 3, 1, 4, 185.00, 740.00, '4 Loose Tablets'),
(6, 4, 9, 8, 160.00, 1280.00, '8 Tablets'),
(7, 5, 20, 4, 90.00, 360.00, '4 Sachets')
ON DUPLICATE KEY UPDATE quantity = VALUES(quantity);

INSERT INTO sale_item_batches (allocation_id, sale_item_id, batch_id, quantity_allocated) VALUES
(1, 1, 1, 10),
(2, 2, 8, 20),
(3, 3, 16, 2),
(4, 4, 8, 10),
(5, 5, 1, 4),
(6, 6, 12, 8),
(7, 7, 23, 4)
ON DUPLICATE KEY UPDATE quantity_allocated = VALUES(quantity_allocated);

INSERT INTO payments (payment_id, sale_id, payment_method, amount_paid, change_given, reference_note, payment_date) VALUES
(1, 1, 'CASH', 2000.00, 150.00, 'Counter POS Cash Receipt #INV-2026-1001', DATE_SUB(NOW(), INTERVAL 3 DAY)),
(2, 2, 'CASH', 200.00, 50.00, 'Counter POS Cash Receipt #INV-2026-1002', DATE_SUB(NOW(), INTERVAL 2 DAY)),
(3, 3, 'CARD', 3450.00, 0.00, 'POS Visa Auth #984210 #INV-2026-1003', DATE_SUB(NOW(), INTERVAL 1 DAY)),
(4, 4, 'CARD', 1280.00, 0.00, 'POS Master Auth #441920 #INV-2026-1004', NOW()),
(5, 5, 'CASH', 500.00, 80.00, 'Counter POS Cash Receipt #INV-2026-1005', NOW())
ON DUPLICATE KEY UPDATE amount_paid = VALUES(amount_paid);

-- 12. SEED PROMOTIONS / COUPONS
INSERT INTO promotions (promotion_id, code, title, description, discount_type, discount_value, min_order_amount, badge, category, tag, is_active, valid_from, valid_until) VALUES
(1, 'IMMUNE15', 'Immune & Wellness Pack', 'Get 15% off high-potency Vitamin C, Zinc, and Multivitamin combinations this season.', 'PERCENT', 15.00, 1000.00, '15% OFF', 'Vitamins & Supplements', 'Trending Health Deal', TRUE, '2025-01-01', '2028-12-31'),
(2, 'CARE50', 'Senior Citizen Chronic Care Delivery', 'Free dispensary doorstep courier service for monthly diabetes and blood pressure prescription refills.', 'FREE_DELIVERY', 0.00, 2500.00, 'FREE DELIVERY', 'Prescription Services', 'Dispensary Special', TRUE, '2025-01-01', '2028-12-31'),
(3, 'HYGIENE20', 'Personal Care & Hygiene Essentials', 'Special bundle discounts on medical-grade antiseptic washes, masks, and sanitizers.', 'PERCENT', 20.00, 1500.00, 'FLAT 20% OFF', 'Personal Care', 'Counter Clearance', TRUE, '2025-01-01', '2028-12-31')
ON DUPLICATE KEY UPDATE code = VALUES(code), discount_value = VALUES(discount_value);

-- 13. SEED CUSTOMER REVIEWS
INSERT INTO customer_reviews (review_id, customer_id, medicine_id, patient_name, role_title, rating, comment, category, is_verified, helpful_count, is_approved, avatar_color) VALUES
(1, 3, 9, 'Dr. Senaka Wickramasinghe', 'Consultant Physician', 5, 
 'Exceptional inventory tracking. Being able to check real-time availability of specialized cardiac medications (Norvasc, Lipitor) before driving to the counter saved immense time for my patients.', 
 'Cardiovascular Care', TRUE, 24, TRUE, 'from-blue-600 to-indigo-600'),
(2, NULL, 6, 'Nadeesha Senanayake', 'Mother of two', 5, 
 'The beauty & baby wellness collection is authentic and carefully handled. The Sebamed baby products and Panadol infant drops were in fresh condition with long expiry dates.', 
 'Baby & Pediatric Care', TRUE, 19, TRUE, 'from-pink-500 to-rose-500'),
(3, 1, 23, 'Mahesh Bandara', 'Chronic Care Patient', 5, 
 'I rely on Lantus SoloStar insulin pens monthly. The dispensary strictly follows the 2°C – 8°C cold-chain protocol with temperature monitored transport packs. Highly dependable!', 
 'Cold-Chain Insulin', TRUE, 31, TRUE, 'from-teal-600 to-emerald-600'),
(4, NULL, 32, 'Dilini Karunaratne', 'Fitness Enthusiast', 5, 
 'Purchased Optimum Nutrition whey and Vitabiotics multivitamins. Excellent price with genuine hologram labels. Much better than shady online sellers!', 
 'Diet & Nutrition', TRUE, 14, TRUE, 'from-amber-500 to-orange-500'),
(5, 2, 11, 'K. V. Perera', 'Senior Citizen', 5, 
 'Very professional dispensary staff. They checked my doctor prescription thoroughly and explained the dosage schedule for Cozaar and Betaloc with clear instructions.', 
 'Hypertension Care', TRUE, 22, TRUE, 'from-purple-600 to-indigo-600'),
(6, 5, 34, 'Amanda Rodrigo', 'Verified Customer', 5, 
 'The CeraVe cleanser and La Roche-Posay SPF 50+ are 100% original imported stock. Great customer support and genuine medical-grade skincare options.', 
 'Beauty & Skincare', TRUE, 18, TRUE, 'from-emerald-600 to-teal-600')
ON DUPLICATE KEY UPDATE patient_name = VALUES(patient_name), comment = VALUES(comment);

-- 14. SEED CUSTOMER INQUIRIES
INSERT INTO inquiries (inquiry_id, reference_code, customer_id, name, phone, email, medicine_query, message, status, staff_notes, responded_by, responded_at) VALUES
(1, 'INQ-481920', 1, 'Kasun Perera', '+94 77 123 4567', 'kasun.perera@gmail.com', 'Lantus SoloStar cold storage refill', 'Do you have cold storage insulated gel packs for Lantus insulin pickup this Friday afternoon?', 'RESOLVED', 'Advised patient that free insulated gel packs are provided with all insulin orders.', 'Staff Pharmacist', NOW()),
(2, 'INQ-552194', 4, 'Mr. Roshan De Silva', '+94 72 333 8899', 'roshan.desilva@gmail.com', 'Norvasc 5mg stock inquiry', 'Can I reserve two 30-tablet boxes of Norvasc 5mg for collection tomorrow morning?', 'IN_REVIEW', 'Batch #NOR-2025-11 checked. Stock reserved.', 'Staff Pharmacist', NOW()),
(3, 'INQ-819302', NULL, 'Lakshmi Jayasinghe', '+94 71 222 9988', 'lakshmi.j@gmail.com', 'Pediatric Ventolin syrup alternative', 'Is Salbutamol pediatric syrup available, or is the Evohaler the only active option?', 'NEW', NULL, NULL, NULL)
ON DUPLICATE KEY UPDATE reference_code = VALUES(reference_code);

-- 15. SEED PRESCRIPTION ORDERS & NORMALIZED PRESCRIPTION FILES
INSERT INTO prescription_orders (
    order_id, account_type, customer_id, your_name, your_email, 
    patient_name, patient_age, contact_no, delivery_option, 
    files_count, message, status, pharmacist_name, reviewed_at, 
    confirmation_message, rejection_reason, ready_time, email_sent, email_sent_at
) VALUES
('RX-2026-8910', 'registered', 1, 'Kasun Perera', 'kasun.perera@gmail.com', 
 'Sunil Perera (Father)', '68', '+94 77 123 4567', 'Dispensary Counter Pickup (Free)',
 1, 'Monthly chronic medication refill for Hypertension and Diabetes.', 'accepted', 
 'Licensed Staff Pharmacist', NOW(), 'Prescription validated by supervising pharmacist. Please bring your original SLMC doctor prescription for counter stamp verification.',
 NULL, 'Today after 4:00 PM', 1, NOW()),

('RX-2026-8911', 'registered', 1, 'Kasun Perera', 'kasun.perera@gmail.com', 
 'Kasun Perera', '38', '+94 77 123 4567', 'Doorstep Courier Delivery (Flat Rs. 350)',
 1, 'Antibiotic prescription refill for Amoxicillin capsules.', 'rejected', 
 'Supervising Clinical Pharmacist', NOW(), NULL,
 'Doctor license seal and date of prescription are illegible or missing. SLMC regulations require an authorized physical seal for scheduled antibiotics.',
 NULL, 1, NOW()),

('RX-2026-8908', 'registered', 2, 'Mrs. Champa Wickramasinghe', 'champa.w@gmail.com', 
 'Mrs. Champa Wickramasinghe', '58', '+94 71 987 6543', 'Doorstep Courier Delivery (Flat Rs. 350)',
 1, 'Lipitor and Cozaar prescription uploaded for delivery.', 'pending', 
 NULL, NULL, NULL, NULL, NULL, 0, NULL)
ON DUPLICATE KEY UPDATE order_id = VALUES(order_id);

INSERT INTO prescription_files (file_id, order_id, file_path, file_name, file_type, file_size) VALUES
(1, 'RX-2026-8910', '/uploads/prescriptions/rx_sample_perera_2026.pdf', 'SLMC_Doctor_Prescription_Cardiology.pdf', 'application/pdf', 245000),
(2, 'RX-2026-8908', '/uploads/prescriptions/rx_sample_champa_2026.jpg', 'Doctor_Prescription_Refill.jpg', 'image/jpeg', 185000)
ON DUPLICATE KEY UPDATE file_id = VALUES(file_id);

-- 16. SEED NOTIFICATION LOGS
INSERT INTO notification_logs (notification_id, order_id, customer_id, recipient_email, recipient_name, subject, message_body, notification_type, status, sent_at) VALUES
(1, 'RX-2026-8910', 1, 'kasun.perera@gmail.com', 'Kasun Perera', 
 'Prescription Order Confirmed [RX-2026-8910] — Ready for Pickup', 
 'Dear Kasun Perera, Great news! Your prescription order RX-2026-8910 has been accepted by our pharmacist and will be ready after 4:00 PM.',
 'PRESCRIPTION_ACCEPTED', 'SENT', NOW()),
(2, 'RX-2026-8908', 2, 'champa.w@gmail.com', 'Mrs. Champa Wickramasinghe', 
 'Prescription Order Received [RX-2026-8908] — Under Review', 
 'Dear Mrs. Champa Wickramasinghe, We have successfully received your prescription upload. A pharmacist will review it shortly.',
 'PRESCRIPTION_RECEIVED', 'SENT', NOW())
ON DUPLICATE KEY UPDATE notification_id = VALUES(notification_id);


-- ============================================================
-- SECTION 4: DATABASE SECURITY & DCL USER MANAGEMENT
-- Provisions specialized accounts under Principle of Least Privilege
-- ============================================================

-- 1. Web Application Service User (Runtime application connection)
DROP USER IF EXISTS 'pharmacy_app'@'localhost';
CREATE USER 'pharmacy_app'@'localhost'
    IDENTIFIED BY 'PharmacyApp@2026!'
    WITH 
        MAX_QUERIES_PER_HOUR 20000
        MAX_CONNECTIONS_PER_HOUR 2000
        MAX_USER_CONNECTIONS 50
    FAILED_LOGIN_ATTEMPTS 5
    PASSWORD_LOCK_TIME 1;

-- 2. Database Administrator (DBA) User
DROP USER IF EXISTS 'pharmacy_admin'@'localhost';
CREATE USER 'pharmacy_admin'@'localhost'
    IDENTIFIED BY 'PharmacyAdmin@2026!'
    WITH 
        MAX_CONNECTIONS_PER_HOUR 500
        MAX_USER_CONNECTIONS 10
    FAILED_LOGIN_ATTEMPTS 3
    PASSWORD_LOCK_TIME 1
    PASSWORD EXPIRE INTERVAL 90 DAY;

-- 3. Regulatory & Financial Auditor User (Read-Only)
DROP USER IF EXISTS 'pharmacy_auditor'@'localhost';
CREATE USER 'pharmacy_auditor'@'localhost'
    IDENTIFIED BY 'PharmacyAudit@2026!'
    WITH 
        MAX_QUERIES_PER_HOUR 5000
        MAX_CONNECTIONS_PER_HOUR 300
        MAX_USER_CONNECTIONS 5
    FAILED_LOGIN_ATTEMPTS 3
    PASSWORD_LOCK_TIME 1;

-- Grant DML and Stored Routine Execution to Application User (Denied DDL by design)
REVOKE ALL PRIVILEGES, GRANT OPTION FROM 'pharmacy_app'@'localhost';
GRANT SELECT, INSERT, UPDATE, DELETE ON pharmacy_db.* TO 'pharmacy_app'@'localhost';
GRANT EXECUTE ON pharmacy_db.* TO 'pharmacy_app'@'localhost';

-- Grant Full DBA Control to Administrator User
GRANT ALL PRIVILEGES ON pharmacy_db.* TO 'pharmacy_admin'@'localhost' WITH GRANT OPTION;

-- Grant Read-Only access to Auditor User
REVOKE ALL PRIVILEGES, GRANT OPTION FROM 'pharmacy_auditor'@'localhost';
GRANT SELECT ON pharmacy_db.v_medicine_catalog TO 'pharmacy_auditor'@'localhost';
GRANT SELECT ON pharmacy_db.v_medicine_availability TO 'pharmacy_auditor'@'localhost';
GRANT SELECT ON pharmacy_db.v_low_stock_alerts TO 'pharmacy_auditor'@'localhost';
GRANT SELECT ON pharmacy_db.v_expiring_batches TO 'pharmacy_auditor'@'localhost';
GRANT SELECT ON pharmacy_db.v_daily_sales TO 'pharmacy_auditor'@'localhost';
GRANT SELECT ON pharmacy_db.v_monthly_sales TO 'pharmacy_auditor'@'localhost';
GRANT SELECT ON pharmacy_db.v_sales_by_medicine TO 'pharmacy_auditor'@'localhost';
GRANT SELECT ON pharmacy_db.v_payment_summary TO 'pharmacy_auditor'@'localhost';
GRANT SELECT ON pharmacy_db.v_customer_purchase_history TO 'pharmacy_auditor'@'localhost';
GRANT SELECT ON pharmacy_db.v_active_promotions TO 'pharmacy_auditor'@'localhost';
GRANT SELECT ON pharmacy_db.v_approved_reviews TO 'pharmacy_auditor'@'localhost';
GRANT SELECT ON pharmacy_db.v_supplier_order_performance TO 'pharmacy_auditor'@'localhost';
GRANT SELECT ON pharmacy_db.v_prescription_fulfillment_pipeline TO 'pharmacy_auditor'@'localhost';
GRANT SELECT ON pharmacy_db.v_pharmacist_dispensing_workload TO 'pharmacy_auditor'@'localhost';
GRANT SELECT ON pharmacy_db.audit_logs TO 'pharmacy_auditor'@'localhost';
GRANT SELECT ON pharmacy_db.notification_logs TO 'pharmacy_auditor'@'localhost';

FLUSH PRIVILEGES;

