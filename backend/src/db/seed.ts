import fs from 'fs';
import path from 'path';
import pool from './pool';

async function main() {
  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_PRODUCTION_SEED !== 'true') {
    throw new Error('Production seeding is disabled by default. Take a database backup and explicitly set ALLOW_PRODUCTION_SEED=true before running this command.');
  }

  const db = await pool.connect();
  try {
    const core = await db.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = current_schema()
        AND table_name = ANY($1::text[])
    `, [['categories', 'products', 'product_variants', 'coupons']]);
    const present = new Set(core.rows.map((row: { table_name: string }) => row.table_name));
    const missing = ['categories', 'products', 'product_variants', 'coupons'].filter(name => !present.has(name));
    if (missing.length) throw new Error(`Cannot seed: base schema tables are missing: ${missing.join(', ')}`);

    const filePath = path.resolve(process.cwd(), 'src', 'db', 'seed.sql');
    await db.query(fs.readFileSync(filePath, 'utf8'));
    console.log('[seed] starter catalogue inserted where missing; existing products and inventory were not overwritten');
  } finally {
    db.release();
    await pool.end();
  }
}

main().catch(async error => {
  console.error('[seed] failed:', error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
