# VDC Store Pharmacy Management System — Test Cases & Validation Plan

This document details the functional and database validation test matrix for the **VDC Store Pharmacy Management System**, covering search algorithms, dynamic availability calculations, expired-batch exclusions, and RBAC authorization.

---

## 1. Test Matrix Summary

| Test Case ID | Test Category | Description | Expected Outcome | Status |
|---|---|---|---|---|
| **TC-01** | Medicine Search | Search by Trade/Brand Name (e.g. "Augmentin") | Returns Augmentin with associated brand and category details | PASSED |
| **TC-02** | Medicine Search | Search by Generic Molecule (e.g. "Paracetamol") | Returns Panadol Extra and Panadol Drops | PASSED |
| **TC-03** | Medicine Search | Search by Brand Name (e.g. "Pfizer") | Returns all medicines manufactured by Pfizer | PASSED |
| **TC-04** | Filtering | Filter by Category (Antibiotics, Category ID 1) | Returns only antibacterial formulations | PASSED |
| **TC-05** | Filtering | Filter by Availability = 'in_stock' | Returns only medicines where saleable stock > threshold | PASSED |
| **TC-06** | Filtering | Filter by Availability = 'low_stock' | Returns medicines where 0 < saleable stock &le; threshold | PASSED |
| **TC-07** | Filtering | Filter by Availability = 'out_of_stock' | Returns medicines with 0 saleable stock | PASSED |
| **TC-08** | Stock Logic | Expired Batch Exclusion Test | Batches with `expiry_date &le; CURDATE()` are strictly ignored in stock sums | PASSED |
| **TC-09** | Stock Logic | Recalled / Quarantined Batch Exclusion | Batches with `status = 'recalled'` are excluded from customer stock | PASSED |
| **TC-10** | Availability | Real-time endpoint `/api/medicines/:id/availability` | Accurately returns In Stock, Low Stock, or Out of Stock status | PASSED |
| **TC-11** | Sorting & Pagination | Alphabetical sorting (A-Z) and `LIMIT 9 OFFSET 0` | Results correctly sorted by name and paginated | PASSED |
| **TC-12** | Security & RBAC | Customer boundary test (No Cart / Checkout) | Customer side contains zero purchasing or ordering options | PASSED |
| **TC-13** | Security & RBAC | Unauthenticated request to `/api/admin/*` | Returns `401 Unauthorized` with error message | PASSED |
| **TC-14** | Database Trigger | `trg_after_batch_stock_update` verification | Modifying batch stock automatically logs old/new quantities in `audit_logs` | PASSED |
| **TC-15** | Stored Procedure | `sp_receive_new_batch` transaction | Validates dates, inserts batch, and logs movement atomically | PASSED |

---

## 2. Detailed Test Specifications

### Test Case TC-01: Search by Medicine Name
- **Objective:** Verify that search queries correctly match trade/brand names.
- **Request:**
  ```http
  GET /api/medicines?search=Augmentin
  ```
- **Validation Query:**
  ```sql
  SELECT m.name, m.generic_name, b.brand_name 
  FROM medicines m 
  JOIN brands b ON m.brand_id = b.brand_id
  WHERE m.name LIKE '%Augmentin%';
  ```
- **Expected Result:** HTTP 200 with Augmentin 625mg in the results list.

---

### Test Case TC-02: Search by Generic Molecule
- **Objective:** Verify that customers can locate alternative brands by searching chemical generic names.
- **Request:**
  ```http
  GET /api/medicines?search=Paracetamol
  ```
- **Expected Result:** HTTP 200 returning both "Panadol Extra" and "Panadol Children Drops".

---

### Test Case TC-08: Expired Batch Exclusion Verification (Core DBMS Requirement)
- **Objective:** Ensure expired batches are not counted towards saleable stock.
- **Scenario in Seed Data:**
  - Medicine ID 1 ("Augmentin 625mg") has 3 batches:
    1. Batch 1 (`AUG-2025-01`): 80 units, expires `2027-06-30` (ACTIVE, UNEXPIRED)
    2. Batch 2 (`AUG-2025-02`): 40 units, expires `2027-08-31` (ACTIVE, UNEXPIRED)
    3. Batch 3 (`AUG-2023-EX`): 20 units, expired `2024-01-01` (EXPIRED)
- **Calculation Rule:**
  - Raw sum of all batches = 80 + 40 + 20 = 140 units.
  - Required saleable stock (excluding expired) = 80 + 40 = **120 units**.
- **Verification Query:**
  ```sql
  SELECT fn_calculate_available_stock(1) AS calculated_stock;
  ```
- **Result:** Value is **120**, confirming expired Batch 3 is excluded.

---

### Test Case TC-09: Recalled Batch Exclusion Verification
- **Objective:** Ensure batches with status other than `'active'` are excluded from customer availability.
- **Scenario in Seed Data:**
  - Medicine ID 4 ("Zithromax 250mg") has 2 batches:
    1. Batch 6 (`ZIT-2024-04`): 0 units (DEPLETED)
    2. Batch 7 (`ZIT-2025-RC`): 45 units with `status = 'recalled'`.
- **Expected Availability Status:** **Out of Stock**.
- **Customer Advice:** *"This medicine is currently out of stock. Please contact the pharmacy for further information."*
- **Result:** Verified. Status is "Out of Stock" because the 45 units in Batch 7 are recalled and not saleable.

---

### Test Case TC-13: Access Control & Security on Admin Endpoints
- **Objective:** Ensure unauthenticated public users cannot alter inventory or read internal supplier data.
- **Request:**
  ```http
  GET /api/admin/medicines
  ```
  *(Without Authorization Header)*
- **Expected Result:**
  ```json
  {
    "success": false,
    "message": "Access denied. Authentication token missing."
  }
  ```
- **Status Code:** `401 Unauthorized`.

---

### Test Case TC-14: Automated Trigger Audit Logging
- **Objective:** Verify MySQL trigger `trg_after_batch_stock_update` logs quantity changes into `audit_logs`.
- **Action:**
  ```sql
  UPDATE medicine_batches SET stock_quantity = 75 WHERE batch_id = 1;
  ```
- **Verification Query:**
  ```sql
  SELECT * FROM audit_logs WHERE record_id = 1 ORDER BY timestamp DESC LIMIT 1;
  ```
- **Expected Result:** A new row in `audit_logs` containing `old_value` (80) and `new_value` (75).
