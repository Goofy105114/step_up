import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { formatPrice, formatDate, formatOrderStatus, getStatusColor } from '../lib/formatters';
import { Package, MapPin, CheckCircle, Circle } from 'lucide-react';
import toast from 'react-hot-toast';

const statusSteps = ['pending', 'confirmed', 'processing', 'shipped', 'out_for_delivery', 'delivered'];

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['order', id],
    queryFn: () => api.get(`/orders/${id}`).then((r) => r.data.data),
  });

  const cancelMutation = useMutation({
    mutationFn: () => api.post(`/orders/${id}/cancel`),
    onSuccess: () => { toast.success('Order cancelled'); qc.invalidateQueries({ queryKey: ['order', id] }); },
  });

  if (isLoading) return <div className="container-custom py-12 skeleton h-96 rounded-2xl" />;
  if (!data) return <div className="container-custom py-24 text-center"><p>Order not found</p></div>;

  const order = data;
  const address = order.shipping_address;
  const currentStepIdx = statusSteps.indexOf(order.status);

  return (
    <div className="container-custom py-8 pb-20 max-w-3xl">
      <Link to="/orders" className="text-sm text-brand-500 hover:text-brand-700 font-medium flex items-center gap-1 mb-6">
        ← My Orders
      </Link>

      <div className="flex items-start justify-between flex-wrap gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900">{order.order_number}</h1>
          <p className="text-sm text-gray-500 mt-1">Placed on {formatDate(order.created_at)}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className={`badge text-sm px-3 py-1 ${getStatusColor(order.status)}`}>
            {formatOrderStatus(order.status)}
          </span>
          {['pending', 'confirmed'].includes(order.status) && (
            <button onClick={() => cancelMutation.mutate()} disabled={cancelMutation.isPending}
              className="text-sm text-red-500 hover:text-red-700 font-medium">
              Cancel Order
            </button>
          )}
        </div>
      </div>

      {/* Progress tracker */}
      {!['cancelled', 'refunded'].includes(order.status) && (
        <div className="card p-5 mb-6">
          <div className="flex items-center justify-between relative">
            <div className="absolute top-4 left-6 right-6 h-0.5 bg-gray-200" />
            <div className="absolute top-4 left-6 h-0.5 bg-brand-500 transition-all"
              style={{ width: `${Math.max(0, (currentStepIdx / (statusSteps.length - 1)) * 100 - 10)}%` }} />
            {statusSteps.map((s, i) => (
              <div key={s} className="flex flex-col items-center gap-1 z-10 flex-1">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  i <= currentStepIdx ? 'bg-brand-500' : 'bg-white border-2 border-gray-200'}`}>
                  {i <= currentStepIdx
                    ? <CheckCircle size={18} className="text-white fill-white" />
                    : <Circle size={18} className="text-gray-300" />}
                </div>
                <span className="text-xs text-gray-500 capitalize hidden sm:block text-center leading-tight">
                  {s.replace(/_/g, ' ')}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Items */}
      <div className="card p-5 mb-5">
        <h2 className="font-semibold mb-4 flex items-center gap-2"><Package size={16} className="text-brand-500" />Items Ordered</h2>
        <div className="space-y-4">
          {order.items?.map((item: any) => (
            <div key={item.id} className="flex gap-4">
              {item.image_url && (
                <img src={item.image_url} alt={item.product_name} className="w-16 h-16 rounded-xl object-cover bg-gray-50" />
              )}
              <div className="flex-1">
                <p className="font-medium text-sm text-gray-900">{item.product_name}</p>
                <p className="text-xs text-gray-500 mt-0.5">{item.size} · {item.color} · Qty {item.quantity}</p>
              </div>
              <span className="font-semibold text-sm text-gray-900 shrink-0">{formatPrice(parseFloat(item.total_price))}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-5 mb-5">
        {/* Address */}
        <div className="card p-5">
          <h3 className="font-semibold mb-3 text-sm flex items-center gap-2"><MapPin size={14} className="text-brand-500" />Delivery Address</h3>
          <div className="text-sm text-gray-600 space-y-0.5">
            <p className="font-medium text-gray-900">{address.full_name}</p>
            {address.phone && <p>{address.phone}</p>}
            <p>{address.line1}{address.line2 ? `, ${address.line2}` : ''}</p>
            <p>{address.city}, {address.state} – {address.postal_code}</p>
            <p>{address.country}</p>
          </div>
        </div>

        {/* Payment summary */}
        <div className="card p-5">
          <h3 className="font-semibold mb-3 text-sm">Payment Details</h3>
          <div className="text-sm space-y-2">
            <div className="flex justify-between text-gray-600"><span>Subtotal</span><span>{formatPrice(parseFloat(order.subtotal))}</span></div>
            {parseFloat(order.discount_amount) > 0 && (
              <div className="flex justify-between text-green-600"><span>Discount</span><span>-{formatPrice(parseFloat(order.discount_amount))}</span></div>
            )}
            <div className="flex justify-between text-gray-600"><span>Shipping</span><span>{parseFloat(order.shipping_amount) === 0 ? 'Free' : formatPrice(parseFloat(order.shipping_amount))}</span></div>
            <div className="flex justify-between text-gray-600"><span>GST</span><span>{formatPrice(parseFloat(order.tax_amount))}</span></div>
            <div className="flex justify-between font-bold text-gray-900 border-t border-gray-100 pt-2">
              <span>Total</span><span>{formatPrice(parseFloat(order.total_amount))}</span>
            </div>
            <div className="flex justify-between text-xs text-gray-500 pt-1">
              <span>Payment</span><span className="capitalize">{order.payment_method?.replace(/_/g, ' ')}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tracking */}
      {order.tracking_number && (
        <div className="card p-4 bg-brand-50 border border-brand-100">
          <p className="text-sm text-brand-700">
            Tracking Number: <strong className="font-mono">{order.tracking_number}</strong>
          </p>
        </div>
      )}
    </div>
  );
}
