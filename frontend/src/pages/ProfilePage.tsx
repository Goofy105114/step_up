import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';
import api from '../lib/api';
import { formatPrice } from '../lib/formatters';
import toast from 'react-hot-toast';

export default function ProfilePage() {
  const { user, logout } = useAuthStore();
  const queryClient = useQueryClient();
  const [fitForm, setFitForm] = useState({ foot_length_mm: '', usual_size: '', arch_preference: '', comfort_focus: '', daily_activity: '', consent: false });
  const [addressForm, setAddressForm] = useState({ label: 'Home', full_name: '', phone: '', line1: '', line2: '', city: '', state: '', postal_code: '', country: 'India', is_default: false });


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
  const { data: addressesData, isLoading: addressesLoading, isError: addressesError, refetch: refetchAddresses } = useQuery({
    queryKey: ['user-addresses'],
    queryFn: () => api.get('/users/addresses').then(r => r.data),
    enabled: !!user,
  });
  const { data: fitProfileData, isLoading: fitProfileLoading, isError: fitProfileError, refetch: refetchFitProfile, isFetching: fitProfileFetching } = useQuery({
    queryKey: ['patient-fit-profile'],
    queryFn: () => api.get('/patient-profile').then(r => r.data),
    enabled: !!user,
  });

  useEffect(() => {
    const profile = fitProfileData?.data;
    if (!profile) return;
    setFitForm({
      foot_length_mm: profile.foot_length_mm ? String(profile.foot_length_mm) : '',
      usual_size: profile.usual_size || '',
      arch_preference: profile.arch_preference || '',
      comfort_focus: profile.comfort_focus || '',
      daily_activity: profile.daily_activity || '',
      consent: false,
    });
  }, [fitProfileData]);

  const saveAddress = useMutation({
    mutationFn: () => api.post('/users/addresses', addressForm),
    onSuccess: () => {
      toast.success('Delivery address saved');
      setAddressForm({ label: 'Home', full_name: '', phone: '', line1: '', line2: '', city: '', state: '', postal_code: '', country: 'India', is_default: false });
      queryClient.invalidateQueries({ queryKey: ['user-addresses'] });
    },
    onError: (error: any) => toast.error(error.response?.data?.message || 'Unable to save address'),
  });

  const deleteAddress = useMutation({
    mutationFn: (id: string) => api.delete('/users/addresses/' + id),
    onSuccess: () => {
      toast.success('Address deleted');
      queryClient.invalidateQueries({ queryKey: ['user-addresses'] });
    },
    onError: (error: any) => toast.error(error.response?.data?.message || 'Unable to delete address'),
  });

  const saveFitProfile = useMutation({
    mutationFn: () => api.put('/patient-profile', {
      consent: true,
      foot_length_mm: fitForm.foot_length_mm === '' ? null : Number(fitForm.foot_length_mm),
      usual_size: fitForm.usual_size,
      arch_preference: fitForm.arch_preference || null,
      comfort_focus: fitForm.comfort_focus || null,
      daily_activity: fitForm.daily_activity || null,
    }),
    onSuccess: () => {
      toast.success('Fit preferences saved');
      setFitForm(current => ({ ...current, consent: false }));
      queryClient.invalidateQueries({ queryKey: ['patient-fit-profile'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'patient-fit-profiles'] });
    },
    onError: (error: any) => toast.error(error.response?.data?.message || 'Unable to save fit preferences'),
  });

  const deleteFitProfile = useMutation({
    mutationFn: () => api.delete('/patient-profile'),
    onSuccess: () => {
      toast.success('Fit profile deleted');
      setFitForm({ foot_length_mm: '', usual_size: '', arch_preference: '', comfort_focus: '', daily_activity: '', consent: false });
      queryClient.invalidateQueries({ queryKey: ['patient-fit-profile'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'patient-fit-profiles'] });
    },
    onError: (error: any) => toast.error(error.response?.data?.message || 'Unable to delete fit profile'),
  });

  if (!user) return (
    <div className="bg-surface min-h-screen flex items-center justify-center p-6">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 rounded-full bg-primary-container flex items-center justify-center mx-auto mb-space-lg">
          <span className="material-symbols-outlined text-[40px] text-on-primary">person</span>
        </div>
        <h2 className="text-headline-md font-semibold text-primary mb-space-sm">Access your STEPUP account</h2>
        <p className="text-body-md text-on-surface-variant mb-space-lg">Manage your account, review your orders and keep track of saved products.</p>
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
    { icon: 'footprint', label: 'My Orders', href: '/orders', badge: orders.length > 0 ? `${orders.length} Active` : null },
    { icon: 'favorite', label: 'Saved Wishlist', href: '/wishlist', badge: wishlist.length > 0 ? `${wishlist.length} Items` : null },
    { icon: 'receipt_long', label: 'Order receipts', href: '/orders', badge: null },
    { icon: 'tune', label: 'Fit profile', href: '/profile#fit-profile', badge: null },
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
                  <span className="material-symbols-outlined text-[13px]">person</span>
                </span>
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-space-xs mb-space-xs">
                  <span className="text-label-badge font-bold uppercase tracking-[0.06em] text-secondary bg-surface-container px-space-sm py-0.5 rounded-full">Account overview</span>
                  
                </div>
                <h1 className="text-headline-lg font-semibold text-primary tracking-tight">Welcome back, {user.first_name} {user.last_name}</h1>
                <p className="text-body-md text-on-surface-variant flex items-center gap-space-xs mt-1">
                  <span className="material-symbols-outlined text-[18px] text-secondary">mail</span>
                  {user.email}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-space-xs">
              <div className="inline-flex items-center gap-space-xs bg-surface-container-low px-space-md py-space-xs rounded-full">
                <span className="material-symbols-outlined text-[16px] text-secondary">person</span>
                <span className="text-label-badge font-bold text-primary uppercase tracking-[0.06em]">Profile</span>
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

        <section id="fit-profile" className="card mb-space-xl p-space-lg md:p-space-xl">
          <div className="mb-space-md">
            <p className="text-label-badge font-bold uppercase tracking-[0.14em] text-secondary">Optional fit information</p>
            <h2 className="mt-2 text-xl font-semibold text-primary">Your fit profile</h2>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-on-surface-variant">
              Save measurements and comfort preferences you choose to share. This is self-reported shopping information, not a medical record, diagnosis or gait analysis.
            </p>
          </div>
          {fitProfileLoading ? <p aria-live="polite" className="mb-4 text-sm text-on-surface-variant">Loading your saved fit preferences…</p> : null}
          {fitProfileError ? (
            <div role="alert" className="mb-4 rounded-xl border border-error/30 bg-surface-container-low p-4">
              <p className="text-sm text-on-surface-variant">We couldn’t load your saved fit preferences. Your existing profile has not been changed.</p>
              <button type="button" onClick={() => refetchFitProfile()} disabled={fitProfileFetching} className="btn-outline mt-3 px-4 py-2 text-xs">{fitProfileFetching ? 'Retrying…' : 'Try again'}</button>
            </div>
          ) : null}
          <form onSubmit={(event) => { event.preventDefault(); if (!fitForm.consent) { toast.error('Please provide consent before saving'); return; } if (!fitForm.foot_length_mm && !fitForm.usual_size.trim() && !fitForm.arch_preference && !fitForm.comfort_focus && !fitForm.daily_activity) { toast.error('Add at least one fit preference before saving'); return; } saveFitProfile.mutate(); }} className="space-y-space-md">
            <div className="grid gap-space-md sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <label className="label">Foot length (mm)</label>
                <select value={fitForm.foot_length_mm} onChange={event => setFitForm(current => ({ ...current, foot_length_mm: event.target.value }))} className="input-field"><option value="">Select foot length</option>{Array.from({ length: 17 }, (_, index) => 220 + index * 5).map(mm => <option key={mm} value={String(mm)}>{mm} mm</option>)}</select>
              </div>
              <div>
                <label className="label">Usual shoe size</label>
                <select value={fitForm.usual_size} onChange={event => setFitForm(current => ({ ...current, usual_size: event.target.value }))} className="input-field"><option value="">Select UK shoe size</option>{[5,6,7,8,9,10,11].map(size => <option key={size} value={`UK ${size}`}>UK {size}</option>)}</select>
              </div>
              <div>
                <label className="label">Arch preference</label>
                <select value={fitForm.arch_preference} onChange={event => setFitForm(current => ({ ...current, arch_preference: event.target.value }))} className="input-field">
                  <option value="">Not specified</option><option value="unknown">Not sure</option><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>
                </select>
              </div>
              <div>
                <label className="label">Comfort focus</label>
                <select value={fitForm.comfort_focus} onChange={event => setFitForm(current => ({ ...current, comfort_focus: event.target.value }))} className="input-field">
                  <option value="">Not specified</option><option value="general">General comfort</option><option value="heel">Heel area</option><option value="arch">Arch area</option><option value="forefoot">Forefoot</option><option value="stability">Stability</option>
                </select>
              </div>
              <div>
                <label className="label">Daily activity</label>
                <select value={fitForm.daily_activity} onChange={event => setFitForm(current => ({ ...current, daily_activity: event.target.value }))} className="input-field">
                  <option value="">Not specified</option><option value="low">Mostly seated / light activity</option><option value="moderate">Mixed activity</option><option value="high">Frequent standing or walking</option>
                </select>
              </div>
            </div>
            <label className="flex items-start gap-space-sm text-sm leading-6 text-on-surface-variant">
              <input type="checkbox" checked={fitForm.consent} onChange={event => setFitForm(current => ({ ...current, consent: event.target.checked }))} className="mt-1" />
              <span>I consent to STEPUP storing these self-reported fit preferences in my account to help with product discovery. I can delete this profile at any time.</span>
            </label>
            <div className="flex flex-wrap gap-space-sm">
              <button type="submit" disabled={!fitForm.consent || saveFitProfile.isPending} className="btn-primary px-6 py-3">{saveFitProfile.isPending ? 'Saving…' : 'Save fit profile'}</button>
              {fitProfileData?.data ? <button type="button" disabled={deleteFitProfile.isPending} onClick={() => { if (window.confirm('Delete your saved fit profile?')) deleteFitProfile.mutate(); }} className="btn-outline px-6 py-3 text-error">{deleteFitProfile.isPending ? 'Deleting…' : 'Delete profile'}</button> : null}
            </div>
          </form>
        </section>

        <section id="saved-addresses" className="card mb-space-xl p-space-lg md:p-space-xl">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-space-md">
            <div>
              <p className="text-label-badge font-bold uppercase tracking-[0.14em] text-secondary">Your delivery details</p>
              <h2 className="mt-2 text-xl font-semibold text-primary">Saved addresses</h2>
              <p className="mt-2 text-sm leading-6 text-on-surface-variant">Keep delivery addresses in your account for a quicker checkout. Only you can view and manage these addresses.</p>
            </div>
            <span className="text-xs text-on-surface-variant">{(addressesData?.data || []).length} saved</span>
          </div>

          {addressesLoading ? <p className="text-sm text-on-surface-variant" aria-live="polite">Loading your addresses…</p> : null}
          {addressesError ? (
            <div role="alert" className="rounded-xl border border-error/30 bg-surface-container-low p-4 mb-space-md">
              <p className="text-sm text-on-surface-variant">Your saved addresses could not be loaded.</p>
              <button type="button" onClick={() => refetchAddresses()} className="btn-outline mt-3 px-4 py-2 text-xs">Try again</button>
            </div>
          ) : null}
          {!addressesLoading && !addressesError && (addressesData?.data || []).length === 0 ? (
            <p className="text-sm text-on-surface-variant mb-space-md">No saved addresses yet. Add one below to make checkout easier.</p>
          ) : null}

          {(addressesData?.data || []).map((address: any) => (
            <div key={address.id} className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 rounded-xl border border-outline-variant/40 p-space-md mb-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <p className="font-semibold text-primary">{address.label || 'Address'}</p>
                  {address.is_default && <span className="rounded-full bg-secondary-container px-2 py-0.5 text-[11px] font-bold text-on-secondary-container">Default</span>}
                </div>
                <p className="text-sm text-on-surface">{address.full_name} · {address.phone}</p>
                <p className="text-sm text-on-surface-variant break-words">{address.line1}{address.line2 ? ', ' + address.line2 : ''}, {address.city}, {address.state} - {address.postal_code}, {address.country}</p>
              </div>
              <button type="button" onClick={() => { if (window.confirm('Delete this saved address?')) deleteAddress.mutate(address.id); }}
                disabled={deleteAddress.isPending} className="btn-outline px-4 py-2 text-xs text-error shrink-0">Delete</button>
            </div>
          ))}

          <form onSubmit={(event) => {
            event.preventDefault();
            const phone = addressForm.phone.replace(/\D/g, '').replace(/^91(?=\d{10}$)/, '');
            if (!addressForm.full_name.trim() || !addressForm.line1.trim() || !addressForm.city.trim() || !addressForm.state.trim()) { toast.error('Complete the required address fields'); return; }
            if (!/^[6-9]\d{9}$/.test(phone)) { toast.error('Enter a valid 10-digit Indian mobile number'); return; }
            if (!/^\d{6}$/.test(addressForm.postal_code)) { toast.error('Enter a valid 6-digit PIN code'); return; }
            saveAddress.mutate();
          }} className="border-t border-outline-variant/30 pt-space-md mt-space-md space-y-space-md">
            <h3 className="font-semibold text-primary">Add a delivery address</h3>
            <div className="grid gap-space-md sm:grid-cols-2">
              <div><label className="label" htmlFor="address-label">Address label</label><select id="address-label" className="input-field" value={addressForm.label} onChange={e => setAddressForm(v => ({ ...v, label: e.target.value }))}><option>Home</option><option>Work</option><option>Other</option></select></div>
              <div><label className="label" htmlFor="address-name">Full name *</label><input id="address-name" required className="input-field" value={addressForm.full_name} onChange={e => setAddressForm(v => ({ ...v, full_name: e.target.value }))} /></div>
              <div><label className="label" htmlFor="address-phone">Mobile number *</label><input id="address-phone" required inputMode="numeric" className="input-field" value={addressForm.phone} onChange={e => setAddressForm(v => ({ ...v, phone: e.target.value }))} /></div>
              <div><label className="label" htmlFor="address-line1">Street address *</label><input id="address-line1" required className="input-field" value={addressForm.line1} onChange={e => setAddressForm(v => ({ ...v, line1: e.target.value }))} /></div>
              <div><label className="label" htmlFor="address-line2">Apartment / landmark</label><input id="address-line2" className="input-field" value={addressForm.line2} onChange={e => setAddressForm(v => ({ ...v, line2: e.target.value }))} /></div>
              <div><label className="label" htmlFor="address-city">City *</label><input id="address-city" required className="input-field" value={addressForm.city} onChange={e => setAddressForm(v => ({ ...v, city: e.target.value }))} /></div>
              <div><label className="label" htmlFor="address-state">State *</label><input id="address-state" required className="input-field" value={addressForm.state} onChange={e => setAddressForm(v => ({ ...v, state: e.target.value }))} /></div>
              <div><label className="label" htmlFor="address-pin">PIN code *</label><input id="address-pin" required maxLength={6} inputMode="numeric" className="input-field" value={addressForm.postal_code} onChange={e => setAddressForm(v => ({ ...v, postal_code: e.target.value.replace(/\D/g, '').slice(0, 6) }))} /></div>
            </div>
            <label className="flex items-center gap-2 text-sm text-on-surface-variant"><input type="checkbox" checked={addressForm.is_default} onChange={e => setAddressForm(v => ({ ...v, is_default: e.target.checked }))} /> Make this my default address</label>
            <button type="submit" disabled={saveAddress.isPending} className="btn-primary px-6 py-3">{saveAddress.isPending ? 'Saving…' : 'Save address'}</button>
          </form>
        </section>

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
                      <span>{label}</span>
                    </div>
                    {badge && <span className="text-label-badge font-bold bg-secondary-container text-on-secondary-container px-2 py-0.5 rounded-full">{badge}</span>}
                  </Link>
                ))}
              </nav>
            </div>

            <div className="card bg-surface-container-high p-space-md">
              <div className="flex items-center gap-space-xs text-primary mb-space-xs">
                <span className="material-symbols-outlined text-[18px]">verified</span>
                <span className="text-label-badge font-bold uppercase tracking-[0.06em]">Shopping information</span>
              </div>
              <p className="text-body-sm text-on-surface-variant">Review the product and order information shown at checkout for current terms.</p>
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
