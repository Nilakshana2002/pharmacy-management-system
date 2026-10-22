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
│   ├── schema.sql                # Complete 3NF relational schema (22 normalized tables)
│   ├── routines.sql              # Stored Procedures (sp_create_pos_sale, etc.), 11 Views, Triggers, Functions, Events
│   ├── seed.sql                  # Comprehensive sample data across all 22 tables
│   ├── security.sql              # DCL User Management (Least Privilege, Password Locks, Resource Limits)
│   ├── init_all.sql              # Consolidated monolithic single-click importer for Workbench/phpMyAdmin
│   └── setup.js                  # Automated migration, seed runner, and verification script
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

### 2. Database Initialization Options

#### Option A: Automated Single-Command Setup (Recommended)
From the project root:
```bash
npm run db:setup
```
This script reads your `backend/.env`, connects to MySQL, and executes `schema.sql`, `routines.sql`, `seed.sql`, and `security.sql` in sequence. It prints a complete verification table of record counts for all 22 entities and provisioned MySQL DCL accounts.

#### Option B: Single-Click Monolithic SQL Import (MySQL Workbench / phpMyAdmin)
Open **MySQL Workbench**, **phpMyAdmin**, or command-line client, connect to your MySQL server, and execute:
```sql
SOURCE c:/Users/tharu/Desktop/adbms/pharmacy-management-system/database/init_all.sql;
```
Or via terminal:
```bash
mysql -u root -p < database/init_all.sql
```
This single master script creates the `pharmacy_db` database, defines all 22 normalized tables, builds all stored procedures, views, triggers, and scheduled events, populates sample data, and provisions the least-privilege security accounts.

---

### 3. Backend Setup
1. Configure credentials in `backend/.env`:
   ```ini
   PORT=5000
   DB_HOST=localhost
   DB_PORT=3306
   # Enterprise Least-Privilege Account (provisioned by security.sql)
   DB_USER=pharmacy_app
   DB_PASSWORD=PharmacyApp@2026!
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

## 🛡️ Database Accounts & Security Architecture (ADBMS Sections 9 & 10)

The system implements the **Principle of Least Privilege** using MySQL Data Control Language (DCL):

| MySQL User Account | Host Binding | Granted Privileges | Restricted Actions (Blocked by Engine) | Real System Activity |
|---|---|---|---|---|
| **`pharmacy_app`** | `@'localhost'` | `SELECT`, `INSERT`, `UPDATE`, `DELETE`, `EXECUTE` on routines | **Denied all DDL** (`DROP`, `ALTER`, `TRUNCATE`). Cannot modify structure. | Express Web Backend runtime queries & POS sales. |
| **`pharmacy_admin`** | `@'localhost'` | `ALL PRIVILEGES` on `pharmacy_db.*` with `GRANT OPTION` | Password expires every 90 days; 3 failed login lock. | Lead DBA structural schema migrations & backups. |
| **`pharmacy_auditor`** | `@'localhost'` | `SELECT` on Views (`v_*`) and `audit_logs` | **Denied all DML & DDL** (cannot insert, update, or delete). | Regulatory compliance & financial inspection. |

### MySQL Engine Security Controls (Section 9):
1. **Host Binding:** Restricted to `@'localhost'` to reject remote network intrusion attempts.
2. **Brute-Force Account Lockout:** `FAILED_LOGIN_ATTEMPTS 3 PASSWORD_LOCK_TIME 1` locks attacker accounts after 3 failed attempts.
3. **Resource Limits:** `MAX_CONNECTIONS_PER_HOUR 2000 MAX_USER_CONNECTIONS 50` protects against connection pool exhaustion / DoS attacks.
4. **Data Hiding & Abstraction:** Public catalog queries consume `v_medicine_catalog` where wholesale supplier costs and trade margins are completely hidden.
5. **Non-Repudiation Audit Trails:** Trigger `trg_after_batch_stock_update` generates immutable JSON snapshots into `audit_logs`.
6. **SQL Injection Immunity:** 100% of application queries utilize parameterized prepared statements (`?` placeholders).

---

## 🔐 Staff Access & Role-Based Credentials (Application Level)

| Role | Username / Identifier | Default Password | Permissions |
|---|---|---|---|
| **ADMIN** | `admin` (or `admin@mypharmacist.lk`) | `admin123` | Full access: POS, inventory, formulary edits, reports, trigger audit trail, user account management |
| **PHARMACIST** | `pharmacist` | `pharmacist123` | POS counter, formulary view/adjust, batch register, inventory reports |
| **CASHIER** | `cashier` | `cashier123` | POS counter, invoice receipt generation |

---

## 📋 Coursework Compliance Checklist

- [x] **No TypeScript migration:** Pure JavaScript (JSX) on frontend, ES Modules on backend.
- [x] **22 Normalized 3NF Relational Tables:** `medicines`, `batches`, `customers`, `prescription_files`, `promotions`, `reviews`, `inquiries`.
- [x] **Atomic Transactions:** Row-level pessimistic locking (`FOR UPDATE`) in POS sales with rollback on stock shortage.
- [x] **MySQL Stored Routines:** 4 Stored procedures (`sp_create_pos_sale`, `sp_update_batch_stock`, `sp_receive_new_batch`, `sp_get_inventory_summary`), 2 Functions, 11 Views.
- [x] **Database Security & DCL Users:** `pharmacy_app`, `pharmacy_admin`, `pharmacy_auditor` with least privilege and brute-force locks.
- [x] **Automated Trigger Auditing:** `trg_after_batch_stock_update` captures JSON snapshots in `audit_logs`.
- [x] **MySQL Scheduled Events:** `ev_daily_quarantine_expired_batches` and `ev_weekly_system_maintenance`.
- [x] **Security:** Bcrypt password hashing, JWT stateless authentication, role-based route guards.