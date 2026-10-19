-- ============================================================
-- MY PHARMACIST PHARMACY MANAGEMENT SYSTEM
-- Incremental Schema Migration: Sales, Purchases, Payments & Stored Routines
-- ============================================================

USE pharmacy_db;

-- 1. Purchases Table
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
        REFERENCES suppliers(supplier_id) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE INDEX IF NOT EXISTS idx_purchases_supplier ON purchases(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchases_date ON purchases(purchase_date);

-- 2. Purchase Items Table
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
        REFERENCES medicines(medicine_id) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE INDEX IF NOT EXISTS idx_purchase_items_medicine ON purchase_items(medicine_id);

-- 3. Sales Table
CREATE TABLE IF NOT EXISTS sales (
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

CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(sale_date);
CREATE INDEX IF NOT EXISTS idx_sales_invoice ON sales(invoice_number);

-- 4. Sale Items Table
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
        REFERENCES medicines(medicine_id) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE INDEX IF NOT EXISTS idx_sale_items_sale ON sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_medicine ON sale_items(medicine_id);

-- 5. Sale Item Batch Allocations (3NF)
CREATE TABLE IF NOT EXISTS sale_item_batches (
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

CREATE INDEX IF NOT EXISTS idx_alloc_batch ON sale_item_batches(batch_id);

-- 6. Payments Table
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
        REFERENCES sales(sale_id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE INDEX IF NOT EXISTS idx_payments_sale ON payments(sale_id);
CREATE INDEX IF NOT EXISTS idx_payments_method ON payments(payment_method);

-- 7. Views
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
