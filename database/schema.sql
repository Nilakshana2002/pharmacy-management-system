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
