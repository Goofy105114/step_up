import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '../lib/api';
import { formatPrice } from '../lib/formatters';
import { Heart, Trash2, ShoppingBag } from 'lucide-react';
import { useCartStore } from '../store/cartStore';
import toast from 'react-hot-toast';

export default function WishlistPage() {
  const qc = useQueryClient();
  const { addItem } = useCartStore();

  const { data, isLoading } = useQuery({
    queryKey: ['wishlist'],
    queryFn: () => api.get('/wishlist').then((r) => r.data),
  });

  const removeMutation = useMutation({
    mutationFn: (productId: string) => api.delete(`/wishlist/${productId}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['wishlist'] }); toast.success('Removed from wishlist'); },
  });

  const items = data?.data || [];

  if (isLoading) return (
    <div className="container-custom py-8 grid grid-cols-2 md:grid-cols-4 gap-5">
      {Array(4).fill(0).map((_, i) => <div key={i} className="card skeleton aspect-[3/4]" />)}
    </div>
  );

  return (
    <div className="container-custom py-8 pb-20">
      <h1 className="text-3xl font-display font-bold mb-8 flex items-center gap-3">
        <Heart size={28} className="text-brand-500" /> Wishlist
        <span className="text-lg font-normal text-gray-500">({items.length})</span>
      </h1>

      {items.length === 0 ? (
        <div className="text-center py-24">
          <Heart size={56} className="mx-auto text-gray-200 mb-5" />
          <p className="text-gray-500 mb-6">Your wishlist is empty. Save items you love!</p>
          <Link to="/shop" className="btn-primary">Browse Products</Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {items.map((item: any) => (
            <div key={item.id} className="card group overflow-hidden">
              <div className="relative aspect-square bg-gray-50">
                {item.image_url ? (
                  <img src={item.image_url} alt={item.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                ) : <div className="w-full h-full bg-gray-200" />}
                <button onClick={() => removeMutation.mutate(item.product_id)}
                  className="absolute top-2 right-2 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-sm hover:bg-red-50 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100">
                  <Trash2 size={14} />
                </button>
              </div>
              <div className="p-4 space-y-2">
                <Link to={`/product/${item.slug}`} className="font-medium text-sm text-gray-900 hover:text-brand-600 line-clamp-2 leading-tight">
                  {item.name}
                </Link>
                <p className="font-bold text-gray-900">{formatPrice(item.price)}</p>
                <button onClick={() => toast('Select size on product page', { icon: '👟' })}
                  className="btn-primary w-full text-sm py-2 flex items-center justify-center gap-2">
                  <ShoppingBag size={14} /> Add to Cart
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
