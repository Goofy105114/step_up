-- ============================================================
-- D2C Footwear Brand - Seed Data
-- ============================================================

-- Categories
INSERT INTO categories (id, name, slug, description, sort_order) VALUES
  ('a1000000-0000-0000-0000-000000000001', 'Men''s Footwear', 'mens', 'Premium footwear for men', 1),
  ('a1000000-0000-0000-0000-000000000002', 'Women''s Footwear', 'womens', 'Elegant footwear for women', 2),
  ('a1000000-0000-0000-0000-000000000003', 'Kids'' Footwear', 'kids', 'Comfortable footwear for kids', 3),
  ('a1000000-0000-0000-0000-000000000004', 'Sports & Athletic', 'sports', 'High-performance sports shoes', 4),
  ('a1000000-0000-0000-0000-000000000005', 'Casual', 'casual', 'Everyday casual wear', 5),
  ('a1000000-0000-0000-0000-000000000006', 'Formal', 'formal', 'Office and formal occasions', 6),
  ('a1000000-0000-0000-0000-000000000007', 'Sandals & Slippers', 'sandals', 'Open footwear collection', 7)
ON CONFLICT (slug) DO NOTHING;

-- Products
INSERT INTO products (id, name, slug, description, short_description, category_id, base_price, sale_price, is_featured, is_new_arrival, is_bestseller, tags, avg_rating, review_count) VALUES
  (
    'b1000000-0000-0000-0000-000000000001',
    'CloudStep Runner Pro',
    'cloudstep-runner-pro',
    'Experience the ultimate in running comfort with our CloudStep Runner Pro. Engineered with advanced foam technology and breathable mesh upper, these shoes provide superior cushioning and support for every stride. Perfect for both road running and gym workouts.',
    'Advanced cushioning running shoe with breathable mesh upper',
    'a1000000-0000-0000-0000-000000000004',
    3999.00, 3199.00, true, true, false,
    ARRAY['running', 'sports', 'mens', 'cushioning'],
    4.6, 128
  ),
  (
    'b1000000-0000-0000-0000-000000000002',
    'UrbanGrace Heel',
    'urbangrace-heel',
    'The UrbanGrace Heel combines contemporary fashion with all-day comfort. Crafted from genuine leather with a padded insole and stable block heel, it transitions effortlessly from office to evening. Available in classic and bold colorways.',
    'Stylish block heel for work and evening wear',
    'a1000000-0000-0000-0000-000000000006',
    4599.00, NULL, true, false, true,
    ARRAY['heels', 'formal', 'womens', 'leather'],
    4.8, 94
  ),
  (
    'b1000000-0000-0000-0000-000000000003',
    'TerraTrek Hiker',
    'terratrek-hiker',
    'Built for the trails, the TerraTrek Hiker delivers rugged durability and ankle support you can rely on. Waterproof nubuck upper, Vibram outsole, and EVA midsole make this your go-to companion for outdoor adventures.',
    'Waterproof trail-ready hiking boot',
    'a1000000-0000-0000-0000-000000000001',
    5999.00, 4999.00, false, true, false,
    ARRAY['hiking', 'outdoor', 'mens', 'waterproof'],
    4.5, 67
  ),
  (
    'b1000000-0000-0000-0000-000000000004',
    'SoftStep Kids Velcro',
    'softstep-kids-velcro',
    'Designed specifically for active kids, the SoftStep Velcro features easy-close straps, a flexible sole that supports natural foot development, and extra cushioning for all-day play. Machine-washable upper.',
    'Easy velcro kids shoe with flexible sole',
    'a1000000-0000-0000-0000-000000000003',
    1999.00, 1699.00, false, false, true,
    ARRAY['kids', 'velcro', 'school', 'flexible'],
    4.7, 203
  ),
  (
    'b1000000-0000-0000-0000-000000000005',
    'StreetVibe Sneaker',
    'streetvibe-sneaker',
    'The StreetVibe Sneaker is where street culture meets premium comfort. Canvas upper with vulcanized rubber sole, padded collar, and tonal laces. A versatile everyday shoe that pairs with anything.',
    'Classic canvas sneaker for everyday wear',
    'a1000000-0000-0000-0000-000000000005',
    2499.00, NULL, true, false, true,
    ARRAY['sneakers', 'casual', 'unisex', 'canvas'],
    4.4, 312
  ),
  (
    'b1000000-0000-0000-0000-000000000006',
    'CloudFloat Slide',
    'cloudfloat-slide',
    'Ultra-lightweight EVA slides with a contoured footbed and anti-slip outsole. Perfect for home, poolside, or quick errands. The CloudFloat Slide delivers unmatched comfort in a minimalist design.',
    'Lightweight EVA slides with contoured footbed',
    'a1000000-0000-0000-0000-000000000007',
    999.00, 799.00, false, false, true,
    ARRAY['slides', 'casual', 'unisex', 'lightweight'],
    4.3, 445
  ),
  (
    'b1000000-0000-0000-0000-000000000007',
    'BlazeKick Football Boot',
    'blazekick-football-boot',
    'Dominate the pitch with the BlazeKick Football Boot. Synthetic leather upper for superior ball feel, stud configuration optimised for natural grass, and a snug anatomical fit. Recommended by professional coaches.',
    'Professional-grade football boot for natural grass',
    'a1000000-0000-0000-0000-000000000004',
    3499.00, 2999.00, false, true, false,
    ARRAY['football', 'sports', 'mens', 'studs'],
    4.6, 89
  ),
  (
    'b1000000-0000-0000-0000-000000000008',
    'ElegantStep Ballerina',
    'elegantstep-ballerina',
    'Timeless ballerina flats crafted from supple faux leather with a cushioned insole and flexible rubber outsole. The ElegantStep Ballerina is a wardrobe essential that takes you from desk to dinner.',
    'Cushioned ballerina flat for all-day comfort',
    'a1000000-0000-0000-0000-000000000002',
    1799.00, NULL, true, false, false,
    ARRAY['flats', 'formal', 'womens', 'ballerina'],
    4.5, 176
  )
