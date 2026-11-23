import { Link } from 'react-router-dom';
import { Heart, ShoppingBag, Eye, Star } from 'lucide-react';
import { useState } from 'react';
import { formatPrice, getDiscountPercent } from '../../lib/formatters';
import { useCartStore } from '../../store/cartStore';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';
import api from '../../lib/api';

interface Product {
  id: string; name: string; slug: string;
  base_price: number; sale_price?: number;
  avg_rating: number; review_count: number;
  primary_image?: string;
  is_new_arrival?: boolean; is_bestseller?: boolean; is_featured?: boolean;
  variants?: Array<{ id: string; size: string; color: string; color_hex?: string; stock_qty: number }>;
}

export default function ProductCard({ product }: { product: Product }) {
  const [wishlisted, setWishlisted] = useState(false);
  const [hovered, setHovered] = useState(false);
  const { addItem } = useCartStore();
  const { user } = useAuthStore();

  const price = product.sale_price || product.base_price;
  const firstVariant = product.variants?.find((v) => v.stock_qty > 0);
  const inStock = !!firstVariant;

  const handleQuickAdd = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!user) { toast.error('Please sign in to add to cart'); return; }
    if (!firstVariant) { toast.error('Out of stock'); return; }
    await addItem(product.id, firstVariant.id, 1);
  };

  const handleWishlist = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!user) { toast.error('Please sign in'); return; }
    try {
      if (wishlisted) {
        await api.delete(`/wishlist/${product.id}`);
        setWishlisted(false);
      } else {
        await api.post('/wishlist', { product_id: product.id });
        setWishlisted(true);
        toast.success('Added to wishlist ♥');
      }
    } catch { /* handled by axios */ }
  };

  return (
    <Link to={`/product/${product.slug}`}
      className="product-card block"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}>

      {/* Image container */}
      <div className="relative overflow-hidden bg-gray-50 aspect-square">
        {product.primary_image ? (
          <img src={product.primary_image} alt={product.name}
            className={`w-full h-full object-cover transition-transform duration-500 ${hovered ? 'scale-105' : 'scale-100'}`} />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-100">
            <ShoppingBag size={40} className="text-gray-300" />
          </div>
        )}

        {/* Badge */}
        {product.is_new_arrival && <span className="badge-new">New</span>}
        {product.sale_price && !product.is_new_arrival && (
          <span className="badge-sale">-{getDiscountPercent(product.base_price, product.sale_price)}%</span>
        )}
        {product.is_bestseller && !product.sale_price && !product.is_new_arrival && (
          <span className="badge-hot">Hot</span>
        )}
        {!inStock && (
          <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
            <span className="text-xs font-bold uppercase tracking-widest text-gray-400">Out of Stock</span>
          </div>
        )}

        {/* Hover actions */}
        <div className={`absolute bottom-0 left-0 right-0 flex items-center justify-center gap-0 transition-all duration-300 ${hovered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-full'}`}>
          {inStock && (
            <button onClick={handleQuickAdd}
              className="flex-1 bg-gray-900 hover:bg-brand-500 text-white text-xs font-semibold uppercase tracking-widest py-3 flex items-center justify-center gap-2 transition-colors">
              <ShoppingBag size={14} /> Add to Cart
            </button>
          )}
          <button onClick={handleWishlist}
            className={`w-11 py-3 flex items-center justify-center transition-colors ${wishlisted ? 'bg-brand-500 text-white' : 'bg-gray-800 text-white hover:bg-brand-500'}`}>
            <Heart size={14} fill={wishlisted ? 'currentColor' : 'none'} />
          </button>
          <Link to={`/product/${product.slug}`} onClick={(e) => e.stopPropagation()}
            className="w-11 py-3 bg-gray-700 text-white hover:bg-brand-500 flex items-center justify-center transition-colors">
            <Eye size={14} />
          </Link>
        </div>
      </div>

      {/* Info */}
      <div className="p-4 text-center border-t border-gray-100">
        <p className="text-xs text-gray-400 uppercase tracking-widest mb-1">StepUp</p>
        <h3 className="text-sm font-semibold text-gray-900 group-hover:text-brand-500 transition-colors line-clamp-1 leading-snug">
          {product.name}
        </h3>

        {/* Stars */}
        {product.review_count > 0 && (
          <div className="flex items-center justify-center gap-0.5 mt-1.5">
            {[1,2,3,4,5].map((s) => (
              <Star key={s} size={11}
                className={s <= Math.round(product.avg_rating) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200 fill-gray-200'} />
            ))}
            <span className="text-xs text-gray-400 ml-1">({product.review_count})</span>
          </div>
        )}

        {/* Price */}
        <div className="flex items-center justify-center gap-2 mt-2">
          {product.sale_price && (
            <span className="text-sm text-gray-400 line-through">{formatPrice(product.base_price)}</span>
          )}
          <span className={`text-sm font-bold ${product.sale_price ? 'text-brand-500' : 'text-gray-900'}`}>
            {formatPrice(price)}
          </span>
        </div>

        {/* Color swatches */}
        {product.variants && product.variants.length > 0 && (
          <div className="flex items-center justify-center gap-1 mt-2">
            {[...new Map(product.variants.map((v) => [v.color, v])).values()].slice(0, 5).map((v) => (
              <div key={v.color} title={v.color}
                className="w-3 h-3 rounded-full border border-gray-300"
                style={{ backgroundColor: v.color_hex || '#ccc' }} />
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}
