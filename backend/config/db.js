import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

/**
 * MySQL Connection Pool Configuration using mysql2/promise.
 * All database operations will consume raw SQL, parameterized queries,
 * views, stored procedures, and triggers directly through this pool.
 */
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'pharmacy_db',
  waitForConnections: process.env.DB_WAIT_FOR_CONNECTIONS !== 'false',
  connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT || '10', 10),
  queueLimit: parseInt(process.env.DB_QUEUE_LIMIT || '0', 10),
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
});

/**
 * Test database connectivity and log connection status.
 */
export const testConnection = async () => {
  try {
    const connection = await pool.getConnection();
    console.log(`[DB] Successfully connected to MySQL database: '${process.env.DB_NAME || 'pharmacy_db'}' at ${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 3306}`);
    connection.release();
    return true;
  } catch (error) {
    console.warn(`[DB Warning] Initial MySQL connection test failed: ${error.message}`);
    console.warn(`[DB Warning] Ensure MySQL 8.0+ is running and database '${process.env.DB_NAME || 'pharmacy_db'}' exists.`);
    return false;
  }
};

export default pool;
