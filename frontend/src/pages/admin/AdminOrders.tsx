import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import { formatPrice, formatDate, formatOrderStatus, getStatusColor } from '../../lib/formatters';
import toast from 'react-hot-toast';

const ORDER_STATUSES = ['pending','confirmed','processing','shipped','out_for_delivery','delivery_failed','return_to_origin','delivered','cancelled'];

export default function AdminOrders() {
  const [filterStatus, setFilterStatus] = useState('');
  const [updating, setUpdating] = useState<string | null>(null);
  const [pendingStatus, setPendingStatus] = useState<Record<string, string>>({});
  const [trackingDraft, setTrackingDraft] = useState<Record<string, string>>({});
  const [trackingUrlDraft, setTrackingUrlDraft] = useState<Record<string, string>>({});
  const [trackingCarrierDraft, setTrackingCarrierDraft] = useState<Record<string, string>>({});
  const qc = useQueryClient();

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['admin', 'orders', filterStatus],
    queryFn: () => api.get(`/admin/orders${filterStatus ? `?status=${filterStatus}` : ''}`).then((r) => r.data),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, status, tracking_number, tracking_url, tracking_carrier }: { id: string; status: string; tracking_number?: string | null; tracking_url?: string | null; tracking_carrier?: string | null }) =>
      api.patch(`/admin/orders/${id}/status`, { status, ...(tracking_number !== undefined ? { tracking_number } : {}), ...(tracking_url !== undefined ? { tracking_url } : {}), ...(tracking_carrier !== undefined ? { tracking_carrier } : {}) }),
    onSuccess: (_response, variables) => { qc.invalidateQueries({ queryKey: ['admin', 'orders'] }); toast.success(variables.tracking_number !== undefined || variables.tracking_url !== undefined || variables.tracking_carrier !== undefined ? 'Tracking details saved' : 'Status updated'); setUpdating(null); setPendingStatus((current) => { const next = { ...current }; delete next[variables.id]; return next; }); setTrackingDraft((current) => { const next = { ...current }; delete next[variables.id]; return next; }); setTrackingUrlDraft((current) => { const next = { ...current }; delete next[variables.id]; return next; }); setTrackingCarrierDraft((current) => { const next = { ...current }; delete next[variables.id]; return next; }); },
    onError: (error: any, variables) => { toast.error(error.response?.data?.message || 'Unable to update order status'); setPendingStatus((current) => { const next = { ...current }; delete next[variables.id]; return next; }); },
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-display font-bold text-gray-900">Orders</h1>
        <select aria-label="Filter orders by status" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
          className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400">
          <option value="">All Statuses</option>
          {ORDER_STATUSES.map((s) => <option key={s} value={s}>{formatOrderStatus(s)}</option>)}
        </select>
      </div>

      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-400">Loading…</div>
        ) : isError ? (
          <div role="alert" className="p-8 text-center"><p className="text-sm text-red-600">Unable to load orders.</p><button type="button" onClick={() => refetch()} disabled={isFetching} className="btn-outline mt-3 px-4 py-2 text-xs">{isFetching ? 'Retrying…' : 'Try again'}</button></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>{['Order #','Customer','Date','Status','Total','Refunds','Tracking','Action'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                ))}</tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {(data?.data || []).map((order: any) => (
                  <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-gray-700">{order.order_number}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{[order.first_name, order.last_name].filter(Boolean).join(' ') || 'Customer'}</p>
                      <p className="text-xs text-gray-400">{order.email}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{formatDate(order.created_at)}</td>
                    <td className="px-4 py-3">
                      <span className={`badge ${getStatusColor(order.status)}`}>{formatOrderStatus(order.status)}</span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-gray-900">{formatPrice(parseFloat(order.total_amount))}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <p className="text-xs font-semibold text-gray-800">{formatPrice(Number(order.refunded_paise || 0) / 100)} refunded</p>
                      <p className="text-xs text-gray-500">{formatPrice(Number(order.remaining_refundable_paise ?? Math.round(Number(order.total_amount) * 100)) / 100)} remaining</p>
                      <p className="text-[10px] text-gray-400">{order.payment_status || 'Payment status unavailable'}</p>
                    </td>
                    <td className="px-4 py-3 min-w-52">
                      <div className="flex flex-col gap-1">
                        <input type="text" aria-label={`Tracking number for order ${order.order_number}`} value={trackingDraft[order.id] ?? order.tracking_number ?? ''} onChange={(e) => setTrackingDraft((current) => ({ ...current, [order.id]: e.target.value }))} placeholder="Add tracking number" className="w-40 border border-gray-200 rounded-lg px-2 py-1 text-xs" />
                        {(trackingDraft[order.id] ?? order.tracking_number ?? '') !== (order.tracking_number ?? '') && <button type="button" disabled={updateMutation.isPending} onClick={() => updateMutation.mutate({ id: order.id, status: order.status, tracking_number: (trackingDraft[order.id] ?? '').trim() || null })} className="text-left text-xs font-medium text-brand-600 hover:text-brand-800 disabled:opacity-50">Save tracking</button>}
                        {order.tracking_number && <span className="text-xs text-gray-500">Current: {order.tracking_number}</span>}
                        <input type="text" aria-label={`Carrier name for order ${order.order_number}`} value={trackingCarrierDraft[order.id] ?? order.tracking_carrier ?? ''} onChange={(e) => setTrackingCarrierDraft((current) => ({ ...current, [order.id]: e.target.value }))} placeholder="Carrier name" maxLength={100} className="w-40 border border-gray-200 rounded-lg px-2 py-1 text-xs" />
                        {(trackingCarrierDraft[order.id] ?? order.tracking_carrier ?? '') !== (order.tracking_carrier ?? '') && <button type="button" disabled={updateMutation.isPending} onClick={() => updateMutation.mutate({ id: order.id, status: order.status, tracking_carrier: (trackingCarrierDraft[order.id] ?? '').trim() || null })} className="text-left text-xs font-medium text-brand-600 hover:text-brand-800 disabled:opacity-50">Save carrier</button>}
                        <input type="url" aria-label={`Carrier tracking URL for order ${order.order_number}`} value={trackingUrlDraft[order.id] ?? order.tracking_url ?? ''} onChange={(e) => setTrackingUrlDraft((current) => ({ ...current, [order.id]: e.target.value }))} placeholder="https://carrier.example/track/…" className="w-48 border border-gray-200 rounded-lg px-2 py-1 text-xs" />
                        {(trackingUrlDraft[order.id] ?? order.tracking_url ?? '') !== (order.tracking_url ?? '') && <button type="button" disabled={updateMutation.isPending} onClick={() => updateMutation.mutate({ id: order.id, status: order.status, tracking_url: (trackingUrlDraft[order.id] ?? '').trim() || null })} className="text-left text-xs font-medium text-brand-600 hover:text-brand-800 disabled:opacity-50">Save tracking link</button>}
                        {order.tracking_url && <a href={order.tracking_url} target="_blank" rel="noopener noreferrer" className="text-xs text-brand-700 underline">Open carrier tracking</a>}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {updating === order.id ? (
                        <select autoFocus value={pendingStatus[order.id] ?? order.status}
                          disabled={updateMutation.isPending}
                          onChange={(e) => { setPendingStatus((current) => ({ ...current, [order.id]: e.target.value })); updateMutation.mutate({ id: order.id, status: e.target.value }); }}
                          className="border border-brand-300 rounded-lg px-2 py-1 text-xs focus:outline-none">
                          {ORDER_STATUSES.map((s) => <option key={s} value={s}>{formatOrderStatus(s)}</option>)}
                        </select>
                      ) : (
                        <button type="button" disabled={updateMutation.isPending} onClick={() => setUpdating(order.id)}
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
