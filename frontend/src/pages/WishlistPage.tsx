import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '../lib/api';
import { formatPrice } from '../lib/formatters';
import { Heart, Trash2, ShoppingBag } from 'lucide-react';
import { useCartStore } from '../store/cartStore';
import toast from 'react-hot-toast';

export default function WishlistPage() {
  const qc = useQueryClient();
  useCartStore();

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['wishlist'],
    queryFn: () => api.get('/wishlist').then((r) => r.data),
  });

  const removeMutation = useMutation({
    mutationFn: (productId: string) => api.delete(`/wishlist/${productId}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['wishlist'] }); toast.success('Removed from wishlist'); },
  });

  const items = data?.data || [];

  if (isLoading) return (
    <div className="bg-surface min-h-screen py-space-xl"><div className="max-w-site mx-auto px-margin-mobile md:px-margin grid grid-cols-2 md:grid-cols-4 gap-space-md">
      {Array(4).fill(0).map((_, i) => <div key={i} className="card skeleton aspect-[3/4]" />)}
    </div></div>
  );

  return (
    <div className="bg-surface min-h-screen py-space-xl">
      <div className="max-w-site mx-auto px-margin-mobile md:px-margin">
        <div className="flex flex-wrap items-end justify-between gap-space-md mb-space-xl">
          <div>
            <p className="text-label-badge font-bold uppercase tracking-[0.12em] text-secondary mb-2">Your STEPUP account</p>
            <h1 className="text-headline-lg font-semibold text-primary tracking-tight flex items-center gap-3"><Heart size={26} /> Saved Wishlist <span className="text-body-md font-medium text-on-surface-variant">({items.length})</span></h1>
            <p className="mt-2 text-body-md text-on-surface-variant">Products you've saved to revisit later.</p>
          </div>
          <Link to="/profile" className="btn-outline px-5 py-3">Account overview</Link>
        </div>

        {isError ? (
          <div role="alert" className="card max-w-2xl mx-auto p-space-xl text-center">
            <Heart size={40} className="mx-auto text-outline mb-space-md" />
            <h2 className="text-headline-sm font-semibold text-primary">We couldn't load your wishlist</h2>
            <p className="mt-2 text-body-md text-on-surface-variant">Your saved items haven't been changed. Please try again.</p>
            <button type="button" onClick={() => refetch()} disabled={isFetching} className="btn-primary mt-space-lg px-8 py-3">{isFetching ? 'Loading…' : 'Retry'}</button>
          </div>
        ) : items.length === 0 ? (
          <div className="card max-w-2xl mx-auto text-center py-space-2xl px-space-lg">
            <Heart size={52} className="mx-auto text-outline-variant mb-space-lg" strokeWidth={1.4} />
            <h2 className="text-headline-sm font-semibold text-primary mb-space-sm">Your wishlist is empty</h2>
            <p className="text-body-md text-on-surface-variant mb-space-lg">Save products that you'd like to explore again.</p>
            <Link to="/shop" className="btn-primary inline-flex px-8 py-3">Browse footwear</Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-space-md">
            {items.map((item: any) => (
              <article key={item.id} className="card group overflow-hidden">
                <div className="relative aspect-square bg-surface-container-low overflow-hidden">
                  {item.image_url ? <img src={item.image_url} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" /> : <div className="w-full h-full flex items-center justify-center"><span className="material-symbols-outlined text-[42px] text-outline">photo</span></div>}
                  <button type="button" onClick={() => removeMutation.mutate(item.product_id)} disabled={removeMutation.isPending} aria-label={`Remove ${item.name} from wishlist`} className="absolute top-3 right-3 h-9 w-9 rounded-full bg-surface-container-lowest text-error shadow-sm flex items-center justify-center hover:bg-error-container disabled:opacity-50">
                    <Trash2 size={16} />
                  </button>
                </div>
                <div className="p-space-md space-y-space-sm">
                  <Link to={`/product/${item.slug}`} className="block text-title-md font-semibold text-primary hover:underline line-clamp-2">{item.name}</Link>
                  <p className="text-title-md font-semibold text-primary">{formatPrice(Number(item.price))}</p>
                  <button type="button" onClick={() => toast('Choose an available size on the product page', { icon: '👟' })} className="btn-primary w-full py-3 flex items-center justify-center gap-2">
                    <ShoppingBag size={16} /> View sizes
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
