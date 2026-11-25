import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../store/authStore';
import { useCartStore } from '../../store/cartStore';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import { useState } from 'react';

interface Product {
  id: string;
  name: string;
  slug: string;
  brand?: string;
  base_price: string;
  sale_price?: string;
  primary_image?: string;
  avg_rating?: string;
  review_count?: number;
  is_new_arrival?: boolean;
  is_bestseller?: boolean;
  is_featured?: boolean;
  category_name?: string;
  variants?: { id: string; size: string; color: string; stock_qty: number }[];
}

export default function ProductCard({ product }: { product: Product }) {
  const { user } = useAuthStore();
  const { fetchCart } = useCartStore();
  const [addingCart, setAddingCart] = useState(false);
  const queryClient = useQueryClient();
  const { data: wishlistData } = useQuery({
    queryKey: ['wishlist'],
    queryFn: () => api.get('/wishlist').then(response => response.data),
    enabled: !!user,
  });
  const wishlisted = wishlistData?.data?.some((item: any) => item.product_id === product.id) || false;

  const basePrice = parseFloat(product.base_price);
  const salePrice = product.sale_price ? parseFloat(product.sale_price) : null;
  const displayPrice = salePrice ?? basePrice;
  const discount = salePrice ? Math.round(((basePrice - salePrice) / basePrice) * 100) : 0;

  const handleQuickAdd = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!user) { toast.error('Please sign in to add to cart'); return; }
    const firstAvailable = product.variants?.find(v => v.stock_qty > 0);
    if (!firstAvailable) { toast.error('Out of stock'); return; }
    setAddingCart(true);
    try {
      await api.post('/cart/items', { product_id: product.id, variant_id: firstAvailable.id, quantity: 1 });
      await fetchCart();
      toast.success(`${product.name} added to cart!`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to add to cart');
    } finally { setAddingCart(false); }
  };

  const handleWishlist = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!user) { toast.error('Please sign in to save items'); return; }
    try {
      if (wishlisted) {
        await api.delete(`/wishlist/${product.id}`);
      } else {
        await api.post('/wishlist', { product_id: product.id });
        toast.success('Saved to wishlist');
      }
      await queryClient.invalidateQueries({ queryKey: ['wishlist'] });
      if (wishlisted) toast.success('Removed from wishlist');
    } catch (err: any) { toast.error(err.response?.data?.message || 'Unable to update wishlist'); }
  };

  return (
    <Link to={`/product/${product.slug}`} className="group product-card block">
      {/* Image */}
      <div className="relative overflow-hidden bg-surface-container-low aspect-[4/5]">
        {product.primary_image ? (
          <img
            src={product.primary_image}
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="material-symbols-outlined text-[48px] text-outline">photo</span>
          </div>
        )}

        {/* Badges */}
        <div className="absolute top-space-sm left-space-sm flex flex-col gap-1">
          {discount > 0 && (
            <span className="badge bg-primary-container text-on-primary">-{discount}%</span>
          )}
          {product.is_new_arrival && !discount && (
            <span className="badge bg-secondary-container text-on-secondary-container">New</span>
          )}
          {product.is_bestseller && (
            <span className="badge bg-tertiary-fixed text-tertiary">Best Seller</span>
          )}
        </div>

        {/* Wishlist */}
        <button
          onClick={handleWishlist}
          className="absolute top-space-sm right-space-sm w-9 h-9 rounded-full bg-surface/80 backdrop-blur-sm flex items-center justify-center text-on-surface-variant hover:text-error transition-colors shadow-sm opacity-0 group-hover:opacity-100"
        >
          <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: wishlisted ? "'FILL' 1" : "'FILL' 0" }}>
            favorite
          </span>
        </button>

        {/* Quick add button */}
        <div className="absolute bottom-0 left-0 right-0 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
          <button
            onClick={handleQuickAdd}
            disabled={addingCart}
            className="w-full bg-primary-container text-on-primary py-space-sm text-label-md font-semibold tracking-[0.04em] hover:bg-primary transition-colors flex items-center justify-center gap-space-xs disabled:opacity-70"
          >
            <span className="material-symbols-outlined text-[18px]">shopping_bag</span>
            {addingCart ? 'Adding...' : 'Quick Add'}
          </button>
        </div>
      </div>

      {/* Info */}
      <div className="p-space-md">
        {product.brand && (
          <p className="text-label-badge font-bold uppercase tracking-[0.06em] text-on-surface-variant mb-1">{product.brand}</p>
        )}
        <h3 className="text-title-md font-semibold text-on-surface group-hover:text-primary transition-colors line-clamp-2 leading-snug mb-space-sm">
          {product.name}
        </h3>

        {/* Rating */}
        {product.avg_rating && parseFloat(product.avg_rating) > 0 && (
          <div className="flex items-center gap-1 mb-space-sm">
            <div className="flex text-[#f59e0b]">
              {[1,2,3,4,5].map(i => (
                <span key={i} className="material-symbols-outlined text-[13px]" style={{ fontVariationSettings: i <= Math.round(parseFloat(product.avg_rating!)) ? "'FILL' 1" : "'FILL' 0" }}>
                  star
                </span>
              ))}
            </div>
            <span className="text-body-sm text-on-surface-variant">
              {parseFloat(product.avg_rating).toFixed(1)} ({product.review_count})
            </span>
          </div>
        )}

        {/* Price */}
        <div className="flex items-center gap-space-sm">
          <span className="text-title-md font-semibold text-primary">
            {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(displayPrice)}
          </span>
          {salePrice && (
            <span className="text-body-sm text-on-surface-variant line-through">
              {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(basePrice)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
