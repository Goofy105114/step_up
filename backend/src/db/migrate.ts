import fs from 'fs';
import path from 'path';
import pool from './pool';

const migrations = [
  { id: '2026-01-stepup-fit-research', file: 'stepup-fit-research-migration.sql' },
  { id: '2026-02-razorpay-checkout', file: 'razorpay-checkout-migration.sql' },
  { id: '2026-11-store-settings', file: 'store-settings-migration.sql' },
  { id: '2026-11-supabase-public-privileges', file: 'supabase-public-privileges-migration.sql' },
  { id: '2026-11-transactional-email-outbox', file: 'transactional-email-outbox-migration.sql' },
];

async function main() {
  const db = await pool.connect();
  try {
    // Bootstrap any missing core tables first. The base schema uses CREATE IF NOT EXISTS
    // and idempotent trigger setup; additive migrations below cover newer features.
    const baseSchemaPath = path.resolve(process.cwd(), 'src', 'db', 'schema.sql');
    if (!fs.existsSync(baseSchemaPath)) throw new Error(`Base schema file not found: ${baseSchemaPath}`);
    await db.query(fs.readFileSync(baseSchemaPath, 'utf8'));
    
    await db.query(`
      CREATE TABLE IF NOT EXISTS stepup_schema_migrations (
        id VARCHAR(160) PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    const core = await db.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = current_schema()
        AND table_name = ANY($1::text[])
    `, [['users', 'products', 'product_variants', 'orders', 'order_items']]);
    const present = new Set(core.rows.map((row: { table_name: string }) => row.table_name));
    const missing = ['users', 'products', 'product_variants', 'orders', 'order_items'].filter(name => !present.has(name));
    if (missing.length) {
      throw new Error(`Base STEPUP schema is incomplete (missing: ${missing.join(', ')}). Review the database before running migrations.`);
    }

    for (const migration of migrations) {
      const applied = await db.query('SELECT id FROM stepup_schema_migrations WHERE id=$1', [migration.id]);
      if (applied.rowCount) {
        console.log(`[migrate] already applied: ${migration.id}`);
        continue;
      }
      const filePath = path.resolve(process.cwd(), 'src', 'db', migration.file);
      if (!fs.existsSync(filePath)) throw new Error(`Migration file not found: ${filePath}`);
      console.log(`[migrate] applying: ${migration.id}`);
      await db.query(fs.readFileSync(filePath, 'utf8'));
      await db.query('INSERT INTO stepup_schema_migrations (id) VALUES ($1) ON CONFLICT (id) DO NOTHING', [migration.id]);
      console.log(`[migrate] applied: ${migration.id}`);
    }
    console.log('[migrate] additive database migrations completed');
  } finally {
    db.release();
    await pool.end();
  }
}

main().catch(async error => {
  console.error('[migrate] failed:', error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
