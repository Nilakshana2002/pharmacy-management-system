import pool from '../config/db.js';

async function diagnose() {
  console.log('--- DATABASE DIAGNOSTIC ---');
  try {
    // 1. Check tables
    const [tables] = await pool.query('SHOW TABLES');
    console.log('Tables:', tables.map(t => Object.values(t)[0]));

    // 2. Check counts
    const checks = ['medicines', 'medicine_batches', 'users', 'sales', 'sale_items', 'payments', 'prescription_orders'];
    for (const tbl of checks) {
      try {
        const [res] = await pool.query(`SELECT COUNT(*) as cnt FROM ${tbl}`);
        console.log(`Table ${tbl}: ${res[0].cnt} rows`);
      } catch (e) {
        console.log(`Table ${tbl}: ERROR -> ${e.message}`);
      }
    }

    // 3. Check views
    const views = ['v_daily_sales', 'v_monthly_sales', 'v_sales_by_medicine', 'v_low_stock_alerts', 'v_expiring_batches'];
    for (const v of views) {
      try {
        const [res] = await pool.query(`SELECT COUNT(*) as cnt FROM ${v}`);
        console.log(`View ${v}: ${res[0].cnt} rows`);
      } catch (e) {
        console.log(`View ${v}: ERROR -> ${e.message}`);
      }
    }

    // 4. Test sp_get_inventory_summary
    try {
      const [res] = await pool.query('CALL sp_get_inventory_summary()');
      console.log('Procedure sp_get_inventory_summary: SUCCESS ->', res[0][0]);
    } catch (e) {
      console.log('Procedure sp_get_inventory_summary: ERROR ->', e.message);
    }

    // 5. Check sales records
    try {
      const [sales] = await pool.query('SELECT * FROM sales LIMIT 5');
      console.log('Sample sales:', sales);
    } catch (e) {
      console.log('Sales query error:', e.message);
    }

  } catch (err) {
    console.error('Diagnostic error:', err);
  } finally {
    process.exit(0);
  }
}

diagnose();
