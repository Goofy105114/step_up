import pool, { query } from './pool';

async function main() {
  try {
    const tables = await query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = current_schema()
        AND table_name = ANY($1::text[])
    `, [['users','categories','products','product_variants','product_images','orders','order_items','clinical_studies','lab_settings','patient_fit_profiles','return_requests','store_settings','stepup_schema_migrations']]);
    const found = new Set(tables.rows.map((row: { table_name: string }) => row.table_name));
    const required = ['users','categories','products','product_variants','product_images','orders','order_items','clinical_studies','lab_settings','patient_fit_profiles','return_requests','store_settings','stepup_schema_migrations'];
    const missing = required.filter(name => !found.has(name));
    if (missing.length) throw new Error(`Missing tables: ${missing.join(', ')}`);

    const publicAccess = await query(`
      SELECT
        (SELECT COUNT(*)::int FROM pg_tables
          WHERE schemaname='public' AND rowsecurity = false) AS tables_without_rls,
        (SELECT COUNT(*)::int FROM pg_class c
          JOIN pg_namespace n ON n.oid=c.relnamespace
          WHERE n.nspname='public' AND c.relkind='r'
            AND (
              has_table_privilege('anon', c.oid, 'SELECT') OR
              has_table_privilege('anon', c.oid, 'INSERT') OR
              has_table_privilege('anon', c.oid, 'UPDATE') OR
              has_table_privilege('anon', c.oid, 'DELETE') OR
              has_table_privilege('anon', c.oid, 'TRUNCATE') OR
              has_table_privilege('anon', c.oid, 'REFERENCES') OR
              has_table_privilege('anon', c.oid, 'TRIGGER') OR
              has_table_privilege('authenticated', c.oid, 'SELECT') OR
              has_table_privilege('authenticated', c.oid, 'INSERT') OR
              has_table_privilege('authenticated', c.oid, 'UPDATE') OR
              has_table_privilege('authenticated', c.oid, 'DELETE') OR
              has_table_privilege('authenticated', c.oid, 'TRUNCATE') OR
              has_table_privilege('authenticated', c.oid, 'REFERENCES') OR
              has_table_privilege('authenticated', c.oid, 'TRIGGER')
            )) AS tables_with_client_role_privileges,
        (SELECT COUNT(*)::int FROM pg_class c
          JOIN pg_namespace n ON n.oid=c.relnamespace
          WHERE n.nspname='public' AND c.relkind='S'
            AND (has_sequence_privilege('anon', c.oid, 'USAGE,SELECT,UPDATE')
              OR has_sequence_privilege('authenticated', c.oid, 'USAGE,SELECT,UPDATE'))) AS sequences_with_client_role_privileges,
        (SELECT COUNT(*)::int FROM pg_proc p
          JOIN pg_namespace n ON n.oid=p.pronamespace
          WHERE n.nspname='public'
            AND (has_function_privilege('anon', p.oid, 'EXECUTE')
              OR has_function_privilege('authenticated', p.oid, 'EXECUTE'))) AS functions_with_client_role_execute
    `);
    const access = publicAccess.rows[0];
    if (
      access.tables_without_rls > 0 ||
      access.tables_with_client_role_privileges > 0 ||
      access.sequences_with_client_role_privileges > 0 ||
      access.functions_with_client_role_execute > 0
    ) {
      throw new Error(`Public schema access hardening failed: ${JSON.stringify(access)}`);
    }
    console.log('[verify] public schema: RLS enabled and anon/authenticated direct privileges revoked');

    const pricing = await query(
      "SELECT setting_value FROM store_settings WHERE setting_key='checkout_pricing'"
    );
    const pricingValue = pricing.rows[0]?.setting_value;
    if (
      !pricingValue ||
      !Number.isFinite(Number(pricingValue.free_shipping_threshold_inr)) ||
      !Number.isFinite(Number(pricingValue.shipping_fee_inr)) ||
      !Number.isFinite(Number(pricingValue.gst_rate_percent))
    ) throw new Error('Checkout pricing settings are missing or invalid');

    const columns = await query(`
      SELECT table_name, column_name FROM information_schema.columns
      WHERE table_schema = current_schema()
        AND ((table_name='orders' AND column_name IN ('payment_intent_id','payment_status','payment_method'))
          OR (table_name='products' AND column_name IN ('arch_support_level','arch_height_mm','durometer_shore_a','calibration_reference','calibrated_at','calibration_notes')))
    `);
    const columnKeys = new Set(columns.rows.map((row: { table_name: string; column_name: string }) => `${row.table_name}.${row.column_name}`));
    const requiredColumns = ['orders.payment_intent_id','orders.payment_status','orders.payment_method','products.arch_support_level','products.arch_height_mm','products.durometer_shore_a','products.calibration_reference','products.calibrated_at','products.calibration_notes'];
    const missingColumns = requiredColumns.filter(name => !columnKeys.has(name));
    if (missingColumns.length) throw new Error(`Missing columns: ${missingColumns.join(', ')}`);

    const seeded = await query(`
      SELECT
        (SELECT COUNT(*)::int FROM products WHERE id::text LIKE 'b1000000-0000-0000-0000-%') AS products,
        (SELECT COUNT(*)::int FROM product_variants pv JOIN products p ON p.id=pv.product_id WHERE p.id::text LIKE 'b1000000-0000-0000-0000-%') AS variants,
        (SELECT COUNT(*)::int FROM product_images pi JOIN products p ON p.id=pi.product_id WHERE p.id::text LIKE 'b1000000-0000-0000-0000-%') AS images,
        (SELECT COUNT(*)::int FROM products WHERE id::text LIKE 'b1000000-0000-0000-0000-%' AND (avg_rating <> 0 OR review_count <> 0)) AS fabricated_reviews,
        (SELECT COUNT(*)::int FROM product_variants pv JOIN products p ON p.id=pv.product_id WHERE p.id::text LIKE 'b1000000-0000-0000-0000-%' AND stock_qty <> 0) AS fabricated_stock
    `);
    const row = seeded.rows[0];
    if (row.products < 8 || row.variants < 1) throw new Error('Starter catalogue or size variants were not seeded');
    if (row.images !== 0) throw new Error('Starter products unexpectedly contain placeholder image records');
    if (row.fabricated_reviews !== 0 || row.fabricated_stock !== 0) throw new Error('Starter catalogue contains unverified ratings or inventory');
    console.log(`[verify] OK: ${row.products} products, ${row.variants} variants, no placeholder images, ratings or inventory`);
    console.log('[verify] core, fit/research, returns and payment schema present');
  } finally {
    await pool.end();
  }
}

main().catch(async error => {
  console.error('[verify] failed:', error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
