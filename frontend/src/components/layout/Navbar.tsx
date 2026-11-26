import { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useCartStore } from '../../store/cartStore';

const navigation = [
  { label: 'Relief Sandals & Slides', to: '/shop?search=sandals' },
  { label: 'Shop by Condition', to: '/shop-by-condition' },
  { label: 'Arch Support Technology', to: '/shop-by-condition?tag=arch-support' },
  { label: 'Find Your Fit', to: '/find-your-fit' },
  { label: 'Clinical Studies', to: '/clinical-studies' },
];

const navClass = (isActive: boolean) =>
  `whitespace-nowrap rounded-full px-3 py-2 text-[12px] font-semibold tracking-[0.015em] transition-colors ${
    isActive ? 'bg-primary-container text-on-primary' : 'text-on-surface-variant hover:bg-surface-container-low hover:text-primary'
  }`;

const isNavigationActive = (to: string, pathname: string, search: string) => {
  const target = new URL(to, 'https://stepup.local');
  if (target.pathname !== pathname) return false;
  const targetTag = target.searchParams.get('tag');
  const currentTag = new URLSearchParams(search).get('tag');
  if (targetTag) return targetTag === currentTag;
  if (target.pathname === '/shop-by-condition') return currentTag !== 'arch-support';
  return true;
};

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { user, logout } = useAuthStore();
  const { items, setOpen, fetchCart } = useCartStore();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => { if (user) fetchCart(); }, [user, fetchCart]);
  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  const handleSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const query = searchQuery.trim();
    if (!query) return;
    navigate(`/shop?search=${encodeURIComponent(query)}`);
    setSearchQuery('');
    setMobileOpen(false);
  };

  const cartCount = items.reduce((total, item) => total + item.quantity, 0);

  return (
    <header className={`sticky top-0 z-50 bg-surface/95 backdrop-blur-xl transition-shadow duration-200 ${scrolled ? 'shadow-[0_4px_18px_rgba(10,92,80,0.08)]' : 'shadow-[0_1px_8px_rgba(10,92,80,0.04)]'}`}>
      <div className="w-full bg-primary px-margin-mobile py-2 text-on-primary md:px-margin">
        <div className="mx-auto flex max-w-site items-center justify-between gap-4 text-[9px] font-semibold uppercase tracking-[0.12em] md:text-[10px]">
          <div className="flex min-w-0 items-center gap-2">
            <span className="material-symbols-outlined shrink-0 text-[14px] text-primary-fixed">verified</span>
            <span className="truncate">Thoughtful support. Confident movement. Every day.</span>
          </div>
          <div className="hidden shrink-0 items-center gap-4 sm:flex">
            <Link to="/clinical-studies" className="flex items-center gap-1 text-primary-fixed transition-colors hover:text-on-primary">
              <span className="material-symbols-outlined text-[13px]">medical_services</span>
              Evidence & Research
            </Link>
            <span className="opacity-40">|</span>
            <Link to="/find-your-fit" className="text-surface-container-highest transition-colors hover:text-on-primary">Find your fit</Link>
          </div>
        </div>
      </div>

      <div className="mx-auto flex min-h-[76px] max-w-site items-center justify-between gap-4 px-margin-mobile py-3 md:px-margin">
        <Link to="/" aria-label="STEPUP home" className="flex shrink-0 flex-col leading-none">
          <span className="font-headline-sm text-[27px] font-bold tracking-[-0.055em] text-primary">STEPUP</span>
          <span className="mt-1 text-[9px] font-semibold uppercase tracking-[0.19em] text-secondary">Supportive Footwear</span>
        </Link>

        <nav aria-label="Main navigation" className="hidden items-center gap-1 xl:flex">
          {navigation.map((item) => (
            <Link key={item.label} to={item.to} aria-current={isNavigationActive(item.to, location.pathname, location.search) ? 'page' : undefined} className={navClass(isNavigationActive(item.to, location.pathname, location.search))}>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-2 md:gap-3">
          <form onSubmit={handleSearch} role="search" className="hidden h-10 items-center gap-2 rounded-full bg-surface-container-low px-3 shadow-[0_1px_4px_rgba(10,92,80,0.04)] lg:flex">
            <span className="material-symbols-outlined text-[18px] text-outline">search</span>
            <input
              type="search"
              aria-label="Search products"
              placeholder="Search supportive footwear"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="w-40 bg-transparent text-xs text-on-surface outline-none placeholder:text-outline xl:w-48"
            />
          </form>

          {user && (
            <Link to="/wishlist" aria-label="Wishlist" className="hidden h-10 w-10 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-primary sm:flex">
              <span className="material-symbols-outlined text-[21px]">favorite</span>
            </Link>
          )}

          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label={`Open shopping bag, ${cartCount} items`}
            className="relative flex h-10 items-center gap-2 rounded-full bg-surface-container-low px-3 text-primary transition-colors hover:bg-surface-container"
          >
            <span className="material-symbols-outlined text-[21px]">shopping_bag</span>
            <span className="hidden text-xs font-semibold text-on-surface-variant sm:inline">Bag</span>
            {cartCount > 0 && <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-on-primary">{cartCount}</span>}
          </button>

          {user ? (
            <div className="hidden items-center gap-2 sm:flex">
              <Link to="/profile" aria-label="My account" className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-container text-sm font-bold text-on-primary transition-colors hover:bg-primary">
                {user.first_name?.[0]?.toUpperCase() || 'U'}
              </Link>
              <button type="button" onClick={logout} className="hidden text-xs font-semibold text-on-surface-variant hover:text-error 2xl:block">Sign out</button>
            </div>
          ) : (
            <div className="hidden items-center gap-3 sm:flex">
              <Link to="/login" className="text-xs font-semibold text-on-surface-variant transition-colors hover:text-primary">Sign in</Link>
              <Link to="/register" className="rounded-full bg-primary-container px-4 py-2.5 text-xs font-semibold text-on-primary shadow-primary transition-colors hover:bg-primary">Create account</Link>
            </div>
          )}

          <button
            type="button"
            aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((open) => !open)}
            className="flex h-10 w-10 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-surface-container-low xl:hidden"
          >
            <span className="material-symbols-outlined text-[23px]">{mobileOpen ? 'close' : 'menu'}</span>
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="border-t border-outline-variant/30 bg-surface-container-lowest px-margin-mobile py-4 shadow-lg xl:hidden">
          <form onSubmit={handleSearch} role="search" className="mb-4 flex h-11 items-center gap-2 rounded-full bg-surface-container-low px-4">
            <span className="material-symbols-outlined text-[18px] text-outline">search</span>
            <input type="search" aria-label="Search products" placeholder="Search supportive footwear" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} className="min-w-0 flex-1 bg-transparent text-sm outline-none" />
            <button type="submit" className="text-xs font-semibold text-primary">Search</button>
          </form>
          <nav aria-label="Mobile navigation" className="grid gap-1">
            {navigation.map((item) => (
              <Link key={item.label} to={item.to} aria-current={isNavigationActive(item.to, location.pathname, location.search) ? 'page' : undefined} className={`rounded-xl px-3 py-3 text-sm font-semibold transition-colors ${isNavigationActive(item.to, location.pathname, location.search) ? 'bg-primary-container text-on-primary' : 'text-on-surface-variant hover:bg-surface-container-low'}`}>
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="mt-4 flex gap-3 border-t border-outline-variant/30 pt-4">
            {user ? (
              <>
                <Link to="/profile" className="btn-outline flex-1">My account</Link>
                <Link to="/orders" className="btn-primary flex-1">My orders</Link>
              </>
            ) : (
              <>
                <Link to="/login" className="btn-outline flex-1">Sign in</Link>
                <Link to="/register" className="btn-primary flex-1">Create account</Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
