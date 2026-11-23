import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import { formatPrice, formatDate, formatOrderStatus, getStatusColor } from '../lib/formatters';
import { Package, ChevronRight } from 'lucide-react';

export default function OrdersPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['orders'],
    queryFn: () => api.get('/orders').then((r) => r.data),
  });

  if (isLoading) return (
    <div className="container-custom py-8 space-y-4">
      {Array(3).fill(0).map((_, i) => <div key={i} className="card p-5 skeleton h-28" />)}
    </div>
  );

  const orders = data?.data || [];

  if (orders.length === 0) {
    return (
      <div className="container-custom py-24 text-center">
        <Package size={56} className="mx-auto text-gray-200 mb-5" />
        <h2 className="text-xl font-bold text-gray-800 mb-2">No orders yet</h2>
        <p className="text-gray-500 mb-6">When you place your first order, it will show up here.</p>
        <Link to="/shop" className="btn-primary">Shop Now</Link>
      </div>
    );
  }

  return (
    <div className="container-custom py-8 pb-20 max-w-3xl">
      <h1 className="text-3xl font-display font-bold mb-8">My Orders</h1>
      <div className="space-y-4">
        {orders.map((order: any) => (
          <Link key={order.id} to={`/orders/${order.id}`} className="card block hover:shadow-md transition-shadow p-5 group">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="font-semibold text-gray-900 text-sm">{order.order_number}</span>
                  <span className={`badge ${getStatusColor(order.status)}`}>{formatOrderStatus(order.status)}</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">{formatDate(order.created_at)}</p>
                <div className="flex gap-2 mt-3 flex-wrap">
                  {order.items?.slice(0, 3).map((item: any) => (
                    <div key={item.id} className="flex items-center gap-1.5 bg-gray-50 rounded-lg px-2 py-1.5">
                      {item.image_url && (
                        <img src={item.image_url} alt="" className="w-6 h-6 rounded object-cover" />
                      )}
                      <span className="text-xs text-gray-600 line-clamp-1 max-w-[120px]">{item.product_name}</span>
                    </div>
                  ))}
                  {order.items?.length > 3 && (
                    <span className="text-xs text-gray-400 self-center">+{order.items.length - 3} more</span>
                  )}
                </div>
              </div>
              <div className="text-right flex items-center gap-2 shrink-0">
                <div>
                  <p className="font-bold text-gray-900">{formatPrice(parseFloat(order.total_amount))}</p>
                  <p className="text-xs text-gray-400">{order.items?.length || 0} items</p>
                </div>
                <ChevronRight size={18} className="text-gray-300 group-hover:text-brand-500 transition-colors" />
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
