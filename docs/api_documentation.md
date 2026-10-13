# VDC Store Pharmacy Management System — REST API Documentation

This document provides complete API reference documentation for the VDC Store Pharmacy Management System backend server built with Express.js and MySQL 8 (raw parameterized SQL via `mysql2/promise`).

Base URL: `http://localhost:5000/api`

---

## 1. Customer-Facing Endpoints (Public)

Customer endpoints do **not** require authentication and are read-only. No customer purchasing, cart, checkout, or order endpoints exist.

### 1.1 Search & Filter Medicines Catalog
- **Endpoint:** `GET /api/medicines`
- **Description:** Retrieve paginated medicines catalog with joins on brands and categories. Includes calculated saleable stock and availability status. Excludes expired or inactive batches.
- **Query Parameters:**
  - `search` (string, optional): Search keyword matched against medicine name, generic name, or brand name using `LIKE ?`.
  - `categoryId` (integer, optional): Filter by `category_id`.
  - `brandId` (integer, optional): Filter by `brand_id`.
  - `availability` (string, optional): One of `'in_stock'`, `'low_stock'`, `'out_of_stock'`. Evaluated via SQL `HAVING` clause.
  - `sortBy` (string, optional): `'name_asc'` (default), `'name_desc'`, `'price_asc'`, `'price_desc'`.
  - `page` (integer, optional, default: `1`): Page number.
  - `limit` (integer, optional, default: `12`): Number of records per page.
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
      "side_effects": "Mild diarrhea, nausea...",
      "usage_instructions": "Take with a meal...",
      "unit_price": "185.00",
      "is_public_price": true,
      "low_stock_threshold": 25,
      "brand_id": 2,
      "brand_name": "GlaxoSmithKline (GSK)",
      "country_of_origin": "United Kingdom",
      "category_id": 1,
      "category_name": "Antibiotics & Antimicrobials",
      "icon_name": "ShieldAlert",
      "saleable_stock": 120,
      "availability_status": "In Stock"
    }
  ]
}
```

---

### 1.2 Get Single Medicine Details
- **Endpoint:** `GET /api/medicines/:id`
- **Description:** Retrieve comprehensive clinical details, active ingredients, dosage form, brand, and verified availability status for a single medicine.
- **Path Parameters:**
  - `id` (integer, required): The unique `medicine_id`.
- **Success Response (`200 OK`):**
```json
{
  "success": true,
  "data": {
    "medicine_id": 1,
    "name": "Augmentin 625mg",
    "generic_name": "Amoxicillin + Clavulanate Potassium",
    "dosage_form": "Tablet",
    "strength": "625mg",
    "description": "Broad-spectrum antibiotic...",
    "side_effects": "Mild diarrhea, nausea, skin rash. Consult doctor if severe.",
    "usage_instructions": "Take with a meal or light snack to reduce stomach discomfort every 12 hours as prescribed.",
    "unit_price": "185.00",
    "is_public_price": true,
    "low_stock_threshold": 25,
    "brand_id": 2,
    "brand_name": "GlaxoSmithKline (GSK)",
    "country_of_origin": "United Kingdom",
    "category_id": 1,
    "category_name": "Antibiotics & Antimicrobials",
    "icon_name": "ShieldAlert",
    "saleable_stock": 120,
    "availability_status": "In Stock",
    "availability_message": "In stock and currently available for in-person dispensing at VDC Store."
  }
}
```

---

### 1.3 Check Real-Time Medicine Availability
- **Endpoint:** `GET /api/medicines/:id/availability`
- **Description:** Real-time stock status check. Recomputes saleable inventory from `medicine_batches` strictly omitting batches where `expiry_date <= CURDATE()`, `status != 'active'`, or `stock_quantity <= 0`.
- **Success Response (`200 OK`):**
```json
{
  "success": true,
  "data": {
    "medicine_id": 4,
    "name": "Zithromax 250mg",
    "generic_name": "Azithromycin Dihydrate",
    "availability_status": "Out of Stock",
    "message": "This medicine is currently out of stock. Please contact the pharmacy for further information.",
    "checked_at": "2026-10-13T10:45:00.000Z"
  }
}
```

---

### 1.4 Get Medicine Categories
- **Endpoint:** `GET /api/categories`
- **Description:** Retrieves all therapeutic categories with count of active formulations.
- **Success Response (`200 OK`):**
```json
{
  "success": true,
  "count": 8,
  "data": [
    {
      "category_id": 1,
      "category_name": "Antibiotics & Antimicrobials",
      "description": "Medicines that fight bacterial infections...",
      "icon_name": "ShieldAlert",
      "medicine_count": 4
    }
  ]
}
```

---

### 1.5 Get Brands
- **Endpoint:** `GET /api/brands`
- **Description:** Retrieves all pharmaceutical brands with formulation counts.
- **Success Response (`200 OK`):**
```json
{
  "success": true,
  "count": 8,
  "data": [
    {
      "brand_id": 1,
      "brand_name": "Pfizer Inc.",
      "country_of_origin": "United States",
      "medicine_count": 5
    }
  ]
}
```

---

### 1.6 Get Public Pharmacy Store Settings
- **Endpoint:** `GET /api/settings/public`
- **Description:** Retrieves public configuration items (phone numbers, store address, opening hours schedule, announcements).
- **Success Response (`200 OK`):**
```json
{
  "success": true,
  "data": {
    "store_name": "VDC Store Pharmacy",
    "phone_primary": "+94 11 234 5678",
    "phone_hotline": "+94 77 123 4567",
    "email": "info@vdcstore.com",
    "address_street": "124 Galle Road, Bambalapitiya",
    "address_city": "Colombo 04, Sri Lanka",
    "hours_weekday": "8:00 AM – 10:00 PM",
    "hours_saturday": "8:30 AM – 9:00 PM",
    "hours_sunday": "9:00 AM – 6:00 PM",
    "announcement": "VDC Store provides real-time medicine availability verification."
  }
}
```

---

## 2. Staff Authentication Endpoints

### 2.1 Staff / Admin Login
- **Endpoint:** `POST /api/auth/login`
- **Headers:** `Content-Type: application/json`
- **Request Body:**
```json
{
  "identifier": "admin@vdcstore.com",
  "password": "admin123"
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
    "email": "admin@vdcstore.com",
    "role": "ADMIN",
    "fullName": "Chief Pharmacy Administrator"
  }
}
```

---

## 3. Protected Staff / Admin Management Endpoints

All endpoints in this section require the HTTP Header:
`Authorization: Bearer <JWT_TOKEN>`

| Method | Endpoint | Allowed Roles | Description |
|---|---|---|---|
| `GET` | `/api/admin/dashboard` | ADMIN, PHARMACIST | Calls stored procedure `sp_get_inventory_summary()` to return dashboard metrics |
| `GET` | `/api/admin/medicines` | ADMIN, PHARMACIST | Administrative medicines list with stock levels, batch totals |
| `POST` | `/api/admin/medicines` | ADMIN | Insert a new medicine into the catalog |
| `PUT` | `/api/admin/medicines/:id` | ADMIN, PHARMACIST | Update medicine details or low stock threshold |
| `GET` | `/api/admin/batches` | ADMIN, PHARMACIST | Full batch register with manufacture, expiry dates, supplier name, status |
| `POST` | `/api/admin/batches` | ADMIN, PHARMACIST | Calls stored procedure `sp_receive_new_batch` to atomically log batch and movement |
| `PATCH`| `/api/admin/batches/:id/stock`| ADMIN, PHARMACIST | Calls stored procedure `sp_update_batch_stock` to modify batch stock and trigger audit |
| `GET` | `/api/admin/suppliers` | ADMIN, PHARMACIST | Retrieve active suppliers for batch creation |
| `GET` | `/api/admin/reports/low-stock` | ADMIN, PHARMACIST | Queries MySQL View `v_low_stock_alerts` |
| `GET` | `/api/admin/reports/expiring` | ADMIN, PHARMACIST | Queries MySQL View `v_expiring_batches` (batches expiring within 90 days) |
| `GET` | `/api/admin/stock-movements` | ADMIN, PHARMACIST | Queries `stock_movements` log table |
| `GET` | `/api/admin/audit-logs` | ADMIN | Queries MySQL trigger audit logs from `audit_logs` table |

---

## 4. Health Check Endpoint
- **Endpoint:** `GET /api/health`
- **Success Response (`200 OK`):**
```json
{
  "status": "ok",
  "service": "VDC Store Pharmacy Management System API",
  "database": "connected",
  "timestamp": "2026-10-13T10:45:00.000Z"
}
```
