import { Router, Request, Response } from 'express';
import { createHash } from 'crypto';
import pool, { query } from '../db/pool';
import { authenticate, authorize } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { fetchRazorpayPaymentRefunds } from '../services/razorpay';
import { enqueueTransactionalEmail } from '../services/emailOutbox';

const router = Router();
router.use(authenticate, authorize('admin', 'staff'));

/* ── Dashboard ───────────────────────────────────────────────────────── */
router.get('/dashboard', authorize('admin'), async (_req: Request, res: Response) => {
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
/* Read-only Razorpay webhook audit. Sensitive payload/signature material is never returned. */
router.get('/razorpay/webhook-events', authorize('admin'), async (req: Request, res: Response) => {
  const pageValue = req.query.page === undefined ? '1' : String(req.query.page);
  const limitValue = req.query.limit === undefined ? '25' : String(req.query.limit);
  if (!/^[0-9]+$/.test(pageValue) || !/^[0-9]+$/.test(limitValue)) {
    throw new AppError('Page and limit must be positive whole numbers', 400);
  }
  const page = Number(pageValue);
  const limit = Number(limitValue);
  if (!Number.isSafeInteger(page) || page < 1 || page > 1000000) throw new AppError('Page must be between 1 and 1000000', 400);
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100) throw new AppError('Limit must be between 1 and 100', 400);
  const status = req.query.processing_status === undefined ? undefined : String(req.query.processing_status);
  if (status !== undefined && !['processed', 'unmatched'].includes(status)) throw new AppError('Invalid webhook processing status filter', 400);
  const conditions: string[] = [];
  const params: unknown[] = [];
  if (status) { conditions.push(`e.processing_status=${params.length + 1}`); params.push(status); }
  const searchValue = req.query.q === undefined ? '' : String(req.query.q).trim();
  if (searchValue.length > 120) throw new AppError('Search query cannot exceed 120 characters', 400);
  if (searchValue) {
    const searchParam = params.length + 1;
    const searchCondition = '(e.event_id ILIKE $' + searchParam + ' OR e.event_type ILIKE $' + searchParam + ' OR e.razorpay_payment_id ILIKE $' + searchParam + ' OR e.razorpay_order_id ILIKE $' + searchParam + ' OR e.order_id::text ILIKE $' + searchParam + ' OR o.order_number ILIKE $' + searchParam + ')';
    conditions.push(searchCondition);
    params.push('%' + searchValue.replace(/[\\%_]/g, (character) => `\\${character}`) + '%');
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const count = await query(`SELECT COUNT(*)::int AS total FROM razorpay_webhook_events e LEFT JOIN orders o ON o.id=e.order_id ${where}`, params);
  params.push(limit, (page - 1) * limit);
  const events = await query(
    `SELECT e.event_id,e.event_type,e.razorpay_payment_id,e.razorpay_order_id,
            e.order_id,e.amount_paise,e.currency,e.processing_status,e.received_at,e.processed_at,
            o.order_number
     FROM razorpay_webhook_events e
     LEFT JOIN orders o ON o.id=e.order_id
     ${where}
     ORDER BY e.received_at DESC
     LIMIT ${params.length - 1} OFFSET ${params.length}`,
    params
  );
  return res.json({ success: true, data: events.rows, pagination: {
    page, limit, total: count.rows[0]?.total || 0,
    total_pages: Math.ceil(Number(count.rows[0]?.total || 0) / limit)
  }});
});

router.get('/orders', async (req: Request, res: Response) => {
  const { status } = req.query as Record<string, string>;
  const pageValue = req.query.page === undefined ? '1' : String(req.query.page);
  const limitValue = req.query.limit === undefined ? '20' : String(req.query.limit);
  if (!/^[0-9]+$/.test(pageValue) || !/^[0-9]+$/.test(limitValue)) {
    throw new AppError('Page and limit must be positive whole numbers', 400);
  }
  const page = Number(pageValue);
  const limit = Number(limitValue);
  if (!Number.isSafeInteger(page) || page < 1 || page > 1000000) {
    throw new AppError('Page must be between 1 and 1000000', 400);
  }
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100) {
    throw new AppError('Limit must be between 1 and 100', 400);
  }
  const allowedStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'out_for_delivery', 'delivery_failed', 'return_to_origin', 'delivered', 'cancelled', 'refunded', 'returned'];
  if (status && !allowedStatuses.includes(status)) throw new AppError('Invalid order status filter', 400);
  const offset = (page - 1) * limit;
  const conditions: string[] = [];
  const params: unknown[] = [];
  if (status) { conditions.push(`o.status=${params.length + 1}`); params.push(status); }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  params.push(limit, offset);
  const result = await query(
    `SELECT o.*,u.email,u.first_name,u.last_name,
       COALESCE(refunds.refunded_paise,0)::bigint AS refunded_paise,
       GREATEST(ROUND(o.total_amount * 100)::bigint - COALESCE(refunds.refunded_paise,0),0)::bigint AS remaining_refundable_paise
     FROM orders o
     LEFT JOIN users u ON o.user_id=u.id
     LEFT JOIN (
       SELECT order_id,SUM(amount_paise)::bigint AS refunded_paise
       FROM payment_refund_reconciliations GROUP BY order_id
     ) refunds ON refunds.order_id=o.id
     ${where}
     ORDER BY o.created_at DESC LIMIT ${params.length - 1} OFFSET ${params.length}`,
    params);
  return res.json({ success: true, data: result.rows });
});

/* Read-only order fulfilment timeline using recorded status-history events. */
router.get('/orders/:id/fulfilment-history', authorize('admin'), async (req: Request, res: Response) => {
  const order = await query(
    'SELECT id,order_number,status,tracking_number,created_at,updated_at,delivered_at FROM orders WHERE id=$1',
    [req.params.id]
  );
  if (!order.rows[0]) throw new AppError('Order not found', 404);
  const history = await query(
    `SELECT h.status,h.note,h.created_at,u.email AS updated_by_email
     FROM order_status_history h
     LEFT JOIN users u ON u.id=h.created_by
     WHERE h.order_id=$1
     ORDER BY h.created_at ASC,h.id ASC`,
    [req.params.id]
  );
  return res.json({ success: true, data: { order: order.rows[0], events: history.rows } });
});

