/**
 * Run this once to create all tables in your Neon database:
 *   npm run db:migrate --prefix api
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { query } from './pool';

async function migrate() {
  console.log('🏗  Running migrations…');
  const schema = readFileSync(join(__dirname, 'schema.sql'), 'utf8');
  await query(schema);
  console.log('✅ Schema applied.');
}

migrate().catch((err) => {
  console.error('❌ Migration failed:', err.message);
  process.exit(1);
});
