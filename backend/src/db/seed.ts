import fs from 'fs';
import path from 'path';
import pool from './pool';

async function main() {
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
    const sql = fs.readFileSync(filePath, 'utf8');
    await db.query(sql);
    console.log('[seed] idempotent starter catalogue applied; image records are intentionally not created');
  } finally {
    db.release();
    await pool.end();
  }
}

main().catch(async error => {
  console.error('[seed] failed:', error instanceof Error ? error.message : error);
  await pool.end();
  process.exitCode = 1;
});
