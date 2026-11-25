import { Link } from 'react-router-dom';
import { useCartStore } from '../store/cartStore';
import { formatPrice } from '../lib/formatters';
import { useState } from 'react';
import api from '../lib/api';
import toast from 'react-hot-toast';

const FREE_SHIPPING_THRESHOLD = 599;
const SHIPPING_COST = 99;

const trustBadges = [
  { icon: 'verified', label: 'Verified Products' },
  { icon: 'replay', label: '30-Day Returns' },
  { icon: 'lock', label: 'Secure Payment' },
];

export default function CartPage() {
  const { items, subtotal, updateItem, removeItem } = useCartStore();
  const [coupon, setCoupon] = useState('');
  const [discount, setDiscount] = useState(0);
  const [appliedCoupon, setAppliedCoupon] = useState('');
  const [applyingCoupon, setApplyingCoupon] = useState(false);

  const shipping = subtotal - discount >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_COST;
  const tax = (subtotal - discount) * 0.05;
  const total = subtotal - discount + shipping + tax;

  const freeShippingProgress = Math.min(((subtotal - discount) / FREE_SHIPPING_THRESHOLD) * 100, 100);
  const amountToFreeShipping = Math.max(FREE_SHIPPING_THRESHOLD - (subtotal - discount), 0);

  const handleApplyCoupon = async () => {
    if (!coupon.trim()) return;
    setApplyingCoupon(true);
    try {
      const res = await api.post('/payments/validate-coupon', { code: coupon, subtotal });
      setDiscount(res.data.discount);
      setAppliedCoupon(coupon);
      toast.success(`Coupon applied — you save ${formatPrice(res.data.discount)}!`);
    } catch { /* handled */ } finally {
      setApplyingCoupon(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="bg-surface min-h-[80vh] flex items-center justify-center px-6">
        <div className="text-center max-w-sm">
          <div className="w-28 h-28 rounded-full bg-surface-container mx-auto flex items-center justify-center mb-space-xl">
            <span className="material-symbols-outlined text-[56px] text-on-surface-variant">shopping_bag</span>
          </div>
          <h2 className="text-headline-sm text-on-surface mb-space-sm">Your cart is empty</h2>
          <p className="text-body-md text-on-surface-variant mb-space-xl">
            Looks like you haven't added anything yet. Discover our latest styles!
          </p>
          <Link to="/shop" className="btn-primary">
            <span className="material-symbols-outlined text-[18px]">storefront</span>
            Shop Now
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface min-h-screen">
      {/* Breadcrumb */}
      <div className="bg-surface-container-low border-b border-outline/10">
        <div className="container-site py-space-md">
          <nav className="flex items-center gap-space-xs text-body-sm text-on-surface-variant">
            <Link to="/" className="hover:text-primary transition-colors">Home</Link>
            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            <span className="text-on-surface font-semibold">Shopping Cart</span>
          </nav>
        </div>
      </div>

      <div className="container-site py-space-xl pb-16">
        <h1 className="text-headline-md text-on-surface mb-space-xl">
          Shopping Cart
          <span className="text-body-lg text-on-surface-variant font-normal ml-space-md">
            ({items.length} {items.length === 1 ? 'item' : 'items'})
          </span>
        </h1>

        <div className="grid lg:grid-cols-3 gap-space-xl">
          {/* ── Left: Cart items ── */}
          <div className="lg:col-span-2 space-y-space-md">
            {/* Free shipping progress */}
            <div className="card p-space-lg">
              <div className="flex items-center justify-between mb-space-sm">
                <div className="flex items-center gap-space-xs text-body-sm text-on-surface-variant">
                  <span className="material-symbols-outlined text-[18px] text-primary">local_shipping</span>
                  {amountToFreeShipping > 0 ? (
                    <span>Add <strong className="text-primary">{formatPrice(amountToFreeShipping)}</strong> more for free shipping</span>
                  ) : (
                    <span className="text-primary font-semibold">🎉 You've unlocked free shipping!</span>
                  )}
                </div>
                <span className="text-label-badge text-on-surface-variant">{Math.round(freeShippingProgress)}%</span>
              </div>
              <div className="h-2 rounded-full bg-surface-container-low overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-500"
                  style={{ width: `${freeShippingProgress}%` }}
                />
              </div>
            </div>

            {/* Cart items */}
            {items.map((item) => (
              <div key={item.id} className="card p-space-md">
                <div className="flex gap-space-md">
                  {/* Image */}
                  <div className="w-[100px] h-[100px] rounded-DEFAULT overflow-hidden bg-surface-container shrink-0">
                    {item.image_url ? (
                      <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="material-symbols-outlined text-[36px] text-outline">photo</span>
                      </div>
                    )}
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-space-sm">
                      <div className="min-w-0">
                        <Link
                          to={`/product/${item.slug}`}
                          className="text-title-md font-semibold text-on-surface hover:text-primary transition-colors line-clamp-2 leading-snug block"
                        >
                          {item.name}
                        </Link>
                        {/* Size & Color tags */}
                        <div className="flex flex-wrap gap-space-xs mt-space-sm">
                          {item.size && (
                            <span className="inline-flex items-center px-space-sm py-0.5 rounded-full bg-surface-container text-label-badge text-on-surface-variant">
                              Size: {item.size}
                            </span>
                          )}
                          {item.color && (
                            <span className="inline-flex items-center gap-1 px-space-sm py-0.5 rounded-full bg-surface-container text-label-badge text-on-surface-variant">
                              {item.color_hex && (
                                <span
                                  className="w-2 h-2 rounded-full border border-outline/20"
                                  style={{ background: item.color_hex }}
                                />
                              )}
                              {item.color}
                            </span>
                          )}
                        </div>
                      </div>
                      {/* Remove */}
                      <button
                        onClick={() => removeItem(item.id)}
                        className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant hover:bg-error-container hover:text-on-error-container transition-colors shrink-0"
                        aria-label="Remove item"
                      >
                        <span className="material-symbols-outlined text-[18px]">close</span>
                      </button>
                    </div>

                    {/* Qty + price row */}
                    <div className="flex items-center justify-between mt-space-md">
                      {/* Qty stepper */}
                      <div className="inline-flex items-center gap-space-xs rounded-full bg-surface-container p-1">
                        <button
                          onClick={() => updateItem(item.id, item.quantity - 1)}
                          disabled={item.quantity <= 1}
                          className="w-8 h-8 rounded-full bg-surface-container-lowest flex items-center justify-center hover:bg-primary-container hover:text-on-primary transition-colors disabled:opacity-30"
                          aria-label="Decrease quantity"
                        >
                          <span className="material-symbols-outlined text-[18px]">remove</span>
                        </button>
                        <span className="text-title-md font-semibold text-on-surface w-8 text-center tabular-nums">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateItem(item.id, item.quantity + 1)}
                          disabled={item.quantity >= item.stock_qty}
                          className="w-8 h-8 rounded-full bg-surface-container-lowest flex items-center justify-center hover:bg-primary-container hover:text-on-primary transition-colors disabled:opacity-30"
                          aria-label="Increase quantity"
                        >
                          <span className="material-symbols-outlined text-[18px]">add</span>
                        </button>
                      </div>

                      {/* Price */}
                      <div className="text-right">
                        <p className="text-title-md font-semibold text-primary">
                          {formatPrice(item.unit_price * item.quantity)}
                        </p>
                        {item.quantity > 1 && (
                          <p className="text-body-sm text-on-surface-variant">
                            {formatPrice(item.unit_price)} each
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* Coupon */}
            <div className="card p-space-lg">
              <h3 className="text-label-md font-bold text-on-surface mb-space-md flex items-center gap-space-xs">
                <span className="material-symbols-outlined text-[18px] text-primary">sell</span>
                Have a coupon?
              </h3>
              <div className="flex gap-space-sm">
                <input
                  value={coupon}
                  onChange={(e) => setCoupon(e.target.value.toUpperCase())}
                  placeholder="Enter coupon code"
                  className="input-field flex-1 uppercase tracking-widest text-label-md"
                />
                <button
                  onClick={handleApplyCoupon}
                  disabled={applyingCoupon || !coupon.trim()}
                  className="btn-primary shrink-0 disabled:opacity-50"
                >
                  {applyingCoupon ? 'Applying…' : 'Apply'}
                </button>
              </div>
              {appliedCoupon && (
                <p className="text-body-sm text-primary mt-space-sm flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                  Coupon "{appliedCoupon}" applied
                </p>
              )}
            </div>
          </div>

          {/* ── Right: Order summary ── */}
          <div className="lg:col-span-1">
            <div className="card p-space-lg sticky top-24 space-y-space-md">
              <h2 className="text-headline-sm text-on-surface">Your Order</h2>

              {/* Line items */}
              <div className="space-y-space-sm">
                <div className="flex justify-between text-body-md text-on-surface-variant">
                  <span>Subtotal ({items.length} items)</span>
                  <span className="font-semibold text-on-surface">{formatPrice(subtotal)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-body-md text-primary">
                    <span>Coupon discount</span>
                    <span className="font-semibold">−{formatPrice(discount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-body-md text-on-surface-variant">
                  <span>Shipping</span>
                  {shipping === 0 ? (
                    <span className="font-semibold text-primary">FREE</span>
                  ) : (
                    <span className="font-semibold text-on-surface">{formatPrice(shipping)}</span>
                  )}
                </div>
                <div className="flex justify-between text-body-md text-on-surface-variant">
                  <span>GST (5%)</span>
                  <span className="font-semibold text-on-surface">{formatPrice(tax)}</span>
                </div>
              </div>

              <div className="border-t border-outline/10 pt-space-md">
                <div className="flex justify-between items-center">
                  <span className="text-title-md font-semibold text-on-surface">Total</span>
                  <span className="text-headline-sm font-bold text-primary">{formatPrice(total)}</span>
                </div>
                {discount > 0 && (
                  <p className="text-body-sm text-primary mt-space-xs">
                    You're saving {formatPrice(discount)} with your coupon!
                  </p>
                )}
              </div>

              {/* CTA */}
              <Link
                to="/checkout"
                className="btn-primary w-full h-[52px] text-label-md"
              >
                <span className="material-symbols-outlined text-[18px]">shopping_cart_checkout</span>
                Proceed to Checkout
              </Link>
              <Link to="/shop" className="btn-outline w-full h-[44px] text-label-badge">
                Continue Shopping
              </Link>

              {/* Trust badges */}
              <div className="border-t border-outline/10 pt-space-md">
                <div className="grid grid-cols-3 gap-space-sm">
                  {trustBadges.map((badge) => (
                    <div key={badge.icon} className="flex flex-col items-center gap-space-xs text-center">
                      <div className="w-9 h-9 rounded-full bg-surface-container flex items-center justify-center">
                        <span className="material-symbols-outlined text-[18px] text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>
                          {badge.icon}
                        </span>
                      </div>
                      <span className="text-label-badge text-on-surface-variant leading-tight">{badge.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
