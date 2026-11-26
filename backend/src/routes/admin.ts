import { Router, Request, Response } from 'express';
import pool, { query } from '../db/pool';
import { authenticate, authorize } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const router = Router();
router.use(authenticate, authorize('admin', 'staff'));

/* ── Dashboard ───────────────────────────────────────────────────────── */
router.get('/dashboard', async (_req: Request, res: Response) => {
  const [orders, revenue, users, products] = await Promise.all([
    query(`SELECT COUNT(*) AS total,
                  COUNT(*) FILTER (WHERE status='pending') AS pending,
                  COUNT(*) FILTER (WHERE status='delivered') AS delivered FROM orders`),
    query(`SELECT COALESCE(SUM(total_amount),0) AS total,
                  COALESCE(SUM(total_amount) FILTER (WHERE created_at>NOW()-INTERVAL '30 days'),0) AS last_30d
           FROM orders WHERE payment_status='paid'`),
    query(`SELECT COUNT(*) AS total,
                  COUNT(*) FILTER (WHERE created_at>NOW()-INTERVAL '7 days') AS new_this_week FROM users`),
    query(`SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE is_active=true) AS active FROM products`),
  ]);
  const topProducts = await query(
    `SELECT p.name,p.slug,SUM(oi.quantity) AS sold,SUM(oi.total_price) AS revenue
     FROM order_items oi
     JOIN products p ON oi.product_id=p.id
     JOIN orders o ON oi.order_id=o.id
     WHERE o.payment_status='paid'
     GROUP BY p.id ORDER BY sold DESC LIMIT 5`);
  return res.json({ success: true, data: {
    orders: orders.rows[0], revenue: revenue.rows[0],
    users: users.rows[0], products: products.rows[0],
    top_products: topProducts.rows,
  }});
});

