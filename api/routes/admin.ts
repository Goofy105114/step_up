import { Router, Request, Response } from 'express';
import { query } from '../db/pool';
import { authenticate, authorize } from '../middleware/auth';
const router = Router();

router.use(authenticate, authorize('admin', 'staff'));

router.get('/dashboard', async (_req: Request, res: Response) => {
  const [orders, revenue, users, products] = await Promise.all([
    query(`SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE status='pending') AS pending,
                  COUNT(*) FILTER (WHERE status='delivered') AS delivered FROM orders`),
    query(`SELECT COALESCE(SUM(total_amount),0) AS total,
                  COALESCE(SUM(total_amount) FILTER (WHERE created_at>NOW()-INTERVAL '30 days'),0) AS last_30d
           FROM orders WHERE payment_status='paid'`),
    query(`SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE created_at>NOW()-INTERVAL '7 days') AS new_this_week FROM users`),
    query(`SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE is_active=true) AS active FROM products`),
  ]);
  const topProducts = await query(
    `SELECT p.name,p.slug,SUM(oi.quantity) AS sold,SUM(oi.total_price) AS revenue
     FROM order_items oi JOIN products p ON oi.product_id=p.id JOIN orders o ON oi.order_id=o.id
     WHERE o.payment_status='paid' GROUP BY p.id ORDER BY sold DESC LIMIT 5`);
  return res.json({ success: true, data: {
    orders: orders.rows[0], revenue: revenue.rows[0],
    users: users.rows[0], products: products.rows[0],
    top_products: topProducts.rows,
  }});
});

router.get('/orders', async (req: Request, res: Response) => {
  const { status, page = '1', limit = '20' } = req.query as Record<string, string>;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  const where = status ? `WHERE o.status='${status}'` : '';
  const result = await query(
    `SELECT o.*,u.email,u.first_name,u.last_name FROM orders o
     LEFT JOIN users u ON o.user_id=u.id ${where}
     ORDER BY o.created_at DESC LIMIT $1 OFFSET $2`,
    [parseInt(limit), offset]);
  return res.json({ success: true, data: result.rows });
});

router.patch('/orders/:id/status', async (req: Request, res: Response) => {
  const { status, note, tracking_number } = req.body;
  const updates = ['status=$1', 'updated_at=NOW()'];
  const params: unknown[] = [status];
  let pIdx = 2;
  if (tracking_number) { updates.push(`tracking_number=$${pIdx++}`); params.push(tracking_number); }
  if (status === 'delivered') updates.push('delivered_at=NOW()');
  params.push(req.params.id);
  await query(`UPDATE orders SET ${updates.join(',')} WHERE id=$${pIdx}`, params);
  await query('INSERT INTO order_status_history (order_id,status,note,created_by) VALUES ($1,$2,$3,$4)',
    [req.params.id, status, note||null, req.user!.userId]);
  return res.json({ success: true, message: 'Order status updated' });
});

router.get('/products', async (_req: Request, res: Response) => {
  const result = await query(
    `SELECT p.*,c.name AS category_name,
      (SELECT url FROM product_images WHERE product_id=p.id AND is_primary=true LIMIT 1) AS primary_image,
      (SELECT COALESCE(SUM(pv.stock_qty),0) FROM product_variants pv WHERE pv.product_id=p.id) AS total_stock
     FROM products p LEFT JOIN categories c ON p.category_id=c.id ORDER BY p.created_at DESC`);
  return res.json({ success: true, data: result.rows });
});

router.post('/products', async (req: Request, res: Response) => {
  const { name, slug, description, short_description, category_id, base_price, sale_price,
          material, tags, is_featured, is_new_arrival, is_bestseller } = req.body;
  const result = await query(
    `INSERT INTO products (name,slug,description,short_description,category_id,base_price,sale_price,
                           material,tags,is_featured,is_new_arrival,is_bestseller)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
    [name,slug,description,short_description,category_id,base_price,sale_price||null,
     material||null,tags||[],is_featured||false,is_new_arrival||false,is_bestseller||false]);
  return res.status(201).json({ success: true, data: result.rows[0] });
});

router.patch('/products/:id', async (req: Request, res: Response) => {
  const fields = ['name','slug','description','short_description','base_price','sale_price',
                  'is_active','is_featured','is_new_arrival','is_bestseller','material','tags'];
  const updates: string[] = [];
  const params: unknown[] = [];
  let pIdx = 1;
  for (const f of fields) {
    if (req.body[f] !== undefined) { updates.push(`${f}=$${pIdx++}`); params.push(req.body[f]); }
  }
  if (!updates.length) return res.status(400).json({ success: false, message: 'No fields' });
  params.push(req.params.id);
  const result = await query(
    `UPDATE products SET ${updates.join(',')},updated_at=NOW() WHERE id=$${pIdx} RETURNING *`, params);
  return res.json({ success: true, data: result.rows[0] });
});

router.get('/users', authorize('admin'), async (_req: Request, res: Response) => {
  const result = await query(
    `SELECT u.id,u.email,u.first_name,u.last_name,u.role,u.created_at,
      COUNT(o.id) AS order_count,COALESCE(SUM(o.total_amount),0) AS lifetime_value
     FROM users u LEFT JOIN orders o ON o.user_id=u.id AND o.payment_status='paid'
     GROUP BY u.id ORDER BY u.created_at DESC`);
  return res.json({ success: true, data: result.rows });
});

export default router;
