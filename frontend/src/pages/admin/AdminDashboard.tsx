import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import { formatPrice, formatDate } from '../../lib/formatters';
import { ShoppingCart, Users, Package, TrendingUp, ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function AdminDashboard() {
  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['admin', 'dashboard'],
    queryFn: () => api.get('/admin/dashboard').then((r) => r.data.data),
    refetchInterval: 30000,
  });
  const { data: ordersData } = useQuery({
    queryKey: ['admin', 'orders', 'recent'],
    queryFn: () => api.get('/admin/orders?limit=5').then((r) => r.data),
  });

  if (isLoading) return (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-5">
        {Array(4).fill(0).map((_, i) => <div key={i} className="bg-white border border-gray-200 h-28" />)}
      </div>
      <div className="bg-white border border-gray-200 h-64" />
    </div>
  );

  if (isError) return (
    <section role="alert" className="bg-white border border-gray-200 p-8 text-center">
      <h1 className="text-lg font-bold text-gray-900">Dashboard data is unavailable</h1>
      <p className="mt-2 text-sm text-gray-500">The latest store metrics could not be loaded. Existing orders and products have not been changed.</p>
      <button type="button" onClick={() => refetch()} disabled={isFetching} className="btn-primary mt-5 px-5 py-3 disabled:opacity-60">{isFetching ? 'Retrying…' : 'Try again'}</button>
    </section>
  );

  const kpis = [
    { label: 'Total Orders', value: data?.orders?.total || 0, sub: `${data?.orders?.pending || 0} pending`, icon: ShoppingCart, color: 'text-blue-500', bg: 'bg-blue-50' },
    { label: 'Revenue', value: formatPrice(parseFloat(data?.revenue?.total || 0)), sub: `${formatPrice(parseFloat(data?.revenue?.last_30d || 0))} / 30d`, icon: TrendingUp, color: 'text-green-500', bg: 'bg-green-50' },
    { label: 'Customers', value: data?.users?.total || 0, sub: `+${data?.users?.new_this_week || 0} this week`, icon: Users, color: 'text-purple-500', bg: 'bg-purple-50' },
    { label: 'Products', value: data?.products?.total || 0, sub: `${data?.products?.active || 0} active`, icon: Package, color: 'text-orange-500', bg: 'bg-orange-50' },
  ];

  return (
    <div className="space-y-5 sm:space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold uppercase tracking-widest text-gray-900">Dashboard</h1>
          <p className="text-xs text-gray-400 mt-1">Overview of your store performance</p>
        </div>
        <span className="text-xs text-gray-400">Auto-refreshes every 30s</span>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-5">
        {kpis.map(({ label, value, sub, icon: Icon, color, bg }) => (
          <div key={label} className="min-w-0 bg-white border border-gray-200 p-4 sm:p-5 hover:border-gray-400 transition-colors">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs uppercase tracking-widest font-semibold text-gray-500">{label}</p>
                <p className="mt-2 break-words text-xl font-bold text-gray-900 sm:text-2xl">{value}</p>
                <p className="text-xs text-gray-400 mt-1">{sub}</p>
              </div>
              <div className={`w-10 h-10 ${bg} flex items-center justify-center`}>
                <Icon size={20} className={color} strokeWidth={1.5} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid min-w-0 lg:grid-cols-3 gap-3 sm:gap-5">
        {/* Recent orders */}
        <div className="min-w-0 lg:col-span-2 bg-white border border-gray-200">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <h2 className="text-xs font-bold uppercase tracking-widest text-gray-700">Recent Orders</h2>
            <Link to="/admin/orders" className="text-xs text-brand-500 hover:text-brand-700 uppercase tracking-wider flex items-center gap-1">
              View All <ArrowUpRight size={12} />
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {(ordersData?.data || []).slice(0, 5).map((o: any) => (
              <div key={o.id} className="flex items-center justify-between px-6 py-3.5 hover:bg-gray-50 transition-colors">
                <div>
                  <p className="text-xs font-semibold text-gray-900 font-mono">{o.order_number}</p>
                  <p className="text-xs text-gray-400">{o.first_name} {o.last_name} · {formatDate(o.created_at)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-gray-900">{formatPrice(parseFloat(o.total_amount))}</p>
                  <span className={`inline-block text-[10px] px-2 py-0.5 font-semibold uppercase tracking-wider mt-0.5 ${
                    o.status === 'delivered' ? 'bg-green-100 text-green-700' :
                    o.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                    o.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                    'bg-blue-100 text-blue-700'}`}>
                    {o.status}
                  </span>
                </div>
              </div>
            ))}
            {!ordersData?.data?.length && (
              <div className="px-6 py-8 text-center text-xs text-gray-400">No orders yet</div>
            )}
          </div>
        </div>

        {/* Top products */}
        <div className="min-w-0 bg-white border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-xs font-bold uppercase tracking-widest text-gray-700">Top Products</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {(data?.top_products || []).map((p: any, i: number) => (
              <div key={p.slug} className="flex items-center gap-3 px-6 py-3.5 hover:bg-gray-50 transition-colors">
                <span className="text-xs font-bold text-gray-300 w-5">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gray-900 truncate">{p.name}</p>
                  <p className="text-xs text-gray-400">{p.sold} sold</p>
                </div>
                <span className="text-xs font-bold text-gray-900 shrink-0">{formatPrice(parseFloat(p.revenue))}</span>
              </div>
            ))}
            {!data?.top_products?.length && (
              <div className="px-6 py-8 text-center text-xs text-gray-400">No sales data yet</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
