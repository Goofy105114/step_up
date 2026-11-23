import { Link } from 'react-router-dom';
import { useCartStore } from '../store/cartStore';
import { formatPrice } from '../lib/formatters';
import { Plus, Minus, ShoppingBag, ArrowRight, Tag, X } from 'lucide-react';
import { useState } from 'react';
import api from '../lib/api';
import toast from 'react-hot-toast';

export default function CartPage() {
  const { items, subtotal, updateItem, removeItem } = useCartStore();
  const [coupon, setCoupon] = useState('');
  const [discount, setDiscount] = useState(0);
  const [appliedCoupon, setAppliedCoupon] = useState('');

  const shipping = subtotal - discount >= 599 ? 0 : 99;
  const tax = (subtotal - discount) * 0.05;
  const total = subtotal - discount + shipping + tax;

  const handleApplyCoupon = async () => {
    if (!coupon.trim()) return;
    try {
      const res = await api.post('/payments/validate-coupon', { code: coupon, subtotal });
      setDiscount(res.data.discount);
      setAppliedCoupon(coupon);
      toast.success(`Coupon applied — you save ${formatPrice(res.data.discount)}!`);
    } catch { /* handled */ }
  };

  if (items.length === 0) return (
    <div className="container-site py-24 text-center">
      <ShoppingBag size={64} className="mx-auto text-gray-200 mb-6" strokeWidth={1} />
      <h2 className="text-lg font-bold uppercase tracking-widest text-gray-700 mb-2">Your Cart is Empty</h2>
      <p className="text-sm text-gray-400 mb-8">Looks like you haven't added anything yet.</p>
      <Link to="/shop" className="btn-primary">Start Shopping</Link>
    </div>
  );

  return (
    <div className="bg-white">
      <div className="bg-gray-50 border-b border-gray-200">
        <div className="container-site py-4 text-xs text-gray-500 flex gap-2">
          <Link to="/" className="hover:text-brand-500">Home</Link><span>/</span>
          <span className="text-gray-900 font-semibold uppercase tracking-wider">Shopping Cart</span>
        </div>
      </div>

      <div className="container-site py-10 pb-20">
        <h1 className="text-lg font-bold uppercase tracking-widest text-gray-900 mb-8">Shopping Cart</h1>

        <div className="grid lg:grid-cols-3 gap-10">
          {/* Items table */}
          <div className="lg:col-span-2">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b-2 border-gray-900">
                  <th className="text-left pb-3 text-xs uppercase tracking-widest font-bold text-gray-700">Product</th>
                  <th className="text-center pb-3 text-xs uppercase tracking-widest font-bold text-gray-700 hidden sm:table-cell">Price</th>
                  <th className="text-center pb-3 text-xs uppercase tracking-widest font-bold text-gray-700">Qty</th>
                  <th className="text-right pb-3 text-xs uppercase tracking-widest font-bold text-gray-700">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((item) => (
                  <tr key={item.id} className="group">
                    <td className="py-5 pr-4">
                      <div className="flex items-center gap-4">
                        <button onClick={() => removeItem(item.id)}
                          className="text-gray-300 hover:text-red-500 transition-colors shrink-0">
                          <X size={14} />
                        </button>
                        <div className="w-16 h-16 border border-gray-100 overflow-hidden shrink-0 bg-gray-50">
                          {item.image_url && <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />}
                        </div>
                        <div>
                          <Link to={`/product/${item.slug}`} className="font-semibold text-gray-900 hover:text-brand-500 transition-colors text-xs uppercase tracking-wide leading-snug line-clamp-2">
                            {item.name}
                          </Link>
                          <p className="text-xs text-gray-400 mt-1">{item.size} / {item.color}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-5 text-center text-sm text-gray-600 hidden sm:table-cell">
                      {formatPrice(item.unit_price)}
                    </td>
                    <td className="py-5 text-center">
                      <div className="inline-flex items-center border border-gray-200">
                        <button onClick={() => updateItem(item.id, item.quantity - 1)}
                          className="w-8 h-8 flex items-center justify-center hover:bg-gray-50 transition-colors">
                          <Minus size={12} />
                        </button>
                        <span className="w-9 text-center text-xs font-semibold border-x border-gray-200 py-2">{item.quantity}</span>
                        <button onClick={() => updateItem(item.id, item.quantity + 1)}
                          disabled={item.quantity >= item.stock_qty}
                          className="w-8 h-8 flex items-center justify-center hover:bg-gray-50 transition-colors disabled:opacity-30">
                          <Plus size={12} />
                        </button>
                      </div>
                    </td>
                    <td className="py-5 text-right font-bold text-gray-900 text-sm">
                      {formatPrice(item.unit_price * item.quantity)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Coupon */}
            <div className="flex gap-0 mt-8 border-t border-gray-200 pt-6">
              <div className="relative flex-1">
                <Tag size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input value={coupon} onChange={(e) => setCoupon(e.target.value.toUpperCase())}
                  placeholder="Coupon code" className="input-field pl-9 text-xs py-3 uppercase tracking-widest" />
              </div>
              <button onClick={handleApplyCoupon} className="btn-primary px-6 py-3 text-xs">Apply</button>
            </div>
            {appliedCoupon && (
              <p className="text-xs text-green-600 mt-2 flex items-center gap-1">✓ Coupon "{appliedCoupon}" applied</p>
            )}
          </div>

          {/* Summary */}
          <div className="lg:col-span-1">
            <div className="border border-gray-200 p-6 space-y-4 sticky top-24">
              <h2 className="text-xs font-bold uppercase tracking-widest text-gray-900 pb-3 border-b border-gray-200">
                Order Summary
              </h2>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between text-gray-600">
                  <span className="text-xs uppercase tracking-wider">Subtotal</span>
                  <span className="font-semibold">{formatPrice(subtotal)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-green-600 text-xs">
                    <span className="uppercase tracking-wider">Discount</span>
                    <span className="font-semibold">−{formatPrice(discount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-gray-600">
                  <span className="text-xs uppercase tracking-wider">Shipping</span>
                  <span className="font-semibold">{shipping === 0 ? <span className="text-green-600">Free</span> : formatPrice(shipping)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span className="text-xs uppercase tracking-wider">GST (5%)</span>
                  <span className="font-semibold">{formatPrice(tax)}</span>
                </div>
                <div className="flex justify-between font-bold text-gray-900 border-t border-gray-200 pt-3 text-base">
                  <span className="text-xs uppercase tracking-widest">Total</span>
                  <span>{formatPrice(total)}</span>
                </div>
              </div>
              {subtotal < 599 && (
                <div className="bg-gray-50 border border-gray-200 px-3 py-2 text-xs text-gray-500 text-center">
                  Add {formatPrice(599 - subtotal)} more for free shipping
                </div>
              )}
              <Link to="/checkout" className="btn-primary w-full text-center block py-3.5 flex items-center justify-center gap-2">
                Proceed to Checkout <ArrowRight size={14} />
              </Link>
              <Link to="/shop" className="btn-outline w-full text-center block py-3 text-xs">Continue Shopping</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
