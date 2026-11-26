import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCartStore } from '../store/cartStore';
import api from '../lib/api';
import toast from 'react-hot-toast';

function fmt(n: number) { return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n); }

export default function CheckoutPage() {
  const { items, subtotal, clearCart } = useCartStore();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [placing, setPlacing] = useState(false);
  const [orderId, setOrderId] = useState('');
  const [payment, setPayment] = useState('cod');
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [addr, setAddr] = useState({ full_name: '', email: '', phone: '', line1: '', city: '', state: '', postal_code: '', country: 'India' });

  const setA = (k: string, v: string) => setAddr(a => ({ ...a, [k]: v }));

  const applyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    try {
      const res = await api.post('/cart/apply-coupon', { code: couponCode });
      setAppliedCoupon(res.data.data);
      toast.success('Coupon applied! 🎉');
    } catch (e: any) { toast.error(e.response?.data?.message || 'Invalid coupon'); }
    finally { setCouponLoading(false); }
  };

  const validateAddress = () => {
    if (!addr.full_name.trim() || !addr.phone.trim() || !addr.line1.trim() || !addr.city.trim() || !addr.state.trim() || !addr.postal_code.trim()) {
      toast.error('Complete all required delivery fields'); return false;
    }
    const phoneDigits = addr.phone.replace(/\D/g, '').replace(/^91(?=\d{10}$)/, '');
    if (!/^[6-9]\d{9}$/.test(phoneDigits)) { toast.error('Enter a valid 10-digit Indian mobile number'); return false; }
    if (!/^\d{6}$/.test(addr.postal_code.trim())) { toast.error('Enter a valid 6-digit Indian PIN code'); return false; }
    if (addr.country !== 'India') { toast.error('STEPUP currently delivers within India only'); return false; }
    return true;
  };

  const placeOrder = async () => {
    if (!validateAddress()) return;
    if (payment !== 'cod') { toast.error('Online payments are not enabled yet. Please choose Cash on Delivery.'); return; }
    setPlacing(true);
    try {
      const res = await api.post('/orders', { shipping_address: addr, payment_method: payment, coupon_code: appliedCoupon?.code });
      setOrderId(res.data.data.order_number);
      await clearCart();
      setStep(3);
    } catch (e: any) { toast.error(e.response?.data?.message || 'Failed to place order'); }
    finally { setPlacing(false); }
  };

  if (step === 3) return (
    <div className="bg-surface min-h-screen flex items-center justify-center p-6">
      <div className="max-w-2xl w-full">
        <div className="card p-space-xl md:p-16 relative overflow-hidden">
          <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-96 h-96 bg-primary-fixed/20 rounded-full blur-3xl pointer-events-none" />
          <div className="relative">
            <div className="flex items-start gap-space-md mb-space-lg">
              <div className="relative shrink-0">
                <div className="w-16 h-16 rounded-full bg-secondary-container flex items-center justify-center shadow-md">
                  <span className="material-symbols-outlined text-[34px] text-on-secondary-container">check_circle</span>
                </div>
                </div>
              <div>
                <div className="flex flex-wrap items-center gap-space-xs mb-2">
                  <span className="bg-primary-fixed text-on-primary-fixed text-label-badge font-bold px-space-sm py-0.5 rounded-full uppercase">Order Confirmed</span>
                  
                </div>
                <h1 className="text-headline-lg font-semibold text-primary tracking-tight mb-2">Order {orderId} placed</h1>
                <p className="text-body-lg text-on-surface-variant">Your order has been received. Payment and fulfilment status will be available in My Orders.</p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-space-md">
              <button onClick={() => navigate('/orders')} className="btn-primary flex-1 py-4 text-title-md font-semibold justify-center">
                <span className="material-symbols-outlined text-[20px]">local_shipping</span>
                Track My Order
              </button>
              <Link to="/shop" className="btn-outline flex-1 py-4 text-title-md font-semibold justify-center">Continue Shopping</Link>
            </div>
            <p className="text-body-sm text-on-surface-variant text-center mt-space-md">
              <span className="material-symbols-outlined text-[16px] text-secondary align-middle mr-1">verified_user</span>
              Your order details are available in your account.
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  if (items.length === 0 && step !== 3) return (
    <div className="bg-surface min-h-screen flex items-center justify-center p-6">
      <div className="max-w-md text-center">
        <span className="material-symbols-outlined text-5xl text-outline-variant">shopping_bag</span>
        <h1 className="mt-4 text-2xl font-semibold text-primary">Your shopping bag is empty</h1>
        <p className="mt-3 text-sm leading-7 text-on-surface-variant">Add a product before continuing to checkout.</p>
        <Link to="/shop" className="btn-primary mt-6 inline-flex px-7 py-3">Browse footwear</Link>
      </div>
    </div>
  );

  return (
    <div className="bg-surface min-h-screen">
      <section className="max-w-site w-full mx-auto px-margin-mobile md:px-margin pt-space-md pb-space-lg">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-space-sm mb-space-lg">
          <div>
            <div className="inline-flex items-center gap-space-xs px-space-md py-space-xs rounded-full bg-surface-container text-primary text-label-badge font-bold uppercase tracking-[0.06em] mb-space-xs">
              <span className="material-symbols-outlined text-[15px] text-secondary">verified_user</span>
              Secure checkout
            </div>
            <h1 className="text-headline-lg font-semibold text-primary tracking-tight">Checkout</h1>
          </div>
          <div className="flex items-center gap-space-md text-on-surface-variant text-body-sm">
            <span className="flex items-center gap-1.5"><span className="material-symbols-outlined text-secondary text-[18px]">lock</span> Secure checkout</span>
            <span className="opacity-30">•</span>
            
          </div>
        </div>
        {/* Step indicator */}
        <div className="flex items-center gap-space-xs text-label-badge font-bold uppercase tracking-[0.06em] text-outline mb-space-xl">
          <span className={step >= 1 ? 'text-primary font-bold' : ''}>01 Bag</span>
          <span className="material-symbols-outlined text-[14px]">chevron_right</span>
          <span className={step >= 2 ? 'text-primary font-bold' : ''}>02 Delivery Details</span>
          <span className="material-symbols-outlined text-[14px]">chevron_right</span>
          <span className={step >= 3 ? 'text-primary font-bold' : ''}>03 Payment</span>
        </div>
      </section>

      <section className="max-w-site w-full mx-auto px-margin-mobile md:px-margin pb-space-xl">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg xl:gap-space-xl items-start">
          <div className="lg:col-span-7 flex flex-col gap-space-lg">

            {/* Step 1: Delivery */}
            {step === 1 && (
              <div className="card p-space-lg md:p-space-xl">
                <div className="flex items-center justify-between mb-space-md">
                  <span className="text-label-badge font-bold uppercase tracking-[0.06em] text-on-surface-variant">Step 01 • Delivery Address</span>
                </div>
                <div className="space-y-space-md">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-md">
                    {[
                      { key: 'full_name', label: 'Full Name *', placeholder: 'Elena Rostova', icon: 'person' },
                      { key: 'email', label: 'Email', placeholder: 'elena@example.com', icon: 'mail', type: 'email' },
                    ].map(({ key, label, placeholder, icon, type }) => (
                      <div key={key}>
                        <label className="label">{label}</label>
                        <div className="relative">
                          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline text-[20px] pointer-events-none">{icon}</span>
                          <input type={type || 'text'} placeholder={placeholder} value={(addr as any)[key]} onChange={e => setA(key, e.target.value)}
                            className="input-field pl-12" />
                        </div>
                      </div>
                    ))}
                  </div>
                  <div>
                    <label className="label">Mobile Number *</label>
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline text-[20px] pointer-events-none">sms</span>
                      <input type="tel" inputMode="numeric" autoComplete="tel-national" placeholder="98765 43210" value={addr.phone} onChange={e => setA('phone', e.target.value)} className="input-field pl-12" />
                    </div>
                    <p className="text-body-sm text-outline mt-1">Your order confirmation will be available after checkout.</p>
                  </div>
                  <div>
                    <label className="label">Street Address *</label>
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline text-[20px] pointer-events-none">my_location</span>
                      <input type="text" placeholder="House number and street name" value={addr.line1} onChange={e => setA('line1', e.target.value)} className="input-field pl-12" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-space-md">
                    <div className="col-span-2 sm:col-span-1">
                      <label className="label">City *</label>
                      <input type="text" placeholder="Mumbai" value={addr.city} onChange={e => setA('city', e.target.value)} className="input-field" />
                    </div>
                    <div>
                      <label className="label">State *</label>
                      <input type="text" placeholder="State or union territory" value={addr.state} onChange={e => setA('state', e.target.value)} className="input-field" />
                    </div>
                    <div>
                      <label className="label">Pincode *</label>
                      <input type="text" placeholder="400001" inputMode="numeric" maxLength={6} value={addr.postal_code} onChange={e => setA('postal_code', e.target.value)} className="input-field" />
                    </div>
                  </div>
                  <button onClick={() => { if (validateAddress()) setStep(2); }} className="w-full h-[52px] bg-primary-container text-on-primary rounded-full text-label-md font-semibold uppercase tracking-[0.04em] shadow-primary hover:bg-primary transition-all flex items-center justify-center gap-2 group mt-2">
                    Continue to Payment
                    <span className="material-symbols-outlined text-[18px] group-hover:translate-x-1 transition-transform">arrow_forward</span>
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Payment */}
            {step === 2 && (
              <>
                <div className="card p-space-lg md:p-space-xl">
                  <span className="text-label-badge font-bold uppercase tracking-[0.06em] text-on-surface-variant block mb-space-md">Step 02 • Payment Method</span>
                  <div className="mb-space-md rounded-xl border border-outline-variant/40 bg-surface-container-low p-space-md">
                    <div className="flex items-center gap-space-sm">
                      <span className="material-symbols-outlined text-[24px] text-primary">payments</span>
                      <div><p className="text-label-md font-semibold text-on-surface">Cash on Delivery</p><p className="text-body-sm text-on-surface-variant">Pay in Indian Rupees when your order arrives.</p></div>
                    </div>
                    <p className="mt-3 text-body-sm text-on-surface-variant">UPI and card payments will be available after a payment gateway is configured. No online payment will be simulated.</p>
                  </div>
                </div>

                <div className="card p-space-lg">
                  <span className="text-label-badge font-bold uppercase tracking-[0.06em] text-on-surface-variant block mb-space-md">Step 03 • Promo Code</span>
                  <div className="flex gap-space-sm">
                    <input value={couponCode} onChange={e => setCouponCode(e.target.value.toUpperCase())} disabled={!!appliedCoupon}
                      placeholder="Enter discount code" className="input-field flex-1 h-11" />
                    {appliedCoupon
                      ? <button onClick={() => { setAppliedCoupon(null); setCouponCode(''); }} className="px-space-md text-label-md font-semibold text-error hover:text-error/80">Remove</button>
                      : <button onClick={applyCoupon} disabled={couponLoading || !couponCode} className="btn-primary px-space-md py-space-xs h-11">
                          {couponLoading ? '...' : 'Apply'}
                        </button>
                    }
                  </div>
                  {appliedCoupon && <p className="text-body-sm text-secondary font-semibold mt-2 flex items-center gap-1"><span className="material-symbols-outlined text-[16px]">check_circle</span>Coupon applied!</p>}
                </div>

                <button onClick={placeOrder} disabled={placing}
                  className="w-full h-[52px] bg-primary-container text-on-primary rounded-full text-label-md font-semibold uppercase tracking-[0.04em] shadow-primary hover:bg-primary transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                  <span className="material-symbols-outlined text-[18px]">lock</span>
                  {placing ? 'Placing Order...' : 'Place Order — Cash on Delivery'}
                  {!placing && <span className="material-symbols-outlined text-[18px]">arrow_forward</span>}
                </button>
                <p className="text-body-sm text-on-surface-variant text-center">Prices and order totals are displayed in INR (₹).</p>
              </>
            )}
          </div>

          {/* Order summary sidebar */}
          <div className="lg:col-span-5 sticky top-32 flex flex-col gap-space-md">
            <div className="card p-space-lg">
              <h3 className="text-title-md font-semibold text-primary mb-space-md">Order summary</h3>
              <div className="space-y-space-sm max-h-64 overflow-y-auto pr-1 mb-space-md">
                {items.map((item: any) => (
                  <div key={item.id} className="flex items-center gap-space-md">
                    <div className="w-16 h-16 rounded-DEFAULT bg-surface-container-low overflow-hidden shrink-0">
                      {item.image_url && <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-label-md font-semibold text-on-surface line-clamp-1">{item.name}</p>
                      <p className="text-body-sm text-on-surface-variant">Size {item.size} · Qty {item.quantity}</p>
                    </div>
                    <span className="text-label-md font-semibold text-on-surface shrink-0">{fmt(item.unit_price * item.quantity)}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-outline-variant/20 pt-space-md space-y-space-sm">
                <div className="flex justify-between text-body-md text-on-surface-variant"><span>Cart subtotal</span><span>{fmt(subtotal)}</span></div>
                {appliedCoupon && <p className="text-body-sm text-secondary font-semibold">Coupon {appliedCoupon.code} applied. Final discount is confirmed when the order is created.</p>}
                <div className="border-t border-outline-variant/20 pt-space-sm">
                  <p className="text-body-sm text-on-surface-variant">Shipping charges, applicable taxes and the final payable amount are calculated and confirmed by STEPUP when you place the order.</p>
                </div>
              </div>
            </div>
            <div className="card p-space-md bg-surface-container-low text-center">
              <p className="text-body-sm text-on-surface-variant flex items-center justify-center gap-1">
                <span className="material-symbols-outlined text-[16px] text-secondary">receipt_long</span>
                An order summary will be available in your account after your order is placed.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
