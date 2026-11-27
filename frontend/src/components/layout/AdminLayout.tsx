import { Outlet, Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Package, ShoppingCart, RotateCcw, Users, ArrowLeft, ShieldCheck,
  FileText, FlaskConical, Activity, Menu, X, MessageSquareText,
  Search, Store, LogOut, PanelLeftClose, PanelLeftOpen, SlidersHorizontal, Webhook
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { useAuthStore } from '../../store/authStore';

const nav = [
  { to: '/admin', label: 'Overview', icon: LayoutDashboard, exact: true, group: 'Workspace' },
  { to: '/admin/products', label: 'Products', icon: Package, group: 'Store management' },
  { to: '/admin/orders', label: 'Orders', icon: ShoppingCart, group: 'Store management' },
  { to: '/admin/store-settings', label: 'Store settings', icon: SlidersHorizontal, group: 'Store management' },
  { to: '/admin/legal-policies', label: 'Legal policies', icon: ShieldCheck, group: 'Store management' },
  { to: '/admin/grievances', label: 'Complaints', icon: MessageSquareText, group: 'Store management' },
  { to: '/admin/webhook-events', label: 'Payment webhooks', icon: Webhook, group: 'Store management' },
  { to: '/admin/returns', label: 'Returns', icon: RotateCcw, group: 'Store management' },
  { to: '/admin/users', label: 'Customers', icon: Users, group: 'Store management' },
  { to: '/admin/clinical-studies', label: 'Research library', icon: FileText, group: 'Fit & research' },
  { to: '/admin/lab-settings', label: 'Lab settings', icon: FlaskConical, group: 'Fit & research' },
  { to: '/admin/patient-profiles', label: 'Fit profiles', icon: Users, group: 'Fit & research' },
  { to: '/admin/fit-operations', label: 'Fit operations', icon: Activity, group: 'Fit & research' },
];

export default function AdminLayout() {
  const { pathname } = useLocation();
  const { user, logout } = useAuthStore();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [search, setSearch] = useState('');
  const activeItem = nav.find((item) => item.exact ? pathname === item.to : pathname.startsWith(item.to));
  const activeLabel = activeItem?.label || 'Admin';
  const filteredNav = useMemo(() => nav.filter((item) => item.label.toLowerCase().includes(search.trim().toLowerCase())), [search]);
  const groups = ['Workspace', 'Store management', 'Fit & research'];

  const navLink = (item: typeof nav[number], mobile = false) => {
    const { to, label, icon: Icon, exact } = item;
    const active = exact ? pathname === to : pathname.startsWith(to);
    return (
      <Link key={to} to={to} onClick={() => setMobileNavOpen(false)} title={collapsed && !mobile ? label : undefined}
        aria-current={active ? 'page' : undefined}
        className={`group relative flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-all duration-200 ${active ? 'bg-white text-gray-950 shadow-sm' : 'text-gray-400 hover:bg-white/10 hover:text-white'} ${collapsed && !mobile ? 'justify-center px-2' : ''}`}>
        {active && <span className="absolute -left-3 top-2 bottom-2 w-1 rounded-r-full bg-amber-400" />}
        <Icon size={18} strokeWidth={active ? 2.3 : 1.8} className={active ? 'text-amber-600' : 'text-gray-500 group-hover:text-gray-200'} />
        {(!collapsed || mobile) && <span className="truncate">{label}</span>}
        {active && (!collapsed || mobile) && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-amber-500" />}
      </Link>
    );
  };

  return (
    <div className="min-h-screen bg-[#f5f6f8] text-gray-900 lg:flex">
      <aside className={`hidden lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col bg-[#17191d] text-white transition-[width] duration-300 ${collapsed ? 'lg:w-[88px]' : 'lg:w-[270px]'}`}>
        <div className={`flex h-[82px] items-center border-b border-white/10 ${collapsed ? 'justify-center px-3' : 'gap-3 px-6'}`}>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-400 text-lg font-black text-gray-950 shadow-lg shadow-amber-500/10">S</div>
          {!collapsed && <div className="min-w-0"><p className="text-lg font-extrabold tracking-[0.16em]">STEPUP</p><p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-gray-500">Control centre</p></div>}
        </div>

        {!collapsed && <div className="px-4 pt-5">
          <label className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2.5 text-gray-500 focus-within:border-amber-400/60">
            <Search size={15} />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Find a section..." aria-label="Search admin sections" className="w-full min-w-0 bg-transparent text-xs text-white outline-none placeholder:text-gray-600" />
            {search && <button type="button" onClick={() => setSearch('')} aria-label="Clear section search" className="text-gray-500 hover:text-white"><X size={14} /></button>}
          </label>
        </div>}

        <nav aria-label="Admin navigation" className="flex-1 space-y-6 overflow-y-auto px-4 py-6">
          {groups.map((group) => {
            const items = filteredNav.filter((item) => item.group === group);
            if (!items.length) return null;
            return <section key={group}>
              {!collapsed && <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-gray-600">{group}</p>}
              <div className="space-y-1">{items.map((item) => navLink(item))}</div>
            </section>;
          })}
          {!filteredNav.length && <p className="px-3 py-4 text-xs leading-5 text-gray-500">No sections match “{search}”.</p>}
        </nav>

        <div className="border-t border-white/10 p-4">
          {user && <div className={`mb-4 flex items-center gap-3 rounded-xl bg-white/[0.05] p-3 ${collapsed ? 'justify-center px-1' : ''}`}>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-400 text-sm font-bold text-gray-950">{user.first_name?.[0]?.toUpperCase() || 'A'}</div>
            {!collapsed && <div className="min-w-0"><p className="truncate text-xs font-semibold text-white">{user.first_name} {user.last_name}</p><p className="truncate text-[10px] text-gray-500">{user.email}</p></div>}
          </div>}
          <div className="space-y-1">
            <Link to="/" title="Back to store" className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold text-gray-400 transition hover:bg-white/10 hover:text-white ${collapsed ? 'justify-center' : ''}`}>
              <Store size={16} />{!collapsed && 'View storefront'}
            </Link>
            <button type="button" onClick={logout} title="Sign out" className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-semibold text-rose-300 transition hover:bg-rose-400/10 hover:text-rose-200 ${collapsed ? 'justify-center' : ''}`}>
              <LogOut size={16} />{!collapsed && 'Sign out'}
            </button>
          </div>
          <button type="button" onClick={() => setCollapsed((value) => !value)} className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-white/10 py-2 text-[10px] font-semibold uppercase tracking-wider text-gray-500 transition hover:border-white/20 hover:text-white" aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
            {collapsed ? <PanelLeftOpen size={15} /> : <><PanelLeftClose size={15} /> Collapse menu</>}
          </button>
        </div>
      </aside>

      {mobileNavOpen && <button type="button" aria-label="Close navigation overlay" onClick={() => setMobileNavOpen(false)} className="fixed inset-0 z-30 bg-gray-950/50 lg:hidden" />}
      {mobileNavOpen && <aside className="fixed inset-y-0 left-0 z-40 flex w-[min(86vw,320px)] flex-col bg-[#17191d] text-white shadow-2xl lg:hidden">
        <div className="flex h-[76px] items-center justify-between border-b border-white/10 px-5">
          <div className="flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-400 font-black text-gray-950">S</div><div><p className="font-extrabold tracking-widest">STEPUP</p><p className="text-[9px] uppercase tracking-widest text-gray-500">Control centre</p></div></div>
          <button type="button" onClick={() => setMobileNavOpen(false)} aria-label="Close navigation" className="rounded-lg p-2 text-gray-400 hover:bg-white/10"><X size={19} /></button>
        </div>
        <nav aria-label="Mobile admin navigation" className="flex-1 space-y-6 overflow-y-auto px-4 py-6">
          {groups.map((group) => <section key={group}><p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-widest text-gray-600">{group}</p><div className="space-y-1">{nav.filter((item) => item.group === group).map((item) => navLink(item, true))}</div></section>)}
        </nav>
        <div className="border-t border-white/10 p-4"><p className="mb-3 truncate px-2 text-xs text-gray-400">{user?.first_name} {user?.last_name}</p><button type="button" onClick={logout} className="flex w-full items-center gap-2 rounded-xl px-3 py-3 text-left text-sm font-semibold text-rose-300 hover:bg-rose-400/10"><LogOut size={16} /> Sign out</button></div>
      </aside>}

      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-[76px] items-center justify-between border-b border-gray-200/80 bg-white/90 px-4 backdrop-blur-xl sm:px-7 lg:px-9">
          <div className="flex min-w-0 items-center gap-3">
            <button type="button" aria-label="Open admin navigation" aria-expanded={mobileNavOpen} onClick={() => setMobileNavOpen(true)} className="rounded-xl border border-gray-200 p-2 text-gray-600 hover:bg-gray-50 lg:hidden"><Menu size={19} /></button>
            <div className="min-w-0"><p className="hidden text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 sm:block">STEPUP / ADMIN</p><h1 className="truncate text-sm font-bold tracking-tight text-gray-900 sm:mt-1 sm:text-base">{activeLabel}</h1></div>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="hidden items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700 sm:flex"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Admin workspace</div>
            <Link to="/" className="inline-flex items-center gap-2 rounded-full border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 transition hover:border-gray-400 hover:bg-gray-50 sm:px-4"><ArrowLeft size={14} /><span className="hidden sm:inline">Back to store</span><span className="sm:hidden">Store</span></Link>
          </div>
        </header>
        <main className="w-full flex-1 p-4 sm:p-6 lg:p-9"><div className="mx-auto w-full max-w-[1600px]"><Outlet /></div></main>
      </div>
    </div>
  );
}
