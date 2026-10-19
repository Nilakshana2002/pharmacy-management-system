-- ============================================================
-- VDC STORE PHARMACY MANAGEMENT SYSTEM
-- Relational Database Schema (MySQL 8.0+)
-- Module: Advanced Database Management System (ADBMS) Coursework
-- ============================================================

CREATE DATABASE IF NOT EXISTS pharmacy_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE pharmacy_db;

-- ------------------------------------------------------------
-- 1. BRANDS TABLE
-- Stores pharmaceutical manufacturing brands and lab origins
-- ------------------------------------------------------------
CREATE TABLE brands (
    brand_id INT AUTO_INCREMENT PRIMARY KEY,
    brand_name VARCHAR(150) NOT NULL UNIQUE,
    country_of_origin VARCHAR(100) DEFAULT 'Global',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- 2. MEDICINE CATEGORIES TABLE
-- Classifies medicines (Antibiotics, Analgesics, Vitamins, etc.)
-- ------------------------------------------------------------
CREATE TABLE medicine_categories (
    category_id INT AUTO_INCREMENT PRIMARY KEY,
    category_name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    icon_name VARCHAR(50) DEFAULT 'Pill',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- 3. SUPPLIERS TABLE
-- Internal pharmaceutical distributors & wholesalers (Staff only)
-- ------------------------------------------------------------
CREATE TABLE suppliers (
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
-- Master medicine catalog with generic and brand relations (3NF)
-- ------------------------------------------------------------
CREATE TABLE medicines (
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
    is_public_price BOOLEAN DEFAULT TRUE,
    low_stock_threshold INT NOT NULL DEFAULT 20,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_medicines_brand FOREIGN KEY (brand_id) 
        REFERENCES brands(brand_id) ON DELETE RESTRICT,
    CONSTRAINT fk_medicines_category FOREIGN KEY (category_id) 
        REFERENCES medicine_categories(category_id) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- Indexes for optimal search and filtering
CREATE INDEX idx_medicines_name ON medicines(name);
CREATE INDEX idx_medicines_generic_name ON medicines(generic_name);
CREATE INDEX idx_medicines_brand ON medicines(brand_id);
CREATE INDEX idx_medicines_category ON medicines(category_id);
CREATE INDEX idx_medicines_search ON medicines(name, generic_name);

-- ------------------------------------------------------------
-- 5. MEDICINE BATCHES TABLE
-- Granular inventory batches with expiration tracking
-- ------------------------------------------------------------
CREATE TABLE medicine_batches (
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
        REFERENCES suppliers(supplier_id) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- Composite index for availability checking (excluding expired/inactive)
CREATE INDEX idx_batches_availability ON medicine_batches(medicine_id, status, expiry_date, stock_quantity);
CREATE INDEX idx_batches_expiry ON medicine_batches(expiry_date);

-- ------------------------------------------------------------
-- 6. STOCK MOVEMENTS TABLE
-- Complete transactional log of physical pharmacy stock changes
-- ------------------------------------------------------------
CREATE TABLE stock_movements (
    movement_id INT AUTO_INCREMENT PRIMARY KEY,
    batch_id INT NOT NULL,
    movement_type ENUM('RESTOCK', 'DISPENSED', 'ADJUSTMENT', 'RECALL', 'EXPIRED_DISCARD') NOT NULL,
    quantity_changed INT NOT NULL,
    reason VARCHAR(255),
    performed_by VARCHAR(100) DEFAULT 'System',
    movement_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_movements_batch FOREIGN KEY (batch_id) 
        REFERENCES medicine_batches(batch_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- 7. USERS TABLE
-- Role-based access control for Staff and Administrators
-- ------------------------------------------------------------
CREATE TABLE users (
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
CREATE TABLE pharmacy_settings (
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
CREATE TABLE audit_logs (
    log_id INT AUTO_INCREMENT PRIMARY KEY,
    table_name VARCHAR(50) NOT NULL,
    operation ENUM('INSERT', 'UPDATE', 'DELETE') NOT NULL,
    record_id INT NOT NULL,
    old_value JSON,
    new_value JSON,
    performed_by VARCHAR(100) DEFAULT 'System Trigger',
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- 10. PURCHASES TABLE
-- Inbound supply shipments received from verified distributors
-- ------------------------------------------------------------
CREATE TABLE purchases (
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
        REFERENCES suppliers(supplier_id) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE INDEX idx_purchases_supplier ON purchases(supplier_id);
CREATE INDEX idx_purchases_date ON purchases(purchase_date);

-- ------------------------------------------------------------
-- 11. PURCHASE ITEMS TABLE
-- Line items associated with incoming purchase invoices
-- ------------------------------------------------------------
CREATE TABLE purchase_items (
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
        REFERENCES medicines(medicine_id) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE INDEX idx_purchase_items_medicine ON purchase_items(medicine_id);

-- ------------------------------------------------------------
-- 12. SALES TABLE
-- Counter POS transactions and formal dispensations
-- ------------------------------------------------------------
CREATE TABLE sales (
    sale_id INT AUTO_INCREMENT PRIMARY KEY,
    invoice_number VARCHAR(60) NOT NULL UNIQUE,
    user_id INT NULL,
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
        REFERENCES users(user_id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE INDEX idx_sales_date ON sales(sale_date);
CREATE INDEX idx_sales_invoice ON sales(invoice_number);

-- ------------------------------------------------------------
-- 13. SALE ITEMS TABLE
-- Medication line items within each sale transaction
-- ------------------------------------------------------------
CREATE TABLE sale_items (
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
        REFERENCES medicines(medicine_id) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE INDEX idx_sale_items_sale ON sale_items(sale_id);
CREATE INDEX idx_sale_items_medicine ON sale_items(medicine_id);

-- ------------------------------------------------------------
-- 14. SALE ITEM BATCH ALLOCATIONS TABLE
-- 3NF bridge linking each line item to the exact batch deducted
-- ------------------------------------------------------------
CREATE TABLE sale_item_batches (
    allocation_id INT AUTO_INCREMENT PRIMARY KEY,
    sale_item_id INT NOT NULL,
    batch_id INT NOT NULL,
    quantity_allocated INT NOT NULL,
    CONSTRAINT chk_allocation_qty CHECK (quantity_allocated > 0),
    CONSTRAINT fk_alloc_sale_item FOREIGN KEY (sale_item_id)
        REFERENCES sale_items(sale_item_id) ON DELETE CASCADE,
    CONSTRAINT fk_alloc_batch FOREIGN KEY (batch_id)
        REFERENCES medicine_batches(batch_id) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE INDEX idx_alloc_batch ON sale_item_batches(batch_id);

-- ------------------------------------------------------------
-- 15. PAYMENTS TABLE
-- Counter payments recorded for sales
-- ------------------------------------------------------------
CREATE TABLE payments (
    payment_id INT AUTO_INCREMENT PRIMARY KEY,
    sale_id INT NOT NULL,
    payment_method ENUM('CASH', 'CARD', 'ONLINE', 'INSURANCE') NOT NULL DEFAULT 'CASH',
    amount_paid DECIMAL(10, 2) NOT NULL,
    change_given DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    reference_note VARCHAR(150),
    payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_payment_amount CHECK (amount_paid >= 0),
    CONSTRAINT fk_payments_sale FOREIGN KEY (sale_id)
        REFERENCES sales(sale_id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE INDEX idx_payments_sale ON payments(sale_id);
CREATE INDEX idx_payments_method ON payments(payment_method);
