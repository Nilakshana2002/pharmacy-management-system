-- ============================================================
-- VDC STORE PHARMACY MANAGEMENT SYSTEM
-- Database Routines: Views, Functions, Procedures & Triggers
-- Module: Advanced Database Management System (ADBMS) Coursework
-- ============================================================

USE pharmacy_db;

-- ============================================================
-- SECTION 1: STORED FUNCTIONS
-- Reusable scalar functions for stock calculations
-- ============================================================

DELIMITER $$

-- 1.1 Calculate current saleable stock for a medicine
-- Excludes expired, recalled, quarantined, or reserved stock
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
    
    IF v_threshold IS NULL THEN
        SET v_threshold = 20;
    END IF;
    
    IF v_stock <= 0 THEN
        RETURN 'Out of Stock';
    ELSEIF v_stock <= v_threshold THEN
        RETURN 'Low Stock';
    ELSE
        RETURN 'In Stock';
    END IF;
END$$

DELIMITER ;


-- ============================================================
-- SECTION 2: DATABASE VIEWS
-- Pre-aggregated and sanitized virtual tables
-- ============================================================

-- 2.1 Public Medicine Catalog View
-- Joins medicines, brands, and categories, computing availability status
-- Does NOT expose internal supplier info or batch IDs to customers
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
    m.dosage_form,
    m.strength,
    m.description,
    m.side_effects,
    m.usage_instructions,
    m.unit_price,
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


-- 2.3 Internal Staff View: Low Stock Alerts
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


-- 2.4 Internal Staff View: Expiring Batches Monitor (Next 90 Days)
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


-- 2.5 Daily Sales Analytics View
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


-- 2.6 Monthly Sales Performance View
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


-- 2.7 Best Selling Medicines View
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


-- 2.8 Payment Methods Breakdown View
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



-- ============================================================
-- SECTION 3: STORED PROCEDURES
-- Transaction-safe operations for inventory management
-- ============================================================

DELIMITER $$

-- 3.1 Adjust Batch Stock with Automatic Audit and Movement Record
DROP PROCEDURE IF EXISTS sp_update_batch_stock$$
CREATE PROCEDURE sp_update_batch_stock(
    IN p_batch_id INT,
    IN p_new_quantity INT,
    IN p_movement_type VARCHAR(20),
    IN p_reason VARCHAR(255),
    IN p_performed_by VARCHAR(100)
)
proc_label: BEGIN
    DECLARE v_current_stock INT;
    DECLARE v_diff INT;
    DECLARE v_medicine_id INT;
    
    IF p_new_quantity < 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Stock quantity cannot be negative.';
    END IF;
    
    START TRANSACTION;
    
    -- Pessimistic locking of the batch row
    SELECT stock_quantity, medicine_id 
    INTO v_current_stock, v_medicine_id
    FROM medicine_batches
    WHERE batch_id = p_batch_id
    FOR UPDATE;
    
    IF v_current_stock IS NULL THEN
        ROLLBACK;
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Batch not found.';
    END IF;
    
    SET v_diff = p_new_quantity - v_current_stock;
    
    -- Update batch quantity and auto-update depleted status if needed
    UPDATE medicine_batches
    SET stock_quantity = p_new_quantity,
        status = CASE 
            WHEN p_new_quantity = 0 THEN 'depleted'
            WHEN status = 'depleted' AND p_new_quantity > 0 THEN 'active'
            ELSE status 
        END,
        updated_at = CURRENT_TIMESTAMP
    WHERE batch_id = p_batch_id;
    
    -- Record stock movement
    INSERT INTO stock_movements (
        batch_id, 
        movement_type, 
        quantity_changed, 
        reason, 
        performed_by
    ) VALUES (
        p_batch_id,
        p_movement_type,
        v_diff,
        p_reason,
        p_performed_by
    );
    
    COMMIT;
END proc_label$$