router.patch('/orders/:id/status', async (req: Request, res: Response) => {
  const { status, note, tracking_number, tracking_url, tracking_carrier } = req.body;
  const allowedStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'out_for_delivery', 'delivery_failed', 'return_to_origin', 'delivered', 'cancelled', 'refunded', 'returned'];
  if (typeof status !== 'string' || !allowedStatuses.includes(status)) {
    throw new AppError('Invalid order status', 400);
  }
  if (tracking_number !== undefined && tracking_number !== null && typeof tracking_number !== 'string') {
    throw new AppError('Tracking number must be text', 400);
  }
  const normalizedTracking = typeof tracking_number === 'string' ? tracking_number.trim() : null;
  if (normalizedTracking !== null && normalizedTracking.length > 100) {
    throw new AppError('Tracking number cannot exceed 100 characters', 400);
  }
  if (tracking_url !== undefined && tracking_url !== null && typeof tracking_url !== 'string') {
    throw new AppError('Tracking URL must be text', 400);
  }
  if (tracking_carrier !== undefined && tracking_carrier !== null && typeof tracking_carrier !== 'string') throw new AppError('Carrier name must be text', 400);
  const normalizedCarrier = typeof tracking_carrier === 'string' ? tracking_carrier.trim() : null;
  if (normalizedCarrier !== null && normalizedCarrier.length > 100) throw new AppError('Carrier name cannot exceed 100 characters', 400);
  const normalizedTrackingUrl = typeof tracking_url === 'string' ? tracking_url.trim() : null;
  if (normalizedTrackingUrl) {
    if (normalizedTrackingUrl.length > 2048) {
      throw new AppError('Tracking URL must be a valid HTTPS link no longer than 2048 characters', 400);
    }
    try {
      const parsedTrackingUrl = new URL(normalizedTrackingUrl);
      if (parsedTrackingUrl.protocol !== 'https:' || !parsedTrackingUrl.hostname ||
          parsedTrackingUrl.username || parsedTrackingUrl.password) {
        throw new Error('Invalid tracking URL');
      }
    } catch {
      throw new AppError('Tracking URL must be a valid HTTPS link without embedded credentials', 400);
    }
  }
  if (note !== undefined && note !== null && typeof note !== 'string') {
    throw new AppError('Order status note must be text', 400);
  }
  if (typeof note === 'string' && note.length > 1000) {
    throw new AppError('Order status note cannot exceed 1000 characters', 400);
  }
  const normalizedNote = typeof note === 'string' ? note.trim() || null : null;
  if (['delivery_failed', 'return_to_origin'].includes(status) && !normalizedNote) {
    throw new AppError('A note explaining the delivery exception is required.', 400);
  }

  const allowedNextStatuses: Record<string, string[]> = {
    pending: ['confirmed', 'cancelled'],
    confirmed: ['processing', 'cancelled'],
    processing: ['shipped', 'cancelled'],
    shipped: ['out_for_delivery'],
    out_for_delivery: ['delivered', 'delivery_failed'],
    delivery_failed: ['out_for_delivery', 'return_to_origin'],
    return_to_origin: [],
    delivered: [],
    cancelled: [],
    refunded: [],
    returned: [],
  };

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const orderRes = await client.query('SELECT * FROM orders WHERE id=$1 FOR UPDATE', [req.params.id]);
    const order = orderRes.rows[0];
    if (!order) throw new AppError('Order not found', 404);

    const statusChanged = status !== order.status;
    if (statusChanged && status === 'shipped') {
      const effectiveTrackingNumber = tracking_number === undefined ? order.tracking_number : normalizedTracking;
      const effectiveTrackingUrl = tracking_url === undefined ? order.tracking_url : normalizedTrackingUrl;
      if (!(typeof effectiveTrackingNumber === 'string' && effectiveTrackingNumber.trim()) &&
          !(typeof effectiveTrackingUrl === 'string' && effectiveTrackingUrl.trim())) {
        throw new AppError('Add a carrier tracking number or tracking link before marking this order as shipped.', 409);
      }
    }
    if (statusChanged && !allowedNextStatuses[order.status]?.includes(status)) {
      if (status === 'refunded') {
        throw new AppError('Refund status must be confirmed by the payment provider integration.', 409);
      }
      if (status === 'returned') {
        throw new AppError('Mark an order as returned only through the reviewed return workflow.', 409);
      }
      throw new AppError(`Order cannot move from ${order.status} to ${status}`, 409);
    }
    if (statusChanged && status === 'cancelled' && order.payment_status === 'paid') {
      throw new AppError('Refund the payment through the payment provider before cancelling this order.', 409);
    }
    if (!statusChanged && tracking_number === undefined && tracking_url === undefined && tracking_carrier === undefined) {
      await client.query('COMMIT');
      return res.json({ success: true, message: 'Order is already in that status' });
    }

    const updates = ['updated_at=NOW()'];
    const params: unknown[] = [];
    let pIdx = 1;
    if (statusChanged) {
      updates.push(`status=$${pIdx++}`);
      params.push(status);
    }
    if (tracking_number !== undefined) {
      updates.push(`tracking_number=$${pIdx++}`);
      params.push(normalizedTracking || null);
    }
    if (tracking_url !== undefined) {
      updates.push(`tracking_url=$${pIdx++}`);
      params.push(normalizedTrackingUrl || null);
    }
    if (tracking_carrier !== undefined) {
      updates.push(`tracking_carrier=$${pIdx++}`);
      params.push(normalizedCarrier || null);
    }
    if (statusChanged && status === 'delivered') updates.push('delivered_at=COALESCE(delivered_at,NOW())');
    params.push(req.params.id);
    await client.query(`UPDATE orders SET ${updates.join(',')} WHERE id=$${pIdx}`, params);

    if (statusChanged) {
      const historyResult = await client.query(
        'INSERT INTO order_status_history (order_id,status,note,created_by) VALUES ($1,$2,$3,$4) RETURNING id',
        [req.params.id, status, normalizedNote, req.user!.userId]
      );

      const emailEvent = status === 'shipped' ? 'order_shipped'
        : status === 'delivered' ? 'order_delivered'
          : status === 'cancelled' ? 'order_cancelled' : null;
      if (emailEvent) {
        const recipientResult = await client.query(
          'SELECT email FROM users WHERE id=$1',
          [order.user_id]
        );
        const recipient = recipientResult.rows[0]?.email;
        if (typeof recipient === 'string' && recipient.trim()) {
          await enqueueTransactionalEmail(
            client,
            `order:${order.id}:status-history:${historyResult.rows[0].id}`,
            emailEvent,
            recipient,
            {
              orderNumber: order.order_number,
              carrier: normalizedCarrier ?? order.tracking_carrier,
              trackingNumber: normalizedTracking ?? order.tracking_number,
              trackingUrl: normalizedTrackingUrl ?? order.tracking_url,
              note: normalizedNote,
            },
          );
        }
      }
    }

    // Restore stock only on the single, locked transition into cancelled.
    if (statusChanged && status === 'cancelled') {
      const items = await client.query('SELECT variant_id,quantity FROM order_items WHERE order_id=$1', [req.params.id]);
      for (const item of items.rows) {
        const restored = await client.query(
          'UPDATE product_variants SET stock_qty=stock_qty+$1 WHERE id=$2 RETURNING id',
          [item.quantity, item.variant_id]
        );
        if (restored.rowCount !== 1) {
          throw new AppError('Cannot complete cancellation because an ordered product variant is missing. Contact support to reconcile inventory.', 409);
        }
      }
      // Cancellation releases the coupon reservation in the same transaction.
      if (order.coupon_id) {
        await client.query('UPDATE coupons SET used_count=GREATEST(0,used_count-1) WHERE id=$1', [order.coupon_id]);
      }
    }

    await client.query('COMMIT');
    return res.json({ success: true, message: statusChanged ? 'Order status updated' : 'Tracking details updated' });
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
});

