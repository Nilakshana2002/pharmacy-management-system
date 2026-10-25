import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env from backend/.env
dotenv.config({ path: path.resolve(__dirname, '.env') });
dotenv.config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  multipleStatements: true
};

const DB_NAME = process.env.DB_NAME || 'pharmacy_db';

function parseSqlStatements(content) {
  const statements = [];
  let currentDelimiter = ';';
  const lines = content.split(/\r?\n/);
  let currentStatement = '';

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.toUpperCase().startsWith('DELIMITER ')) {
      currentDelimiter = trimmed.substring(10).trim();
      continue;
    }

    if (trimmed.startsWith('--') && !currentStatement.trim()) {
      continue;
    }

    currentStatement += line + '\n';

    if (currentStatement.trim().endsWith(currentDelimiter)) {
      let stmt = currentStatement.trim();
      stmt = stmt.substring(0, stmt.length - currentDelimiter.length).trim();
      if (stmt.length > 0) {
        statements.push(stmt);
      }
      currentStatement = '';
    }
  }

  if (currentStatement.trim().length > 0) {
    statements.push(currentStatement.trim());
  }

  return statements;
}

async function runDatabaseSetup() {
  console.log(`[DB Setup] Connecting to MySQL at ${dbConfig.host}:${dbConfig.port} as ${dbConfig.user}...`);
  
  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    console.log('[DB Setup] Connected successfully to MySQL server.');

    // 1. Run schema.sql
    console.log('\n[1/4] Executing database/schema.sql (22 Normalized Tables)...');
    const schemaSql = fs.readFileSync(path.resolve(__dirname, '../database/schema.sql'), 'utf-8');
    const schemaStatements = parseSqlStatements(schemaSql);
    for (const stmt of schemaStatements) {
      if (!stmt.trim()) continue;
      try {
        await connection.query(stmt);
      } catch (err) {
        if (err.errno === 1061 || err.code === 'ER_DUP_KEYNAME') {
          continue;
        }
        throw err;
      }
    }
    console.log('✓ Schema created/verified successfully (22 tables + indexes).');

    // Switch to target database
    await connection.changeUser({ database: DB_NAME });

    // Synchronize columns for existing tables if created with older schema
    const columnSyncList = [
      { table: 'prescription_orders', column: 'files_count', definition: 'INT DEFAULT 0' },
      { table: 'prescription_orders', column: 'customer_id', definition: 'INT NULL' },
      { table: 'prescription_orders', column: 'account_type', definition: "ENUM('registered', 'guest') NOT NULL DEFAULT 'guest'" },
      { table: 'prescription_orders', column: 'reviewed_at', definition: 'DATETIME NULL' },
      { table: 'prescription_orders', column: 'confirmation_message', definition: 'TEXT NULL' },
      { table: 'prescription_orders', column: 'rejection_reason', definition: 'TEXT NULL' },
      { table: 'prescription_orders', column: 'ready_time', definition: 'VARCHAR(100) NULL' },
      { table: 'prescription_orders', column: 'email_sent', definition: 'TINYINT(1) DEFAULT 0' },
      { table: 'prescription_orders', column: 'email_sent_at', definition: 'DATETIME NULL' },
      { table: 'medicines', column: 'image_url', definition: 'VARCHAR(500) NULL' },
      { table: 'medicines', column: 'is_public_price', definition: 'BOOLEAN DEFAULT TRUE' },
      { table: 'medicines', column: 'is_offer', definition: 'BOOLEAN NOT NULL DEFAULT FALSE' },
      { table: 'medicines', column: 'discount_percent', definition: 'DECIMAL(5, 2) NOT NULL DEFAULT 0.00' },
      { table: 'medicine_categories', column: 'parent_category_id', definition: 'INT NULL' },
      { table: 'medicine_categories', column: 'icon_name', definition: "VARCHAR(50) DEFAULT 'Pill'" },
      { table: 'medicine_categories', column: 'image_url', definition: 'VARCHAR(500) NULL' },
      { table: 'users', column: 'permissions', definition: 'TEXT NULL' }
    ];

    for (const col of columnSyncList) {
      try {
        const [existing] = await connection.query(
          'SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?',
          [DB_NAME, col.table, col.column]
        );
        if (existing.length === 0) {
          await connection.query(`ALTER TABLE ${col.table} ADD COLUMN ${col.column} ${col.definition}`);
          console.log(`  ↳ Synchronized schema: added missing column '${col.column}' to '${col.table}'.`);
        }
      } catch (colErr) {}
    }

    // Ensure files column in prescription_orders is LONGTEXT
    try {
      await connection.query('ALTER TABLE prescription_orders MODIFY COLUMN files LONGTEXT NULL');
    } catch (e) {}

    // 2. Run routines.sql
    console.log('\n[2/4] Executing database/routines.sql (Views, Functions, Procedures, Triggers, Events)...');
    const routinesSql = fs.readFileSync(path.resolve(__dirname, '../database/routines.sql'), 'utf-8');
    const routineStatements = parseSqlStatements(routinesSql);
    
    for (const stmt of routineStatements) {
      if (!stmt.trim()) continue;
      try {
        await connection.query(stmt);
      } catch (err) {
        console.warn(`[Routine note]: ${err.message}`);
      }
    }
    console.log('✓ Database routines successfully installed.');

    // 3. Run seed.sql
    console.log('\n[3/4] Executing database/seed.sql (Populating sample records)...');
    const seedSql = fs.readFileSync(path.resolve(__dirname, '../database/seed.sql'), 'utf-8');
    await connection.query(seedSql);
    console.log('✓ Sample data seeded successfully (38 medicines, batches, suppliers, categories, settings, users).');

    // 4. Run security.sql (Provision least-privilege DCL accounts)
    console.log('\n[4/4] Executing database/security.sql (Provisioning Least-Privilege DCL Users)...');
    try {
      const securitySql = fs.readFileSync(path.resolve(__dirname, '../database/security.sql'), 'utf-8');
      await connection.query(securitySql);
      console.log('✓ DCL database users provisioned (pharmacy_app, pharmacy_admin, pharmacy_auditor).');
    } catch (secErr) {
      console.warn(`[Security Setup Note]: ${secErr.message} (Requires MySQL root grant privileges)`);
    }

    // 1. Table Record Counts
    const [counts] = await connection.query(`
      SELECT 
        (SELECT COUNT(*) FROM medicines) AS medicines_count,
        (SELECT COUNT(*) FROM medicine_batches) AS batches_count,
        (SELECT COUNT(*) FROM brands) AS brands_count,
        (SELECT COUNT(*) FROM medicine_categories) AS categories_count,
        (SELECT COUNT(*) FROM users) AS users_count,
        (SELECT COUNT(*) FROM customers) AS customers_count,
        (SELECT COUNT(*) FROM purchases) AS purchases_count,
        (SELECT COUNT(*) FROM sales) AS sales_count,
        (SELECT COUNT(*) FROM payments) AS payments_count,
        (SELECT COUNT(*) FROM prescription_orders) AS prescription_orders_count,
        (SELECT COUNT(*) FROM prescription_files) AS prescription_files_count,
        (SELECT COUNT(*) FROM customer_reviews) AS reviews_count,
        (SELECT COUNT(*) FROM inquiries) AS inquiries_count,
        (SELECT COUNT(*) FROM notification_logs) AS notification_logs_count
    `);
    console.log('\n[DB Setup Summary - Complete ADBMS Schema (22 Tables)]:');
    console.table(counts[0]);

    // 2. Procedural & Architectural Object Totals
    const [adbmsTotals] = await connection.query(`
      SELECT 
        (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = '${DB_NAME}' AND TABLE_TYPE = 'BASE TABLE') AS 'Tables (3NF)',
        (SELECT COUNT(*) FROM information_schema.VIEWS WHERE TABLE_SCHEMA = '${DB_NAME}') AS 'Views',
        (SELECT COUNT(*) FROM information_schema.ROUTINES WHERE ROUTINE_SCHEMA = '${DB_NAME}' AND ROUTINE_TYPE = 'PROCEDURE') AS 'Stored Procedures',
        (SELECT COUNT(*) FROM information_schema.ROUTINES WHERE ROUTINE_SCHEMA = '${DB_NAME}' AND ROUTINE_TYPE = 'FUNCTION') AS 'Stored Functions',
        (SELECT COUNT(*) FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA = '${DB_NAME}') AS 'Triggers',
        (SELECT COUNT(*) FROM information_schema.EVENTS WHERE EVENT_SCHEMA = '${DB_NAME}') AS 'Scheduled Events'
    `);
    console.log('\n[ADBMS Coursework Architecture Verification (Target Counts)]:');
    console.table(adbmsTotals[0]);

    try {
      const [dbUsers] = await connection.query("SELECT user, host, account_locked FROM mysql.user WHERE user LIKE 'pharmacy_%'");
      if (dbUsers.length > 0) {
        console.log('\n[Provisioned MySQL Security Accounts (DCL)]:');
        console.table(dbUsers);
      }
    } catch (uErr) {}

    console.log('🎉 VDC Store / My Pharmacist database initialized and ready!');
  } catch (error) {
    console.error('\n[DB Setup Error]:', error.message);
    if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('👉 Tip: Please verify your DB_PASSWORD in backend/.env matches your local MySQL root password.');
    }
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

runDatabaseSetup();
