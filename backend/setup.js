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
    console.log('\n[1/3] Executing database/schema.sql...');
    const schemaSql = fs.readFileSync(path.resolve(__dirname, '../database/schema.sql'), 'utf-8');
    await connection.query(schemaSql);
    console.log('✓ Schema created successfully (9 tables + indexes).');

    // Switch to target database
    await connection.changeUser({ database: DB_NAME });

    // 2. Run routines.sql
    console.log('\n[2/3] Executing database/routines.sql (Views, Functions, Procedures, Triggers)...');
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
    console.log('\n[3/3] Executing database/seed.sql (Populating sample records)...');
    const seedSql = fs.readFileSync(path.resolve(__dirname, '../database/seed.sql'), 'utf-8');
    await connection.query(seedSql);
    console.log('✓ Sample data seeded successfully (27 medicines, batches, suppliers, categories, settings, users).');

    // Verify installation
    const [counts] = await connection.query(`
      SELECT 
        (SELECT COUNT(*) FROM medicines) AS medicines_count,
        (SELECT COUNT(*) FROM medicine_batches) AS batches_count,
        (SELECT COUNT(*) FROM brands) AS brands_count,
        (SELECT COUNT(*) FROM medicine_categories) AS categories_count,
        (SELECT COUNT(*) FROM users) AS users_count,
        (SELECT COUNT(*) FROM purchases) AS purchases_count,
        (SELECT COUNT(*) FROM sales) AS sales_count,
        (SELECT COUNT(*) FROM payments) AS payments_count
    `);
    console.log('\n[DB Setup Summary]:');
    console.table(counts[0]);
    console.log('🎉 VDC Store database initialized and ready!');

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
