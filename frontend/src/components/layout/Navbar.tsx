import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useCartStore } from '../../store/cartStore';

const categories = [
  { name: "Men's",    slug: 'mens',    sub: ['Formal Shoes', 'Casual Shoes', 'Sneakers', 'Boots'] },
  { name: "Women's",  slug: 'womens',  sub: ['Heels', 'Flats', 'Sneakers', 'Sandals'] },
  { name: "Kids'",    slug: 'kids',    sub: ['Boys', 'Girls', 'School Shoes', 'Sports'] },
  { name: 'Sports',   slug: 'sports',  sub: ['Running', 'Football', 'Cricket', 'Training'] },
  { name: 'Casual',   slug: 'casual',  sub: ['Loafers', 'Canvas', 'Sneakers'] },
  { name: 'Formal',   slug: 'formal',  sub: ['Oxford', 'Derby', 'Monk Strap'] },
  { name: 'Sandals',  slug: 'sandals', sub: ['Slides', 'Flip Flops', 'Wedges'] },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const dropdownTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { user, logout } = useAuthStore();
  const { items, setOpen, fetchCart } = useCartStore();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => { if (user) fetchCart(); }, [user]);
  useEffect(() => { setMobileOpen(false); setActiveDropdown(null); }, [location.pathname]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/shop?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
    }
  };

  const cartCount = items.reduce((s, i) => s + i.quantity, 0);
  const enterDropdown = (slug: string) => {
    if (dropdownTimer.current) clearTimeout(dropdownTimer.current);
    setActiveDropdown(slug);
  };
  const leaveDropdown = () => {
    dropdownTimer.current = setTimeout(() => setActiveDropdown(null), 150);
  };

  return (
    <>
      {/* Announcement bar */}
      <div className="w-full bg-primary text-on-primary py-space-xs px-margin-mobile md:px-margin">
        <div className="max-w-site mx-auto flex items-center justify-between font-label-badge text-label-badge uppercase tracking-wider">
          <div className="flex items-center gap-space-sm overflow-hidden">
            <span className="material-symbols-outlined text-[13px] text-primary-fixed shrink-0">verified</span>
            <div className="ticker-inner flex whitespace-nowrap gap-16 w-max">
              {Array(2).fill([
                'Thoughtful footwear for everyday movement',
                'Explore the STEPUP collection',
                'Find your fit with STEPUP',
                'Comfort-led design, everyday style',
              ]).flat().map((t, i) => (
                <span key={i}>{t}</span>
              ))}
            </div>
          </div>
          <div className="hidden md:flex items-center gap-space-lg shrink-0">
            <Link to="/find-your-fit" className="text-primary-fixed hover:text-on-primary transition-colors flex items-center gap-1">
              <span className="material-symbols-outlined text-[13px]">psychology_alt</span>
              Find Your Fit
            </Link>
            <span className="opacity-40">|</span>
            <span className="text-surface-container-highest">Free Express Delivery Over ₹599</span>
          </div>
        </div>
      </div>

      {/* Main header */}
      <header className={`sticky top-0 z-50 bg-surface/90 backdrop-blur-xl transition-shadow duration-300 ${scrolled ? 'shadow-nav' : ''}`}>
        <div className="max-w-site mx-auto px-margin-mobile md:px-margin h-20 flex items-center justify-between gap-space-lg">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-space-sm shrink-0">
            <div className="flex flex-col">
              <span className="font-headline-sm text-headline-sm text-primary tracking-tight leading-none">StepUp</span>
              <span className="font-label-badge text-label-badge text-secondary tracking-widest uppercase leading-none mt-0.5">Supportive Footwear</span>
            </div>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden xl:flex items-center gap-space-xs">
            <Link to="/shop" className="px-space-md py-space-sm rounded-full font-label-md text-label-md text-on-surface-variant hover:text-primary hover:bg-surface-container-low transition-colors">
              All Products
            </Link>
            {categories.slice(0, 4).map((cat) => (
              <div
                key={cat.slug}
                className="relative"
                onMouseEnter={() => enterDropdown(cat.slug)}
                onMouseLeave={leaveDropdown}
              >
                <Link
                  to={`/shop/${cat.slug}`}
                  className={`px-space-md py-space-sm rounded-full font-label-md text-label-md transition-colors ${
                    activeDropdown === cat.slug
                      ? 'bg-primary-container text-on-primary'
                      : 'text-on-surface-variant hover:text-primary'
                  }`}
                >
                  {cat.name}
                </Link>
                {activeDropdown === cat.slug && (
                  <div className="absolute top-full left-0 mt-1 bg-surface-container-lowest shadow-card-hover rounded-DEFAULT border border-outline-variant/30 w-52 py-space-sm z-50 animate-fade-in">
                    {cat.sub.map((s) => (
                      <Link
                        key={s}
                        to={`/shop/${cat.slug}?search=${encodeURIComponent(s)}`}
                        className="block px-space-lg py-space-xs font-body-sm text-body-sm text-on-surface-variant hover:text-primary hover:bg-surface-container-low transition-colors"
                      >
                        {s}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
            <Link to="/find-your-fit" className="px-space-md py-space-sm rounded-full font-label-md text-label-md text-on-surface-variant hover:text-primary transition-colors">
              Find Your Fit
            </Link>
          </nav>

          {/* Right section */}
          <div className="flex items-center gap-space-md">
            {/* Search */}
            <form onSubmit={handleSearch} className="hidden lg:flex items-center gap-space-sm bg-surface-container-low px-space-md py-space-xs rounded-full shadow-nav">
              <span className="material-symbols-outlined text-[18px] text-outline">search</span>
              <input
                type="text"
                placeholder="Search shoes, brands..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent font-body-sm text-body-sm text-on-surface placeholder:text-outline focus:outline-none w-44"
              />
            </form>

            {/* Find Your Fit CTA */}
            <Link
              to="/find-your-fit"
              className="hidden md:inline-flex items-center justify-center bg-primary-container text-on-primary px-space-lg py-space-sm rounded-full font-label-md text-label-md shadow-primary hover:bg-primary transition-all duration-200"
            >
              Take Size Quiz
            </Link>

            {/* Wishlist */}
            {user && (
              <Link
                to="/wishlist"
                aria-label="Wishlist"
                className="hidden sm:flex w-10 h-10 rounded-full items-center justify-center text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">favorite</span>
              </Link>
            )}

            {/* Cart */}
            <button
              onClick={() => setOpen(true)}
              className="relative flex items-center gap-space-xs px-space-md py-space-xs rounded-full bg-surface-container hover:bg-surface-container-high transition-colors"
            >
              <span className="material-symbols-outlined text-[20px] text-primary">shopping_bag</span>
              {cartCount > 0 && (
                <span className="font-label-badge text-label-badge text-on-secondary-container bg-secondary-container px-space-xs py-0.5 rounded-full">{cartCount}</span>
              )}
              <span className="hidden 2xl:inline font-label-badge text-label-badge text-on-surface-variant">Bag</span>
            </button>

            {/* Account */}
            {user ? (
              <div className="relative group">
                <button className="flex items-center gap-space-xs">
                  <div className="w-8 h-8 rounded-full bg-primary-container flex items-center justify-center">
                    <span className="font-label-md text-label-md text-on-primary">{user.first_name[0]}</span>
                  </div>
                  <span className="hidden md:block font-label-md text-label-md text-on-surface-variant">{user.first_name}</span>
                  <span className="material-symbols-outlined text-[18px] text-outline">expand_more</span>
                </button>
                <div className="absolute right-0 top-full pt-2 z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                  <div className="bg-surface-container-lowest shadow-card-hover border border-outline-variant/30 rounded-DEFAULT w-52 py-space-sm">
                    <div className="px-space-lg py-space-xs mb-space-xs border-b border-outline-variant/20">
                      <p className="font-label-md text-label-md text-on-surface">{user.first_name} {user.last_name}</p>
                      <p className="font-body-sm text-body-sm text-on-surface-variant truncate">{user.email}</p>
                    </div>
                    <Link to="/profile" className="flex items-center gap-space-sm px-space-lg py-space-xs font-body-sm text-body-sm text-on-surface-variant hover:text-primary hover:bg-surface-container-low transition-colors">
                      <span className="material-symbols-outlined text-[16px]">account_circle</span>My Account
                    </Link>
                    <Link to="/orders" className="flex items-center gap-space-sm px-space-lg py-space-xs font-body-sm text-body-sm text-on-surface-variant hover:text-primary hover:bg-surface-container-low transition-colors">
                      <span className="material-symbols-outlined text-[16px]">package_2</span>My Orders
                    </Link>
                    <Link to="/wishlist" className="flex items-center gap-space-sm px-space-lg py-space-xs font-body-sm text-body-sm text-on-surface-variant hover:text-primary hover:bg-surface-container-low transition-colors">
                      <span className="material-symbols-outlined text-[16px]">favorite</span>Wishlist
                    </Link>
                    {(user.role === 'admin' || user.role === 'staff') && (
                      <Link to="/admin" className="flex items-center gap-space-sm px-space-lg py-space-xs font-body-sm text-body-sm text-primary font-semibold hover:bg-surface-container-low transition-colors">
                        <span className="material-symbols-outlined text-[16px]">admin_panel_settings</span>Admin Panel
                      </Link>
                    )}
                    <hr className="my-space-xs border-outline-variant/20" />
                    <button onClick={logout} className="w-full flex items-center gap-space-sm px-space-lg py-space-xs font-body-sm text-body-sm text-error hover:bg-error-container/30 transition-colors">
                      <span className="material-symbols-outlined text-[16px]">logout</span>Sign Out
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="hidden sm:flex items-center gap-space-sm">
                <Link to="/login" className="font-label-md text-label-md text-on-surface-variant hover:text-primary transition-colors">Sign In</Link>
                <span className="text-outline-variant">|</span>
                <Link to="/register" className="font-label-md text-label-md text-on-surface-variant hover:text-primary transition-colors">Register</Link>
              </div>
            )}

            {/* Mobile menu toggle */}
            <button onClick={() => setMobileOpen(!mobileOpen)} className="xl:hidden p-2 text-on-surface-variant hover:text-on-surface transition-colors">
              <span className="material-symbols-outlined text-[24px]">{mobileOpen ? 'close' : 'menu'}</span>
            </button>
          </div>
        </div>

        {/* Mobile nav */}
        {mobileOpen && (
          <div className="xl:hidden border-t border-outline-variant/20 bg-surface-container-lowest animate-slide-up">
            <div className="container-site py-space-lg space-y-space-xs">
              <form onSubmit={handleSearch} className="flex items-center gap-space-sm bg-surface-container-low px-space-md py-space-sm rounded-full mb-space-md">
                <span className="material-symbols-outlined text-[18px] text-outline">search</span>
                <input type="text" placeholder="Search shoes..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="bg-transparent flex-1 font-body-sm text-body-sm focus:outline-none" />
              </form>
              <Link to="/shop" className="block py-space-sm font-label-md text-label-md text-on-surface-variant hover:text-primary transition-colors">All Products</Link>
              {categories.map((cat) => (
                <Link key={cat.slug} to={`/shop/${cat.slug}`} className="block py-space-sm font-label-md text-label-md text-on-surface-variant hover:text-primary transition-colors pl-space-md">
                  {cat.name}
                </Link>
              ))}
              <Link to="/find-your-fit" className="block py-space-sm font-label-md text-label-md text-secondary">Find Your Fit →</Link>
              <div className="border-t border-outline-variant/20 pt-space-md mt-space-md">
                {user ? (
                  <div className="space-y-space-xs">
                    <Link to="/profile" className="block py-space-xs font-body-sm text-body-sm text-on-surface-variant">My Account</Link>
                    <Link to="/orders" className="block py-space-xs font-body-sm text-body-sm text-on-surface-variant">My Orders</Link>
                    <button onClick={logout} className="block py-space-xs font-body-sm text-body-sm text-error">Sign Out</button>
                  </div>
                ) : (
                  <div className="flex gap-space-md">
                    <Link to="/login" className="btn-primary flex-1 justify-center py-space-sm">Sign In</Link>
                    <Link to="/register" className="btn-outline flex-1 justify-center py-space-sm">Register</Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </header>
    </>
  );
}