-- 3.2 Transactional Batch Receipt
DROP PROCEDURE IF EXISTS sp_receive_new_batch$$
CREATE PROCEDURE sp_receive_new_batch(
    IN p_medicine_id INT,
    IN p_supplier_id INT,
    IN p_batch_number VARCHAR(80),
    IN p_manufacture_date DATE,
    IN p_expiry_date DATE,
    IN p_quantity INT,
    IN p_unit_cost DECIMAL(10,2),
    IN p_performed_by VARCHAR(100),
    OUT p_new_batch_id INT
)
BEGIN
    IF p_expiry_date <= p_manufacture_date THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Expiry date must be after manufacture date.';
    END IF;
    
    IF p_quantity <= 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Quantity received must be greater than zero.';
    END IF;
    
    START TRANSACTION;
    
    INSERT INTO medicine_batches (
        medicine_id,
        supplier_id,
        batch_number,
        manufacture_date,
        expiry_date,
        quantity_received,
        stock_quantity,
        reserved_quantity,
        unit_cost,
        status
    ) VALUES (
        p_medicine_id,
        p_supplier_id,
        p_batch_number,
        p_manufacture_date,
        p_expiry_date,
        p_quantity,
        p_quantity,
        0,
        p_unit_cost,
        'active'
    );
    
    SET p_new_batch_id = LAST_INSERT_ID();
    
    INSERT INTO stock_movements (
        batch_id,
        movement_type,
        quantity_changed,
        reason,
        performed_by
    ) VALUES (
        p_new_batch_id,
        'RESTOCK',
        p_quantity,
        CONCAT('Initial batch receipt: ', p_batch_number),
        p_performed_by
    );
    
    COMMIT;
END$$


-- 3.3 Aggregated Dashboard Inventory & Performance Summary
DROP PROCEDURE IF EXISTS sp_get_inventory_summary$$
CREATE PROCEDURE sp_get_inventory_summary()
BEGIN
    SELECT 
        (SELECT COUNT(*) FROM medicines WHERE is_active = TRUE) AS total_medicines,
        (SELECT COUNT(*) FROM brands) AS total_brands,
        (SELECT COUNT(*) FROM medicine_categories) AS total_categories,
        (SELECT COUNT(*) FROM medicine_batches WHERE status = 'active' AND expiry_date > CURDATE()) AS active_batches,
        (SELECT COUNT(*) FROM v_low_stock_alerts) AS low_stock_medicines,
        (SELECT COUNT(*) FROM medicines m WHERE fn_calculate_available_stock(m.medicine_id) = 0 AND m.is_active = TRUE) AS out_of_stock_medicines,
        (SELECT COUNT(*) FROM v_expiring_batches) AS expiring_batches_count,
        (SELECT COUNT(*) FROM sales WHERE DATE(sale_date) = CURDATE() AND payment_status = 'PAID') AS today_sales_count,
        (SELECT COALESCE(SUM(total_amount), 0.00) FROM sales WHERE DATE(sale_date) = CURDATE() AND payment_status = 'PAID') AS today_revenue,
        (SELECT COALESCE(SUM(total_amount), 0.00) FROM sales WHERE MONTH(sale_date) = MONTH(CURDATE()) AND YEAR(sale_date) = YEAR(CURDATE()) AND payment_status = 'PAID') AS monthly_revenue;
END$$

