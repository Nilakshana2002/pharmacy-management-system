# 💊 VDC Store — Pharmacy Management System

> A full-stack web application designed for **VDC Store Pharmacy**, featuring a dedicated **customer-side medicine searching and real-time availability verification portal**, backed by a normalized **MySQL 8.0+** relational database and a separate protected **staff/admin inventory management module**.

---

## 📌 Project Overview & Purpose

The customer-facing website is designed **strictly for medicine catalog browsing and stock checking**. In compliance with retail pharmacy safety requirements:
- Customers **cannot** purchase medicines, place orders, upload prescriptions, or add items to an online cart through the website.
- Medicines are dispensed exclusively at the physical pharmacy counter upon verification by licensed pharmacists.
- Availability calculations are recomputed live from MySQL inventory batches, automatically excluding expired batches (`expiry_date <= CURDATE()`) and recalled/inactive lots.
- Authorized pharmacy staff and administrators manage medicine formulations, suppliers, lots, and stock movements through a separate, role-protected interface.

---

## 🛠️ Technology Stack

- **Frontend:** React 19, Vite, Tailwind CSS, Axios, Lucide React (JavaScript only, no TypeScript)
- **Backend:** Node.js, Express.js (ES Modules), JWT Authentication, Bcrypt (JavaScript only)
- **Database:** MySQL 8.0+ (Raw parameterized SQL via `mysql2/promise`, Stored Procedures, Views, Triggers, Functions — No ORM)
- **Architecture:** Client-Server REST API separated into `frontend/`, `backend/`, and `database/`

---

## 📁 Repository Directory Structure

```
pharmacy-management-system/
├── frontend/                     # React + Vite + Tailwind CSS customer & staff UI
│   ├── src/
│   │   ├── components/           # Navbar, Footer, MedicineCard, DetailModal, AvailabilityBadge
│   │   ├── pages/                # HomePage, MedicineSearchPage, AboutContactPage, StaffLoginPage, StaffDashboardPage
│   │   ├── services/api.js       # Axios client module for customer & admin endpoints
│   │   ├── App.jsx               # Main client application router
│   │   ├── index.css             # Tailwind design system
│   │   └── main.jsx
│   ├── package.json
│   └── vite.config.js
├── backend/                      # Node.js Express API server
│   ├── config/
│   │   └── db.js                 # mysql2/promise connection pool
│   ├── controllers/              # medicines, categories, brands, settings, auth, admin controllers
│   ├── middleware/               # JWT authentication and RBAC middleware
│   ├── routes/                   # medicines, categories, brands, settings, auth, admin routes
│   ├── index.js                  # Express server entry point
│   ├── package.json
│   └── .env.example
├── database/                     # MySQL 8.0+ DDL, DML, and automation scripts
│   ├── schema.sql                # 3NF relational schema (9 tables, constraints, indexes)
│   ├── routines.sql              # Views, Stored Functions, Stored Procedures, Triggers
│   ├── seed.sql                  # Comprehensive sample data (27 medicines, batches, suppliers, settings)
│   └── setup.js                  # Automated migration and seed runner
├── docs/                         # ADBMS Coursework Documentation Deliverables
│   ├── er_diagram.md             # Mermaid Entity-Relationship Diagram & Data Dictionary
│   ├── api_documentation.md      # REST API endpoints, request/response specifications
│   └── test_cases.md             # Test matrix (search, availability, expired-batch exclusion, RBAC)
└── README.md
```

---

## 🚀 Quick Setup & Installation Guide

### 1. Prerequisites
- **Node.js** (v18.0.0 or higher)
- **MySQL Server 8.0+** running locally on port `3306`

---

### 2. Database Setup

1. Make sure your MySQL server is running.
2. Configure credentials in `backend/.env` (or copy from `backend/.env.example`):
   ```ini
   PORT=5000
   DB_HOST=localhost
   DB_PORT=3306
   DB_USER=root
   DB_PASSWORD=
   DB_NAME=pharmacy_db
   JWT_SECRET=vdc_store_jwt_super_secret_key_2026_adbms
   ```
3. Run the automated database installer:
   ```bash
   cd backend
   npm install
   npm run db:setup
   ```
   *Alternative manual setup via MySQL CLI:*
   ```bash
   mysql -u root -p < database/schema.sql
   mysql -u root -p pharmacy_db < database/routines.sql
   mysql -u root -p pharmacy_db < database/seed.sql
   ```

---

### 3. Start the Backend API Server

```bash
cd backend
npm install
npm run dev
```
The Express API will be running at `http://localhost:5000`. You can verify health at `http://localhost:5000/api/health`.

---

### 4. Start the Frontend Client

In a separate terminal:
```bash
cd frontend
npm install
npm run dev
```
The React customer application will launch at `http://localhost:3000`.

---

## 👥 Demo Staff Credentials

For testing the protected Staff and Administrator management portal:

| Role | Username / Email | Password |
|---|---|---|
| **Administrator** | `admin@vdcstore.com` | `admin123` |
| **Pharmacist** | `pharmacist@vdcstore.com` | `pharma123` |

*(A quick 1-click autofill button is provided on the Staff Login screen for convenience).*

---

## 🎓 Advanced Database (ADBMS) Coursework Highlights

- **Normalized 3NF Architecture:** Separated relations for `brands`, `medicine_categories`, `medicines`, `suppliers`, `medicine_batches`, `stock_movements`, `users`, `pharmacy_settings`, and `audit_logs`.
- **Complex SQL Joins:** Multi-table `INNER JOIN` and `LEFT JOIN` queries combining medicine specifications, brand origins, category groupings, and batch availability.
- **SQL Views:**
  - `v_medicine_catalog`: Public view with calculated stock status.
  - `v_medicine_availability`: Real-time stock summary with customer messages.
  - `v_low_stock_alerts`: Internal staff view for items at or below reorder threshold.
  - `v_expiring_batches`: Internal monitoring view for batches expiring within 90 days.
- **Stored Functions:**
  - `fn_calculate_available_stock(p_medicine_id)`: Calculates active unexpired stock.
  - `fn_get_availability_status(p_medicine_id)`: Returns `'In Stock'`, `'Low Stock'`, or `'Out of Stock'`.
- **Stored Procedures:**
  - `sp_update_batch_stock`: Transactional pessimistic row locking (`FOR UPDATE`) with automatic stock movement logging.
  - `sp_receive_new_batch`: Atomically receives batch and initializes movement record.
  - `sp_get_inventory_summary`: Aggregates operational dashboard metrics.
- **Triggers:**
  - `trg_after_batch_stock_update`: Triggers on batch updates, writing JSON audit snapshots of old/new values to `audit_logs`.
  - `trg_before_batch_insert`: Enforces business integrity: `expiry_date > manufacture_date` and `stock_quantity <= quantity_received`.
- **Indexes:** Multi-column composite index on `(name, generic_name)` and `(medicine_id, status, expiry_date, stock_quantity)` for performant sub-second searches.

---

## 📄 Documentation Deliverables

- [API Documentation](file:///c:/Users/tharu/Desktop/adbms/pharmacy-management-system/docs/api_documentation.md)
- [Entity-Relationship (ER) Diagram & Schema](file:///c:/Users/tharu/Desktop/adbms/pharmacy-management-system/docs/er_diagram.md)
- [Test Cases & Validation Plan](file:///c:/Users/tharu/Desktop/adbms/pharmacy-management-system/docs/test_cases.md)