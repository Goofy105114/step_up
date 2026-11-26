import { Router, Request, Response } from 'express';
import { query } from '../db/pool';
import { AppError } from '../middleware/errorHandler';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  const readString = (key: string, fallback?: string): string | undefined => {
    const value = req.query[key];
    if (value === undefined) return fallback;
    if (typeof value !== 'string') {
      throw new AppError(`Query parameter ${key} must be supplied once as text`, 400);
    }
    return value;
  };

  const pageValue = readString('page', '1')!;
  const limitValue = readString('limit', '12')!;
  if (!/^\d+$/.test(pageValue) || !/^\d+$/.test(limitValue)) {
    throw new AppError('Page and limit must be positive whole numbers', 400);
  }
  const page = Number(pageValue);
  const limit = Number(limitValue);
  if (!Number.isSafeInteger(page) || page < 1 || page > 1000000) {
    throw new AppError('Page must be between 1 and 1000000', 400);
  }
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 48) {
    throw new AppError('Limit must be between 1 and 48', 400);
  }
  const offset = (page - 1) * limit;
  if (!Number.isSafeInteger(offset)) {
    throw new AppError('Requested product page is out of range', 400);
  }

  const category = readString('category');
  const search = readString('search');
  const minPriceValue = readString('min_price');
  const maxPriceValue = readString('max_price');
  const sort = readString('sort', 'created_at')!;
  const order = readString('order', 'desc')!;
  const tagsValue = readString('tags');

  if (category !== undefined && category.trim().length > 100) {
    throw new AppError('Category filter cannot exceed 100 characters', 400);
  }
  if (search !== undefined && search.trim().length > 200) {
    throw new AppError('Search query cannot exceed 200 characters', 400);
  }

  const parsePrice = (key: string, value: string | undefined): number | undefined => {
    if (value === undefined) return undefined;
    if (!/^\d+(?:\.\d{1,2})?$/.test(value.trim())) {
      throw new AppError(`${key} must be a non-negative amount with up to two decimal places`, 400);
    }
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) throw new AppError(`${key} is outside the supported range`, 400);
    return parsed;
  };
  const minPrice = parsePrice('min_price', minPriceValue);
  const maxPrice = parsePrice('max_price', maxPriceValue);
  if (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice) {
    throw new AppError('Minimum price cannot exceed maximum price', 400);
  }

  const sortMap: Record<string, string> = {
    created_at: 'p.created_at',
    price: 'COALESCE(p.sale_price,p.base_price)',
    rating: 'p.avg_rating',
    name: 'p.name',
  };
  if (!Object.prototype.hasOwnProperty.call(sortMap, sort)) {
    throw new AppError('Unsupported product sort field', 400);
  }
  if (order !== 'asc' && order !== 'desc') {
    throw new AppError('Sort order must be asc or desc', 400);
  }

  const readFlag = (key: string): boolean => {
    const value = readString(key);
    if (value === undefined || value === 'false') return false;
    if (value === 'true') return true;
    throw new AppError(`${key} must be true or false`, 400);
  };
  const featured = readFlag('featured');
  const newArrival = readFlag('new_arrival');
  const bestseller = readFlag('bestseller');

  let tagList: string[] = [];
  if (tagsValue !== undefined && tagsValue.trim()) {
    tagList = tagsValue.split(',').map(tag => tag.trim()).filter(Boolean);
    if (tagList.length > 20 || tagList.some(tag => tag.length > 50)) {
      throw new AppError('Provide at most 20 tags, each no longer than 50 characters', 400);
    }
    tagList = [...new Set(tagList)];
  }

  const conditions: string[] = ['p.is_active=true'];
  const params: unknown[] = [];
  let pIdx = 1;
  if (category?.trim()) {
    conditions.push(`c.slug = $${pIdx++}`);
    params.push(category.trim());
  }
  if (search?.trim()) {
    conditions.push(`(p.name ILIKE $${pIdx} OR p.description ILIKE $${pIdx} OR p.short_description ILIKE $${pIdx})`);
    params.push(`%${search.trim()}%`);
    pIdx++;
  }
  if (minPrice !== undefined) {
    conditions.push(`COALESCE(p.sale_price,p.base_price) >= $${pIdx++}`);
    params.push(minPrice);
  }
  if (maxPrice !== undefined) {
    conditions.push(`COALESCE(p.sale_price,p.base_price) <= $${pIdx++}`);
    params.push(maxPrice);
  }
  if (featured) conditions.push('p.is_featured=true');
  if (newArrival) conditions.push('p.is_new_arrival=true');
  if (bestseller) conditions.push('p.is_bestseller=true');
  if (tagList.length) {
    conditions.push(`p.tags && $${pIdx++}::text[]`);
    params.push(tagList);
  }

  const where = `WHERE ${conditions.join(' AND ')}`;
  const orderBy = `${sortMap[sort]} ${order.toUpperCase()}`;
  const countRes = await query(
    `SELECT COUNT(*) FROM products p LEFT JOIN categories c ON p.category_id=c.id ${where}`,
    params
  );
  const total = Number.parseInt(countRes.rows[0].count, 10);
  const dataRes = await query(
    `SELECT p.*,c.name AS category_name,c.slug AS category_slug,
      (SELECT url FROM product_images WHERE product_id=p.id AND is_primary=true LIMIT 1) AS primary_image,
      (SELECT json_agg(json_build_object('id',pv.id,'size',pv.size,'color',pv.color,'color_hex',pv.color_hex,'stock_qty',pv.stock_qty)) FROM product_variants pv WHERE pv.product_id=p.id) AS variants
      FROM products p LEFT JOIN categories c ON p.category_id=c.id ${where}
      ORDER BY ${orderBy} LIMIT $${pIdx++} OFFSET $${pIdx++}`,
    [...params, limit, offset]
  );
  return res.json({
    success: true,
    data: dataRes.rows,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
});

