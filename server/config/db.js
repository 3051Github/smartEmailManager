import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const pool = mysql.createPool({
  host:            process.env.DB_HOST     || 'localhost',
  port:            parseInt(process.env.DB_PORT || '3306'),
  user:            process.env.DB_USER     || 'root',
  password:        process.env.DB_PASS     || '',
  database:        process.env.DB_NAME     || 'smart_email_manager',
  waitForConnections: true,
  connectionLimit:    10,
  charset:         'utf8mb4',
  timezone:        '+01:00',
});

export async function query(sql, params = []) {
  const [rows] = await pool.execute(sql, params);
  return rows;
}

export async function scalar(sql, params = []) {
  const [rows] = await pool.execute(sql, params);
  if (!rows.length) return null;
  return Object.values(rows[0])[0];
}

export async function queryOne(sql, params = []) {
  const [rows] = await pool.execute(sql, params);
  return rows[0] || null;
}

export async function insert(sql, params = []) {
  const [result] = await pool.execute(sql, params);
  return result.insertId;
}

export async function update(sql, params = []) {
  const [result] = await pool.execute(sql, params);
  return result.affectedRows;
}

export default pool;
