-- ============================================================
-- VDC STORE / MY PHARMACIST MANAGEMENT SYSTEM
-- Module: Advanced Database Management Systems (ADBMS)
-- Script: security.sql (Database Security & DCL User Management)
-- Standards: Principle of Least Privilege, Role-Based Access,
--            Brute-Force Lockout, Resource Throttling & Auditability
-- ============================================================

USE pharmacy_db;

-- ============================================================
-- SECTION 1: PROVISION DATABASE USERS (DCL: CREATE USER)
-- ============================================================

-- 1.1 Web Application Service User (Runtime application connection)
-- Used by Express backend (backend/config/db.js) for customer/POS requests.
-- Restricted strictly to DML operations and Stored Routines execution.
-- Denied all DDL permissions (Cannot DROP TABLE, ALTER TABLE, or TRUNCATE).
DROP USER IF EXISTS 'pharmacy_app'@'localhost';
CREATE USER 'pharmacy_app'@'localhost'
    IDENTIFIED BY 'PharmacyApp@2026!'
    WITH 
        MAX_QUERIES_PER_HOUR 20000
        MAX_CONNECTIONS_PER_HOUR 2000
        MAX_USER_CONNECTIONS 50
    FAILED_LOGIN_ATTEMPTS 5
    PASSWORD_LOCK_TIME 1;

-- 1.2 Database Administrator (DBA) User
-- Used exclusively for maintenance, structural schema migrations, and backups.
DROP USER IF EXISTS 'pharmacy_admin'@'localhost';
CREATE USER 'pharmacy_admin'@'localhost'
    IDENTIFIED BY 'PharmacyAdmin@2026!'
    WITH 
        MAX_CONNECTIONS_PER_HOUR 500
        MAX_USER_CONNECTIONS 10
    FAILED_LOGIN_ATTEMPTS 3
    PASSWORD_LOCK_TIME 1
    PASSWORD EXPIRE INTERVAL 90 DAY;

-- 1.3 Regulatory & Financial Auditor User (Read-Only)
-- Used by clinical inspectors, internal auditors, and financial reviewers.
-- Strictly restricted to SELECT queries on virtual views and audit trail.
DROP USER IF EXISTS 'pharmacy_auditor'@'localhost';
CREATE USER 'pharmacy_auditor'@'localhost'
    IDENTIFIED BY 'PharmacyAudit@2026!'
    WITH 
        MAX_QUERIES_PER_HOUR 5000
        MAX_CONNECTIONS_PER_HOUR 300
        MAX_USER_CONNECTIONS 5
    FAILED_LOGIN_ATTEMPTS 3
    PASSWORD_LOCK_TIME 1;


-- ============================================================
-- SECTION 2: PRIVILEGE SPECIFICATION (DCL: GRANT & REVOKE)
-- ============================================================

-- ------------------------------------------------------------
-- 2.1 Privileges for 'pharmacy_app'@'localhost' (Least Privilege)
-- ------------------------------------------------------------
-- Revoke any potential administrative rights
REVOKE ALL PRIVILEGES, GRANT OPTION FROM 'pharmacy_app'@'localhost';

-- Grant DML (Data Manipulation Language) on all operational tables
GRANT SELECT, INSERT, UPDATE, DELETE ON pharmacy_db.brands TO 'pharmacy_app'@'localhost';
GRANT SELECT, INSERT, UPDATE, DELETE ON pharmacy_db.medicine_categories TO 'pharmacy_app'@'localhost';
GRANT SELECT, INSERT, UPDATE, DELETE ON pharmacy_db.suppliers TO 'pharmacy_app'@'localhost';
GRANT SELECT, INSERT, UPDATE, DELETE ON pharmacy_db.medicines TO 'pharmacy_app'@'localhost';
GRANT SELECT, INSERT, UPDATE, DELETE ON pharmacy_db.medicine_batches TO 'pharmacy_app'@'localhost';
GRANT SELECT, INSERT, UPDATE, DELETE ON pharmacy_db.stock_movements TO 'pharmacy_app'@'localhost';
GRANT SELECT, INSERT, UPDATE, DELETE ON pharmacy_db.users TO 'pharmacy_app'@'localhost';
GRANT SELECT, INSERT, UPDATE, DELETE ON pharmacy_db.audit_logs TO 'pharmacy_app'@'localhost';
GRANT SELECT, INSERT, UPDATE, DELETE ON pharmacy_db.purchases TO 'pharmacy_app'@'localhost';
GRANT SELECT, INSERT, UPDATE, DELETE ON pharmacy_db.purchase_items TO 'pharmacy_app'@'localhost';
GRANT SELECT, INSERT, UPDATE, DELETE ON pharmacy_db.customers TO 'pharmacy_app'@'localhost';
GRANT SELECT, INSERT, UPDATE, DELETE ON pharmacy_db.sales TO 'pharmacy_app'@'localhost';
GRANT SELECT, INSERT, UPDATE, DELETE ON pharmacy_db.sale_items TO 'pharmacy_app'@'localhost';
GRANT SELECT, INSERT, UPDATE, DELETE ON pharmacy_db.sale_item_batches TO 'pharmacy_app'@'localhost';
GRANT SELECT, INSERT, UPDATE, DELETE ON pharmacy_db.payments TO 'pharmacy_app'@'localhost';
GRANT SELECT, INSERT, UPDATE, DELETE ON pharmacy_db.prescription_orders TO 'pharmacy_app'@'localhost';
GRANT SELECT, INSERT, UPDATE, DELETE ON pharmacy_db.prescription_files TO 'pharmacy_app'@'localhost';
GRANT SELECT, INSERT, UPDATE, DELETE ON pharmacy_db.customer_reviews TO 'pharmacy_app'@'localhost';
GRANT SELECT, INSERT, UPDATE, DELETE ON pharmacy_db.inquiries TO 'pharmacy_app'@'localhost';
GRANT SELECT, INSERT, UPDATE, DELETE ON pharmacy_db.notification_logs TO 'pharmacy_app'@'localhost';