router.get('/tags', async (_req: Request, res: Response) => {
  const result = await query(
    `SELECT DISTINCT tag.value AS tag
     FROM products p
     CROSS JOIN LATERAL UNNEST(COALESCE(p.tags,ARRAY[]::TEXT[])) AS tag(value)
     WHERE p.is_active=true AND NULLIF(BTRIM(tag.value),'') IS NOT NULL
     ORDER BY tag.value`
  );
  return res.json({ success: true, data: result.rows.map(row => row.tag) });
});

router.get('/:slug', async (req: Request, res: Response) => {
  const result = await query(
    `SELECT p.*,c.name AS category_name,c.slug AS category_slug,
      (SELECT json_agg(json_build_object('id',pi.id,'url',pi.url,'alt_text',pi.alt_text,'is_primary',pi.is_primary,'sort_order',pi.sort_order) ORDER BY pi.sort_order) FROM product_images pi WHERE pi.product_id=p.id) AS images,
      (SELECT json_agg(json_build_object('id',pv.id,'size',pv.size,'color',pv.color,'color_hex',pv.color_hex,'stock_qty',pv.stock_qty,'sku',pv.sku,'price_adj',pv.price_adj) ORDER BY pv.size,pv.color) FROM product_variants pv WHERE pv.product_id=p.id) AS variants,
      (SELECT json_agg(json_build_object('id',r.id,'rating',r.rating,'title',r.title,'body',r.body,'created_at',r.created_at,'user_name',u.first_name||' '||LEFT(u.last_name,1)||'.') ORDER BY r.created_at DESC) FROM reviews r JOIN users u ON u.id=r.user_id WHERE r.product_id=p.id AND r.is_approved=true) AS reviews
      FROM products p LEFT JOIN categories c ON p.category_id=c.id WHERE p.slug=$1 AND p.is_active=true`,
    [req.params.slug]
  );
  if (!result.rows[0]) throw new AppError('Product not found', 404);
  return res.json({ success: true, data: result.rows[0] });
});

export default router;
