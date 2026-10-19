# 💊 My Pharmacist — Pharmacy Management System

> A comprehensive full-stack web application designed for **My Pharmacist Dispensary**, featuring a dedicated **customer-side medicine searching and real-time availability verification portal** (with in-store inquiry slip printing), backed by a normalized **MySQL 8.0+** relational database, and an advanced **staff POS counter, batch tracking, multi-view analytics, trigger audit trail, and RBAC user management system**.

---

## 📌 Project Overview & Purpose

### 1. Customer Public Experience
The customer-facing website is designed **strictly for medicine catalog browsing, clinical details verification, and stock checking**:
- Customers **cannot** execute online purchases or online credit card checkout (in full accordance with pharmacy regulations).
- Real-time availability calculations are recomputed live from MySQL inventory batches, automatically excluding expired batches (`expiry_date <= CURDATE()`) and recalled/inactive lots.
- Customers can build a shopping list of needed medications and generate a professional **Printable In-Store Inquiry Slip** to bring to the physical pharmacy counter.
- Sensitive internal data (wholesale cost prices, batch numbers, internal supplier logistics) are completely withheld from public endpoints.

### 2. Staff Dispensary & Management Experience
Authorized pharmacy staff (Pharmacists, Cashiers, Admins) log in through a protected JWT portal to access:
- **POS Dispense Counter**: Multi-unit packaging calculator (strips/cards, loose tablets, blister packs, vials, bottles, inhalers), automated invoice generation, atomic stock deduction with row-level pessimistic locking (`FOR UPDATE`), and 80mm thermal receipt printing.
- **Formulary Medicine Master**: Comprehensive formulation directory with live stock badges, reorder thresholds, and formulation editing.
- **Granular Batch & Expiry Tracker**: Lot number registry with manufacturing & expiry dates, usability status badges, days-to-expiry counters, and stock adjustment with mandatory audit reasons.
- **Reports & DBMS Intelligence**:
  - Daily & Monthly Sales Summaries (`v_daily_sales`, `v_monthly_sales`).
  - Top Dispensed Medications (`v_sales_by_medicine`).
  - Total Inventory Valuation (wholesale cost vs retail value potential).
  - Database Trigger Audit Trail (`audit_logs`) tracking stock modifications in real time via `trg_after_batch_stock_update` with parsed snapshot badges.
- **Staff Accounts & RBAC (Admin Only)**: Staff account creation with bcrypt password hashing, and active/inactive status toggle.

---

## 🛠️ Technology Stack

- **Frontend:** React 19, Vite, Tailwind CSS v4, Axios, Lucide React (JavaScript JSX only, no TypeScript).
- **Backend:** Node.js, Express.js (ES Modules), JWT Authentication, Bcrypt (JavaScript only).
- **Database:** MySQL 8.0+ (Raw parameterized SQL via `mysql2/promise`, Stored Procedures, Views, Triggers, Functions — No ORM).
- **Architecture:** Client-Server REST API separated into `frontend/`, `backend/`, and `database/`.

---

## 📁 Repository Directory Structure

```
pharmacy-management-system/
├── frontend/                     # React + Vite + Tailwind CSS customer & staff UI
│   ├── src/
│   │   ├── components/           # Navbar, Footer, MedicineCard, DetailModal, AvailabilityBadge, InquiryCartModal
│   │   ├── pages/                # HomePage, MedicineSearchPage, AboutContactPage, StaffLoginPage, StaffDashboardPage
│   │   ├── services/api.js       # Axios client module for customer & admin endpoints
│   │   ├── context/              # ThemeContext (dark/light mode)
│   │   ├── utils/                # Image helpers and formatting utilities
│   │   ├── App.jsx               # Main client application router
│   │   └── index.css             # Tailwind design system
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
│   ├── schema.sql                # Complete 3NF relational schema (15 tables)
│   ├── routines.sql              # Stored Procedures (sp_create_pos_sale, etc.), Views, Triggers
│   ├── seed.sql                  # Comprehensive sample data (medicines, batches, suppliers, sales, purchases)
│   ├── migration_v2.sql          # Non-destructive MySQL migration script for existing databases
│   └── setup.js                  # Automated migration and seed runner
├── docs/                         # ADBMS Coursework Documentation Deliverables
│   ├── er_diagram.md             # Mermaid 3NF Entity-Relationship Diagram & Table Specifications
│   ├── api_documentation.md      # REST API endpoints, request/response specifications
│   └── test_cases.md             # Complete test matrix (POS, DBMS trigger audit, RBAC, inquiry slip)
└── README.md
```

---

## 🚀 Setup & Execution Guide

### 1. Prerequisites
- **Node.js** (v18.0.0 or higher)
- **MySQL Server 8.0+** running locally on port `3306`

---

### 2. Database Migration Options

#### Option A: Non-Destructive Update (Recommended for existing data)
Open **MySQL Workbench** or command-line client, connect to your MySQL server, and execute:
```sql
SOURCE c:/Users/tharu/Desktop/adbms/pharmacy-management-system/database/migration_v2.sql;
```
This script safely creates missing tables (`purchases`, `purchase_items`, `sales`, `sale_items`, `sale_item_batches`, `payments`), missing views (`v_daily_sales`, `v_monthly_sales`, `v_sales_by_medicine`, `v_payment_summary`), and the atomic POS sale stored procedure `sp_create_pos_sale` without dropping any of your existing records.

#### Option B: Fresh Installation from Scratch
To recreate the complete database with sample data:
```bash
cd backend
node setup.js
```

---

### 3. Backend Setup
1. Configure credentials in `backend/.env`:
   ```ini
   PORT=5000
   DB_HOST=localhost
   DB_PORT=3306
   DB_USER=root
   DB_PASSWORD=your_password
   DB_NAME=pharmacy_db
   JWT_SECRET=supersecret_mypharmacist_jwt_key_2026
   ```
2. Start the backend server:
   ```bash
   cd backend
   npm run dev
   ```
   The backend API will run on `http://localhost:5000`.

---

### 4. Frontend Setup
1. Start the Vite development server:
   ```bash
   cd frontend
   npm run dev
   ```
2. Open your browser and navigate to `http://localhost:3000`.

---

## 🔐 Staff Access & Role-Based Credentials

| Role | Username / Identifier | Default Password | Permissions |
|---|---|---|---|
| **ADMIN** | `admin` (or `admin@mypharmacist.lk`) | `admin123` | Full access: POS, inventory, formulary edits, reports, trigger audit trail, user account management |
| **PHARMACIST** | `pharmacist` | `pharmacist123` | POS counter, formulary view/adjust, batch register, inventory reports |
| **CASHIER** | `cashier` | `cashier123` | POS counter, invoice receipt generation |

---

## 📋 Coursework Compliance Checklist

- [x] **No TypeScript migration:** Pure JavaScript (JSX) on frontend, ES Modules on backend.
- [x] **No customer online checkout / payment gateways:** Strict inquiry slip generator with print styling.
- [x] **3NF Database Normalization:** 15 normalized tables, foreign keys with referential actions.
- [x] **Atomic Transactions:** Row-level pessimistic locking (`FOR UPDATE`) in POS sales with rollback on stock shortage.
- [x] **MySQL Stored Routines:** Stored procedures (`sp_create_pos_sale`, `sp_receive_new_batch`, `sp_update_batch_stock`, `sp_get_inventory_summary`), views, and functions.
- [x] **Automated Trigger Auditing:** `trg_after_batch_stock_update` captures old and new states in `audit_logs`.
- [x] **Security:** Bcrypt password hashing, JWT stateless authentication, role-based route guards.