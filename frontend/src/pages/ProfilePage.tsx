import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';
import api from '../lib/api';
import { formatPrice } from '../lib/formatters';

export default function ProfilePage() {
  const { user, logout } = useAuthStore();

  const { data: ordersData } = useQuery({
    queryKey: ['orders'],
    queryFn: () => api.get('/orders').then(r => r.data),
    enabled: !!user,
  });
  const { data: wishlistData } = useQuery({
    queryKey: ['wishlist'],
    queryFn: () => api.get('/wishlist').then(r => r.data),
    enabled: !!user,
  });

  if (!user) return (
    <div className="bg-surface min-h-screen flex items-center justify-center p-6">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 rounded-full bg-primary-container flex items-center justify-center mx-auto mb-space-lg">
          <span className="material-symbols-outlined text-[40px] text-on-primary">person</span>
        </div>
        <h2 className="text-headline-md font-semibold text-primary mb-space-sm">Access Your Orthopedic Profile</h2>
        <p className="text-body-md text-on-surface-variant mb-space-lg">Manage active footwear orders, view your size calibrations, and download itemized receipts.</p>
        <div className="flex gap-space-md justify-center">
          <Link to="/login" className="btn-primary px-8 py-4 text-title-md font-semibold">Sign In</Link>
          <Link to="/register" className="btn-outline px-8 py-4 text-title-md font-semibold">Create Account</Link>
        </div>
      </div>
    </div>
  );

  const orders = ordersData?.data || [];
  const wishlist = wishlistData?.data || [];
  const initials = `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`.toUpperCase();

  const MENU = [
    { icon: 'footprint', label: 'My Foot Health &amp; Orders', href: '/orders', badge: orders.length > 0 ? `${orders.length} Active` : null },
    { icon: 'favorite', label: 'Saved Wishlist', href: '/wishlist', badge: wishlist.length > 0 ? `${wishlist.length} Items` : null },
    { icon: 'receipt_long', label: 'HSA/FSA Receipts', href: '/orders', badge: null },
    { icon: 'tune', label: 'Settings &amp; Sizing Specs', href: '/profile', badge: null },
  ];

  return (
    <div className="bg-surface min-h-screen py-space-xl">
      <div className="max-w-site mx-auto px-margin-mobile md:px-margin">
        <div className="absolute top-24 left-1/3 w-96 h-96 bg-primary-fixed/20 rounded-full blur-3xl pointer-events-none -z-10" />
        <div className="absolute top-80 right-10 w-80 h-80 bg-secondary-container/30 rounded-full blur-3xl pointer-events-none -z-10" />

        {/* Profile banner */}
        <div className="card p-space-lg md:p-space-xl relative overflow-hidden mb-space-xl">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-lg relative z-10">
            <div className="flex items-start md:items-center gap-space-md">
              <div className="relative">
                <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-primary-container flex items-center justify-center shadow-primary">
                  <span className="text-display-hero-mobile font-bold text-on-primary">{initials}</span>
                </div>
                <span className="absolute bottom-1 right-1 w-5 h-5 bg-secondary text-on-secondary rounded-full flex items-center justify-center shadow-sm">
                  <span className="material-symbols-outlined text-[13px]">check</span>
                </span>
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-space-xs mb-space-xs">
                  <span className="text-label-badge font-bold uppercase tracking-[0.06em] text-secondary bg-surface-container px-space-sm py-0.5 rounded-full">Verified Account</span>
                  <span className="text-label-badge font-bold text-outline">HSA/FSA Member</span>
                </div>
                <h1 className="text-headline-lg font-semibold text-primary tracking-tight">Welcome back, {user.first_name} {user.last_name}</h1>
                <p className="text-body-md text-on-surface-variant flex items-center gap-space-xs mt-1">
                  <span className="material-symbols-outlined text-[18px] text-secondary">clinical_notes</span>
                  {user.email}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-space-xs">
              <div className="inline-flex items-center gap-space-xs bg-surface-container-low px-space-md py-space-xs rounded-full">
                <span className="material-symbols-outlined text-[16px] text-secondary">verified_user</span>
                <span className="text-label-badge font-bold text-primary uppercase tracking-[0.06em]">Verified Profile</span>
              </div>
              {user.role === 'admin' && (
                <div className="inline-flex items-center gap-space-xs bg-tertiary-fixed text-tertiary px-space-md py-space-xs rounded-full">
                  <span className="material-symbols-outlined text-[16px]">admin_panel_settings</span>
                  <span className="text-label-badge font-bold uppercase tracking-[0.06em]">Admin Access</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg">
          {/* Sidebar */}
          <aside className="lg:col-span-3 flex flex-col gap-space-md">
            <div className="card p-space-md">
              <div className="px-space-md py-space-sm mb-space-xs">
                <span className="text-label-badge font-bold uppercase tracking-[0.06em] text-outline">Account Navigation</span>
              </div>
              <nav className="flex flex-col gap-space-xs">
                {MENU.map(({ icon, label, href, badge }) => (
                  <Link key={label} to={href}
                    className="flex items-center justify-between px-space-md py-space-sm rounded-DEFAULT text-on-surface-variant hover:bg-surface-container hover:text-primary text-label-md font-semibold transition-all">
                    <div className="flex items-center gap-space-sm">
                      <span className="material-symbols-outlined text-[20px]">{icon}</span>
                      <span dangerouslySetInnerHTML={{ __html: label }} />
                    </div>
                    {badge && <span className="text-label-badge font-bold bg-secondary-container text-on-secondary-container px-2 py-0.5 rounded-full">{badge}</span>}
                  </Link>
                ))}
              </nav>
            </div>

            <div className="card bg-surface-container-high p-space-md">
              <div className="flex items-center gap-space-xs text-primary mb-space-xs">
                <span className="material-symbols-outlined text-[18px]">verified</span>
                <span className="text-label-badge font-bold uppercase tracking-[0.06em]">Pain-Free Guarantee</span>
              </div>
              <p className="text-body-sm text-on-surface-variant">All active models maintain 60 days of risk-free daily rehabilitation wear. Full refunds or recalibrations honored.</p>
            </div>

            <button onClick={logout} className="card p-space-md text-error hover:bg-error-container/30 transition-colors flex items-center gap-space-sm">
              <span className="material-symbols-outlined text-[20px]">logout</span>
              <span className="text-label-md font-semibold">Sign Out</span>
            </button>
          </aside>

          {/* Main content */}
          <div className="lg:col-span-9 flex flex-col gap-space-lg">
            {/* Stats */}
            <div className="grid grid-cols-3 gap-space-md">
              {[
                { n: orders.length, label: 'Orders', icon: 'package_2', href: '/orders' },
                { n: wishlist.length, label: 'Wishlist', icon: 'favorite', href: '/wishlist' },
                { n: 0, label: 'Reviews', icon: 'star', href: '/profile' },
              ].map(({ n, label, icon, href }) => (
                <Link key={label} to={href} className="card p-space-lg text-center hover:shadow-card-hover">
                  <span className="material-symbols-outlined text-[28px] text-secondary block mb-space-xs">{icon}</span>
                  <span className="text-display-hero-mobile font-bold text-primary block">{n}</span>
                  <span className="text-body-sm text-on-surface-variant">{label}</span>
                </Link>
              ))}
            </div>

            {/* Recent orders */}
            <div className="card p-space-lg">
              <div className="flex items-center justify-between mb-space-md">
                <h2 className="text-headline-sm font-semibold text-primary">Recent Orders</h2>
                <Link to="/orders" className="text-label-md font-semibold text-secondary hover:text-primary transition-colors flex items-center gap-1">
                  View All <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                </Link>
              </div>
              {orders.length === 0 ? (
                <div className="text-center py-space-xl">
                  <span className="material-symbols-outlined text-[48px] text-outline-variant block mb-space-md">package_2</span>
                  <p className="text-body-md text-on-surface-variant mb-space-md">No orders yet. Discover our collection.</p>
                  <Link to="/shop" className="btn-primary">Shop Now</Link>
                </div>
              ) : (
                <div className="divide-y divide-outline-variant/20">
                  {orders.slice(0, 3).map((order: any) => (
                    <Link key={order.id} to={`/orders/${order.id}`} className="flex items-center justify-between py-space-md hover:bg-surface-container-low px-space-sm rounded transition-colors">
                      <div>
                        <p className="text-label-md font-semibold text-on-surface font-mono">{order.order_number}</p>
                        <p className="text-body-sm text-on-surface-variant">{new Date(order.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-label-md font-semibold text-primary">{formatPrice(parseFloat(order.total_amount))}</p>
                        <span className={`text-label-badge font-bold uppercase px-2 py-0.5 rounded-full ${order.status === 'delivered' ? 'bg-secondary-container text-on-secondary-container' : 'bg-surface-container text-on-surface-variant'}`}>
                          {order.status}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
