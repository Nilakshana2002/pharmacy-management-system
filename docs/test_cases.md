# My Pharmacist Pharmacy Management System — Comprehensive Test Plan & Test Cases

This document defines the formal test suites for validating the **My Pharmacist** application across all user roles, security boundaries, and database transaction guarantees.

---

## Test Suite 1: Customer Public Portal & Inquiry System

### TC-01: Medicine Catalog Search with Multi-Word Keyword
- **Precondition:** Database seeded with formulary items.
- **Steps:**
  1. Open Public Homepage (`/`).
  2. Enter keyword "Augmentin" into the search bar and press Enter.
- **Expected Result:**
  - Navigates to `/search?q=Augmentin`.
  - Only active, matching formulations are returned.
  - Wholesale cost, supplier name, and internal batch numbers are completely hidden.

### TC-02: Real-Time Availability Check Excludes Expired Stock
- **Precondition:** A medicine exists with 50 units in an active batch and 100 units in an expired batch.
- **Steps:**
  1. View medicine card on the search page.
  2. Inspect displayed saleable stock.
- **Expected Result:**
  - Displayed saleable stock is exactly 50 units.
  - Availability badge displays "In Stock" (or "Low Stock" based on threshold).
  - Expired batch stock is strictly omitted by MySQL subquery.

### TC-03: In-Store Inquiry Slip Generation (No Online Checkout)
- **Precondition:** Customer browsing search catalog.
- **Steps:**
  1. Click "+ Add to Inquiry" on 2 medicines.
  2. Click the floating Inquiry Cart button.
  3. Enter customer name and prescription note.
  4. Click "Print Inquiry Slip".
- **Expected Result:**
  - Opens a clean, formatted in-store inquiry slip ready for printing.
  - Shows disclaimer: *"This is an in-store reservation and availability inquiry slip, NOT an online payment invoice."*
  - No payment gateway or credit card form is displayed.

---

## Test Suite 2: Staff POS Dispensing & Atomic Transactions

### TC-04: Atomic POS Sale Creation with Pessimistic Locking
- **Precondition:** Staff user logged in. Lot #26 has 10 units in stock.
- **Steps:**
  1. Navigate to "POS Dispense Counter" tab.
  2. Select medicine and lot #26.
  3. Select packaging mode: "1 Card of 10 Tablets" (10 units).
  4. Enter patient name "Nimal Silva" and Rx ref "RX-901".
  5. Click "Complete Dispensation & Print Receipt".
- **Expected Result:**
  - Atomically locks batch row with `FOR UPDATE`.
  - Inserts record into `sales`, `sale_items`, `sale_item_batches`, and `payments`.
  - Decrements batch `stock_quantity` from 10 to 0.
  - Updates lot status to `'depleted'`.
  - Generates receipt with unique invoice # (e.g., `INV-20261018-0001`).

### TC-05: Rollback on Insufficient Stock or Race Condition
- **Precondition:** Lot #26 has 2 units in stock.
- **Steps:**
  1. Attempt to dispense 5 units from lot #26.
- **Expected Result:**
  - Frontend alerts "Insufficient stock".
  - Backend transaction rolls back with SQL error `ERR_INSUFFICIENT_STOCK`.
  - No partial records are inserted into `sales` or `sale_items`.

---

## Test Suite 3: DBMS Triggers & Audit Logging

### TC-06: Automatic Stock Update Trigger Execution
- **Precondition:** Staff adjusts batch stock quantity in "Batch & Expiry" tab.
- **Steps:**
  1. Click "Adjust Stock" on batch #29 (current stock: 75).
  2. Change stock to 74 with reason "Dispensary count verification".
  3. Submit form.
  4. Navigate to "Reports & Analytics" &rarr; "Trigger Audit Trail".
- **Expected Result:**
  - MySQL trigger `trg_after_batch_stock_update` automatically inserts a record into `audit_logs`.
  - Operation is logged as `UPDATE`.
  - Old state is displayed as `Stock: 75 (active)`.
  - New state is displayed as `Stock: 74 (active)`.
  - Performed by shows the caller or trigger identifier.

---

## Test Suite 4: Role-Based Access Control (RBAC) & Security

### TC-07: Pharmacist Restricted from Admin Tabs
- **Precondition:** User logged in with `PHARMACIST` role.
- **Steps:**
  1. Inspect sidebar navigation.
  2. Attempt to navigate to `activeTab === 'users'`.
- **Expected Result:**
  - "Staff Accounts" tab is hidden from sidebar.
  - API calls to `/api/admin/users` return `403 Forbidden` (`Admin role required`).

### TC-08: Admin Staff User Account Creation
- **Precondition:** User logged in with `ADMIN` role.
- **Steps:**
  1. Navigate to "Staff Accounts" tab.
  2. Click "+ Add Staff User".
  3. Enter username, email, full name, role (`PHARMACIST`), and password.
  4. Submit form.
- **Expected Result:**
  - Password is hashed with `bcrypt.hash(password, 10)` before storage.
  - Plaintext password is never saved in MySQL.
  - New user appears in the staff table with status "Active".

### TC-09: User Account Deactivation
- **Precondition:** Admin views active user in "Staff Accounts" tab.
- **Steps:**
  1. Click "Deactivate" button next to a user.
- **Expected Result:**
  - User status changes to `Inactive` (`is_active = FALSE`).
  - Next login attempt by this user is rejected with `"Account has been deactivated"`.
