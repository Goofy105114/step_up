import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../store/authStore';
import api from '../../lib/api';
import toast from 'react-hot-toast';

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
    <article className="group product-card">
      <div className="relative overflow-hidden bg-surface-container-low aspect-[4/5]">
        <Link to={`/product/${product.slug}`} aria-label={`View ${product.name}`} className="block w-full h-full">
          {product.primary_image ? (
            <img
              src={product.primary_image}
              alt={product.name}
              loading="lazy"
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="material-symbols-outlined text-[48px] text-outline" aria-hidden="true">photo</span>
              <span className="sr-only">No product image available</span>
            </div>
          )}
        </Link>

        <div className="absolute top-space-sm left-space-sm flex flex-col gap-1 pointer-events-none">
          {discount > 0 && <span className="badge bg-primary-container text-on-primary">-{discount}%</span>}
          {product.is_new_arrival && !discount && <span className="badge bg-secondary-container text-on-secondary-container">New</span>}
          {product.is_bestseller && <span className="badge bg-tertiary-fixed text-tertiary">Best Seller</span>}
        </div>

        <button
          type="button"
          onClick={handleWishlist}
          aria-label={wishlisted ? `Remove ${product.name} from wishlist` : `Save ${product.name} to wishlist`}
          aria-pressed={wishlisted}
          className="absolute top-space-sm right-space-sm w-10 h-10 rounded-full bg-surface/90 backdrop-blur-sm flex items-center justify-center text-on-surface-variant hover:text-error focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary transition-colors shadow-sm opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
        >
          <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: wishlisted ? "'FILL' 1" : "'FILL' 0" }} aria-hidden="true">
            favorite
          </span>
        </button>

        <Link
          to={`/product/${product.slug}`}
          className="absolute bottom-0 left-0 right-0 translate-y-0 sm:translate-y-full sm:group-hover:translate-y-0 sm:group-focus-within:translate-y-0 transition-transform duration-300 bg-primary-container text-on-primary py-space-sm text-label-md font-semibold tracking-[0.04em] hover:bg-primary flex items-center justify-center gap-space-xs"
        >
          View sizes &amp; details
          <span className="material-symbols-outlined text-[18px]" aria-hidden="true">arrow_forward</span>
        </Link>
      </div>

      <Link to={`/product/${product.slug}`} className="block p-space-md rounded-b-DEFAULT focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">
        {product.brand && (
          <p className="text-label-badge font-bold uppercase tracking-[0.06em] text-on-surface-variant mb-1">{product.brand}</p>
        )}
        <h3 className="text-title-md font-semibold text-on-surface group-hover:text-primary transition-colors line-clamp-2 leading-snug mb-space-sm">
          {product.name}
        </h3>

        {product.avg_rating && parseFloat(product.avg_rating) > 0 && (
          <div className="flex items-center gap-1 mb-space-sm" aria-label={`Rated ${parseFloat(product.avg_rating).toFixed(1)} out of 5 from ${product.review_count ?? 0} reviews`}>
            <div className="flex text-[#f59e0b]" aria-hidden="true">
              {[1, 2, 3, 4, 5].map(i => (
                <span key={i} className="material-symbols-outlined text-[13px]" style={{ fontVariationSettings: i <= Math.round(parseFloat(product.avg_rating!)) ? "'FILL' 1" : "'FILL' 0" }}>
                  star
                </span>
              ))}
            </div>
            <span className="text-body-sm text-on-surface-variant">
              {parseFloat(product.avg_rating).toFixed(1)} ({product.review_count ?? 0})
            </span>
          </div>
        )}

        <div className="flex flex-wrap items-baseline gap-space-sm">
          <span className="text-title-md font-semibold text-primary">
            {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(displayPrice)}
          </span>
          {salePrice !== null && (
            <span className="text-body-sm text-on-surface-variant line-through">
              {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(basePrice)}
            </span>
          )}
        </div>
      </Link>
    </article>
  );
}