/* ── Orders ──────────────────────────────────────────────────────────── */
router.get('/orders', async (req: Request, res: Response) => {
  const { status, page = '1', limit = '20' } = req.query as Record<string, string>;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  const conditions: string[] = [];
  const params: unknown[] = [];
  if (status) { conditions.push(`o.status=$${params.length + 1}`); params.push(status); }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  params.push(parseInt(limit), offset);
  const result = await query(
    `SELECT o.*,u.email,u.first_name,u.last_name FROM orders o
     LEFT JOIN users u ON o.user_id=u.id ${where}
     ORDER BY o.created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params);
  return res.json({ success: true, data: result.rows });
});

router.patch('/orders/:id/status', async (req: Request, res: Response) => {
  const { status, note, tracking_number } = req.body;
  const allowedStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'out_for_delivery', 'delivered', 'cancelled', 'refunded', 'returned'];
  if (!allowedStatuses.includes(status)) throw new AppError('Invalid order status', 400);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const orderRes = await client.query('SELECT * FROM orders WHERE id=$1 FOR UPDATE', [req.params.id]);
    const order = orderRes.rows[0];
    if (!order) throw new AppError('Order not found', 404);
    if (status === 'cancelled' && order.payment_status === 'paid') {
      throw new AppError('Refund the payment through the payment provider before cancelling this order.', 409);
    }
    if (status === 'refunded') {
      throw new AppError('Refund status must be confirmed by the payment provider integration.', 409);
    }

    const updates = ['status=$1', 'updated_at=NOW()'];
    const params: unknown[] = [status];
    let pIdx = 2;
    if (tracking_number !== undefined) {
      updates.push(`tracking_number=$${pIdx++}`);
      params.push(tracking_number || null);
    }
    if (status === 'delivered') updates.push('delivered_at=COALESCE(delivered_at,NOW())');
    params.push(req.params.id);
    await client.query(`UPDATE orders SET ${updates.join(',')} WHERE id=$${pIdx}`, params);
    await client.query('INSERT INTO order_status_history (order_id,status,note,created_by) VALUES ($1,$2,$3,$4)',
      [req.params.id, status, note || null, req.user!.userId]);

    if (status === 'cancelled' && order.status !== 'cancelled') {
      const items = await client.query('SELECT * FROM order_items WHERE order_id=$1', [req.params.id]);
      for (const item of items.rows) {
        await client.query('UPDATE product_variants SET stock_qty=stock_qty+$1 WHERE id=$2',
          [item.quantity, item.variant_id]);
      }
    }

    await client.query('COMMIT');
    return res.json({ success: true, message: 'Order status updated' });
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
});

/* ── Products ────────────────────────────────────────────────────────── */
router.get('/products', async (_req: Request, res: Response) => {
  const result = await query(
    `SELECT p.*,c.name AS category_name,
      (SELECT url FROM product_images WHERE product_id=p.id AND is_primary=true LIMIT 1) AS primary_image,
      (SELECT COALESCE(SUM(pv.stock_qty),0) FROM product_variants pv WHERE pv.product_id=p.id) AS total_stock
     FROM products p LEFT JOIN categories c ON p.category_id=c.id ORDER BY p.created_at DESC`);
  return res.json({ success: true, data: result.rows });
});

router.get('/products/:id', async (req: Request, res: Response) => {
  const result = await query(
    `SELECT p.*,c.name AS category_name,
      (SELECT json_agg(json_build_object(
        'id',pi.id,'url',pi.url,'alt_text',pi.alt_text,'is_primary',pi.is_primary,'sort_order',pi.sort_order
      ) ORDER BY pi.sort_order) FROM product_images pi WHERE pi.product_id=p.id) AS images,
      (SELECT json_agg(json_build_object(
        'id',pv.id,'size',pv.size,'color',pv.color,'color_hex',pv.color_hex,
        'stock_qty',pv.stock_qty,'price_adj',pv.price_adj,'sku',pv.sku
      ) ORDER BY pv.size,pv.color) FROM product_variants pv WHERE pv.product_id=p.id) AS variants
     FROM products p LEFT JOIN categories c ON p.category_id=c.id WHERE p.id=$1`,
    [req.params.id]);
  if (!result.rows[0]) throw new AppError('Product not found', 404);
  return res.json({ success: true, data: result.rows[0] });
});

router.post('/products', async (req: Request, res: Response) => {
  const { name, slug, description, short_description, category_id, base_price, sale_price, sku,
          material, care_instructions, arch_support_level, arch_height_mm, durometer_shore_a,
          calibration_reference, calibrated_at, calibration_notes, tags, is_featured, is_new_arrival, is_bestseller } = req.body;
  const parsedBasePrice = Number(base_price);
  const parsedSalePrice = sale_price === undefined || sale_price === null || sale_price === '' ? null : Number(sale_price);
  if (!String(name || '').trim() || !String(slug || '').trim() || !Number.isFinite(parsedBasePrice) || parsedBasePrice <= 0) {
    throw new AppError('Name, slug and a positive base price are required', 400);
  }
  if (parsedSalePrice !== null && (!Number.isFinite(parsedSalePrice) || parsedSalePrice <= 0 || parsedSalePrice > parsedBasePrice)) {
    throw new AppError('Sale price must be positive and cannot exceed the base price', 400);
  }
  if (arch_support_level && !['low', 'medium', 'high'].includes(arch_support_level)) throw new AppError('Invalid arch support level', 400);
  if (arch_height_mm !== undefined && arch_height_mm !== null && arch_height_mm !== '' && (!Number.isFinite(Number(arch_height_mm)) || Number(arch_height_mm) <= 0)) throw new AppError('Arch height must be a positive number of millimetres', 400);
  if (durometer_shore_a !== undefined && durometer_shore_a !== null && durometer_shore_a !== '' && (!Number.isFinite(Number(durometer_shore_a)) || Number(durometer_shore_a) < 0 || Number(durometer_shore_a) > 100)) throw new AppError('Durometer must be between 0 and 100 Shore A', 400);
  const result = await query(
    `INSERT INTO products (name,slug,description,short_description,category_id,base_price,sale_price,sku,
                           material,care_instructions,arch_support_level,arch_height_mm,durometer_shore_a,
                           calibration_reference,calibrated_at,calibration_notes,tags,is_featured,is_new_arrival,is_bestseller)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20) RETURNING *`,
    [name, slug, description || null, short_description || null, category_id || null,
     base_price, sale_price || null, sku || null, material || null, care_instructions || null,
     arch_support_level || null, arch_height_mm === '' ? null : arch_height_mm ?? null, durometer_shore_a === '' ? null : durometer_shore_a ?? null,
     calibration_reference || null, calibrated_at || null, calibration_notes || null, tags || [],
     is_featured || false, is_new_arrival || false, is_bestseller || false]);
  return res.status(201).json({ success: true, data: result.rows[0] });
});

router.patch('/products/:id', async (req: Request, res: Response) => {
  const fields = ['name','slug','description','short_description','category_id','base_price',
                  'sale_price','sku','is_active','is_featured','is_new_arrival','is_bestseller','material','care_instructions','arch_support_level','arch_height_mm','durometer_shore_a','calibration_reference','calibrated_at','calibration_notes','tags'];
  const updates: string[] = [];
  const params: unknown[] = [];
  let pIdx = 1;
  for (const f of fields) {
    if (req.body[f] !== undefined) { updates.push(`${f}=$${pIdx++}`); params.push(req.body[f]); }
  }
  if (req.body.base_price !== undefined && (!Number.isFinite(Number(req.body.base_price)) || Number(req.body.base_price) <= 0)) throw new AppError('Base price must be a positive number', 400);
  if (req.body.sale_price !== undefined && req.body.sale_price !== null && req.body.sale_price !== '' && (!Number.isFinite(Number(req.body.sale_price)) || Number(req.body.sale_price) <= 0)) throw new AppError('Sale price must be a positive number', 400);
  if (req.body.base_price !== undefined || req.body.sale_price !== undefined) {
    const current = await query('SELECT base_price,sale_price FROM products WHERE id=$1',[req.params.id]);
    if (!current.rows[0]) throw new AppError('Product not found',404);
    const nextBase = req.body.base_price !== undefined ? Number(req.body.base_price) : Number(current.rows[0].base_price);
    const nextSaleRaw = req.body.sale_price !== undefined ? req.body.sale_price : current.rows[0].sale_price;
    const nextSale = nextSaleRaw === null || nextSaleRaw === '' ? null : Number(nextSaleRaw);
    if (nextSale !== null && (!Number.isFinite(nextSale) || nextSale <= 0 || nextSale > nextBase)) throw new AppError('Sale price must be positive and cannot exceed the base price',400);
  }
  if (req.body.arch_support_level !== undefined && req.body.arch_support_level !== null && !['low', 'medium', 'high'].includes(req.body.arch_support_level)) throw new AppError('Invalid arch support level', 400);
  if (req.body.arch_height_mm !== undefined && req.body.arch_height_mm !== null && req.body.arch_height_mm !== '' && (!Number.isFinite(Number(req.body.arch_height_mm)) || Number(req.body.arch_height_mm) <= 0)) throw new AppError('Arch height must be a positive number of millimetres', 400);
  if (req.body.durometer_shore_a !== undefined && req.body.durometer_shore_a !== null && req.body.durometer_shore_a !== '' && (!Number.isFinite(Number(req.body.durometer_shore_a)) || Number(req.body.durometer_shore_a) < 0 || Number(req.body.durometer_shore_a) > 100)) throw new AppError('Durometer must be between 0 and 100 Shore A', 400);
  if (!updates.length) throw new AppError('No fields to update', 400);
  params.push(req.params.id);
  const result = await query(
    `UPDATE products SET ${updates.join(',')},updated_at=NOW() WHERE id=$${pIdx} RETURNING *`, params);
  return res.json({ success: true, data: result.rows[0] });
});

/* ── Variants ────────────────────────────────────────────────────────── */
router.post('/products/:id/variants', async (req: Request, res: Response) => {
  const { size, color, color_hex, stock_qty, price_adj, sku } = req.body;
  if (!String(size || '').trim() || !String(color || '').trim()) throw new AppError('Size and color required', 400);
  const parsedStock = stock_qty === undefined ? 0 : Number(stock_qty);
  const parsedAdjustment = price_adj === undefined ? 0 : Number(price_adj);
  if (!Number.isInteger(parsedStock) || parsedStock < 0) throw new AppError('Stock quantity must be a non-negative whole number', 400);
  if (!Number.isFinite(parsedAdjustment)) throw new AppError('Price adjustment must be a valid number', 400);
  if (color_hex && !/^#[0-9a-fA-F]{6}$/.test(color_hex)) throw new AppError('Color must use a six-digit hex value', 400);
  const product = await query('SELECT COALESCE(sale_price,base_price) AS price FROM products WHERE id=$1',[req.params.id]);
  if (!product.rows[0]) throw new AppError('Product not found',404);
  if (Number(product.rows[0].price) + parsedAdjustment <= 0) throw new AppError('Variant price must remain above zero',400);
  const result = await query(
    `INSERT INTO product_variants (product_id,size,color,color_hex,stock_qty,price_adj,sku)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [req.params.id, String(size).trim(), String(color).trim(), color_hex || null, parsedStock, parsedAdjustment, sku || null]);
  return res.status(201).json({ success: true, data: result.rows[0] });
});