ON CONFLICT (slug) DO NOTHING;

-- Product Variants
INSERT INTO product_variants (product_id, size, color, color_hex, stock_qty, sku) VALUES
  -- CloudStep Runner Pro (Men's)
  ('b1000000-0000-0000-0000-000000000001', '7',  'Black/White', '#000000', 25, 'CSR-BW-7'),
  ('b1000000-0000-0000-0000-000000000001', '8',  'Black/White', '#000000', 30, 'CSR-BW-8'),
  ('b1000000-0000-0000-0000-000000000001', '9',  'Black/White', '#000000', 28, 'CSR-BW-9'),
  ('b1000000-0000-0000-0000-000000000001', '10', 'Black/White', '#000000', 20, 'CSR-BW-10'),
  ('b1000000-0000-0000-0000-000000000001', '11', 'Black/White', '#000000', 15, 'CSR-BW-11'),
  ('b1000000-0000-0000-0000-000000000001', '8',  'Navy Blue',   '#1B2A6B', 22, 'CSR-NB-8'),
  ('b1000000-0000-0000-0000-000000000001', '9',  'Navy Blue',   '#1B2A6B', 18, 'CSR-NB-9'),
  ('b1000000-0000-0000-0000-000000000001', '10', 'Navy Blue',   '#1B2A6B', 20, 'CSR-NB-10'),
  -- UrbanGrace Heel
  ('b1000000-0000-0000-0000-000000000002', '5',  'Black',       '#111111', 15, 'UGH-BK-5'),
  ('b1000000-0000-0000-0000-000000000002', '6',  'Black',       '#111111', 20, 'UGH-BK-6'),
  ('b1000000-0000-0000-0000-000000000002', '7',  'Black',       '#111111', 18, 'UGH-BK-7'),
  ('b1000000-0000-0000-0000-000000000002', '6',  'Nude',        '#D4A574', 12, 'UGH-NU-6'),
  ('b1000000-0000-0000-0000-000000000002', '7',  'Nude',        '#D4A574', 10, 'UGH-NU-7'),
  -- StreetVibe Sneaker
  ('b1000000-0000-0000-0000-000000000005', '6',  'White',       '#FFFFFF', 40, 'SVS-WH-6'),
  ('b1000000-0000-0000-0000-000000000005', '7',  'White',       '#FFFFFF', 45, 'SVS-WH-7'),
  ('b1000000-0000-0000-0000-000000000005', '8',  'White',       '#FFFFFF', 38, 'SVS-WH-8'),
  ('b1000000-0000-0000-0000-000000000005', '9',  'White',       '#FFFFFF', 30, 'SVS-WH-9'),
  ('b1000000-0000-0000-0000-000000000005', '7',  'Black',       '#111111', 35, 'SVS-BK-7'),
  ('b1000000-0000-0000-0000-000000000005', '8',  'Black',       '#111111', 32, 'SVS-BK-8'),
  -- CloudFloat Slide
  ('b1000000-0000-0000-0000-000000000006', 'S',  'Black',       '#111111', 60, 'CFS-BK-S'),
  ('b1000000-0000-0000-0000-000000000006', 'M',  'Black',       '#111111', 80, 'CFS-BK-M'),
  ('b1000000-0000-0000-0000-000000000006', 'L',  'Black',       '#111111', 70, 'CFS-BK-L'),
  ('b1000000-0000-0000-0000-000000000006', 'M',  'White',       '#FFFFFF', 50, 'CFS-WH-M'),
  ('b1000000-0000-0000-0000-000000000006', 'L',  'White',       '#FFFFFF', 45, 'CFS-WH-L'),
  -- SoftStep Kids
  ('b1000000-0000-0000-0000-000000000004', '1',  'Blue',        '#3B82F6', 30, 'SSK-BL-1'),
  ('b1000000-0000-0000-0000-000000000004', '2',  'Blue',        '#3B82F6', 35, 'SSK-BL-2'),
  ('b1000000-0000-0000-0000-000000000004', '3',  'Blue',        '#3B82F6', 28, 'SSK-BL-3'),
  ('b1000000-0000-0000-0000-000000000004', '2',  'Pink',        '#EC4899', 25, 'SSK-PK-2'),
  ('b1000000-0000-0000-0000-000000000004', '3',  'Pink',        '#EC4899', 22, 'SSK-PK-3')
ON CONFLICT (sku) DO NOTHING;

-- Product Images (using placeholder URLs — replace with real CDN in production)
INSERT INTO product_images (product_id, url, alt_text, is_primary, sort_order) VALUES
  ('b1000000-0000-0000-0000-000000000001', 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800', 'CloudStep Runner Pro - Black', true,  1),
  ('b1000000-0000-0000-0000-000000000001', 'https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=800', 'CloudStep Runner Pro - Side', false, 2),
  ('b1000000-0000-0000-0000-000000000002', 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=800', 'UrbanGrace Heel - Black', true,  1),
  ('b1000000-0000-0000-0000-000000000003', 'https://images.unsplash.com/photo-1486915309851-b0cc1f8a0084?w=800', 'TerraTrek Hiker', true,  1),
  ('b1000000-0000-0000-0000-000000000004', 'https://images.unsplash.com/photo-1555384843-9e44cdde36b6?w=800', 'SoftStep Kids Velcro', true,  1),
  ('b1000000-0000-0000-0000-000000000005', 'https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?w=800', 'StreetVibe Sneaker - White', true,  1),
  ('b1000000-0000-0000-0000-000000000005', 'https://images.unsplash.com/photo-1491553895911-0055eca6402d?w=800', 'StreetVibe Sneaker - Side', false, 2),
  ('b1000000-0000-0000-0000-000000000006', 'https://images.unsplash.com/photo-1603487742131-4160ec999306?w=800', 'CloudFloat Slide', true,  1),
  ('b1000000-0000-0000-0000-000000000007', 'https://images.unsplash.com/photo-1556906781-9a414e2a9c86?w=800', 'BlazeKick Football Boot', true,  1),
  ('b1000000-0000-0000-0000-000000000008', 'https://images.unsplash.com/photo-1603487742131-4160ec999306?w=800', 'ElegantStep Ballerina', true,  1)
ON CONFLICT DO NOTHING;

-- Coupon
INSERT INTO coupons (code, description, discount_type, discount_value, min_order_amount, max_uses) VALUES
  ('WELCOME10', 'Welcome discount for new customers', 'percentage', 10, 999, 1000),
  ('FLAT500',   'Flat ₹500 off on orders above ₹3000',  'fixed',      500, 3000, 500),
  ('SUMMER20',  'Summer sale 20% off',                   'percentage', 20, 1500, NULL)
ON CONFLICT (code) DO NOTHING;
