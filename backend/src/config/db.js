// =====================================================================
// db.js: PostgreSQL Connection Pool & Query Adapter
// =====================================================================

const { Pool, types } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../../.env') });

// Parse numeric/decimal types as floats for chart and metric calculations
types.setTypeParser(1700, (val) => (val === null ? null : parseFloat(val)));

const poolConfig = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD !== undefined ? process.env.DB_PASSWORD : '',
  database: process.env.DB_NAME || 'student_workload',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000
};

const pool = new Pool(poolConfig);

/**
 * Normalizes SQL dialect and parameter placeholders for PostgreSQL
 */
function adaptSqlAndParams(sql, params = []) {
  let adaptedSql = sql;

  // Handle MySQL date function compatibility
  adaptedSql = adaptedSql.replace(/DATE_ADD\(\s*NOW\(\)\s*,\s*INTERVAL\s+14\s+DAY\s*\)/gi, "CURRENT_TIMESTAMP + INTERVAL '14 days'");
  adaptedSql = adaptedSql.replace(/DATE_ADD\(\s*NOW\(\)\s*,\s*INTERVAL\s*\?\s*DAY\s*\)/gi, "(CURRENT_TIMESTAMP + (? || ' days')::INTERVAL)");
  adaptedSql = adaptedSql.replace(/\bNOW\(\)/gi, 'CURRENT_TIMESTAMP');

  // Handle MySQL INSERT IGNORE INTO ...
  let hasIgnore = false;
  if (/^\s*INSERT\s+IGNORE\s+INTO/i.test(adaptedSql)) {
    adaptedSql = adaptedSql.replace(/^\s*INSERT\s+IGNORE\s+INTO/i, 'INSERT INTO');
    hasIgnore = true;
  }

  let paramIdx = 1;
  const newParams = [];

  for (let i = 0; i < params.length; i++) {
    const val = params[i];
    if (Array.isArray(val)) {
      adaptedSql = adaptedSql.replace(/IN\s*\(\s*\?\s*\)/i, `= ANY($${paramIdx})`);
      newParams.push(val);
      paramIdx++;
    } else {
      adaptedSql = adaptedSql.replace(/\?/, `$${paramIdx}`);
      newParams.push(val);
      paramIdx++;
    }
  }

  const isInsert = /^\s*INSERT\s+INTO/i.test(adaptedSql);
  if (hasIgnore) {
    adaptedSql += ' ON CONFLICT DO NOTHING';
  } else if (isInsert && !/RETURNING/i.test(adaptedSql)) {
    adaptedSql += ' RETURNING *';
  }

  return { adaptedSql, newParams, isInsert };
}

/**
 * Generic query executor for pool or dedicated client
 */
async function executeQueryOn(target, sql, params = []) {
  const { adaptedSql, newParams, isInsert } = adaptSqlAndParams(sql, params);

  try {
    const res = await target.query(adaptedSql, newParams);

    if (/^\s*(SELECT|WITH)/i.test(adaptedSql)) {
      return [res.rows, res.fields];
    }

    const result = {
      rowCount: res.rowCount,
      affectedRows: res.rowCount
    };

    if (isInsert && res.rows && res.rows[0]) {
      const row = res.rows[0];
      const idKey = Object.keys(row).find((k) => k.endsWith('_id')) || Object.keys(row)[0];
      result.insertId = row[idKey];
    }

    return [result, res.fields];
  } catch (err) {
    // Map PostgreSQL error codes for unified middleware error handling
    if (err.code === '23505') err.code = 'ER_DUP_ENTRY';
    if (err.code === '23503') err.code = 'ER_NO_REFERENCED_ROW_2';
    if (err.code === '23514') err.code = 'ER_CHECK_CONSTRAINT_VIOLATED';
    if (err.code === 'P0001' || err.code === '45000') {
      err.code = 'ER_SIGNAL_EXCEPTION';
      err.sqlMessage = err.message;
    }
    throw err;
  }
}

/**
 * Global pool query
 */
async function query(sql, params = []) {
  return executeQueryOn(pool, sql, params);
}

// Test database connection on startup
async function testConnection() {
  try {
    const client = await pool.connect();
    console.log(`[DB] Connected successfully to PostgreSQL database "${poolConfig.database}" at ${poolConfig.host}:${poolConfig.port}`);
    client.release();
  } catch (error) {
    console.error('[DB] Connection error:', error.message);
  }
}

testConnection();

module.exports = {
  query,
  getConnection: async () => {
    const client = await pool.connect();
    return {
      query: (sql, params) => executeQueryOn(client, sql, params),
      beginTransaction: async () => client.query('BEGIN'),
      commit: async () => client.query('COMMIT'),
      rollback: async () => client.query('ROLLBACK'),
      release: () => client.release()
    };
  },
  end: () => pool.end()
};