/* ── Price history and transparent promotions ───────────────────────── */
router.get('/products/:id/price-history', authorize('admin'), async (req: Request, res: Response) => {
  const product = await query('SELECT id,base_price,sale_price FROM products WHERE id=$1', [req.params.id]);
  if (!product.rows[0]) throw new AppError('Product not found', 404);
  const history = await query(
    `SELECT base_price,sale_price,effective_price,change_type,valid_from,valid_to
     FROM product_price_history WHERE product_id=$1
     ORDER BY valid_from DESC LIMIT 200`,
    [req.params.id]
  );
  const current = history.rows.find((row: any) => row.valid_to === null);
  const currentStart = current ? new Date(current.valid_from).getTime() : 0;
  const cutoff = currentStart - 30 * 24 * 60 * 60 * 1000;
  const priorRows = history.rows.filter((row: any) => row.valid_to &&
    new Date(row.valid_to).getTime() > cutoff &&
    new Date(row.valid_from).getTime() < currentStart);
  const earliestPriorStart = priorRows.length
    ? Math.min(...priorRows.map((row: any) => new Date(row.valid_from).getTime()))
    : 0;
  const complete = Boolean(current && earliestPriorStart > 0 && earliestPriorStart <= cutoff);
  const lowestPrevious = priorRows.length
    ? Math.min(...priorRows.map((row: any) => Number(row.effective_price)))
    : null;
  const currentPrice = Number(product.rows[0].sale_price ?? product.rows[0].base_price);
  return res.json({ success: true, data: {
    history: history.rows,
    disclosure: {
      available: complete && lowestPrevious !== null && currentPrice < lowestPrevious,
      prior_30_day_lowest_price: complete ? lowestPrevious : null,
      current_price: currentPrice,
      period_days: 30,
      history_complete: complete,
      reason: complete ? (lowestPrevious !== null && currentPrice < lowestPrevious ? null : 'Current price is not below the lowest recorded price in the 30 days before this price change') : 'At least 30 days of continuous recorded price history before this price change is required',
    },
  }});
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

const getProductColumnNames = async () => {
  const result = await query(
    `SELECT column_name FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'products'`
  );
  return new Set<string>(result.rows.map((row: { column_name: string }) => row.column_name));
};

router.post('/products', authorize('admin'), async (req: Request, res: Response) => {
  const { name, slug, description, short_description, category_id, base_price, sale_price, sku, material, care_instructions, arch_support_level, arch_height_mm, durometer_shore_a, calibration_reference, calibrated_at, calibration_notes, tags, is_featured, is_new_arrival, is_bestseller, generic_product_name, manufacturer_name, packer_name, importer_name, country_of_origin, consumer_care_details, mrp_inr, declarations_verified } = req.body;
  if (typeof name !== 'string' || typeof slug !== 'string') throw new AppError('Product name and slug must be text', 400);
  const optionalTextFields = { description, short_description, sku, material, care_instructions, calibration_reference, calibration_notes, generic_product_name, manufacturer_name, packer_name, importer_name, country_of_origin, consumer_care_details };
  for (const [field, value] of Object.entries(optionalTextFields)) {
    if (value !== undefined && value !== null && typeof value !== 'string') throw new AppError(`Product ${field.replace(/_/g, ' ')} must be text`, 400);
  }
  if (tags !== undefined && (!Array.isArray(tags) || tags.some((tag: unknown) => typeof tag !== 'string'))) {
    throw new AppError('Product tags must be an array of text values', 400);
  }
  for (const [field, value] of Object.entries({ is_featured, is_new_arrival, is_bestseller })) {
    if (value !== undefined && typeof value !== 'boolean') throw new AppError(`${field.replace(/_/g, ' ')} must be a boolean`, 400);
  }
  const numericInput = (value: unknown) => typeof value === 'number' || (typeof value === 'string' && value.trim().length > 0);
  if (!numericInput(base_price)) throw new AppError('Base price must be a positive number', 400);
  if (sale_price !== undefined && sale_price !== null && sale_price !== '' && !numericInput(sale_price)) {
    throw new AppError('Sale price must be a number', 400);
  }
  if (category_id !== undefined && category_id !== null && typeof category_id !== 'string') {
    throw new AppError('Product category must be a valid identifier', 400);
  }
  if (calibrated_at !== undefined && calibrated_at !== null && typeof calibrated_at !== 'string') {
    throw new AppError('Calibration date must be text', 400);
  }
  if (arch_support_level !== undefined && arch_support_level !== null &&
      arch_support_level !== '' && (typeof arch_support_level !== 'string' || !['low', 'medium', 'high'].includes(arch_support_level))) {
    throw new AppError('Invalid arch support level', 400);
  }
  const base = Number(base_price);
  const sale = sale_price === undefined || sale_price === null || sale_price === '' ? null : Number(sale_price);
  if (!String(name || '').trim() || !String(slug || '').trim() || !Number.isFinite(base) || base <= 0) throw new AppError('Name, slug and a positive base price are required', 400);
  if (sale !== null && (!Number.isFinite(sale) || sale <= 0 || sale > base)) throw new AppError('Sale price must be positive and cannot exceed the base price', 400);
  if (arch_support_level && !['low', 'medium', 'high'].includes(arch_support_level)) throw new AppError('Invalid arch support level', 400);
  if (arch_height_mm !== undefined && arch_height_mm !== null && arch_height_mm !== '' && (!Number.isFinite(Number(arch_height_mm)) || Number(arch_height_mm) <= 0)) throw new AppError('Arch height must be a positive number of millimetres', 400);
  if (durometer_shore_a !== undefined && durometer_shore_a !== null && durometer_shore_a !== '' && (!Number.isFinite(Number(durometer_shore_a)) || Number(durometer_shore_a) < 0 || Number(durometer_shore_a) > 100)) throw new AppError('Durometer must be between 0 and 100 Shore A', 400);
  if (mrp_inr !== undefined && mrp_inr !== null && mrp_inr !== '' && (!Number.isFinite(Number(mrp_inr)) || Number(mrp_inr) <= 0 || Number(mrp_inr) < (sale ?? base))) throw new AppError('MRP must be positive and at least the selling price', 400);
  if (declarations_verified !== undefined && typeof declarations_verified !== 'boolean') throw new AppError('Declaration verification must be a boolean', 400);
  if (declarations_verified === true && ![generic_product_name, country_of_origin, consumer_care_details].every(value => typeof value === 'string' && value.trim())) throw new AppError('Generic product name, country of origin and consumer-care details are required before verification', 400);
  if (declarations_verified === true && ![manufacturer_name, packer_name, importer_name].some(value => typeof value === 'string' && value.trim())) throw new AppError('Provide the applicable manufacturer, packer or importer details before verification', 400);
  const payload: Record<string, unknown> = {
    name: String(name).trim(), slug: String(slug).trim(), description: description || null, short_description: short_description || null,
    category_id: category_id || null, base_price: base, sale_price: sale, sku: sku || null, material: material || null,
    care_instructions: care_instructions || null, tags: Array.isArray(tags) ? tags : [], is_featured: Boolean(is_featured),
    is_new_arrival: Boolean(is_new_arrival), is_bestseller: Boolean(is_bestseller), arch_support_level: arch_support_level || null,
    arch_height_mm: arch_height_mm === '' || arch_height_mm === undefined ? null : arch_height_mm,
    durometer_shore_a: durometer_shore_a === '' || durometer_shore_a === undefined ? null : durometer_shore_a,
    calibration_reference: calibration_reference || null, calibrated_at: calibrated_at || null, calibration_notes: calibration_notes || null,
    generic_product_name: generic_product_name || null, manufacturer_name: manufacturer_name || null, packer_name: packer_name || null,
    importer_name: importer_name || null, country_of_origin: country_of_origin || null, consumer_care_details: consumer_care_details || null,
    mrp_inr: mrp_inr === undefined || mrp_inr === null || mrp_inr === '' ? null : Number(mrp_inr),
    declarations_verified: declarations_verified === true,
  };
  const available = await getProductColumnNames();
  const columns = Object.keys(payload).filter(column => available.has(column));
  const values = columns.map(column => payload[column]);
  const placeholders = columns.map((_, index) => `$${index + 1}`);
  const result = await query(`INSERT INTO products (${columns.join(',')}) VALUES (${placeholders.join(',')}) RETURNING *`, values);
  return res.status(201).json({ success: true, data: result.rows[0] });
});

router.patch('/products/:id', authorize('admin'), async (req: Request, res: Response) => {
  const fields = ['name','slug','description','short_description','category_id','base_price','sale_price','sku','is_active','is_featured','is_new_arrival','is_bestseller','material','care_instructions','arch_support_level','arch_height_mm','durometer_shore_a','calibration_reference','calibrated_at','calibration_notes','tags','generic_product_name','manufacturer_name','packer_name','importer_name','country_of_origin','consumer_care_details','mrp_inr','declarations_verified'];
  const textFields = ['name','slug','description','short_description','sku','material','care_instructions','calibration_reference','calibration_notes','generic_product_name','manufacturer_name','packer_name','importer_name','country_of_origin','consumer_care_details'];
  for (const field of textFields) {
    if (req.body[field] !== undefined && req.body[field] !== null && typeof req.body[field] !== 'string') {
      throw new AppError(`Product ${field.replace(/_/g, ' ')} must be text`, 400);
    }
  }
  for (const field of ['is_active','is_featured','is_new_arrival','is_bestseller','declarations_verified']) {
    if (req.body[field] !== undefined && typeof req.body[field] !== 'boolean') {
      throw new AppError(`${field.replace(/_/g, ' ')} must be a boolean`, 400);
    }
  }
  if (req.body.tags !== undefined && (!Array.isArray(req.body.tags) || req.body.tags.some((tag: unknown) => typeof tag !== 'string'))) {
    throw new AppError('Product tags must be an array of text values', 400);
  }
  const numericFields = ['base_price','sale_price','arch_height_mm','durometer_shore_a'];
  for (const field of numericFields) {
    const value = req.body[field];
    if (value !== undefined && value !== null && !(typeof value === 'number' || (typeof value === 'string' && value.trim().length > 0))) {
      throw new AppError(`Product ${field.replace(/_/g, ' ')} must be a number`, 400);
    }
  }
  if (req.body.category_id !== undefined && req.body.category_id !== null && typeof req.body.category_id !== 'string') {
    throw new AppError('Product category must be a valid identifier', 400);
  }
  if (req.body.calibrated_at !== undefined && req.body.calibrated_at !== null && typeof req.body.calibrated_at !== 'string') {
    throw new AppError('Calibration date must be text', 400);
  }
  const declarationFields = ['generic_product_name','manufacturer_name','packer_name','importer_name','country_of_origin','consumer_care_details','mrp_inr'];
  const declarationChanged = declarationFields.some(field => req.body[field] !== undefined);
  if (declarationChanged && req.body.declarations_verified !== true) {
    req.body.declarations_verified = false;
  }
  const available = await getProductColumnNames();
  const updates: string[] = [];
  const params: unknown[] = [];
  let index = 1;
  for (const field of fields) { if (req.body[field] !== undefined && available.has(field)) { updates.push(`${field}=$${index++}`); params.push(req.body[field]); } }
  if (req.body.base_price !== undefined && (!Number.isFinite(Number(req.body.base_price)) || Number(req.body.base_price) <= 0)) throw new AppError('Base price must be a positive number', 400);
  if (req.body.sale_price !== undefined && req.body.sale_price !== null && req.body.sale_price !== '' && (!Number.isFinite(Number(req.body.sale_price)) || Number(req.body.sale_price) <= 0)) throw new AppError('Sale price must be a positive number', 400);
  if (req.body.base_price !== undefined || req.body.sale_price !== undefined) {
    const current = await query('SELECT base_price,sale_price FROM products WHERE id=$1', [req.params.id]);
    if (!current.rows[0]) throw new AppError('Product not found', 404);
    const nextBase = req.body.base_price !== undefined ? Number(req.body.base_price) : Number(current.rows[0].base_price);
    const nextSaleRaw = req.body.sale_price !== undefined ? req.body.sale_price : current.rows[0].sale_price;
    const nextSale = nextSaleRaw === null || nextSaleRaw === '' ? null : Number(nextSaleRaw);
    if (nextSale !== null && (!Number.isFinite(nextSale) || nextSale <= 0 || nextSale > nextBase)) throw new AppError('Sale price must be positive and cannot exceed the base price', 400);
  }
  if (req.body.arch_support_level !== undefined && req.body.arch_support_level !== null && !['low', 'medium', 'high'].includes(req.body.arch_support_level)) throw new AppError('Invalid arch support level', 400);
  if (req.body.arch_height_mm !== undefined && req.body.arch_height_mm !== null && req.body.arch_height_mm !== '' && (!Number.isFinite(Number(req.body.arch_height_mm)) || Number(req.body.arch_height_mm) <= 0)) throw new AppError('Arch height must be a positive number of millimetres', 400);
  if (req.body.durometer_shore_a !== undefined && req.body.durometer_shore_a !== null && req.body.durometer_shore_a !== '' && (!Number.isFinite(Number(req.body.durometer_shore_a)) || Number(req.body.durometer_shore_a) < 0 || Number(req.body.durometer_shore_a) > 100)) throw new AppError('Durometer must be between 0 and 100 Shore A', 400);
  if (req.body.mrp_inr !== undefined && req.body.mrp_inr !== null && req.body.mrp_inr !== '' && (!Number.isFinite(Number(req.body.mrp_inr)) || Number(req.body.mrp_inr) <= 0)) throw new AppError('MRP must be a positive INR amount', 400);
  if (req.body.declarations_verified === true || req.body.mrp_inr !== undefined) {
    const current = await query('SELECT * FROM products WHERE id=$1', [req.params.id]);
    if (!current.rows[0]) throw new AppError('Product not found', 404);
    const merged = { ...current.rows[0], ...req.body };
    const sellingPrice = Number(merged.sale_price ?? merged.base_price);
    if (merged.mrp_inr !== null && merged.mrp_inr !== undefined && (!Number.isFinite(Number(merged.mrp_inr)) || Number(merged.mrp_inr) < sellingPrice)) throw new AppError('MRP must be at least the selling price', 400);
    if (req.body.declarations_verified === true) {
      if (!Number.isFinite(Number(merged.mrp_inr)) || Number(merged.mrp_inr) < sellingPrice) throw new AppError('A valid MRP at least equal to the selling price is required before verification', 400);
      if (![merged.generic_product_name, merged.country_of_origin, merged.consumer_care_details].every(value => typeof value === 'string' && value.trim())) throw new AppError('Generic product name, country of origin and consumer-care details are required before verification', 400);
      if (![merged.manufacturer_name, merged.packer_name, merged.importer_name].some(value => typeof value === 'string' && value.trim())) throw new AppError('Provide the applicable manufacturer, packer or importer details before verification', 400);
    }
  }
  if (!updates.length) throw new AppError('No supported product fields to update', 400);
  params.push(req.params.id);
  const result = await query(`UPDATE products SET ${updates.join(',')},updated_at=NOW() WHERE id=$${index} RETURNING *`, params);
  if (!result.rows[0]) throw new AppError('Product not found', 404);
  return res.json({ success: true, data: result.rows[0] });
});

/* ── Variants ────────────────────────────────────────────────────────── */
router.post('/products/:id/variants', authorize('admin'), async (req: Request, res: Response) => {
  const { size, color, color_hex, stock_qty, price_adj, sku } = req.body;
  if (typeof size !== 'string' || typeof color !== 'string') throw new AppError('Size and color must be text', 400);
  if (color_hex !== undefined && color_hex !== null && typeof color_hex !== 'string') throw new AppError('Color must be text', 400);
  if (sku !== undefined && sku !== null && typeof sku !== 'string') throw new AppError('SKU must be text', 400);
  const isNumericInput = (value: unknown) => typeof value === 'number' || (typeof value === 'string' && value.trim().length > 0);
  if (stock_qty !== undefined && !isNumericInput(stock_qty)) throw new AppError('Stock quantity must be a number', 400);
  if (price_adj !== undefined && !isNumericInput(price_adj)) throw new AppError('Price adjustment must be a number', 400);
  const normalizedSize = size.trim();
  const normalizedColor = String(color || '').trim();
  const parsedStock = stock_qty === undefined ? 0 : Number(stock_qty);
  const parsedAdjustment = price_adj === undefined ? 0 : Number(price_adj);
  if (!normalizedSize || !normalizedColor) throw new AppError('Size and color required', 400);
  if (normalizedSize.length > 40 || normalizedColor.length > 80) throw new AppError('Size or color is too long', 400);
  if (!Number.isInteger(parsedStock) || parsedStock < 0) throw new AppError('Stock quantity must be a non-negative whole number', 400);
  if (!Number.isFinite(parsedAdjustment)) throw new AppError('Price adjustment must be a valid number', 400);
  const normalizedColorHex = color_hex === undefined || color_hex === null || color_hex.trim() === '' ? null : color_hex.trim();
  if (normalizedColorHex !== null && !/^#[0-9a-fA-F]{6}$/.test(normalizedColorHex)) throw new AppError('Color must use a six-digit hex value', 400);
  const normalizedSku = sku === undefined || sku === null || sku.trim() === '' ? null : sku.trim();
  if (normalizedSku !== null && normalizedSku.length > 100) throw new AppError('SKU cannot exceed 100 characters', 400);
  const product = await query('SELECT COALESCE(sale_price,base_price) AS price FROM products WHERE id=$1', [req.params.id]);
  if (!product.rows[0]) throw new AppError('Product not found', 404);
  if (Number(product.rows[0].price) + parsedAdjustment <= 0) throw new AppError('Variant price must remain above zero', 400);
  const result = await query(
    `INSERT INTO product_variants (product_id,size,color,color_hex,stock_qty,price_adj,sku)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [req.params.id, normalizedSize, normalizedColor, normalizedColorHex, parsedStock, parsedAdjustment, normalizedSku]);
  return res.status(201).json({ success: true, data: result.rows[0] });
});

router.patch('/products/:id/variants/:variantId', authorize('admin'), async (req: Request, res: Response) => {
  const { stock_qty, price_adj, sku, size, color, color_hex } = req.body;
  if (size !== undefined && typeof size !== 'string') throw new AppError('Size must be text', 400);
  if (color !== undefined && typeof color !== 'string') throw new AppError('Color must be text', 400);
  if (color_hex !== undefined && color_hex !== null && typeof color_hex !== 'string') throw new AppError('Color must be text', 400);
  if (sku !== undefined && sku !== null && typeof sku !== 'string') throw new AppError('SKU must be text', 400);
  const isNumericInput = (value: unknown) => typeof value === 'number' || (typeof value === 'string' && value.trim().length > 0);
  if (stock_qty !== undefined && !isNumericInput(stock_qty)) throw new AppError('Stock quantity must be a number', 400);
  if (price_adj !== undefined && !isNumericInput(price_adj)) throw new AppError('Price adjustment must be a number', 400);
  const fields: Record<string, unknown> = {};
  if (stock_qty !== undefined) fields.stock_qty = Number(stock_qty);
  if (price_adj !== undefined) fields.price_adj = Number(price_adj);
  if (sku !== undefined) fields.sku = sku;
  if (size !== undefined) fields.size = String(size).trim();
  if (color !== undefined) fields.color = String(color).trim();
  if (color_hex !== undefined) fields.color_hex = color_hex;
  if (!Object.keys(fields).length) throw new AppError('No fields to update', 400);
  if (stock_qty !== undefined && (!Number.isInteger(Number(stock_qty)) || Number(stock_qty) < 0)) throw new AppError('Stock quantity must be a non-negative whole number', 400);
  if (price_adj !== undefined && !Number.isFinite(Number(price_adj))) throw new AppError('Price adjustment must be a valid number', 400);
  if (size !== undefined && (!String(size).trim() || String(size).trim().length > 40)) throw new AppError('Size is invalid', 400);
  if (color !== undefined && (!String(color).trim() || String(color).trim().length > 80)) throw new AppError('Color is invalid', 400);
  if (color_hex !== undefined && color_hex !== null && typeof color_hex !== 'string') throw new AppError('Color must be text', 400);
  if (sku !== undefined && sku !== null && typeof sku !== 'string') throw new AppError('SKU must be text', 400);
  const normalizedColorHex = color_hex === undefined ? undefined : (color_hex === null || color_hex.trim() === '' ? null : color_hex.trim());
  const normalizedSku = sku === undefined ? undefined : (sku === null || sku.trim() === '' ? null : sku.trim());
  if (normalizedColorHex !== undefined && normalizedColorHex !== null && !/^#[0-9a-fA-F]{6}$/.test(normalizedColorHex)) throw new AppError('Color must use a six-digit hex value', 400);
  if (normalizedSku !== undefined && normalizedSku !== null && normalizedSku.length > 100) throw new AppError('SKU cannot exceed 100 characters', 400);
  if (normalizedSku !== undefined) fields.sku = normalizedSku;
  if (normalizedColorHex !== undefined) fields.color_hex = normalizedColorHex;
  const existing = await query(`SELECT pv.price_adj,COALESCE(p.sale_price,p.base_price) AS price
    FROM product_variants pv JOIN products p ON p.id=pv.product_id
    WHERE pv.id=$1 AND pv.product_id=$2`, [req.params.variantId, req.params.id]);
  if (!existing.rows[0]) throw new AppError('Product variant not found', 404);
  const finalAdjustment = price_adj === undefined ? Number(existing.rows[0].price_adj) : Number(price_adj);
  if (Number(existing.rows[0].price) + finalAdjustment <= 0) throw new AppError('Variant price must remain above zero', 400);
  const columns = Object.keys(fields);
  const params = columns.map(column => fields[column]);
  const assignments = columns.map((column, index) => `${column}=$${index + 1}`);
  params.push(req.params.variantId, req.params.id);
  const result = await query(
    `UPDATE product_variants SET ${assignments.join(',')}
     WHERE id=$${params.length - 1} AND product_id=$${params.length} RETURNING *`, params);
  if (!result.rows[0]) throw new AppError('Product variant not found', 404);
  return res.json({ success: true, data: result.rows[0] });
});

router.delete('/products/:id/variants/:variantId', authorize('admin'), async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const variant = await client.query(
      'SELECT id FROM product_variants WHERE id=$1 AND product_id=$2 FOR UPDATE',
      [req.params.variantId, req.params.id]
    );
    if (!variant.rows[0]) throw new AppError('Product variant not found', 404);

    const ordered = await client.query(
      'SELECT 1 FROM order_items WHERE variant_id=$1 LIMIT 1',
      [req.params.variantId]
    );
    if (ordered.rows[0]) {
      throw new AppError('This variant is linked to order history and cannot be deleted. Set its stock to zero instead.', 409);
    }

    await client.query('DELETE FROM product_variants WHERE id=$1 AND product_id=$2',
      [req.params.variantId, req.params.id]);
    await client.query('COMMIT');
    return res.json({ success: true });
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
});

/* ── Product Images ──────────────────────────────────────────────────── */
const cloudinaryConfig = () => {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
  const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();
  if (!cloudName || !apiKey || !apiSecret) {
    throw new AppError('Product image uploads are not configured. Ask an administrator to configure Cloudinary on the backend.', 503);
  }
  return { cloudName, apiKey, apiSecret };
};

const cloudinarySignature = (parameters: Record<string, string>, apiSecret: string) => {
  const canonical = Object.keys(parameters).sort().map(key => `${key}=${parameters[key]}`).join('&');
  return createHash('sha1').update(canonical + apiSecret).digest('hex');
};

const cloudinaryPublicIdFromUrl = (value: string) => {
  let parsed: URL;
  try { parsed = new URL(value); } catch { return null; }
  if (parsed.hostname !== 'res.cloudinary.com') return null;
  const segments = parsed.pathname.split('/').filter(Boolean);
  const uploadIndex = segments.indexOf('upload');
  if (uploadIndex < 0) return null;
  const assetSegments = segments.slice(uploadIndex + 1).filter(segment => !/^v\d+$/.test(segment));
  if (!assetSegments.length) return null;
  const last = assetSegments[assetSegments.length - 1];
  assetSegments[assetSegments.length - 1] = last.replace(/\.[a-z0-9]+$/i, '');
  return assetSegments.join('/');
};

const deleteCloudinaryAsset = async (imageUrl: string) => {
  const publicId = cloudinaryPublicIdFromUrl(imageUrl);
  if (!publicId) return;
  const { cloudName, apiKey, apiSecret } = cloudinaryConfig();
  const parsed = new URL(imageUrl);
  if (parsed.pathname.split('/').filter(Boolean)[0] !== cloudName) return;
  const timestamp = String(Math.floor(Date.now() / 1000));
  const signature = cloudinarySignature({ public_id: publicId, timestamp }, apiSecret);
  const body = new URLSearchParams({ public_id: publicId, timestamp, api_key: apiKey, signature });
  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  const result = await response.json() as { result?: string; error?: { message?: string } };
  if (!response.ok || (result.result !== 'ok' && result.result !== 'not found')) {
    throw new AppError(result.error?.message || 'Cloud image could not be deleted. The product image record was kept.', 502);
  }
};

const normalizeProductImageUrl = (value: unknown) => {
  if (typeof value !== 'string' || value.length > 2048) throw new AppError('Image URL must be a valid HTTPS URL under 2048 characters', 400);
  let parsed: URL;
  try { parsed = new URL(value.trim()); } catch { throw new AppError('Image URL is invalid', 400); }
  if (parsed.protocol !== 'https:' || !parsed.hostname || parsed.username || parsed.password) {
    throw new AppError('Product image URL must use HTTPS and cannot contain embedded credentials', 400);
  }
  return parsed.toString();
};

router.post('/products/:id/images/upload-signature', authorize('admin'), async (req: Request, res: Response) => {
  const { cloudName, apiKey, apiSecret } = cloudinaryConfig();
  const product = await query('SELECT id FROM products WHERE id=$1', [req.params.id]);
  if (!product.rows[0]) throw new AppError('Product not found', 404);
  const timestamp = String(Math.floor(Date.now() / 1000));
  const folder = `stepup/products/${req.params.id}`;
  const allowed_formats = 'jpg,png,webp,avif';
  const signature = cloudinarySignature({ allowed_formats, folder, timestamp }, apiSecret);
  return res.json({ success: true, data: { cloud_name: cloudName, api_key: apiKey, folder, timestamp, allowed_formats, signature } });
});

router.post('/products/:id/images', authorize('admin'), async (req: Request, res: Response) => {
  const { url, alt_text, is_primary, sort_order } = req.body;
  const imageUrl = normalizeProductImageUrl(url);
  if (alt_text !== undefined && alt_text !== null && (typeof alt_text !== 'string' || alt_text.length > 255)) {
    throw new AppError('Image alt text cannot exceed 255 characters', 400);
  }
  const sortOrder = sort_order === undefined ? 0 : Number(sort_order);
  if (!Number.isInteger(sortOrder) || sortOrder < 0) throw new AppError('Image sort order must be a non-negative whole number', 400);
  if (is_primary !== undefined && typeof is_primary !== 'boolean') throw new AppError('is_primary must be a boolean', 400);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const product = await client.query('SELECT id FROM products WHERE id=$1 FOR UPDATE', [req.params.id]);
    if (!product.rows[0]) throw new AppError('Product not found', 404);
    const existing = await client.query('SELECT id FROM product_images WHERE product_id=$1 AND is_primary=true', [req.params.id]);
    const setAsPrimary = is_primary === true || existing.rows.length === 0;
    if (setAsPrimary) await client.query('UPDATE product_images SET is_primary=false WHERE product_id=$1', [req.params.id]);
    const result = await client.query(
      `INSERT INTO product_images (product_id,url,alt_text,is_primary,sort_order)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [req.params.id, imageUrl, alt_text ? alt_text.trim() : null, setAsPrimary, sortOrder]);
    await client.query('COMMIT');
    return res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
});

router.delete('/products/:id/images/:imageId', authorize('admin'), async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const product = await client.query('SELECT id FROM products WHERE id=$1 FOR UPDATE', [req.params.id]);
    if (!product.rows[0]) throw new AppError('Product not found', 404);
    const image = await client.query(
      'SELECT url,is_primary FROM product_images WHERE id=$1 AND product_id=$2 FOR UPDATE',
      [req.params.imageId, req.params.id]);
    if (!image.rows[0]) throw new AppError('Product image not found', 404);
    // Remove uploaded Cloudinary assets as well as their database records.
    await deleteCloudinaryAsset(image.rows[0].url);
    const deleted = await client.query(
      'DELETE FROM product_images WHERE id=$1 AND product_id=$2 RETURNING is_primary',
      [req.params.imageId, req.params.id]);
    if (!deleted.rows[0]) throw new AppError('Product image not found', 404);
    if (deleted.rows[0].is_primary) {
      const next = await client.query(
        'SELECT id FROM product_images WHERE product_id=$1 ORDER BY sort_order ASC,created_at ASC LIMIT 1',
        [req.params.id]);
      if (next.rows[0]) await client.query('UPDATE product_images SET is_primary=true WHERE id=$1', [next.rows[0].id]);
    }
    await client.query('COMMIT');
    return res.json({ success: true });
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
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

/* ── Store settings ─────────────────────────────────────────────────── */
const parseCheckoutPricing = (value: any) => {
  const free_shipping_threshold_inr = Number(value?.free_shipping_threshold_inr);
  const shipping_fee_inr = Number(value?.shipping_fee_inr);
  const gst_rate_percent = Number(value?.gst_rate_percent);
  const tax_enabled = value?.tax_enabled === true;
  const tax_configuration_confirmed = value?.tax_configuration_confirmed === true;
  if (
    !Number.isFinite(free_shipping_threshold_inr) || free_shipping_threshold_inr < 0 ||
    !Number.isFinite(shipping_fee_inr) || shipping_fee_inr < 0 ||
    !Number.isFinite(gst_rate_percent) || gst_rate_percent < 0 || gst_rate_percent > 100 ||
    (tax_enabled && !tax_configuration_confirmed)
  ) {
    throw new AppError('Enter valid non-negative INR amounts and confirm accountant-reviewed tax treatment before enabling tax collection', 400);
  }
  return {
    free_shipping_threshold_inr,
    shipping_fee_inr,
    gst_rate_percent,
    tax_enabled,
    tax_configuration_confirmed,
  };
};

router.get('/store-settings/checkout-pricing', authorize('admin'), async (_req: Request, res: Response) => {
  const result = await query(
    "SELECT setting_key,setting_value,description,updated_at FROM store_settings WHERE setting_key='checkout_pricing'"
  );
  if (!result.rows[0]) throw new AppError('Checkout pricing settings are not configured', 503);
  return res.json({ success: true, data: result.rows[0] });
});

router.put('/store-settings/checkout-pricing', authorize('admin'), async (req: Request, res: Response) => {
  const setting_value = parseCheckoutPricing(req.body);
  const result = await query(
    `INSERT INTO store_settings (setting_key,setting_value,description,updated_by)
     VALUES ('checkout_pricing',$1,'Checkout shipping threshold, shipping fee and explicitly approved tax configuration. Applies to new orders.',$2)
     ON CONFLICT (setting_key) DO UPDATE
       SET setting_value=EXCLUDED.setting_value,updated_by=EXCLUDED.updated_by,updated_at=NOW()
     RETURNING setting_key,setting_value,description,updated_at`,
    [JSON.stringify(setting_value), req.user!.userId]
  );
  return res.json({ success: true, data: result.rows[0] });
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


/* Read-only audit trail of provider-confirmed refunds for an order. */
router.get('/orders/:id/refunds', authorize('admin'), async (req: Request, res: Response) => {
  const order = await query(
    'SELECT id,order_number,total_amount,payment_status,razorpay_payment_id FROM orders WHERE id=$1',
    [req.params.id]
  );
  if (!order.rows[0]) throw new AppError('Order not found', 404);
  const result = await query(
    `SELECT r.provider,r.provider_refund_id,r.provider_payment_id,r.amount_paise,r.currency,
            r.confirmed_at,u.email AS confirmed_by_email
     FROM payment_refund_reconciliations r
     LEFT JOIN users u ON u.id=r.confirmed_by
     WHERE r.order_id=$1
     ORDER BY r.confirmed_at ASC,r.id ASC`,
    [req.params.id]
  );
  const refundedPaise = result.rows.reduce((sum: number, row: any) => sum + Number(row.amount_paise), 0);
  return res.json({ success: true, data: {
    order: order.rows[0],
    refunds: result.rows,
    refunded_paise: refundedPaise,
    remaining_refundable_paise: Math.max(0, Math.round(Number(order.rows[0].total_amount) * 100) - refundedPaise)
  }});
});

/* Verify provider refund state and reconcile cumulative partial/full refunds. */
router.post('/orders/:id/refund-confirmation', authorize('admin'), async (req: Request, res: Response) => {
  const providerRefundId = typeof req.body?.provider_refund_id === 'string' ? req.body.provider_refund_id.trim() : '';
  if (!providerRefundId || providerRefundId.length > 255) throw new AppError('Enter the refund reference returned by Razorpay', 400);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const found = await client.query('SELECT * FROM orders WHERE id=$1 FOR UPDATE', [req.params.id]);
    const order = found.rows[0];
    if (!order) throw new AppError('Order not found', 404);
    if (order.payment_method !== 'razorpay' || !order.razorpay_payment_id) throw new AppError('Only orders with a recorded Razorpay payment can be reconciled here', 409);
    if (!['paid', 'partially_refunded'].includes(order.payment_status)) throw new AppError('Order is not in a refundable payment state', 409);
    if (!['cancelled', 'returned'].includes(order.status)) throw new AppError('A refund can only be recorded after cancellation or completion of the return workflow', 409);
    const returnState = await client.query('SELECT status FROM return_requests WHERE order_id=$1', [order.id]);
    if (order.status === 'returned' && returnState.rows[0]?.status !== 'received') throw new AppError('The return must be marked received before recording its refund', 409);
    const providerRefunds = await fetchRazorpayPaymentRefunds(order.razorpay_payment_id);
    const providerRefund = providerRefunds.find((item: any) => item.id === providerRefundId);
    if (!providerRefund || providerRefund.payment_id !== order.razorpay_payment_id || providerRefund.status !== 'processed' || !Number.isSafeInteger(providerRefund.amount) || providerRefund.amount <= 0 || providerRefund.currency !== 'INR') {
      throw new AppError('Razorpay has not confirmed this refund as processed for the recorded payment', 409);
    }
    const orderAmountPaise = Math.round(Number(order.total_amount) * 100);
    const prior = await client.query('SELECT COALESCE(SUM(amount_paise),0)::bigint AS refunded FROM payment_refund_reconciliations WHERE order_id=$1', [order.id]);
    const alreadyRefunded = Number(prior.rows[0]?.refunded || 0);
    const newTotal = alreadyRefunded + Number(providerRefund.amount);
    if (!Number.isSafeInteger(orderAmountPaise) || orderAmountPaise <= 0 || !Number.isSafeInteger(newTotal) || newTotal > orderAmountPaise) {
      throw new AppError('Refund total would exceed the captured order amount; reconciliation is blocked', 409);
    }
    await client.query(
      `INSERT INTO payment_refund_reconciliations
        (order_id, provider, provider_refund_id, provider_payment_id, amount_paise, currency, confirmed_by)
       VALUES ($1,'razorpay',$2,$3,$4,'INR',$5)`,
      [order.id, providerRefundId, order.razorpay_payment_id, providerRefund.amount, req.user!.userId]
    );
    const fullyRefunded = newTotal === orderAmountPaise;
    await client.query("UPDATE orders SET payment_status=$2, status=CASE WHEN $2='refunded' THEN 'refunded' ELSE status END, updated_at=NOW() WHERE id=$1",
      [order.id, fullyRefunded ? 'refunded' : 'partially_refunded']);
    await client.query(
      "INSERT INTO order_status_history (order_id,status,note,created_by) VALUES ($1,$2,$3,$4)",
      [order.id, fullyRefunded ? 'refunded' : order.status, (fullyRefunded ? 'Full' : 'Partial') + ' Razorpay refund verified via API; reference: ' + providerRefundId, req.user!.userId]
    );
    const refundRecipient = await client.query('SELECT email FROM users WHERE id=$1', [order.user_id]);
    const refundEmail = refundRecipient.rows[0]?.email;
    if (typeof refundEmail === 'string' && refundEmail.trim()) {
      await enqueueTransactionalEmail(
        client,
        `refund:${providerRefundId}:confirmed`,
        'refund_confirmed',
        refundEmail,
        {
          orderNumber: order.order_number,
          refundAmount: '₹' + (Number(providerRefund.amount) / 100).toFixed(2),
          note: fullyRefunded ? 'Full refund confirmed by Razorpay' : 'Partial refund confirmed by Razorpay',
        },
      );
    }
    await client.query('COMMIT');
    return res.json({ success: true, data: { order_id: order.id, provider_refund_id: providerRefundId, refund_amount_paise: Number(providerRefund.amount), cumulative_refund_paise: newTotal, remaining_refundable_paise: orderAmountPaise - newTotal, payment_status: fullyRefunded ? 'refunded' : 'partially_refunded' } });
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
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

router.patch('/return-requests/:id', authorize('admin'), async (req: Request, res: Response) => {
  const { status, admin_note } = req.body;
  if (typeof status !== 'string' || !['approved','rejected','received'].includes(status)) {
    throw new AppError('Choose approved, rejected or received', 400);
  }
  if (admin_note !== undefined && admin_note !== null && typeof admin_note !== 'string') {
    throw new AppError('Admin note must be text', 400);
  }
  if (typeof admin_note === 'string' && admin_note.length > 1000) {
    throw new AppError('Admin note cannot exceed 1000 characters', 400);
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
    const order = await client.query('SELECT status,order_number,user_id FROM orders WHERE id=$1 FOR UPDATE', [request.order_id]);
    if (!order.rows[0]) throw new AppError('Associated order not found', 404);
    const note = `Return request ${status}: ${String(admin_note || 'No additional note').slice(0, 1000)}`;
    const updated = await client.query(
      `UPDATE return_requests SET status=$1,admin_note=$2,reviewed_by=$3,reviewed_at=NOW(),updated_at=NOW()
       WHERE id=$4 RETURNING *`,
      [status, admin_note ? String(admin_note).slice(0, 1000) : null, req.user!.userId, req.params.id]);
    // Record the return decision without falsely changing the order's delivery status.
    await client.query(
      'INSERT INTO order_status_history (order_id,status,note,created_by) VALUES ($1,$2,$3,$4)',
      [request.order_id, order.rows[0].status, note, req.user!.userId]);
    const returnRecipient = await client.query('SELECT email FROM users WHERE id=$1', [order.rows[0].user_id]);
    const returnEmail = returnRecipient.rows[0]?.email;
    if (typeof returnEmail === 'string' && returnEmail.trim()) {
      await enqueueTransactionalEmail(
        client,
        `return:${request.id}:decision:${status}`,
        'return_decision',
        returnEmail,
        { orderNumber: order.rows[0].order_number, returnStatus: status, note: admin_note || '' },
      );
    }
    await client.query('COMMIT');
    return res.json({ success: true, data: updated.rows[0] });
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
});


/* ── Legal policy drafts and publication ───────────────────────────── */
/* ── Customer grievances ─────────────────────────────────────────────── */
router.get('/grievances', authorize('admin'), async (_req: Request, res: Response) => {
  const result = await query(
    `SELECT id, ticket_number, customer_name, customer_email, customer_phone, order_number,
      subject, message, status, admin_note, acknowledged_at, resolution_due_at,
      resolved_at, created_at, updated_at
     FROM customer_grievances
     ORDER BY CASE WHEN status IN ('resolved', 'rejected') THEN 1 ELSE 0 END,
       resolution_due_at ASC, created_at ASC
     LIMIT 200`
  );
  return res.json({ success: true, data: result.rows });
});

router.patch('/grievances/:id', authorize('admin'), async (req: Request, res: Response) => {
  const { status, admin_note } = req.body || {};
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(req.params.id)) {
    throw new AppError('Invalid grievance reference', 400);
  }
  if (!['open', 'in_progress', 'resolved', 'rejected'].includes(status)) {
    throw new AppError('Choose a valid grievance status', 400);
  }
  if (admin_note !== undefined && (typeof admin_note !== 'string' || admin_note.trim().length > 5000)) {
    throw new AppError('Internal note must be 5000 characters or fewer', 400);
  }
  const result = await query(
    `UPDATE customer_grievances
     SET status=$1, admin_note=COALESCE($2, admin_note),
         resolved_at=CASE WHEN $1='resolved' THEN COALESCE(resolved_at, NOW()) ELSE NULL END,
         updated_by=$3, updated_at=NOW()
     WHERE id=$4
     RETURNING id, ticket_number, status, admin_note, acknowledged_at, resolution_due_at, resolved_at, updated_at`,
    [status, admin_note === undefined ? null : admin_note.trim(), req.user!.userId, req.params.id]
  );
  if (!result.rows[0]) throw new AppError('Grievance not found', 404);
  return res.json({ success: true, data: result.rows[0] });
});

router.get('/legal-policies', authorize('admin'), async (_req: Request, res: Response) => {
  const result = await query("SELECT setting_value,updated_at FROM store_settings WHERE setting_key='legal_policies'");
  if (!result.rows[0]) throw new AppError('Legal policy settings are not configured. Apply the reviewed legal-policy migration first.', 503);
  return res.json({ success: true, data: result.rows[0] });
});

router.put('/legal-policies', authorize('admin'), async (req: Request, res: Response) => {
  const value = req.body?.setting_value;
  if (!value || typeof value !== 'object' || Array.isArray(value) || !Array.isArray(value.policies)) {
    throw new AppError('Legal policy settings must include a policies array', 400);
  }
  const allowed = ['privacy', 'terms', 'shipping', 'returns'];
  const seen = new Set<string>();
  for (const policy of value.policies) {
    if (!policy || !allowed.includes(policy.slug) || seen.has(policy.slug) ||
        typeof policy.title !== 'string' || typeof policy.content !== 'string' ||
        !['draft', 'published'].includes(policy.status) || policy.content.length > 30000) {
      throw new AppError('Each policy needs a unique supported slug, title, content and valid status', 400);
    }
    seen.add(policy.slug);
    if (policy.status === 'published' && /\[(COMPANY|ADD |CONFIRM|PRIVACY|LEGAL ENTITY|OFFICIAL|COMPANY MUST)/i.test(policy.content)) {
      throw new AppError('Resolve all company-specific placeholders before publishing a policy', 400);
    }
  }
  if (allowed.some(slug => !seen.has(slug))) throw new AppError('All four policy documents must be retained', 400);

  const business = value.business_identity;
  const operations = value.operational_confirmation;
  if (!business || typeof business !== 'object' || Array.isArray(business) ||
      !operations || typeof operations !== 'object' || Array.isArray(operations)) {
    throw new AppError('Business identity and operational confirmation sections are required', 400);
  }
  const textFields = [
    'legal_name', 'registered_address', 'customer_care_email', 'customer_care_phone',
    'grievance_officer_name', 'grievance_officer_designation', 'grievance_email', 'grievance_phone',
  ];
  for (const field of textFields) {
    if (business[field] !== undefined && typeof business[field] !== 'string') {
      throw new AppError(`Business identity field ${field} must be text`, 400);
    }
  }
  if (business.gstin !== undefined && typeof business.gstin !== 'string') throw new AppError('GSTIN must be text', 400);
  if (!['unverified', 'verified', 'not_registered'].includes(business.gst_status)) {
    throw new AppError('Choose a valid GST registration status', 400);
  }
  const gstin = String(business.gstin || '').trim().toUpperCase();
  if (business.gst_status === 'verified' && !/^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(gstin)) {
    throw new AppError('A GSTIN in the expected 15-character format is required for company-confirmed GST registration', 400);
  }
  if (business.gst_status === 'not_registered' && gstin) {
    throw new AppError('Remove the GSTIN when the company confirms it is not registered', 400);
  }
  if (business.confirmed !== undefined && typeof business.confirmed !== 'boolean') {
    throw new AppError('Business identity confirmation must be a boolean', 400);
  }

  if (business.confirmed === true &&
      (textFields.some(field => !String(business[field] || '').trim()) ||
       !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(business.customer_care_email)) ||
       !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(business.grievance_email)) ||
       business.gst_status === 'unverified')) {
    throw new AppError('Complete and validate every business disclosure field and confirm GST status before making disclosures public', 400);
  }

  const operationTextFields = [
    'shipping_coverage', 'dispatch_sla', 'delivery_estimate', 'return_conditions',
    'return_shipping_rule', 'refund_sla', 'cod_refund_method', 'confirmed_by',
  ];
  for (const field of operationTextFields) {
    if (operations[field] !== undefined && typeof operations[field] !== 'string') {
      throw new AppError(`Operational field ${field} must be text`, 400);
    }
  }
  if (operations.return_window_days !== undefined && operations.return_window_days !== null &&
      (!Number.isInteger(operations.return_window_days) || operations.return_window_days < 0 || operations.return_window_days > 365)) {
    throw new AppError('Return window must be a whole number between 0 and 365 days', 400);
  }

  if (value.policies.some((policy: any) => policy.status === 'published')) {
    const requiredIdentity = [...textFields];
    if (requiredIdentity.some(field => !String(business[field] || '').trim()) ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(business.customer_care_email)) ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(business.grievance_email)) ||
        !business.confirmed || business.gst_status === 'unverified') {
      throw new AppError('Confirm the complete legal business identity, customer-care and grievance contacts, and GST registration status before publishing policies', 400);
    }
    if (!String(operations.shipping_coverage || '').trim() || !String(operations.dispatch_sla || '').trim() ||
        !String(operations.delivery_estimate || '').trim() || !Number.isInteger(operations.return_window_days) ||
        !String(operations.return_conditions || '').trim() || !String(operations.return_shipping_rule || '').trim() ||
        !String(operations.refund_sla || '').trim() || !String(operations.cod_refund_method || '').trim() ||
        !String(operations.confirmed_by || '').trim()) {
      throw new AppError('Confirm actual shipping, return, refund and COD operating terms before publishing policies', 400);
    }
  }

  const result = await query(
    `UPDATE store_settings SET setting_value=$1,updated_by=$2,updated_at=NOW()
     WHERE setting_key='legal_policies' RETURNING setting_value,updated_at`,
    [JSON.stringify({ ...value, last_reviewed_at: new Date().toISOString() }), req.user!.userId]
  );
  if (!result.rows[0]) throw new AppError('Legal policy settings are not configured', 503);
  return res.json({ success: true, data: result.rows[0] });
});

export default router;