-- Grant Stored Routine Execution (Stored Procedures & Functions)
GRANT EXECUTE ON PROCEDURE pharmacy_db.sp_create_pos_sale TO 'pharmacy_app'@'localhost';
GRANT EXECUTE ON PROCEDURE pharmacy_db.sp_update_batch_stock TO 'pharmacy_app'@'localhost';
GRANT EXECUTE ON PROCEDURE pharmacy_db.sp_receive_new_batch TO 'pharmacy_app'@'localhost';
GRANT EXECUTE ON PROCEDURE pharmacy_db.sp_get_inventory_summary TO 'pharmacy_app'@'localhost';
GRANT EXECUTE ON FUNCTION pharmacy_db.fn_calculate_available_stock TO 'pharmacy_app'@'localhost';
GRANT EXECUTE ON FUNCTION pharmacy_db.fn_get_availability_status TO 'pharmacy_app'@'localhost';

-- Grant SELECT on Virtual Views
GRANT SELECT ON pharmacy_db.v_medicine_catalog TO 'pharmacy_app'@'localhost';
GRANT SELECT ON pharmacy_db.v_medicine_availability TO 'pharmacy_app'@'localhost';
GRANT SELECT ON pharmacy_db.v_low_stock_alerts TO 'pharmacy_app'@'localhost';
GRANT SELECT ON pharmacy_db.v_expiring_batches TO 'pharmacy_app'@'localhost';
GRANT SELECT ON pharmacy_db.v_daily_sales TO 'pharmacy_app'@'localhost';
GRANT SELECT ON pharmacy_db.v_monthly_sales TO 'pharmacy_app'@'localhost';
GRANT SELECT ON pharmacy_db.v_sales_by_medicine TO 'pharmacy_app'@'localhost';
GRANT SELECT ON pharmacy_db.v_payment_summary TO 'pharmacy_app'@'localhost';
GRANT SELECT ON pharmacy_db.v_approved_reviews TO 'pharmacy_app'@'localhost';
GRANT SELECT ON pharmacy_db.v_customer_purchase_history TO 'pharmacy_app'@'localhost';

-- Explicitly ensure NO DDL commands are permitted for the application user
-- (DROP, ALTER, CREATE TABLE, TRUNCATE are blocked by design)

-- ------------------------------------------------------------
-- 2.2 Privileges for 'pharmacy_admin'@'localhost' (DBA)
-- ------------------------------------------------------------
GRANT ALL PRIVILEGES ON pharmacy_db.* TO 'pharmacy_admin'@'localhost' WITH GRANT OPTION;

-- ------------------------------------------------------------
-- 2.3 Privileges for 'pharmacy_auditor'@'localhost' (Compliance)
-- ------------------------------------------------------------
REVOKE ALL PRIVILEGES, GRANT OPTION FROM 'pharmacy_auditor'@'localhost';

-- Grant read-only access strictly to virtual views and audit trail
GRANT SELECT ON pharmacy_db.v_medicine_catalog TO 'pharmacy_auditor'@'localhost';
GRANT SELECT ON pharmacy_db.v_low_stock_alerts TO 'pharmacy_auditor'@'localhost';
GRANT SELECT ON pharmacy_db.v_expiring_batches TO 'pharmacy_auditor'@'localhost';
GRANT SELECT ON pharmacy_db.v_daily_sales TO 'pharmacy_auditor'@'localhost';
GRANT SELECT ON pharmacy_db.v_monthly_sales TO 'pharmacy_auditor'@'localhost';
GRANT SELECT ON pharmacy_db.v_sales_by_medicine TO 'pharmacy_auditor'@'localhost';
GRANT SELECT ON pharmacy_db.v_payment_summary TO 'pharmacy_auditor'@'localhost';
GRANT SELECT ON pharmacy_db.v_customer_purchase_history TO 'pharmacy_auditor'@'localhost';
GRANT SELECT ON pharmacy_db.v_approved_reviews TO 'pharmacy_auditor'@'localhost';
GRANT SELECT ON pharmacy_db.v_supplier_order_performance TO 'pharmacy_auditor'@'localhost';
GRANT SELECT ON pharmacy_db.v_prescription_fulfillment_pipeline TO 'pharmacy_auditor'@'localhost';
GRANT SELECT ON pharmacy_db.v_pharmacist_dispensing_workload TO 'pharmacy_auditor'@'localhost';
GRANT SELECT ON pharmacy_db.audit_logs TO 'pharmacy_auditor'@'localhost';
GRANT SELECT ON pharmacy_db.notification_logs TO 'pharmacy_auditor'@'localhost';

-- Apply privilege tables immediately
FLUSH PRIVILEGES;


-- ============================================================
-- SECTION 3: PRIVILEGE VERIFICATION QUERIES (For Examiners)
-- ============================================================

-- Query 1: Verify all active MySQL database accounts
-- SELECT user, host, account_locked, password_expired FROM mysql.user WHERE user LIKE 'pharmacy_%';

-- Query 2: Verify granted privileges for application runtime account
-- SHOW GRANTS FOR 'pharmacy_app'@'localhost';

-- Query 3: Verify read-only restriction for auditor account
-- SHOW GRANTS FOR 'pharmacy_auditor'@'localhost';
