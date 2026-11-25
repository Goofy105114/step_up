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
          material, care_instructions, tags, is_featured, is_new_arrival, is_bestseller } = req.body;
  if (!name || !slug || !base_price) throw new AppError('Name, slug and base_price required', 400);
  const result = await query(
    `INSERT INTO products (name,slug,description,short_description,category_id,base_price,sale_price,sku,
                           material,care_instructions,tags,is_featured,is_new_arrival,is_bestseller)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`,
    [name, slug, description || null, short_description || null, category_id || null,
     base_price, sale_price || null, sku || null, material || null, care_instructions || null, tags || [],
     is_featured || false, is_new_arrival || false, is_bestseller || false]);
  return res.status(201).json({ success: true, data: result.rows[0] });
});

router.patch('/products/:id', async (req: Request, res: Response) => {
  const fields = ['name','slug','description','short_description','category_id','base_price',
                  'sale_price','sku','is_active','is_featured','is_new_arrival','is_bestseller','material','care_instructions','tags'];
  const updates: string[] = [];
  const params: unknown[] = [];
  let pIdx = 1;
  for (const f of fields) {
    if (req.body[f] !== undefined) { updates.push(`${f}=$${pIdx++}`); params.push(req.body[f]); }
  }
  if (!updates.length) throw new AppError('No fields to update', 400);
  params.push(req.params.id);
  const result = await query(
    `UPDATE products SET ${updates.join(',')},updated_at=NOW() WHERE id=$${pIdx} RETURNING *`, params);
  return res.json({ success: true, data: result.rows[0] });
});

/* ── Variants ────────────────────────────────────────────────────────── */
router.post('/products/:id/variants', async (req: Request, res: Response) => {
  const { size, color, color_hex, stock_qty, price_adj, sku } = req.body;
  if (!size || !color) throw new AppError('Size and color required', 400);
  const result = await query(
    `INSERT INTO product_variants (product_id,size,color,color_hex,stock_qty,price_adj,sku)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [req.params.id, size, color, color_hex || null, stock_qty || 0, price_adj || 0, sku || null]);
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
  params.push(req.params.variantId, req.params.id);
  const result = await query(
    `UPDATE product_variants SET ${updates.join(',')} WHERE id=$${pIdx} AND product_id=$${pIdx+1} RETURNING *`, params);
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
  if (!url) throw new AppError('Image URL required', 400);
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

export default router;
