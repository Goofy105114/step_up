import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import { formatPrice, formatDate, formatOrderStatus, getStatusColor } from '../lib/formatters';
import { Package, ChevronRight } from 'lucide-react';

export default function OrdersPage() {
  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['orders'],
    queryFn: () => api.get('/orders').then((response) => response.data),
  });

  const orders = data?.data || [];

  if (isLoading) return (
    <div className="bg-surface min-h-screen py-space-xl">
      <div className="max-w-site mx-auto px-margin-mobile md:px-margin space-y-space-md">
        <div className="h-10 w-48 rounded bg-surface-container animate-pulse" />
        {Array.from({ length: 3 }).map((_, index) => <div key={index} className="card h-32 animate-pulse bg-surface-container-low" />)}
      </div>
    </div>
  );

  return (
    <div className="bg-surface min-h-screen py-space-xl">
      <div className="max-w-site mx-auto px-margin-mobile md:px-margin">
        <div className="flex flex-wrap items-end justify-between gap-space-md mb-space-xl">
          <div>
            <p className="text-label-badge font-bold uppercase tracking-[0.12em] text-secondary mb-2">Your STEPUP account</p>
            <h1 className="text-headline-lg font-semibold text-primary tracking-tight">My Orders</h1>
            <p className="mt-2 text-body-md text-on-surface-variant">Review your purchases and open an order for its latest details.</p>
          </div>
          <Link to="/profile" className="btn-outline px-5 py-3">Account overview</Link>
        </div>

        {isError ? (
          <div role="alert" className="card max-w-2xl p-space-xl text-center mx-auto">
            <Package size={40} className="mx-auto text-outline mb-space-md" />
            <h2 className="text-headline-sm font-semibold text-primary">We couldn't load your orders</h2>
            <p className="mt-2 text-body-md text-on-surface-variant">Your order history hasn't been changed. Try loading it again.</p>
            <button type="button" onClick={() => refetch()} disabled={isFetching} className="btn-primary mt-space-lg px-8 py-3">{isFetching ? 'Loading…' : 'Retry'}</button>
          </div>
        ) : orders.length === 0 ? (
          <div className="card max-w-2xl mx-auto px-space-lg py-space-2xl text-center">
            <Package size={52} className="mx-auto text-outline-variant mb-space-lg" strokeWidth={1.4} />
            <h2 className="text-headline-sm font-semibold text-primary mb-space-sm">No orders yet</h2>
            <p className="text-body-md text-on-surface-variant mb-space-lg">Your orders will appear here after you complete checkout.</p>
            <Link to="/shop" className="btn-primary inline-flex px-8 py-3">Explore footwear</Link>
          </div>
        ) : (
          <div className="max-w-4xl space-y-space-md">
            {orders.map((order: any) => (
              <Link key={order.id} to={`/orders/${order.id}`} className="card block p-space-lg md:p-space-xl hover:shadow-card-hover transition-shadow group">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-space-md">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-space-sm">
                      <span className="text-label-md font-semibold text-primary font-mono">{order.order_number}</span>
                      <span className={`badge ${getStatusColor(order.status)}`}>{formatOrderStatus(order.status)}</span>
                    </div>
                    <p className="mt-1 text-body-sm text-on-surface-variant">Placed {formatDate(order.created_at)}</p>
                    <div className="mt-space-md flex flex-wrap gap-2">
                      {order.items?.slice(0, 3).map((item: any) => (
                        <span key={item.id} className="inline-flex items-center gap-2 rounded-full bg-surface-container-low px-3 py-1.5 text-body-sm text-on-surface-variant max-w-full">
                          {item.image_url ? <img src={item.image_url} alt="" className="h-7 w-7 rounded-full object-cover" /> : <Package size={15} className="text-outline" />}
                          <span className="truncate max-w-[160px]">{item.product_name}</span>
                        </span>
                      ))}
                      {order.items?.length > 3 && <span className="self-center text-body-sm text-outline">+{order.items.length - 3} more</span>}
                    </div>
                  </div>
                  <div className="flex items-center justify-between sm:justify-end gap-space-md shrink-0">
                    <div className="sm:text-right">
                      <p className="text-title-md font-semibold text-primary">{formatPrice(Number(order.total_amount))}</p>
                      <p className="text-body-sm text-on-surface-variant">{order.items?.length || 0} products</p>
                    </div>
                    <ChevronRight size={20} className="text-outline group-hover:text-primary transition-colors" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