router.patch('/products/:id/variants/:variantId', async (req: Request, res: Response) => {
  const { stock_qty, price_adj, sku, size, color, color_hex } = req.body;
  const fields: Record<string, unknown> = { stock_qty, price_adj, sku, size, color, color_hex };
  const updates: string[] = [];
  const params: unknown[] = [];
  let pIdx = 1;
  for (const [k, v] of Object.entries(fields)) {
    if (v !== undefined) { updates.push(`${k}=$${pIdx++}`); params.push(v); }
  }
  if (!updates.length) throw new AppError('No fields to update', 400);
  if (stock_qty !== undefined && (!Number.isInteger(Number(stock_qty)) || Number(stock_qty) < 0)) throw new AppError('Stock quantity must be a non-negative whole number',400);
  if (price_adj !== undefined && !Number.isFinite(Number(price_adj))) throw new AppError('Price adjustment must be a valid number',400);
  if (size !== undefined && !String(size).trim()) throw new AppError('Size cannot be empty',400);
  if (color !== undefined && !String(color).trim()) throw new AppError('Color cannot be empty',400);
  if (color_hex !== undefined && color_hex !== null && !/^#[0-9a-fA-F]{6}$/.test(color_hex)) throw new AppError('Color must use a six-digit hex value',400);
  const existing = await query(`SELECT pv.price_adj,pv.size,pv.color,pv.color_hex,COALESCE(p.sale_price,p.base_price) AS price
    FROM product_variants pv JOIN products p ON p.id=pv.product_id WHERE pv.id=$1 AND pv.product_id=$2`,
    [req.params.variantId,req.params.id]);
  if (!existing.rows[0]) throw new AppError('Product variant not found',404);
  const finalAdjustment = price_adj === undefined ? Number(existing.rows[0].price_adj) : Number(price_adj);
  if (Number(existing.rows[0].price) + finalAdjustment <= 0) throw new AppError('Variant price must remain above zero',400);
  params.push(req.params.variantId, req.params.id);
  const result = await query(
    `UPDATE product_variants SET ${updates.join(',')} WHERE id=${pIdx} AND product_id=${pIdx+1} RETURNING *`, params);
  return res.json({ success: true, data: result.rows[0] });
});

router.delete('/products/:id/variants/:variantId', async (req: Request, res: Response) => {
  await query('DELETE FROM product_variants WHERE id=$1 AND product_id=$2',
    [req.params.variantId, req.params.id]);
  return res.json({ success: true });
});

/* ── Product Images ──────────────────────────────────────────────────── */
router.post('/products/:id/images', async (req: Request, res: Response) => {
  const { url, alt_text, is_primary, sort_order } = req.body;
  if (typeof url !== 'string' || !url.trim()) throw new AppError('Image URL required', 400);
  if (!isHttpsUrl(url)) throw new AppError('Product image URL must use HTTPS',400);
  const product = await query('SELECT id FROM products WHERE id=$1',[req.params.id]);
  if (!product.rows[0]) throw new AppError('Product not found',404);
  if (sort_order !== undefined && (!Number.isInteger(Number(sort_order)) || Number(sort_order) < 0)) throw new AppError('Image sort order must be a non-negative whole number',400);
  if (is_primary) {
    await query('UPDATE product_images SET is_primary=false WHERE product_id=$1', [req.params.id]);
  }
  const existing = await query(
    'SELECT id FROM product_images WHERE product_id=$1 AND is_primary=true', [req.params.id]);
  const setAsPrimary = is_primary || existing.rows.length === 0;
  const result = await query(
    `INSERT INTO product_images (product_id,url,alt_text,is_primary,sort_order)
     VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [req.params.id, url, alt_text || null, setAsPrimary, sort_order || 0]);
  return res.status(201).json({ success: true, data: result.rows[0] });
});

router.delete('/products/:id/images/:imageId', async (req: Request, res: Response) => {
  await query('DELETE FROM product_images WHERE id=$1 AND product_id=$2',
    [req.params.imageId, req.params.id]);
  return res.json({ success: true });
});

/* ── Users ───────────────────────────────────────────────────────────── */
router.get('/users', authorize('admin'), async (_req: Request, res: Response) => {
  const result = await query(
    `SELECT u.id,u.email,u.first_name,u.last_name,u.role,u.created_at,
      COUNT(o.id) AS order_count,
      COALESCE(SUM(o.total_amount),0) AS lifetime_value
     FROM users u LEFT JOIN orders o ON o.user_id=u.id AND o.payment_status='paid'
     GROUP BY u.id ORDER BY u.created_at DESC`);
  return res.json({ success: true, data: result.rows });
});

/* ── Clinical source library ───────────────────────────────────────── */
const isHttpsUrl = (value: unknown) => {
  if (typeof value !== 'string' || !value.trim()) return false;
  try { return new URL(value).protocol === 'https:'; } catch { return false; }
};

router.get('/clinical-studies', authorize('admin'), async (_req: Request, res: Response) => {
  const result = await query(
    'SELECT * FROM clinical_studies ORDER BY created_at DESC');
  return res.json({ success: true, data: result.rows });
});

router.post('/clinical-studies', authorize('admin'), async (req: Request, res: Response) => {
  const { title, authors, publication, publication_date, doi, source_url, document_url,
    summary, source_verified = false, is_published = false } = req.body;
  if (!String(title || '').trim()) throw new AppError('Study title is required', 400);
  if (!isHttpsUrl(source_url)) throw new AppError('A valid HTTPS source URL is required', 400);
  if (document_url && !isHttpsUrl(document_url)) throw new AppError('Document URL must use HTTPS', 400);
  if (is_published && !source_verified) {
    throw new AppError('Verify the original source before publishing this entry', 400);
  }
  const result = await query(
    `INSERT INTO clinical_studies
      (title,authors,publication,publication_date,doi,source_url,document_url,summary,source_verified,is_published,created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
    [String(title).trim(), authors || null, publication || null, publication_date || null, doi || null,
      source_url, document_url || null, summary || null, Boolean(source_verified), Boolean(is_published), req.user!.userId]);
  return res.status(201).json({ success: true, data: result.rows[0] });
});

router.patch('/clinical-studies/:id', authorize('admin'), async (req: Request, res: Response) => {
  const current = await query('SELECT * FROM clinical_studies WHERE id=$1', [req.params.id]);
  if (!current.rows[0]) throw new AppError('Clinical study not found', 404);
  const merged = { ...current.rows[0], ...req.body };
  if (!String(merged.title || '').trim()) throw new AppError('Study title is required', 400);
  if (!isHttpsUrl(merged.source_url)) throw new AppError('A valid HTTPS source URL is required', 400);
  if (merged.document_url && !isHttpsUrl(merged.document_url)) throw new AppError('Document URL must use HTTPS', 400);
  if (merged.is_published && !merged.source_verified) {
    throw new AppError('Verify the original source before publishing this entry', 400);
  }
  const fields = ['title','authors','publication','publication_date','doi','source_url','document_url','summary','source_verified','is_published'];
  const updates: string[] = [];
  const params: unknown[] = [];
  let pIdx = 1;
  for (const field of fields) {
    if (req.body[field] !== undefined) {
      updates.push(`${field}=${pIdx++}`);
      params.push(req.body[field]);
    }
  }
  if (!updates.length) throw new AppError('No fields to update', 400);
  updates.push('updated_at=NOW()');
  params.push(req.params.id);
  const result = await query(
    `UPDATE clinical_studies SET ${updates.join(',')} WHERE id=${pIdx} RETURNING *`, params);
  return res.json({ success: true, data: result.rows[0] });
});

router.delete('/clinical-studies/:id', authorize('admin'), async (req: Request, res: Response) => {
  const result = await query('DELETE FROM clinical_studies WHERE id=$1 RETURNING id', [req.params.id]);
  if (!result.rows[0]) throw new AppError('Clinical study not found', 404);
  return res.json({ success: true });
});

/* ── Laboratory settings ────────────────────────────────────────────── */
const validSettingKey = (value: unknown) =>
  typeof value === 'string' && /^[a-zA-Z0-9_.-]{2,120}$/.test(value);

router.get('/lab-settings', authorize('admin'), async (_req: Request, res: Response) => {
  const result = await query('SELECT * FROM lab_settings ORDER BY setting_key ASC');
  return res.json({ success: true, data: result.rows });
});

router.post('/lab-settings', authorize('admin'), async (req: Request, res: Response) => {
  const { setting_key, setting_value, description } = req.body;
  if (!validSettingKey(setting_key)) throw new AppError('Setting key must be 2–120 letters, numbers, dots, underscores or hyphens', 400);
  if (!setting_value || typeof setting_value !== 'object' || Array.isArray(setting_value)) {
    throw new AppError('Setting value must be a JSON object', 400);
  }
  const result = await query(
    `INSERT INTO lab_settings (setting_key,setting_value,description,updated_by)
     VALUES ($1,$2,$3,$4) RETURNING *`,
    [setting_key, JSON.stringify(setting_value), description || null, req.user!.userId]);
  return res.status(201).json({ success: true, data: result.rows[0] });
});

router.patch('/lab-settings/:id', authorize('admin'), async (req: Request, res: Response) => {
  const fields = ['setting_value','description'];
  const updates: string[] = [];
  const params: unknown[] = [];
  let pIdx = 1;
  if (req.body.setting_value !== undefined) {
    if (!req.body.setting_value || typeof req.body.setting_value !== 'object' || Array.isArray(req.body.setting_value)) {
      throw new AppError('Setting value must be a JSON object', 400);
    }
    updates.push(`setting_value=${pIdx++}`);
    params.push(JSON.stringify(req.body.setting_value));
  }
  if (req.body.description !== undefined) {
    updates.push(`description=${pIdx++}`);
    params.push(req.body.description || null);
  }
  if (!updates.length) throw new AppError('No fields to update', 400);
  updates.push('updated_at=NOW()');
  updates.push(`updated_by=${pIdx++}`);
  params.push(req.user!.userId);
  params.push(req.params.id);
  const result = await query(
    `UPDATE lab_settings SET ${updates.join(',')} WHERE id=${pIdx} RETURNING *`, params);
  if (!result.rows[0]) throw new AppError('Lab setting not found', 404);
  return res.json({ success: true, data: result.rows[0] });
});

router.delete('/lab-settings/:id', authorize('admin'), async (req: Request, res: Response) => {
  const result = await query('DELETE FROM lab_settings WHERE id=$1 RETURNING id', [req.params.id]);
  if (!result.rows[0]) throw new AppError('Lab setting not found', 404);
  return res.json({ success: true });
});

/* ── Self-reported fit profiles ─────────────────────────────────────── */
router.get('/patient-fit-profiles', authorize('admin'), async (_req: Request, res: Response) => {
  const result = await query(
    `SELECT p.id,p.user_id,p.foot_length_mm,p.usual_size,p.arch_preference,p.comfort_focus,
       p.daily_activity,p.consent_at,p.updated_at,u.first_name,u.last_name,u.email
     FROM patient_fit_profiles p
     JOIN users u ON u.id=p.user_id
     ORDER BY p.updated_at DESC`);
  return res.json({ success: true, data: result.rows });
});

/* ── Fit profile operations summary ─────────────────────────────────── */
router.get('/fit-operations', authorize('admin'), async (_req: Request, res: Response) => {
  const [totals, archPreferences, comfortFocus, recent] = await Promise.all([
    query(`SELECT COUNT(*)::int AS total_profiles,
             COUNT(foot_length_mm)::int AS profiles_with_measurements
           FROM patient_fit_profiles`),
    query(`SELECT arch_preference AS label, COUNT(*)::int AS count
           FROM patient_fit_profiles WHERE arch_preference IS NOT NULL
           GROUP BY arch_preference ORDER BY count DESC`),
    query(`SELECT comfort_focus AS label, COUNT(*)::int AS count
           FROM patient_fit_profiles WHERE comfort_focus IS NOT NULL
           GROUP BY comfort_focus ORDER BY count DESC`),
    query(`SELECT p.id,p.foot_length_mm,p.usual_size,p.arch_preference,p.comfort_focus,p.updated_at,
             u.first_name,u.last_name
           FROM patient_fit_profiles p JOIN users u ON u.id=p.user_id
           ORDER BY p.updated_at DESC LIMIT 8`)
  ]);
  return res.json({ success: true, data: {
    totals: totals.rows[0],
    arch_preferences: archPreferences.rows,
    comfort_focus: comfortFocus.rows,
    recent_profiles: recent.rows
  }});
});


router.get('/return-requests', async (_req: Request, res: Response) => {
  const result = await query(
    `SELECT rr.*,o.order_number,o.total_amount,o.status AS order_status,
       u.email,u.first_name,u.last_name
     FROM return_requests rr
     JOIN orders o ON o.id=rr.order_id
     LEFT JOIN users u ON u.id=rr.user_id
     ORDER BY rr.created_at DESC`);
  return res.json({ success: true, data: result.rows });
});

router.patch('/return-requests/:id', async (req: Request, res: Response) => {
  const { status, admin_note } = req.body;
  if (!['approved','rejected','received'].includes(status)) {
    throw new AppError('Choose approved, rejected or received', 400);
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const current = await client.query('SELECT * FROM return_requests WHERE id=$1 FOR UPDATE', [req.params.id]);
    const request = current.rows[0];
    if (!request) throw new AppError('Return request not found', 404);
    const transitions: Record<string, string[]> = {
      requested: ['approved','rejected'],
      approved: ['received'],
      received: [],
      rejected: [],
    };
    if (!transitions[request.status]?.includes(status)) {
      throw new AppError('This return request cannot move to that status', 409);
    }
    const updated = await client.query(
      `UPDATE return_requests SET status=$1,admin_note=$2,reviewed_by=$3,reviewed_at=NOW(),updated_at=NOW()
       WHERE id=$4 RETURNING *`,
      [status, admin_note || null, req.user!.userId, req.params.id]);
    await client.query(
      'INSERT INTO order_status_history (order_id,status,note,created_by) VALUES ($1,$2,$3,$4)',
      [request.order_id, 'delivered', `Return request ${status}: ${admin_note || 'No additional note'}`, req.user!.userId]);
    await client.query('COMMIT');
    return res.json({ success: true, data: updated.rows[0] });
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
});

export default router;
