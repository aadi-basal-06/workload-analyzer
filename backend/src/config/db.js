// =====================================================================
// db.js: MySQL2 Promise Pool Connection Configuration
// =====================================================================

const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../../.env') });

const poolConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD !== undefined ? process.env.DB_PASSWORD : '',
  database: process.env.DB_NAME || 'student_workload',
  waitForConnections: true,
  connectionLimit: 15,
  queueLimit: 0,
  decimalNumbers: true,
  dateStrings: true // Return date/datetime as formatted strings (YYYY-MM-DD HH:mm:ss)
};

const pool = mysql.createPool(poolConfig);

// Test database connection on startup
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log(`[DB] Connected successfully to MySQL database "${poolConfig.database}" at ${poolConfig.host}:${poolConfig.port}`);
    connection.release();
  } catch (error) {
    console.error('[DB] Connection error:', error.message);
  }
}

testConnection();

module.exports = pool;

