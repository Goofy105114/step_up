import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import { formatPrice, formatDate, formatOrderStatus, getStatusColor } from '../../lib/formatters';
import toast from 'react-hot-toast';

const ORDER_STATUSES = ['pending','confirmed','processing','shipped','out_for_delivery','delivered','cancelled'];

export default function AdminOrders() {
  const [filterStatus, setFilterStatus] = useState('');
  const [updating, setUpdating] = useState<string | null>(null);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'orders', filterStatus],
    queryFn: () => api.get(`/admin/orders${filterStatus ? `?status=${filterStatus}` : ''}`).then((r) => r.data),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/admin/orders/${id}/status`, { status }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin', 'orders'] }); toast.success('Status updated'); setUpdating(null); },
    onError: (error: any) => { toast.error(error.response?.data?.message || 'Unable to update order status'); setUpdating(null); },
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-display font-bold text-gray-900">Orders</h1>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
          className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400">
          <option value="">All Statuses</option>
          {ORDER_STATUSES.map((s) => <option key={s} value={s}>{formatOrderStatus(s)}</option>)}
        </select>
      </div>

      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-400">Loading…</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>{['Order #','Customer','Date','Status','Total','Action'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                ))}</tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {(data?.data || []).map((order: any) => (
                  <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-gray-700">{order.order_number}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{order.first_name} {order.last_name}</p>
                      <p className="text-xs text-gray-400">{order.email}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{formatDate(order.created_at)}</td>
                    <td className="px-4 py-3">
                      <span className={`badge ${getStatusColor(order.status)}`}>{formatOrderStatus(order.status)}</span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-gray-900">{formatPrice(parseFloat(order.total_amount))}</td>
                    <td className="px-4 py-3">
                      {updating === order.id ? (
                        <select autoFocus defaultValue={order.status}
                          onChange={(e) => updateMutation.mutate({ id: order.id, status: e.target.value })}
                          className="border border-brand-300 rounded-lg px-2 py-1 text-xs focus:outline-none">
                          {ORDER_STATUSES.map((s) => <option key={s} value={s}>{formatOrderStatus(s)}</option>)}
                        </select>
                      ) : (
                        <button onClick={() => setUpdating(order.id)}
                          className="text-xs text-brand-600 hover:text-brand-800 font-medium">Update</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!data?.data?.length && (
              <div className="text-center py-12 text-gray-400">No orders found</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