-- 3.4 Transactional POS Sale Processing with Batch Allocation and Stock Movement
DROP PROCEDURE IF EXISTS sp_create_pos_sale$$
CREATE PROCEDURE sp_create_pos_sale(
    IN p_user_id INT,
    IN p_patient_name VARCHAR(150),
    IN p_prescription_ref VARCHAR(100),
    IN p_medicine_id INT,
    IN p_batch_id INT,
    IN p_quantity INT,
    IN p_unit_price DECIMAL(10,2),
    IN p_packaging_desc VARCHAR(100),
    IN p_payment_method VARCHAR(20),
    IN p_amount_paid DECIMAL(10,2),
    IN p_performer VARCHAR(100),
    OUT p_out_sale_id INT,
    OUT p_out_invoice_number VARCHAR(60)
)
BEGIN
    DECLARE v_batch_stock INT;
    DECLARE v_batch_status VARCHAR(20);
    DECLARE v_batch_expiry DATE;
    DECLARE v_invoice_no VARCHAR(60);
    DECLARE v_total_bill DECIMAL(10,2);
    DECLARE v_new_stock INT;
    DECLARE v_new_status VARCHAR(20);
    DECLARE v_sale_item_id INT;
    DECLARE v_change DECIMAL(10,2) DEFAULT 0.00;

    -- Validate input
    IF p_quantity <= 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Dispensary error: Quantity must be strictly greater than zero.';
    END IF;

    SET v_total_bill = p_quantity * p_unit_price;

    IF p_amount_paid < v_total_bill THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Dispensary error: Amount paid is less than the total bill.';
    END IF;

    SET v_change = p_amount_paid - v_total_bill;

    -- Generate unique invoice number: INV-YYYYMMDD-RANDOM
    SET v_invoice_no = CONCAT('INV-', DATE_FORMAT(NOW(), '%Y%m%d'), '-', LPAD(FLOOR(RAND() * 100000), 5, '0'));

    START TRANSACTION;

    -- Pessimistic lock on the selected batch
    SELECT stock_quantity, status, expiry_date
    INTO v_batch_stock, v_batch_status, v_batch_expiry
    FROM medicine_batches
    WHERE batch_id = p_batch_id
    FOR UPDATE;

    IF v_batch_stock IS NULL THEN
        ROLLBACK;
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Selected inventory batch not found.';
    END IF;

    IF v_batch_expiry <= CURDATE() THEN
        ROLLBACK;
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Cannot dispense from an expired batch.';
    END IF;

    IF v_batch_status <> 'active' THEN
        ROLLBACK;
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Cannot dispense from an inactive, quarantined, or recalled batch.';
    END IF;

    IF v_batch_stock < p_quantity THEN
        ROLLBACK;
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Insufficient batch stock for dispensation.';
    END IF;

    -- 1. Insert into sales
    INSERT INTO sales (
        invoice_number, user_id, patient_name, prescription_ref,
        subtotal, discount_amount, tax_amount, total_amount, payment_status, sale_date
    ) VALUES (
        v_invoice_no, p_user_id, COALESCE(p_patient_name, 'Walk-in Customer'), 
        COALESCE(p_prescription_ref, 'OTC'), v_total_bill, 0.00, 0.00, v_total_bill, 'PAID', CURRENT_TIMESTAMP
    );

    SET p_out_sale_id = LAST_INSERT_ID();
    SET p_out_invoice_number = v_invoice_no;

    -- 2. Insert into sale_items
    INSERT INTO sale_items (
        sale_id, medicine_id, quantity, unit_price, subtotal, packaging_desc
    ) VALUES (
        p_out_sale_id, p_medicine_id, p_quantity, p_unit_price, v_total_bill, COALESCE(p_packaging_desc, '1 Unit')
    );

    SET v_sale_item_id = LAST_INSERT_ID();

    -- 3. Insert into sale_item_batches (3NF allocation)
    INSERT INTO sale_item_batches (
        sale_item_id, batch_id, quantity_allocated
    ) VALUES (
        v_sale_item_id, p_batch_id, p_quantity
    );

    -- 4. Insert into payments
    INSERT INTO payments (
        sale_id, payment_method, amount_paid, change_given, reference_note
    ) VALUES (
        p_out_sale_id, p_payment_method, p_amount_paid, v_change, CONCAT('Counter POS Receipt #', v_invoice_no)
    );

    -- 5. Deduct batch stock
    SET v_new_stock = v_batch_stock - p_quantity;
    SET v_new_status = IF(v_new_stock = 0, 'depleted', 'active');

    UPDATE medicine_batches
    SET stock_quantity = v_new_stock,
        status = v_new_status,
        updated_at = CURRENT_TIMESTAMP
    WHERE batch_id = p_batch_id;

    -- 6. Record stock movement
    INSERT INTO stock_movements (
        batch_id, movement_type, quantity_changed, reason, performed_by
    ) VALUES (
        p_batch_id, 'DISPENSED', -p_quantity, 
        CONCAT('Sale ', v_invoice_no, ' to ', COALESCE(p_patient_name, 'Walk-in')),
        COALESCE(p_performer, 'Staff Pharmacist')
    );

    COMMIT;
END$$

DELIMITER ;


-- ============================================================
-- SECTION 4: TRIGGERS
-- Automatic data auditing and validation triggers
-- ============================================================

DELIMITER $$

-- 4.1 Audit Log Trigger on Batch Update
DROP TRIGGER IF EXISTS trg_after_batch_stock_update$$
CREATE TRIGGER trg_after_batch_stock_update
AFTER UPDATE ON medicine_batches
FOR EACH ROW
BEGIN
    IF OLD.stock_quantity <> NEW.stock_quantity OR OLD.status <> NEW.status THEN
        INSERT INTO audit_logs (
            table_name,
            operation,
            record_id,
            old_value,
            new_value,
            performed_by
        ) VALUES (
            'medicine_batches',
            'UPDATE',
            NEW.batch_id,
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
            'Trigger: trg_after_batch_stock_update'
        );
    END IF;
END$$

-- 4.2 Validation Trigger on New Batch Insertion
DROP TRIGGER IF EXISTS trg_before_batch_insert$$
CREATE TRIGGER trg_before_batch_insert
BEFORE INSERT ON medicine_batches
FOR EACH ROW
BEGIN
    IF NEW.expiry_date <= NEW.manufacture_date THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Validation error: Expiry date must be strictly after manufacture date.';
    END IF;
    
    IF NEW.stock_quantity > NEW.quantity_received THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Validation error: Current stock cannot exceed received quantity.';
    END IF;
END$$

DELIMITER ;
