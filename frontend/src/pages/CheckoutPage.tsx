import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCartStore } from '../store/cartStore';
import { formatPrice } from '../lib/formatters';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { MapPin, CreditCard, CheckCircle } from 'lucide-react';

interface AddressForm {
  full_name: string; phone: string; line1: string; line2: string;
  city: string; state: string; postal_code: string; country: string;
}

const defaultAddress: AddressForm = {
  full_name: '', phone: '', line1: '', line2: '',
  city: '', state: '', postal_code: '', country: 'India',
};

const INDIAN_STATES = [
  'Andhra Pradesh','Delhi','Gujarat','Karnataka','Kerala','Maharashtra',
  'Punjab','Rajasthan','Tamil Nadu','Telangana','Uttar Pradesh','West Bengal',
];

export default function CheckoutPage() {
  const { items, subtotal, clearCart } = useCartStore();
  const [address, setAddress] = useState<AddressForm>(defaultAddress);
  const [payment, setPayment] = useState('cod');
  const [step, setStep] = useState(1);
  const [isPlacing, setIsPlacing] = useState(false);
  const [orderId, setOrderId] = useState('');
  const navigate = useNavigate();

  const shipping = subtotal >= 599 ? 0 : 99;
  const tax = subtotal * 0.05;
  const total = subtotal + shipping + tax;

  const handlePlaceOrder = async () => {
    if (!address.full_name || !address.phone || !address.line1 || !address.city || !address.state || !address.postal_code) {
      toast.error('Please fill all required fields'); return;
    }
    setIsPlacing(true);
    try {
      const res = await api.post('/orders', {
        shipping_address: address,
        payment_method: payment,
      });
      setOrderId(res.data.data.order_number);
      setStep(3);
      await clearCart();
    } catch { /* interceptor handles */ } finally {
      setIsPlacing(false);
    }
  };

  if (step === 3) {
    return (
      <div className="container-custom py-24 text-center max-w-lg mx-auto">
        <div className="card p-10 space-y-5">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle size={32} className="text-green-500" />
          </div>
          <h1 className="text-2xl font-display font-bold text-gray-900">Order Placed!</h1>
          <p className="text-gray-600">Your order <strong>{orderId}</strong> has been placed successfully. You'll receive a confirmation shortly.</p>
          <div className="flex flex-col gap-3">
            <button onClick={() => navigate('/orders')} className="btn-primary">View My Orders</button>
            <button onClick={() => navigate('/shop')} className="btn-secondary">Continue Shopping</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-custom py-8 pb-20">
      <h1 className="text-3xl font-display font-bold mb-8">Checkout</h1>

      {/* Steps */}
      <div className="flex items-center gap-3 mb-8">
        {[{ n: 1, label: 'Delivery', icon: MapPin }, { n: 2, label: 'Payment', icon: CreditCard }].map(({ n, label, icon: Icon }) => (
          <div key={n} className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
              step >= n ? 'bg-brand-500 text-white' : 'bg-gray-100 text-gray-400'}`}>
              {n}
            </div>
            <span className={`text-sm font-medium ${step >= n ? 'text-gray-900' : 'text-gray-400'}`}>{label}</span>
            {n < 2 && <span className="w-12 h-px bg-gray-200 mx-1" />}
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          {step === 1 && (
            <div className="card p-6 space-y-5 animate-fade-in">
              <h2 className="font-semibold text-lg flex items-center gap-2"><MapPin size={18} className="text-brand-500" />Delivery Address</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Full Name *</label>
                  <input className="input-field" value={address.full_name} onChange={(e) => setAddress({ ...address, full_name: e.target.value })} />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Phone *</label>
                  <input className="input-field" type="tel" value={address.phone} onChange={(e) => setAddress({ ...address, phone: e.target.value })} />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Address Line 1 *</label>
                  <input className="input-field" placeholder="House / Flat / Block no." value={address.line1} onChange={(e) => setAddress({ ...address, line1: e.target.value })} />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Address Line 2</label>
                  <input className="input-field" placeholder="Street / Locality / Area" value={address.line2} onChange={(e) => setAddress({ ...address, line2: e.target.value })} />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">City *</label>
                  <input className="input-field" value={address.city} onChange={(e) => setAddress({ ...address, city: e.target.value })} />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">State *</label>
                  <select className="input-field" value={address.state} onChange={(e) => setAddress({ ...address, state: e.target.value })}>
                    <option value="">Select state</option>
                    {INDIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Pincode *</label>
                  <input className="input-field" maxLength={6} value={address.postal_code} onChange={(e) => setAddress({ ...address, postal_code: e.target.value })} />
                </div>
              </div>
              <button onClick={() => setStep(2)} className="btn-primary w-full">Continue to Payment</button>
            </div>
          )}

          {step === 2 && (
            <div className="card p-6 space-y-5 animate-fade-in">
              <h2 className="font-semibold text-lg flex items-center gap-2"><CreditCard size={18} className="text-brand-500" />Payment Method</h2>
              <div className="space-y-3">
                {[
                  { id: 'cod', label: 'Cash on Delivery', desc: 'Pay when your order arrives', icon: '💵' },
                  { id: 'upi', label: 'UPI', desc: 'Google Pay, PhonePe, Paytm', icon: '📱' },
                  { id: 'card', label: 'Credit / Debit Card', desc: 'Visa, Mastercard, RuPay', icon: '💳' },
                  { id: 'netbanking', label: 'Net Banking', desc: 'All major banks supported', icon: '🏦' },
                ].map((opt) => (
                  <label key={opt.id} className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    payment === opt.id ? 'border-brand-500 bg-brand-50' : 'border-gray-200 hover:border-gray-300'}`}>
                    <input type="radio" name="payment" value={opt.id} checked={payment === opt.id}
                      onChange={() => setPayment(opt.id)} className="accent-brand-500" />
                    <span className="text-2xl">{opt.icon}</span>
                    <div>
                      <p className="font-medium text-sm text-gray-900">{opt.label}</p>
                      <p className="text-xs text-gray-500">{opt.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
              <div className="flex gap-3">
                <button onClick={() => setStep(1)} className="btn-secondary flex-1">Back</button>
                <button onClick={handlePlaceOrder} disabled={isPlacing} className="btn-primary flex-1">
                  {isPlacing ? 'Placing Order…' : `Place Order — ${formatPrice(total)}`}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Summary sidebar */}
        <div className="card p-5 h-fit sticky top-24 space-y-4">
          <h3 className="font-semibold text-gray-900">Order Summary</h3>
          <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
            {items.map((item) => (
              <div key={item.id} className="flex gap-3 items-center">
                <div className="w-14 h-14 rounded-lg bg-gray-100 overflow-hidden shrink-0">
                  {item.image_url && <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-900 line-clamp-1">{item.name}</p>
                  <p className="text-xs text-gray-400">{item.size} · Qty {item.quantity}</p>
                </div>
                <span className="text-xs font-semibold shrink-0">{formatPrice(item.unit_price * item.quantity)}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-gray-100 pt-3 space-y-2 text-sm">
            <div className="flex justify-between text-gray-600"><span>Subtotal</span><span>{formatPrice(subtotal)}</span></div>
            <div className="flex justify-between text-gray-600"><span>Shipping</span><span>{shipping === 0 ? <span className="text-green-600">Free</span> : formatPrice(shipping)}</span></div>
            <div className="flex justify-between text-gray-600"><span>GST</span><span>{formatPrice(tax)}</span></div>
            <div className="flex justify-between font-bold text-gray-900 text-base pt-2 border-t border-gray-100">
              <span>Total</span><span>{formatPrice(total)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
