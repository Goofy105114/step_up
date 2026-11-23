import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME     || 'footwear_db',
  user:     process.env.DB_USER     || 'goofy',
  password: process.env.DB_PASSWORD || undefined,   // undefined = trust auth (no password)
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('connect', () => {
  // silent – connection established
});

pool.on('error', (err) => {
  console.error('PostgreSQL pool error:', err.message);
});

export const query = (text: string, params?: unknown[]) => pool.query(text, params);
export default pool;
