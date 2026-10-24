# My Pharmacist Pharmacy Management System — REST API Documentation

This document provides complete API reference documentation for the **My Pharmacist** pharmacy management system backend server built with Express.js and MySQL 8 (raw parameterized SQL via `mysql2/promise`).

Base URL: `http://localhost:5000/api`

---

## 1. Customer-Facing Endpoints (Public)

Customer endpoints do **not** require authentication and are read-only. No customer purchasing, checkout, or payment endpoints exist.

### 1.1 Search & Filter Medicines Catalog
- **Endpoint:** `GET /api/medicines`
- **Description:** Retrieve paginated medicines catalog with joins on brands and categories. Includes calculated saleable stock and availability status. Excludes expired or inactive batches. Sensitive internal fields (unit cost, supplier) are completely omitted.
- **Query Parameters:**
  - `search` (string, optional): Keyword search matching name, generic molecule, or brand.
  - `categoryId` (integer, optional): Filter by `category_id`.
  - `brandId` (integer, optional): Filter by `brand_id`.
  - `availability` (string, optional): `'in_stock'`, `'low_stock'`, `'out_of_stock'`.
  - `sortBy` (string, optional): `'name_asc'`, `'name_desc'`, `'price_asc'`, `'price_desc'`.
  - `page` (integer, optional, default: 1): Page number.
  - `limit` (integer, optional, default: 12): Records per page.
- **Success Response (`200 OK`):**
```json
{
  "success": true,
  "count": 9,
  "total": 27,
  "page": 1,
  "totalPages": 3,
  "data": [
    {
      "medicine_id": 1,
      "name": "Augmentin 625mg",
      "generic_name": "Amoxicillin + Clavulanate Potassium",
      "dosage_form": "Tablet",
      "strength": "625mg",
      "description": "Broad-spectrum antibiotic...",
      "unit_price": "185.00",
      "brand_name": "GlaxoSmithKline (GSK)",
      "category_name": "Antibiotics & Antimicrobials",
      "saleable_stock": 120,
      "availability_status": "In Stock"
    }
  ]
}
```

### 1.2 Get Single Medicine Clinical Details
- **Endpoint:** `GET /api/medicines/:id`
- **Description:** Retrieve comprehensive formulary details, side effects, and usage instructions for a single medicine.

### 1.3 Check Real-Time Medicine Availability
- **Endpoint:** `GET /api/medicines/:id/availability`
- **Description:** Real-time stock status check recomputed from active non-expired lots.

### 1.4 Public Metadata Endpoints
- `GET /api/categories` — List active therapeutic categories.
- `GET /api/brands` — List pharmaceutical brands and manufacturers.
- `GET /api/settings/public` — List public store hours, phone numbers, and address.

---

## 2. Staff Authentication Endpoints

### 2.1 Staff Login
- **Endpoint:** `POST /api/auth/login`
- **Headers:** `Content-Type: application/json`
- **Request Body:**
```json
{
  "identifier": "admin@mypharmacist.lk",
  "password": "yourpassword"
}
```
- **Success Response (`200 OK`):**
```json
{
  "success": true,
  "message": "Login successful.",
  "token": "eyJhbGciOiJIUzI1NiIsIn...",
  "user": {
    "userId": 1,
    "username": "admin",
    "email": "admin@mypharmacist.lk",
    "role": "ADMIN",
    "fullName": "Chief Pharmacist Administrator"
  }
}
```

---

## 3. Protected Staff & Admin Endpoints

All endpoints below require the HTTP header:
`Authorization: Bearer <JWT_TOKEN>`

### 3.1 POS Sales & Counter Dispensing
- **`POST /api/admin/sales`** (ADMIN, PHARMACIST, CASHIER)
  - Atomically creates an invoice, logs line items and batch allocations, updates physical inventory, records payment, and fires the stock audit trigger.
  - **Request Body:**
    ```json
    {
      "patient_name": "Kasun Perera",
      "prescription_ref": "RX-4820",
      "medicine_id": 1,
      "batch_id": 2,
      "quantity": 10,
      "unit_price": 185.00,
      "packaging_desc": "1 Card of 10 Tablets",
      "payment_method": "CASH",
      "amount_paid": 1850.00
    }
    ```
- **`GET /api/admin/sales`** (ADMIN, PHARMACIST) — Retrieve sales invoices history with cashier, customer, and payment metadata.

### 3.2 Inventory Management & Formulary Master
- **`GET /api/admin/medicines`** (ADMIN, PHARMACIST) — Full formulary master list with stock counts.
- **`POST /api/admin/medicines`** (ADMIN) — Create a new medicine formulation.
- **`PUT /api/admin/medicines/:id`** (ADMIN, PHARMACIST) — Update medicine formulation details or low stock reorder threshold.
- **`GET /api/admin/batches`** (ADMIN, PHARMACIST) — Granular batch register with expiration status.
- **`POST /api/admin/batches`** (ADMIN, PHARMACIST) — Receive and register a new inventory batch via `sp_receive_new_batch`.
- **`PATCH /api/admin/batches/:id/stock`** (ADMIN, PHARMACIST) — Physical stock count adjustment with audit logging.

### 3.3 DBMS Analytics & View Reports
- **`GET /api/admin/dashboard`** (ADMIN, PHARMACIST) — Stored procedure `sp_get_inventory_summary` KPI metrics.
- **`GET /api/admin/reports/daily-sales`** (ADMIN, PHARMACIST) — MySQL View `v_daily_sales` (gross, net, tax, cash/card).
- **`GET /api/admin/reports/monthly-sales`** (ADMIN, PHARMACIST) — MySQL View `v_monthly_sales`.
- **`GET /api/admin/reports/best-selling`** (ADMIN, PHARMACIST) — MySQL View `v_sales_by_medicine`.
- **`GET /api/admin/reports/valuation`** (ADMIN, PHARMACIST) — Inventory valuation at wholesale cost vs retail potential.
- **`GET /api/admin/reports/low-stock`** (ADMIN, PHARMACIST) — MySQL View `v_low_stock_alerts`.
- **`GET /api/admin/reports/expiring`** (ADMIN, PHARMACIST) — MySQL View `v_expiring_batches`.
- **`GET /api/admin/audit-logs`** (ADMIN) — MySQL trigger audit trail from `audit_logs`.

### 3.4 User Access & RBAC Management (Admin Only)
- **`GET /api/admin/users`** (ADMIN) — Staff directory.
- **`POST /api/admin/users`** (ADMIN) — Register staff member with bcrypt hashing.
- **`PATCH /api/admin/users/:id/status`** (ADMIN) — Activate or deactivate user access.

---

## 4. System Health Check
- **Endpoint:** `GET /api/health`
- **Success Response (`200 OK`):**
```json
{
  "status": "ok",
  "service": "My Pharmacist Pharmacy Management System API",
  "database": "connected",
  "timestamp": "2026-10-18T18:30:00.000Z"
}
```
