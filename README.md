# 💊 PharmaCare — Pharmacy Management & E-Prescription System

> A full-stack web application designed for retail pharmacies to streamline batch inventory control, customer orders, and pharmacist-verified prescription workflows. Built to showcase robust relational database modeling, data integrity constraints, and transactional consistency.

---

## 📌 Project Overview

This project implements an end-to-end pharmacy operations platform with a strict focus on **relational database architecture (3NF)**. It replaces fragile application-layer stock tracking with database-native **triggers, stored procedures, and views** to guarantee ACID compliance during concurrent order processing and batch dispensing.

### Key Capabilities
- **Relational Schema in 3NF:** Strictly normalized data structures covering medicines, batches, orders, prescriptions, and role-based accounts.
- **ACID Transaction Order Handling:** Stored procedures utilizing pessimistic row locks (`FOR UPDATE`) to prevent race conditions and overselling.
- **Automated Stock Deduction:** MySQL triggers automatically adjust inventory batches upon order item entry.
- **Batch Expiry & Reorder Monitoring:** Pre-computed SQL views highlight nearing-expiry medicines (within 60 days) and low-stock alerts.
- **Prescription Verification Workflow:** Role-separated customer upload portal and pharmacist review desk with side-by-side status validation.

---

## 🛠️ Tech Stack

- **Database:** MySQL 8.0+ (Raw parameterized SQL, Triggers, Views, Stored Procedures via `mysql2/promise`)
- **Backend:** Node.js, Express.js (ES Modules), JWT Authentication, Bcrypt, Multer
- **Frontend:** React 18, Vite, Tailwind CSS, Axios
- **Architecture:** Client-Server REST API