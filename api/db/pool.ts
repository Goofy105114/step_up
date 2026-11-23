import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

/**
 * Single pool — works everywhere with one DATABASE_URL:
 *
 *   Local dev:  DATABASE_URL=postgresql://goofy@localhost/footwear_db
 *   Supabase:   DATABASE_URL=postgresql://postgres:[password]@db.[ref].supabase.co:5432/postgres
 *   Render PG:  DATABASE_URL=postgresql://...  (auto-injected by Render)
 *
 * SSL is auto-enabled for Supabase and any URL with sslmode=require.
 */

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    'DATABASE_URL is not set.\n' +
    '  Local:    add DATABASE_URL=postgresql://USER@localhost/footwear_db to api/.env\n' +
    '  Render:   set DATABASE_URL in Dashboard → Environment\n' +
    '  Supabase: copy the "Connection string" from Project Settings → Database'
  );
}

const needsSSL =
  connectionString.includes('supabase.co') ||
  connectionString.includes('sslmode=require') ||
  connectionString.includes('render.com');

const pool = new Pool({
  connectionString,
  ssl: needsSSL ? { rejectUnauthorized: false } : false,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

pool.on('error', (err: Error) => {
  console.error('[DB] Pool error:', err.message);
});

export const query = (text: string, params?: unknown[]) => pool.query(text, params);
export default pool;
