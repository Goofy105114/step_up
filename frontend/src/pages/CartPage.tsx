import { Link } from 'react-router-dom';
import { useCartStore } from '../store/cartStore';
import { useAuthStore } from '../store/authStore';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { useState } from 'react';

function formatPrice(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

export default function CartPage() {
  const { items, removeItem, updateItem, subtotal, clearCart } = useCartStore();
  const { user } = useAuthStore();
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const hasUnavailableItems = items.some((item: any) => !item.is_active);

  const handleUpdate = async (itemId: string, qty: number) => {
    setUpdatingId(itemId);
    try {
      if (qty < 1) await removeItem(itemId);
      else await updateItem(itemId, qty);
    } catch { toast.error('Failed to update'); }
    finally { setUpdatingId(null); }
  };

  const handleCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    try {
      const res = await api.post('/cart/apply-coupon', { code: couponCode });
      setAppliedCoupon(res.data.data);
      toast.success('Coupon applied!');
    } catch (e: any) { toast.error(e.response?.data?.message || 'Invalid coupon'); }
    finally { setCouponLoading(false); }
  };

  if (!user) return (
    <div className="bg-surface min-h-screen flex items-center justify-center p-6">
      <div className="text-center max-w-md">
        <span className="material-symbols-outlined text-[64px] text-outline-variant block mb-space-lg">shopping_bag</span>
        <h2 className="text-headline-md font-semibold text-primary mb-space-sm">Sign in to view your cart</h2>
        <p className="text-body-md text-on-surface-variant mb-space-lg">Sign in to view and manage your saved cart items.</p>
        <Link to="/login" className="btn-primary px-10 py-4 text-title-md font-semibold">Sign In</Link>
      </div>
    </div>
  );

  if (items.length === 0) return (
    <div className="bg-surface min-h-screen flex items-center justify-center p-6">
      <div className="text-center max-w-md">
        <span className="material-symbols-outlined text-[64px] text-outline-variant block mb-space-lg">shopping_bag</span>
        <h2 className="text-headline-md font-semibold text-primary mb-space-sm">Your shopping bag is empty</h2>
        <p className="text-body-md text-on-surface-variant mb-space-lg">Browse the current collection and add items to your bag.</p>
        <Link to="/shop" className="btn-primary px-10 py-4 text-title-md font-semibold">
          Browse footwear
          <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
        </Link>
      </div>
    </div>
  );

  return (
    <div className="bg-surface min-h-screen">
      {/* Page header */}
      <div className="w-full bg-surface-container-low py-space-xs px-margin-mobile md:px-margin border-b border-outline-variant/20">
        <div className="max-w-site mx-auto flex flex-wrap items-center justify-between text-on-surface-variant text-body-sm">
          <div className="flex items-center gap-space-sm">
            <span className="material-symbols-outlined text-[18px] text-secondary">verified_user</span>
            <span>Your selected items are ready for review</span>
          </div>
          <div className="flex items-center gap-space-md text-label-md font-semibold">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" /> Stock is checked when you place your order
            </span>
            
          </div>
        </div>
      </div>

      <section className="max-w-site w-full mx-auto px-margin-mobile md:px-margin py-space-xl">
        {/* Breadcrumb progress */}
        <div className="flex items-center justify-between mb-space-lg">
          <div className="flex items-center gap-space-xs text-label-badge font-bold uppercase tracking-[0.06em] text-outline">
            <span className="text-primary font-bold">01 Bag</span>
            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            <span>02 Shipping Profile</span>
            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            <span>03 Payment</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-xl items-start">
          {/* Left: Cart items */}
          <div className="lg:col-span-7 flex flex-col gap-space-lg">
            <div className="pb-space-sm">
              <div className="flex items-baseline justify-between mb-space-xs">
                <h1 className="text-headline-lg font-semibold text-primary tracking-tight">Your shopping bag</h1>
                <span className="text-label-badge font-bold uppercase tracking-[0.06em] text-secondary bg-surface-container px-space-md py-space-xs rounded-full">
                  {items.length} item{items.length !== 1 ? 's' : ''}
                </span>
              </div>
              <p className="text-body-md text-on-surface-variant flex items-center gap-space-xs">
                <span className="material-symbols-outlined text-[18px] text-secondary">verified</span>
                Review product details and order information before checkout.
              </p>
            </div>

            {items.map((item: any) => (
              <div key={item.id} className="card p-space-lg hover:shadow-card-hover">
                <div className="flex flex-col sm:flex-row gap-space-lg">
                  <div className="relative w-full sm:w-36 h-36 rounded-DEFAULT bg-surface-container-low shrink-0 overflow-hidden">
                    {item.image_url
                      ? <img src={item.image_url} alt={item.name} className="w-full h-full object-cover rounded-DEFAULT" />
                      : <div className="w-full h-full flex items-center justify-center"><span className="material-symbols-outlined text-[40px] text-outline">photo</span></div>
                    }
                    <span className="absolute top-2 left-2 bg-primary-container text-on-primary text-label-badge font-bold px-space-xs py-0.5 rounded-full uppercase tracking-[0.06em]">STEPUP</span>
                  </div>
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-space-sm mb-space-xs">
                        <div>
                          <span className="text-label-badge font-bold uppercase tracking-[0.06em] text-secondary">Selected footwear</span>
                          <h2 className="text-title-md font-semibold text-primary">{item.name}</h2>
                          {!item.is_active && <p className="mt-1 text-xs font-semibold text-error">This product is no longer available. Remove it to continue.</p>}
                        </div>
                        <span className="text-title-md font-semibold text-primary shrink-0">{formatPrice(item.unit_price)}</span>
                      </div>
                      <div className="flex flex-wrap gap-space-xs text-on-surface-variant text-body-sm mt-space-xs mb-space-sm">
                        <span className="bg-surface-container-low px-space-sm py-0.5 rounded-full">Size: <strong className="text-on-surface font-medium">US {item.size}</strong></span>
                        <span className="bg-surface-container-low px-space-sm py-0.5 rounded-full">Color: <strong className="text-on-surface font-medium">{item.color}</strong></span>
                      </div>
                      <div className="inline-flex items-center gap-1 bg-surface-container px-space-sm py-space-xs rounded-full text-label-badge font-bold text-primary-container mb-space-sm">
                        <span className="material-symbols-outlined text-[13px] text-secondary">health_and_safety</span>
                        Order details
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-space-sm">
                      <div className="flex items-center bg-surface-container-low rounded-full p-1 shadow-sm">
                        <button onClick={() => handleUpdate(item.id, item.quantity - 1)} disabled={updatingId === item.id}
                          className="w-7 h-7 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container-highest transition-colors">
                          <span className="material-symbols-outlined text-[16px]">{item.quantity === 1 ? 'delete_outline' : 'remove'}</span>
                        </button>
                        <span className="w-8 text-center text-label-md font-semibold text-on-surface">
                          {updatingId === item.id ? '…' : item.quantity}
                        </span>
                        <button onClick={() => handleUpdate(item.id, item.quantity + 1)} disabled={updatingId === item.id}
                          className="w-7 h-7 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container-highest transition-colors">
                          <span className="material-symbols-outlined text-[16px]">add</span>
                        </button>
                      </div>
                      <div className="flex items-center gap-space-md text-on-surface-variant text-body-sm">
                        <button onClick={async () => {
                          try {
                            await api.post('/wishlist', { product_id: item.product_id });
                            toast.success('Saved to wishlist');
                          } catch (error: any) {
                            toast.error(error.response?.data?.message || 'Unable to save item');
                          }
                        }} className="hover:text-primary transition-colors flex items-center gap-1">
                          <span className="material-symbols-outlined text-[16px]">favorite</span>
                          <span className="hidden sm:inline">Save</span>
                        </button>
                        <button onClick={() => handleUpdate(item.id, 0)} className="hover:text-error transition-colors flex items-center gap-1">
                          <span className="material-symbols-outlined text-[16px]">delete_outline</span>
                          <span className="hidden sm:inline">Remove</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Right: Order summary */}
          <div className="lg:col-span-5 sticky top-32 flex flex-col gap-space-md">
            {/* Coupon */}
            <div className="card p-space-lg">
              <div className="flex items-center gap-space-xs mb-space-md">
                <span className="material-symbols-outlined text-[20px] text-secondary">receipt_long</span>
                <h3 className="text-title-md font-semibold text-primary">Discount / Coupon Code</h3>
              </div>
              <div className="flex gap-space-sm">
                <input
                  value={couponCode}
                  onChange={e => setCouponCode(e.target.value.toUpperCase())}
                  disabled={!!appliedCoupon}
                  placeholder="e.g. WELCOME10"
                  className="input-field flex-1 h-11"
                />
                {appliedCoupon
                  ? <button onClick={() => { setAppliedCoupon(null); setCouponCode(''); }} className="px-space-md text-label-md font-semibold text-error hover:text-error/80 transition-colors">Remove</button>
                  : <button onClick={handleCoupon} disabled={couponLoading || !couponCode} className="btn-primary px-space-md py-space-xs h-11 text-label-md font-semibold">
                      {couponLoading ? '...' : 'Apply'}
                    </button>
                }
              </div>
              {appliedCoupon && (
                <p className="text-body-sm text-secondary font-semibold mt-2 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px]">check_circle</span>
                  {appliedCoupon.discount_type === 'percentage' ? `${appliedCoupon.discount_value}% off applied!` : `₹${appliedCoupon.discount_value} off applied!`}
                </p>
              )}
            </div>

            {/* Summary */}
            <div className="card p-space-lg">
              <h3 className="text-title-md font-semibold text-primary mb-space-md">Order Summary</h3>
              <div className="space-y-space-sm">
                <div className="flex justify-between text-body-md text-on-surface-variant"><span>Cart subtotal</span><span>{formatPrice(subtotal)}</span></div>
                {appliedCoupon && <p className="text-body-sm text-secondary font-semibold">Coupon {appliedCoupon.code} applied. The final discount will be confirmed at checkout.</p>}
                <div className="border-t border-outline-variant/20 pt-space-sm">
                  <p className="text-body-sm text-on-surface-variant">Shipping charges, applicable taxes and the final payable amount are calculated and confirmed at checkout.</p>
                </div>
              </div>

              {hasUnavailableItems ? (
                <p className="mt-space-lg rounded-xl bg-error-container/40 p-4 text-center text-sm font-medium text-error">Remove unavailable products before proceeding to checkout.</p>
              ) : (
                <Link to="/checkout" className="mt-space-lg flex items-center justify-center gap-space-sm w-full bg-primary-container text-on-primary py-4 rounded-full text-label-md font-semibold uppercase tracking-[0.04em] shadow-primary hover:bg-primary transition-all duration-200 group">
                  <span className="material-symbols-outlined text-[18px]">lock</span>
                  Proceed to Checkout
                  <span className="material-symbols-outlined text-[18px] group-hover:translate-x-1 transition-transform">arrow_forward</span>
                </Link>
              )}

              <p className="text-body-sm text-on-surface-variant text-center mt-space-sm">
                Checkout details are confirmed before you place your order.
              </p>
            </div>

            {/* Trust badges */}
            <div className="grid grid-cols-2 gap-space-sm">
              {[
                { icon: 'verified', label: 'Product listing', desc: 'Catalogue details' },
                { icon: 'receipt_long', label: 'Order details', desc: 'Shown at checkout' },
              ].map(({ icon, label, desc }) => (
                <div key={label} className="card p-space-md flex items-center gap-space-sm">
                  <span className="material-symbols-outlined text-[22px] text-secondary shrink-0">{icon}</span>
                  <div>
                    <p className="text-label-md font-semibold text-on-surface">{label}</p>
                    <p className="text-body-sm text-on-surface-variant">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
