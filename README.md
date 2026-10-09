# Full-Stack Pharmacy Management Web System

An Advanced Database Coursework project built with a decoupled architecture featuring a Node.js/Express REST API backend using raw MySQL queries (`mysql2/promise`), and a React + Vite + Tailwind CSS frontend.

---

## 🚀 Key Architecture & Rules

- **Database**: MySQL 8.0+
- **Backend**: Node.js & Express.js using **ES Modules** (`"type": "module"`) syntax.
- **Database Driver**: `mysql2/promise` with Connection Pooling configured in `server/config/db.js`.
- **Query Layer Constraint**: Strictly **No ORMs** (No Prisma/Sequelize). All database queries, views, stored procedures, and triggers are written in raw SQL.
- **Frontend**: React (Vite) styled with Tailwind CSS v4 and Lucide React icons.
- **Auth Strategy**: JWT authentication with `bcryptjs` password hashing and role-based middleware (`Admin`, `Pharmacist`, `Customer`).

---

## 📁 Repository Structure

```
ADMS project/
├── server/
│   ├── config/
│   │   └── db.js            # mysql2/promise Connection Pool & Test Utility
│   ├── controllers/         # Raw SQL logic controllers (placeholder)
│   ├── middleware/          # JWT Auth & Role Middleware (placeholder)
│   ├── routes/              # Express API Routes (placeholder)
│   ├── sql/                 # Schema, Stored Procedures, Views, & Triggers (placeholder)
│   ├── .env.example         # Database & Server environment template
│   ├── index.js             # Express API Server entry point
│   └── package.json         # Backend Node dependencies & ES module declaration
├── client/
│   ├── src/
│   │   ├── App.jsx          # React system status dashboard
│   │   ├── main.jsx         # React DOM entry
│   │   └── index.css        # Tailwind CSS v4 stylesheet
│   ├── index.html           # Main HTML with Plus Jakarta Sans typography
│   ├── vite.config.js       # Vite configuration with Tailwind plugin & API proxy
│   ├── .env.example         # Client environment template
│   └── package.json         # Frontend React & Tailwind dependencies
├── .gitignore
└── README.md
```

---

## ⚡ Quick Start Instructions

### 1. Environment Setup

Copy `.env.example` files to `.env` in both server and client directories:

```bash
cp server/.env.example server/.env
cp client/.env.example client/.env
```

Ensure your MySQL server is running and configure `DB_USER`, `DB_PASSWORD`, and `DB_NAME` inside `server/.env`.

### 2. Install Dependencies

#### Backend (`/server`)
```bash
cd server
npm install
```

#### Frontend (`/client`)
```bash
cd client
npm install
```

### 3. Running Development Servers

#### Start Express Server (Port 5000)
```bash
cd server
npm run dev
```

#### Start Vite React Server (Port 3000)
```bash
cd client
npm run dev
```

---

## 🛡️ Database Verification API

The backend provides a health check endpoint at `http://localhost:5000/api/health` that pings the MySQL connection pool and returns JSON status.
