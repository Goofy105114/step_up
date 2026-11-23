/**
 * DB pool — single DATABASE_URL works everywhere:
 *   Local dev  → postgresql://goofy@localhost/footwear_db
 *   Neon       → postgresql://user:pass@ep-xxx.neon.tech/footwear_db?sslmode=require
 *   Render     → auto-injected as DATABASE_URL from Render dashboard
 */
import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    'DATABASE_URL is not set.\n' +
    'Local: add it to api/.env\n' +
    'Render: add it in Dashboard → Environment\n' +
    'Vercel: add it in Project → Settings → Environment Variables'
  );
}

const pool = new Pool({
  connectionString,
  ssl: connectionString.includes('neon.tech') || connectionString.includes('sslmode=require')
    ? { rejectUnauthorized: false }
    : false,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

pool.on('error', (err: Error) => {
  console.error('[DB Pool Error]', err.message);
});

export const query = (text: string, params?: unknown[]) => pool.query(text, params);
export default pool;
