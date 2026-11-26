import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { formatPrice, formatDate, formatOrderStatus, getStatusColor } from '../lib/formatters';
import { Package, MapPin, CheckCircle, Circle, RotateCcw, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

const statusSteps = ['pending', 'confirmed', 'processing', 'shipped', 'out_for_delivery', 'delivered'];

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [returnReason, setReturnReason] = useState('');

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['order', id],
    queryFn: () => api.get(`/orders/${id}`).then((r) => r.data.data),
  });

  const cancelMutation = useMutation({
    mutationFn: () => api.post(`/orders/${id}/cancel`),
    onSuccess: () => { toast.success('Order cancelled'); qc.invalidateQueries({ queryKey: ['order', id] }); },
    onError: (error: any) => toast.error(error.response?.data?.message || 'Unable to cancel this order'),
  });

  const returnMutation = useMutation({
    mutationFn: (reason: string) => api.post(`/orders/${id}/return`, { reason }),
    onSuccess: () => {
      toast.success('Return request submitted for review. No refund has been issued yet.');
      qc.invalidateQueries({ queryKey: ['order', id] });
      setShowReturnModal(false);
      setReturnReason('');
    },
    onError: (error: any) => toast.error(error.response?.data?.message || 'Unable to submit the return request'),
  });

  if (isLoading) return <div className="container-site py-12 skeleton h-96" />;
  if (isError) return (
    <div role="alert" className="container-site py-24 text-center">
      <p className="mb-3 text-gray-700">We couldn’t load this order right now.</p>
      <button type="button" onClick={() => refetch()} disabled={isFetching} className="btn-primary mb-4 px-5 py-2.5">{isFetching ? 'Retrying…' : 'Try again'}</button>
      <div><Link to="/orders" className="text-sm font-semibold text-primary underline">Back to my orders</Link></div>
    </div>
  );
  if (!data) return (
    <div className="container-site py-24 text-center">
      <p className="text-gray-500 mb-4">Order not found</p>
      <Link to="/orders" className="btn-primary">My Orders</Link>
    </div>
  );

  const order = data;
  const address = order.shipping_address;
  const currentStepIdx = statusSteps.indexOf(order.status);

  return (
    <div className="bg-white">
      <div className="bg-gray-50 border-b border-gray-200">
        <div className="container-site py-4 text-xs text-gray-500 flex gap-2">
          <Link to="/" className="hover:text-brand-500">Home</Link><span>/</span>
          <Link to="/orders" className="hover:text-brand-500">My Orders</Link><span>/</span>
          <span className="text-gray-900 font-semibold">{order.order_number}</span>
        </div>
      </div>

      <div className="container-site py-8 pb-20 max-w-3xl">
        {/* Header */}
        <div className="flex items-start justify-between flex-wrap gap-3 mb-6">
          <div>
            <h1 className="text-xl font-bold uppercase tracking-widest text-gray-900">{order.order_number}</h1>
            <p className="text-sm text-gray-500 mt-1">Placed on {formatDate(order.created_at)}</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <span className={`text-xs px-3 py-1.5 font-bold uppercase tracking-widest ${getStatusColor(order.status)}`}>
              {formatOrderStatus(order.status)}
            </span>
            {['pending', 'confirmed'].includes(order.status) && (
              <button type="button" onClick={() => cancelMutation.mutate()} disabled={cancelMutation.isPending}
                className="text-xs text-red-500 hover:text-red-700 font-semibold uppercase tracking-wider border border-red-200 px-3 py-1.5 hover:bg-red-50 transition-colors">
                {cancelMutation.isPending ? 'Cancelling…' : 'Cancel Order'}
              </button>
            )}
            {order.status === 'delivered' && !order.return_request && (
              <button type="button" onClick={() => setShowReturnModal(true)}
                className="text-xs text-gray-600 hover:text-gray-900 font-semibold uppercase tracking-wider border border-gray-200 px-3 py-1.5 hover:bg-gray-50 transition-colors flex items-center gap-1.5">
                <RotateCcw size={12} /> Return / Refund
              </button>
            )}
          </div>
        </div>

        {/* Progress tracker */}
        {!['cancelled', 'refunded', 'returned'].includes(order.status) && (
          <div className="border border-gray-200 bg-white p-6 mb-6">
            <h3 className="text-xs font-bold uppercase tracking-widest text-gray-700 mb-5">Order Progress</h3>
            <div className="flex items-start justify-between relative">
              <div className="absolute top-4 left-4 right-4 h-0.5 bg-gray-200" />
              <div className="absolute top-4 left-4 h-0.5 bg-brand-500 transition-all"
                style={{ width: `${currentStepIdx > 0 ? (currentStepIdx / (statusSteps.length - 1)) * (100 - 8) : 0}%` }} />
              {statusSteps.map((s, i) => (
                <div key={s} className="flex flex-col items-center gap-2 z-10 flex-1">
                  <div className={`w-8 h-8 flex items-center justify-center transition-all ${
                    i <= currentStepIdx ? 'bg-brand-500' : 'bg-white border-2 border-gray-200'}`}>
                    {i <= currentStepIdx
                      ? <CheckCircle size={18} className="text-white" />
                      : <Circle size={18} className="text-gray-300" />}
                  </div>
                  <span className="text-xs text-gray-500 capitalize hidden sm:block text-center leading-tight w-16">
                    {s.replace(/_/g, ' ')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Cancelled / Returned banner */}
        {['cancelled', 'returned', 'refunded'].includes(order.status) && (
          <div className={`border p-4 mb-6 flex items-center gap-3 ${
            order.status === 'cancelled' ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200'}`}>
            <X size={16} className={order.status === 'cancelled' ? 'text-red-500' : 'text-yellow-600'} />
            <p className={`text-sm font-medium ${order.status === 'cancelled' ? 'text-red-700' : 'text-yellow-700'}`}>
              {order.status === 'cancelled' && 'This order has been cancelled.'}
              {order.status === 'returned' && 'Return request recorded. Our team will review it and contact you about the next steps.'}
              {order.status === 'refunded' && 'This order has been refunded.'}
            </p>
          </div>
        )}

        {/* Items */}
        <div className="border border-gray-200 p-5 mb-5">
          <h2 className="text-xs font-bold uppercase tracking-widest text-gray-700 mb-4 flex items-center gap-2">
            <Package size={14} className="text-brand-500" /> Items Ordered
          </h2>
          <div className="space-y-4">
            {order.items?.map((item: any) => (
              <div key={item.id} className="flex gap-4 items-center">
                <div className="w-16 h-16 bg-gray-50 border border-gray-100 overflow-hidden shrink-0">
                  {item.image_url && <img src={item.image_url} alt={item.product_name} className="w-full h-full object-cover" />}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-sm text-gray-900">{item.product_name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{item.size} · {item.color} · Qty {item.quantity}</p>
                </div>
                <span className="font-bold text-sm text-gray-900 shrink-0">
                  {formatPrice(parseFloat(item.total_price))}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-5 mb-5">
          {/* Address */}
          <div className="border border-gray-200 p-5">
            <h3 className="text-xs font-bold uppercase tracking-widest text-gray-700 mb-3 flex items-center gap-2">
              <MapPin size={12} className="text-brand-500" /> Delivery Address
            </h3>
            <div className="text-sm text-gray-600 space-y-0.5">
              <p className="font-semibold text-gray-900">{address.full_name}</p>
              {address.phone && <p>{address.phone}</p>}
              <p>{address.line1}{address.line2 ? `, ${address.line2}` : ''}</p>
              <p>{address.city}, {address.state} – {address.postal_code}</p>
              <p>{address.country}</p>
            </div>
          </div>

          {/* Payment */}
          <div className="border border-gray-200 p-5">
            <h3 className="text-xs font-bold uppercase tracking-widest text-gray-700 mb-3">Payment Details</h3>
            <div className="text-sm space-y-2">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span><span>{formatPrice(parseFloat(order.subtotal))}</span>
              </div>
              {parseFloat(order.discount_amount) > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Discount</span><span>−{formatPrice(parseFloat(order.discount_amount))}</span>
                </div>
              )}
              <div className="flex justify-between text-gray-600">
                <span>Shipping</span>
                <span>{parseFloat(order.shipping_amount) === 0 ? 'Free' : formatPrice(parseFloat(order.shipping_amount))}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>GST (5%)</span><span>{formatPrice(parseFloat(order.tax_amount))}</span>
              </div>
              <div className="flex justify-between font-bold text-gray-900 border-t border-gray-100 pt-2">
                <span>Total</span><span>{formatPrice(parseFloat(order.total_amount))}</span>
              </div>
              <div className="flex justify-between text-xs text-gray-400 pt-1">
                <span>Method</span>
                <span className="capitalize">{order.payment_method?.replace(/_/g, ' ')}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tracking */}
        {order.tracking_number && (
          <div className="bg-brand-50 border border-brand-100 p-4">
            <p className="text-sm text-brand-700">
              Tracking: <strong className="font-mono">{order.tracking_number}</strong>
            </p>
          </div>
        )}

        {order.return_request && (
          <section className="mt-5 border border-gray-200 bg-white p-5" aria-labelledby="return-status-heading">
            <h3 id="return-status-heading" className="text-xs font-bold uppercase tracking-widest text-gray-700">Return request status</h3>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <span className="text-sm font-semibold capitalize text-gray-900">{String(order.return_request.status).replace(/_/g, ' ')}</span>
              <span className="text-xs text-gray-400">Requested {formatDate(order.return_request.created_at)}</span>
            </div>
            <p className="mt-2 text-sm leading-6 text-gray-600">{order.return_request.reason}</p>
            <p className="mt-3 border-t border-gray-100 pt-3 text-xs leading-5 text-gray-500">
              {order.return_request.status === 'requested' && 'Your request is waiting for review by the STEPUP team.'}
              {order.return_request.status === 'approved' && 'Your return has been approved. Follow the instructions provided by the STEPUP team to send the item back.'}
              {order.return_request.status === 'received' && 'The returned item has been marked as received. Any applicable refund is handled separately and is not automatic.'}
              {order.return_request.status === 'rejected' && 'The return request was not approved. Contact STEPUP support if you need clarification.'}
            </p>
          </section>
        )}

        {/* Order history */}
        {order.history?.length > 0 && (
          <div className="border border-gray-200 p-5 mt-5">
            <h3 className="text-xs font-bold uppercase tracking-widest text-gray-700 mb-4">Order History</h3>
            <div className="space-y-3">
              {order.history.map((h: any, i: number) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-brand-500 rounded-full mt-1.5 shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-gray-900 uppercase tracking-wider">{formatOrderStatus(h.status)}</p>
                    {h.note && <p className="text-xs text-gray-500 mt-0.5">{h.note}</p>}
                    <p className="text-xs text-gray-400 mt-0.5">{formatDate(h.created_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Return Modal */}
      <AnimatePresence>
        {showReturnModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-50" onClick={() => setShowReturnModal(false)} />
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-white w-full max-w-md shadow-2xl">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                <h2 className="text-xs font-bold uppercase tracking-widest text-gray-900 flex items-center gap-2">
                  <RotateCcw size={14} /> Request Return / Refund
                </h2>
                <button type="button" onClick={() => setShowReturnModal(false)} className="p-1 hover:bg-gray-100">
                  <X size={16} />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div className="bg-yellow-50 border border-yellow-200 p-3 text-xs text-yellow-700">
                  Return requests are reviewed by our team. Refunds are not automatic and are processed only after approval.
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-widest text-gray-700 mb-2 block">
                    Reason for Return *
                  </label>
                  <select value={returnReason} onChange={(e) => setReturnReason(e.target.value)} className="input-field mb-3">
                    <option value="">Select a reason</option>
                    <option>Wrong size received</option>
                    <option>Wrong product received</option>
                    <option>Product damaged / defective</option>
                    <option>Product not as described</option>
                    <option>Changed my mind</option>
                    <option>Other</option>
                  </select>
                  <textarea rows={3} value={returnReason.startsWith('Other') ? returnReason : ''}
                    onChange={(e) => setReturnReason('Other: ' + e.target.value)}
                    className="input-field resize-none" placeholder="Additional details (optional)" />
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setShowReturnModal(false)} className="btn-outline flex-1 py-3">Cancel</button>
                  <button
                    type="button"
                    disabled={!returnReason || returnMutation.isPending}
                    onClick={() => returnMutation.mutate(returnReason)}
                    className="btn-primary flex-1 py-3">
                    {returnMutation.isPending ? 'Submitting…' : 'Submit Request'}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
