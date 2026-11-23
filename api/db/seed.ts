/**
 * Seed the database with categories, products, variants, images and coupons:
 *   npm run db:seed --prefix api
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { query } from './pool';

async function seed() {
  console.log('🌱 Seeding database…');
  const sql = readFileSync(join(__dirname, 'seed.sql'), 'utf8');
  await query(sql);
  console.log('✅ Seed data inserted.');
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err.message);
  process.exit(1);
});
