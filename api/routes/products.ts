import { Router, Request, Response } from 'express';
import { query } from '../db/pool';
import { AppError } from '../middleware/errorHandler';
const router = Router();
router.get('/', async (req: Request, res: Response) => {
  const { page='1', limit='12', category, search, min_price, max_price, sort='created_at', order='desc', featured, new_arrival, bestseller, tags } = req.query as Record<string,string>;
  const safePage=Math.max(1,Number.parseInt(page,10)||1), safeLimit=Math.min(48,Math.max(1,Number.parseInt(limit,10)||12)), offset=(safePage-1)*safeLimit;
  const conditions:string[]=['p.is_active=true']; const params:unknown[]=[]; let pIdx=1;
  if(category){conditions.push(`c.slug = $${pIdx++}`);params.push(category.trim());}
  if(search?.trim()){conditions.push(`(p.name ILIKE $${pIdx} OR p.description ILIKE $${pIdx} OR p.short_description ILIKE $${pIdx})`);params.push(`%${search.trim()}%`);pIdx++;}
  if(min_price&&Number.isFinite(Number(min_price))){conditions.push(`COALESCE(p.sale_price,p.base_price) >= $${pIdx++}`);params.push(Number(min_price));}
  if(max_price&&Number.isFinite(Number(max_price))){conditions.push(`COALESCE(p.sale_price,p.base_price) <= $${pIdx++}`);params.push(Number(max_price));}
  if(featured==='true')conditions.push('p.is_featured=true');
  if(new_arrival==='true')conditions.push('p.is_new_arrival=true');
  if(bestseller==='true')conditions.push('p.is_bestseller=true');
  if(tags?.trim()){const tagList=tags.split(',').map(tag=>tag.trim()).filter(Boolean);if(tagList.length){conditions.push(`p.tags && $${pIdx++}::text[]`);params.push(tagList);}}
  const where=`WHERE ${conditions.join(' AND ')}`;
  const sortMap:Record<string,string>={created_at:'p.created_at',price:'COALESCE(p.sale_price,p.base_price)',rating:'p.avg_rating',name:'p.name'};
  const orderBy=`${sortMap[sort]||'p.created_at'} ${order==='asc'?'ASC':'DESC'}`;
  const countRes=await query(`SELECT COUNT(*) FROM products p LEFT JOIN categories c ON p.category_id=c.id ${where}`,params);
  const total=Number.parseInt(countRes.rows[0].count,10);
  const dataRes=await query(`SELECT p.*,c.name AS category_name,c.slug AS category_slug,
    (SELECT url FROM product_images WHERE product_id=p.id AND is_primary=true LIMIT 1) AS primary_image,
    (SELECT json_agg(json_build_object('id',pv.id,'size',pv.size,'color',pv.color,'color_hex',pv.color_hex,'stock_qty',pv.stock_qty)) FROM product_variants pv WHERE pv.product_id=p.id) AS variants
    FROM products p LEFT JOIN categories c ON p.category_id=c.id ${where}
    ORDER BY ${orderBy} LIMIT $${pIdx++} OFFSET $${pIdx++}`,[...params,safeLimit,offset]);
  return res.json({success:true,data:dataRes.rows,pagination:{page:safePage,limit:safeLimit,total,pages:Math.ceil(total/safeLimit)}});
});
router.get('/tags',async(_req:Request,res:Response)=>{
  const result=await query(`SELECT DISTINCT tag.value AS tag FROM products p CROSS JOIN LATERAL UNNEST(COALESCE(p.tags,ARRAY[]::TEXT[])) AS tag(value) WHERE p.is_active=true AND NULLIF(BTRIM(tag.value),'') IS NOT NULL ORDER BY tag.value`);
  return res.json({success:true,data:result.rows.map(row=>row.tag)});
});
router.get('/:slug',async(req:Request,res:Response)=>{
  const result=await query(`SELECT p.*,c.name AS category_name,c.slug AS category_slug,
    (SELECT json_agg(json_build_object('id',pi.id,'url',pi.url,'alt_text',pi.alt_text,'is_primary',pi.is_primary,'sort_order',pi.sort_order) ORDER BY pi.sort_order) FROM product_images pi WHERE pi.product_id=p.id) AS images,
    (SELECT json_agg(json_build_object('id',pv.id,'size',pv.size,'color',pv.color,'color_hex',pv.color_hex,'stock_qty',pv.stock_qty,'sku',pv.sku,'price_adj',pv.price_adj) ORDER BY pv.size,pv.color) FROM product_variants pv WHERE pv.product_id=p.id) AS variants,
    (SELECT json_agg(json_build_object('id',r.id,'rating',r.rating,'title',r.title,'body',r.body,'created_at',r.created_at,'user_name',u.first_name||' '||LEFT(u.last_name,1)||'.') ORDER BY r.created_at DESC) FROM reviews r JOIN users u ON u.id=r.user_id WHERE r.product_id=p.id AND r.is_approved=true) AS reviews
    FROM products p LEFT JOIN categories c ON p.category_id=c.id WHERE p.slug=$1 AND p.is_active=true`,[req.params.slug]);
  if(!result.rows[0])throw new AppError('Product not found',404);
  return res.json({success:true,data:result.rows[0]});
});
export default router;
