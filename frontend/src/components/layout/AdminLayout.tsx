import { Outlet, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Package, ShoppingCart, RotateCcw, Users, ArrowLeft, FileText, FlaskConical, Activity, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { useAuthStore } from '../../store/authStore';

const nav = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { to: '/admin/products', label: 'Products', icon: Package },
  { to: '/admin/orders', label: 'Orders', icon: ShoppingCart },
  { to: '/admin/returns', label: 'Returns', icon: RotateCcw },
  { to: '/admin/users', label: 'Customers', icon: Users },
  { to: '/admin/clinical-studies', label: 'Research Library', icon: FileText },
  { to: '/admin/lab-settings', label: 'Lab Settings', icon: FlaskConical },
  { to: '/admin/patient-profiles', label: 'Fit Profiles', icon: Users },
  { to: '/admin/fit-operations', label: 'Fit Operations', icon: Activity },
];

export default function AdminLayout() {
  const { pathname } = useLocation();
  const { user, logout } = useAuthStore();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const activeLabel = nav.find((item) => item.exact ? pathname === item.to : pathname.startsWith(item.to))?.label || 'Admin';

  const navLink = (to: string, label: string, Icon: typeof LayoutDashboard, exact?: boolean, mobile = false) => {
    const active = exact ? pathname === to : pathname.startsWith(to);
    return (
      <Link key={to} to={to} onClick={() => setMobileNavOpen(false)}
        className={`flex items-center gap-3 px-4 py-3 text-xs font-semibold uppercase tracking-widest transition-colors ${active ? 'bg-brand-500 text-white' : 'text-gray-400 hover:bg-white/10 hover:text-white'} ${mobile ? 'rounded-lg' : ''}`}>
        <Icon size={16} strokeWidth={active ? 2 : 1.5} /> {label}
      </Link>
    );
  };

  return (
    <div className="min-h-screen flex bg-gray-100">
      <aside className="hidden lg:flex w-64 bg-gray-900 text-gray-300 flex-col min-h-screen sticky top-0 self-start h-screen">
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-brand-500 flex items-center justify-center"><span className="text-white font-bold text-sm">S</span></div>
            <div><span className="font-display text-lg font-bold text-white block">STEPUP</span><span className="text-[9px] text-gray-500 uppercase tracking-widest">Admin Panel</span></div>
          </div>
        </div>
        <nav aria-label="Admin navigation" className="flex-1 py-4 px-3 space-y-0.5 overflow-y-auto">
          {nav.map(({ to, label, icon: Icon, exact }) => navLink(to, label, Icon, exact))}
        </nav>
        <div className="p-4 border-t border-white/10 space-y-3">
          {user && <div className="flex items-center gap-3 px-2"><div className="w-8 h-8 bg-brand-500 flex items-center justify-center shrink-0"><span className="text-white font-bold text-xs">{user.first_name?.[0]?.toUpperCase() || 'A'}</span></div><div className="min-w-0"><p className="text-xs font-semibold text-white truncate">{user.first_name} {user.last_name}</p><p className="text-[10px] text-gray-500 truncate">{user.email}</p></div></div>}
          <Link to="/" className="flex items-center gap-2 px-4 py-2 text-xs text-gray-400 hover:text-white transition-colors uppercase tracking-widest"><ArrowLeft size={14} /> Back to Store</Link>
          <button type="button" onClick={logout} className="w-full flex items-center gap-2 px-4 py-2 text-xs text-red-400 hover:text-red-300 transition-colors uppercase tracking-widest">Sign Out</button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-gray-200 px-4 py-4 sm:px-6 lg:px-8 flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <button type="button" aria-label={mobileNavOpen ? 'Close admin navigation' : 'Open admin navigation'} aria-expanded={mobileNavOpen} onClick={() => setMobileNavOpen(open => !open)} className="lg:hidden p-2 -ml-2 rounded-lg text-gray-600 hover:bg-gray-100">
              {mobileNavOpen ? <X size={19} /> : <Menu size={19} />}
            </button>
            <div><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-400 lg:hidden">STEPUP Admin</p><h1 className="text-xs font-bold uppercase tracking-widest text-gray-700">{activeLabel}</h1></div>
          </div>
          <Link to="/shop" target="_blank" rel="noreferrer" className="btn-outline text-xs py-2 px-3 sm:px-4">View Store</Link>
        </header>

        {mobileNavOpen && (
          <div className="lg:hidden bg-gray-900 px-3 py-3 shadow-lg">
            <nav aria-label="Mobile admin navigation" className="grid grid-cols-2 gap-1 sm:grid-cols-3">
              {nav.map(({ to, label, icon: Icon, exact }) => navLink(to, label, Icon, exact, true))}
            </nav>
            <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-3">
              <span className="truncate px-2 text-xs text-gray-400">{user?.first_name} {user?.last_name}</span>
              <button type="button" onClick={logout} className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-red-300">Sign Out</button>
            </div>
          </div>
        )}

        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto"><Outlet /></main>
      </div>
    </div>
  );
}
