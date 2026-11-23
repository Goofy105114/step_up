import { Router, Request, Response } from 'express';
import { query } from '../db/pool';
import { AppError } from '../middleware/errorHandler';

const router = Router();

// GET /api/products - list with filters, pagination, sorting
router.get('/', async (req: Request, res: Response) => {
  const {
    page = '1', limit = '12', category, search,
    min_price, max_price, sort = 'created_at', order = 'desc',
    featured, new_arrival, bestseller, tags,
  } = req.query as Record<string, string>;

  const offset = (parseInt(page) - 1) * parseInt(limit);
  const conditions: string[] = ['p.is_active = true'];
  const params: unknown[] = [];
  let pIdx = 1;

  if (category) {
    conditions.push(`c.slug = $${pIdx++}`);
    params.push(category);
  }
  if (search) {
    conditions.push(`(p.name ILIKE $${pIdx} OR p.description ILIKE $${pIdx} OR $${pIdx} = ANY(p.tags))`);
    params.push(`%${search}%`);
    pIdx++;
  }
  if (min_price) { conditions.push(`COALESCE(p.sale_price, p.base_price) >= $${pIdx++}`); params.push(parseFloat(min_price)); }
  if (max_price) { conditions.push(`COALESCE(p.sale_price, p.base_price) <= $${pIdx++}`); params.push(parseFloat(max_price)); }
  if (featured === 'true') { conditions.push('p.is_featured = true'); }
  if (new_arrival === 'true') { conditions.push('p.is_new_arrival = true'); }
  if (bestseller === 'true') { conditions.push('p.is_bestseller = true'); }
  if (tags) {
    conditions.push(`p.tags && $${pIdx++}::text[]`);
    params.push(tags.split(','));
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const allowedSorts: Record<string, string> = {
    created_at: 'p.created_at', price: 'COALESCE(p.sale_price, p.base_price)',
    rating: 'p.avg_rating', name: 'p.name',
  };
  const orderBy = `${allowedSorts[sort] || 'p.created_at'} ${order === 'asc' ? 'ASC' : 'DESC'}`;

  const countRes = await query(
    `SELECT COUNT(*) FROM products p LEFT JOIN categories c ON p.category_id = c.id ${whereClause}`,
    params
  );
  const total = parseInt(countRes.rows[0].count);

  const dataRes = await query(
    `SELECT p.*, c.name AS category_name, c.slug AS category_slug,
            (SELECT url FROM product_images WHERE product_id = p.id AND is_primary = true LIMIT 1) AS primary_image,
            (SELECT json_agg(json_build_object('id',pv.id,'size',pv.size,'color',pv.color,'color_hex',pv.color_hex,'stock_qty',pv.stock_qty))
             FROM product_variants pv WHERE pv.product_id = p.id) AS variants
     FROM products p
     LEFT JOIN categories c ON p.category_id = c.id
     ${whereClause}
     ORDER BY ${orderBy}
     LIMIT $${pIdx++} OFFSET $${pIdx++}`,
    [...params, parseInt(limit), offset]
  );

  return res.json({
    success: true,
    data: dataRes.rows,
    pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) },
  });
});

// GET /api/products/:slug
router.get('/:slug', async (req: Request, res: Response) => {
  const result = await query(
    `SELECT p.*, c.name AS category_name, c.slug AS category_slug,
            (SELECT json_agg(json_build_object('id',pi.id,'url',pi.url,'alt_text',pi.alt_text,'is_primary',pi.is_primary,'sort_order',pi.sort_order,'variant_id',pi.variant_id) ORDER BY pi.sort_order)
             FROM product_images pi WHERE pi.product_id = p.id) AS images,
            (SELECT json_agg(json_build_object('id',pv.id,'size',pv.size,'color',pv.color,'color_hex',pv.color_hex,'stock_qty',pv.stock_qty,'sku',pv.sku,'price_adj',pv.price_adj))
             FROM product_variants pv WHERE pv.product_id = p.id) AS variants,
            (SELECT json_agg(json_build_object('id',r.id,'rating',r.rating,'title',r.title,'body',r.body,'created_at',r.created_at,'user_name', u.first_name || ' ' || LEFT(u.last_name,1) || '.') ORDER BY r.created_at DESC)
             FROM reviews r JOIN users u ON r.user_id = u.id WHERE r.product_id = p.id AND r.is_approved = true LIMIT 10) AS reviews
     FROM products p
     LEFT JOIN categories c ON p.category_id = c.id
     WHERE p.slug = $1 AND p.is_active = true`,
    [req.params.slug]
  );
  if (!result.rows[0]) throw new AppError('Product not found', 404);
  return res.json({ success: true, data: result.rows[0] });
});

export default router;
