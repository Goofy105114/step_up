import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

/**
 * Supports:
 *   Local dev  → DB_HOST/DB_PORT/DB_USER/DB_NAME (no password, trust auth)
 *   Supabase   → DATABASE_URL (postgresql://postgres:pass@db.xxx.supabase.co:5432/postgres)
 *   Render PG  → DATABASE_URL (auto-injected)
 */

const connectionString = process.env.DATABASE_URL;

// Supabase direct hosts use *.supabase.co; its poolers use *.pooler.supabase.com.
const isSupabase = Boolean(connectionString && /supabase\.(co|com)/i.test(connectionString));

const pool = new Pool(
  connectionString
    ? {
        connectionString,
        ssl: isSupabase ? { rejectUnauthorized: true } : false,
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
      }
    : {
        // Local fallback using individual env vars
        host:     process.env.DB_HOST     || 'localhost',
        port:     parseInt(process.env.DB_PORT || '5432'),
        database: process.env.DB_NAME     || 'footwear_db',
        user:     process.env.DB_USER     || process.env.USER || 'postgres',
        password: process.env.DB_PASSWORD || undefined,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
      }
);

pool.on('error', (err: Error) => {
  console.error('[DB] Pool error:', err.message);
});

export const query = (text: string, params?: unknown[]) => pool.query(text, params);
export default pool;
