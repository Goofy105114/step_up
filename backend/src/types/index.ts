export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  role: 'customer' | 'admin' | 'staff';
  is_verified: boolean;
  avatar_url?: string;
  created_at: Date;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description?: string;
  short_description?: string;
  category_id?: string;
  base_price: number;
  sale_price?: number;
  is_active: boolean;
  is_featured: boolean;
  is_new_arrival: boolean;
  is_bestseller: boolean;
  tags?: string[];
  avg_rating: number;
  review_count: number;
  created_at: Date;
}

export interface ProductVariant {
  id: string;
  product_id: string;
  size: string;
  color: string;
  color_hex?: string;
  stock_qty: number;
  sku?: string;
}

export interface CartItem {
  id: string;
  cart_id: string;
  product_id: string;
  variant_id: string;
  quantity: number;
}

export interface Order {
  id: string;
  order_number: string;
  user_id?: string;
  status: string;
  subtotal: number;
  discount_amount: number;
  shipping_amount: number;
  tax_amount: number;
  total_amount: number;
  shipping_address: Address;
  payment_status: string;
  created_at: Date;
}

export interface Address {
  full_name: string;
  phone?: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
}

export interface JwtPayload {
  userId: string;
  email: string;
  role: string;
}

// Extend Express Request
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}
