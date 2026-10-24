-- ============================================================
-- VDC STORE / MY PHARMACIST MANAGEMENT SYSTEM
-- Relational Database Schema (MySQL 8.0+)
-- Module: Advanced Database Management System (ADBMS)
-- Architecture: 3NF Relational Model with Referential Integrity
-- ============================================================

CREATE DATABASE IF NOT EXISTS pharmacy_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE pharmacy_db;

-- ------------------------------------------------------------
-- 1. BRANDS TABLE
-- Stores pharmaceutical manufacturing brands and lab origins
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS brands (
    brand_id INT AUTO_INCREMENT PRIMARY KEY,
    brand_name VARCHAR(150) NOT NULL UNIQUE,
    country_of_origin VARCHAR(100) DEFAULT 'Global',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- 2. MEDICINE CATEGORIES TABLE
-- Classifies medicines & wellness departments with self-referencing hierarchy
-- ------------------------------------------------------------
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

-- ------------------------------------------------------------
-- 3. SUPPLIERS TABLE
-- Internal pharmaceutical distributors & wholesalers (Staff only)
-- ------------------------------------------------------------
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

-- ------------------------------------------------------------
-- 4. MEDICINES TABLE
-- Master medicine & wellness catalog in 3NF with pricing, discounts & media
-- ------------------------------------------------------------
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

-- ------------------------------------------------------------
-- 5. MEDICINE BATCHES TABLE
-- Granular physical inventory tracking batch numbers, expiry & safety stock
-- ------------------------------------------------------------
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

-- ------------------------------------------------------------
-- 6. STOCK MOVEMENTS TABLE
-- Complete transactional audit log of physical pharmacy stock changes
-- ------------------------------------------------------------
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

-- ------------------------------------------------------------
-- 7. USERS TABLE
-- Role-based access control for internal staff (Admin, Pharmacist)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('ADMIN', 'PHARMACIST') NOT NULL DEFAULT 'PHARMACIST',
    full_name VARCHAR(100) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- 8. PHARMACY SETTINGS TABLE
-- Configurable store information (contact, opening hours, address)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pharmacy_settings (
    setting_key VARCHAR(50) PRIMARY KEY,
    setting_value TEXT NOT NULL,
    description VARCHAR(255),
    is_public BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- 9. AUDIT LOGS TABLE
-- Automated change log triggered on batch and inventory changes
-- ------------------------------------------------------------
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

-- ------------------------------------------------------------
-- 10. PURCHASES TABLE
-- Inbound wholesale shipment orders from verified distributors
-- ------------------------------------------------------------
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

-- ------------------------------------------------------------
-- 11. PURCHASE ITEMS TABLE
-- Line items associated with incoming purchase invoices
-- ------------------------------------------------------------
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

-- ------------------------------------------------------------
-- 12. CUSTOMERS TABLE
-- Registered online patient accounts & dispensary counter client profiles
-- ------------------------------------------------------------
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

-- ------------------------------------------------------------
-- 13. SALES TABLE
-- Counter POS transactions, patient dispensations & checkout invoices
-- Foreign Keys: users (staff pharmacist) AND customers (patient account)
-- ------------------------------------------------------------
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

-- ------------------------------------------------------------
-- 14. SALE ITEMS TABLE
-- Medication line items within each sale transaction
-- ------------------------------------------------------------
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

-- ------------------------------------------------------------
-- 15. SALE ITEM BATCH ALLOCATIONS TABLE
-- 3NF bridge linking each line item to the exact physical batch lot deducted
-- ------------------------------------------------------------
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

-- ------------------------------------------------------------
-- 16. PAYMENTS TABLE
-- Counter payments recorded for sales
-- ------------------------------------------------------------
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

-- ------------------------------------------------------------
-- 17. PRESCRIPTION ORDERS TABLE
-- Online prescription upload and dispensary fulfillment requests
-- Normalized with foreign keys to customers and child files table
-- ------------------------------------------------------------
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
    files LONGTEXT NULL, -- Maintained for backward compatibility
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

-- ------------------------------------------------------------
-- 18. PRESCRIPTION FILES TABLE (3NF Normalization)
-- Child entity separating file uploads from the orders table to eliminate
-- Buffer Pool degradation and First Normal Form (1NF) multi-value violations
-- ------------------------------------------------------------
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

-- ------------------------------------------------------------
-- 19. PROMOTIONS / COUPONS TABLE
-- Promotional discount vouchers with expiration tracking and minimum order rule
-- ------------------------------------------------------------
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

-- ------------------------------------------------------------
-- 20. CUSTOMER REVIEWS TABLE
-- Verified patient testimonials and ratings linked to medicines & customers
-- ------------------------------------------------------------
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

-- ------------------------------------------------------------
-- 21. INQUIRIES TABLE
-- Patient contact messages and clinical counseling inquiries
-- ------------------------------------------------------------
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

-- ------------------------------------------------------------
-- 22. NOTIFICATION LOGS TABLE
-- Relational audit trail for emails, alerts & receipts replacing disk flat-files
-- ------------------------------------------------------------
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
