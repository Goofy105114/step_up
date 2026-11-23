import { Outlet, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Package, ShoppingCart, Users, ArrowLeft, Bell } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

const nav = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { to: '/admin/products', label: 'Products', icon: Package },
  { to: '/admin/orders', label: 'Orders', icon: ShoppingCart },
  { to: '/admin/users', label: 'Customers', icon: Users },
];

export default function AdminLayout() {
  const { pathname } = useLocation();
  const { user, logout } = useAuthStore();

  return (
    <div className="min-h-screen flex bg-gray-100">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-900 text-gray-300 flex flex-col min-h-screen sticky top-0">
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-brand-500 flex items-center justify-center">
              <span className="text-white font-bold text-sm">S</span>
            </div>
            <div>
              <span className="font-display text-lg font-bold text-white block">StepUp</span>
              <span className="text-[9px] text-gray-500 uppercase tracking-widest">Admin Panel</span>
            </div>
          </div>
        </div>

        <nav className="flex-1 py-4 px-3 space-y-0.5">
          {nav.map(({ to, label, icon: Icon, exact }) => {
            const active = exact ? pathname === to : pathname.startsWith(to);
            return (
              <Link key={to} to={to}
                className={`flex items-center gap-3 px-4 py-3 text-xs font-semibold uppercase tracking-widest transition-all ${
                  active ? 'bg-brand-500 text-white' : 'text-gray-400 hover:bg-white/10 hover:text-white'}`}>
                <Icon size={16} strokeWidth={active ? 2 : 1.5} /> {label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/10 space-y-3">
          {user && (
            <div className="flex items-center gap-3 px-2">
              <div className="w-8 h-8 bg-brand-500 flex items-center justify-center shrink-0">
                <span className="text-white font-bold text-xs">{user.first_name[0]}</span>
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-white truncate">{user.first_name} {user.last_name}</p>
                <p className="text-[10px] text-gray-500 truncate">{user.email}</p>
              </div>
            </div>
          )}
          <Link to="/" className="flex items-center gap-2 px-4 py-2 text-xs text-gray-400 hover:text-white transition-colors uppercase tracking-widest">
            <ArrowLeft size={14} /> Back to Store
          </Link>
          <button onClick={logout} className="w-full flex items-center gap-2 px-4 py-2 text-xs text-red-400 hover:text-red-300 transition-colors uppercase tracking-widest">
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between sticky top-0 z-10">
          <h1 className="text-xs font-bold uppercase tracking-widest text-gray-700">
            {nav.find((n) => n.exact ? pathname === n.to : pathname.startsWith(n.to))?.label || 'Admin'}
          </h1>
          <div className="flex items-center gap-3">
            <button className="p-2 hover:bg-gray-50 transition-colors relative">
              <Bell size={16} className="text-gray-500" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-brand-500 rounded-full" />
            </button>
            <Link to="/shop" target="_blank"
              className="btn-outline text-xs py-2 px-4">View Store</Link>
          </div>
        </header>

        <main className="flex-1 p-8 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
