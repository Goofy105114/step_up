import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Search, Heart, ShoppingBag, User, ChevronDown, Menu, X, Phone, Mail } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useCartStore } from '../../store/cartStore';

const categories = [
  { name: "Men's", slug: 'mens', sub: ['Formal Shoes', 'Casual Shoes', 'Sneakers', 'Boots', 'Sandals'] },
  { name: "Women's", slug: 'womens', sub: ['Heels', 'Flats', 'Sneakers', 'Boots', 'Sandals'] },
  { name: "Kids'", slug: 'kids', sub: ['Boys', 'Girls', 'School Shoes', 'Sports'] },
  { name: 'Sports', slug: 'sports', sub: ['Running', 'Football', 'Cricket', 'Training', 'Walking'] },
  { name: 'Casual', slug: 'casual', sub: ['Loafers', 'Canvas', 'Moccasins'] },
  { name: 'Formal', slug: 'formal', sub: ['Oxford', 'Derby', 'Monk Strap'] },
  { name: 'Sandals', slug: 'sandals', sub: ['Slides', 'Flip Flops', 'Wedges'] },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
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
      setSearchOpen(false);
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
      {/* Top bar */}
      <div className="bg-gray-900 text-gray-300 text-xs py-2 hidden md:block">
        <div className="container-site flex items-center justify-between">
          <div className="flex items-center gap-6">
            <span className="flex items-center gap-1.5"><Phone size={12} /> +91 99999 99999</span>
            <span className="flex items-center gap-1.5"><Mail size={12} /> support@stepup.in</span>
          </div>
          <div className="flex items-center gap-4">
            <span>Get 10% off your first order — code: <strong className="text-white">WELCOME10</strong></span>
            {user ? (
              <div className="relative group">
                <span className="cursor-pointer text-white flex items-center gap-1">
                  {user.first_name} <ChevronDown size={11} />
                </span>
                <div className="absolute right-0 top-full pt-1 z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                  <div className="bg-white shadow-xl border border-gray-100 w-44 py-1">
                    <Link to="/profile" className="block px-4 py-2 text-xs text-gray-700 hover:bg-gray-50">My Account</Link>
                    <Link to="/orders" className="block px-4 py-2 text-xs text-gray-700 hover:bg-gray-50">My Orders</Link>
                    <Link to="/wishlist" className="block px-4 py-2 text-xs text-gray-700 hover:bg-gray-50">Wishlist</Link>
                    {(user.role === 'admin' || user.role === 'staff') && (
                      <Link to="/admin" className="block px-4 py-2 text-xs text-brand-600 hover:bg-brand-50 font-medium">Admin Panel</Link>
                    )}
                    <hr className="my-1 border-gray-100" />
                    <button onClick={logout} className="block w-full text-left px-4 py-2 text-xs text-red-500 hover:bg-red-50">Sign Out</button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Link to="/login" className="hover:text-white transition-colors">Sign In</Link>
                <span>|</span>
                <Link to="/register" className="hover:text-white transition-colors">Register</Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main header */}
      <header className={`bg-white z-40 transition-shadow duration-300 ${scrolled ? 'sticky top-0 shadow-md' : ''}`}>
        <div className="container-site py-4 flex items-center justify-between gap-6">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 shrink-0">
            <div className="w-9 h-9 bg-gray-900 flex items-center justify-center">
              <span className="text-white font-bold tracking-widest text-sm">S</span>
            </div>
            <div>
              <span className="font-display text-2xl font-bold text-gray-900 tracking-tight">StepUp</span>
              <span className="block text-[9px] tracking-[0.3em] uppercase text-gray-400 -mt-1">Premium Footwear</span>
            </div>
          </Link>

          {/* Search bar */}
          <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-xl">
            <div className="flex w-full border border-gray-300 focus-within:border-gray-900 transition-colors">
              <input
                type="text"
                placeholder="Search for shoes, brands, styles…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 px-4 py-2.5 text-sm focus:outline-none"
              />
              <button type="submit" className="bg-gray-900 hover:bg-gray-700 text-white px-4 py-2.5 transition-colors">
                <Search size={16} />
              </button>
            </div>
          </form>

          {/* Icons */}
          <div className="flex items-center gap-1">
            <button onClick={() => setSearchOpen(!searchOpen)} className="p-2.5 hover:text-brand-500 transition-colors md:hidden">
              <Search size={20} />
            </button>
            {user && (
              <Link to="/wishlist" className="p-2.5 hover:text-brand-500 transition-colors hidden sm:block">
                <Heart size={20} />
              </Link>
            )}
            {!user && (
              <Link to="/login" className="p-2.5 hover:text-brand-500 transition-colors hidden sm:block">
                <User size={20} />
              </Link>
            )}
            <button onClick={() => setOpen(true)} className="p-2.5 hover:text-brand-500 transition-colors relative">
              <ShoppingBag size={20} />
              {cartCount > 0 && (
                <span className="absolute top-1 right-1 bg-brand-500 text-white text-[10px] font-bold w-4 h-4 flex items-center justify-center leading-none">
                  {cartCount}
                </span>
              )}
            </button>
            <button onClick={() => setMobileOpen(!mobileOpen)} className="p-2.5 lg:hidden">
              {mobileOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {/* Mobile search */}
        {searchOpen && (
          <div className="md:hidden border-t border-gray-100 px-4 py-3">
            <form onSubmit={handleSearch} className="flex border border-gray-300">
              <input type="text" placeholder="Search…" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 px-3 py-2.5 text-sm focus:outline-none" autoFocus />
              <button type="submit" className="bg-gray-900 text-white px-3">
                <Search size={15} />
              </button>
            </form>
          </div>
        )}

        {/* Category nav */}
        <nav className="border-t border-gray-100 hidden lg:block">
          <div className="container-site">
            <ul className="flex items-center">
              <li className="border-r border-gray-100">
                <Link to="/shop" className="block px-5 py-3 text-xs font-semibold uppercase tracking-widest text-gray-900 hover:text-brand-500 hover:bg-gray-50 transition-colors">
                  All Products
                </Link>
              </li>
              {categories.map((cat) => (
                <li key={cat.slug} className="relative border-r border-gray-100"
                  onMouseEnter={() => enterDropdown(cat.slug)}
                  onMouseLeave={leaveDropdown}>
                  <Link to={`/shop/${cat.slug}`}
                    className="flex items-center gap-1 px-5 py-3 text-xs font-semibold uppercase tracking-widest text-gray-700 hover:text-brand-500 hover:bg-gray-50 transition-colors">
                    {cat.name} <ChevronDown size={11} />
                  </Link>
                  {activeDropdown === cat.slug && (
                    <div className="absolute top-full left-0 bg-white shadow-xl border border-gray-100 w-48 py-2 z-50 animate-slide-up">
                      {cat.sub.map((s) => (
                        <Link key={s} to={`/shop/${cat.slug}?search=${encodeURIComponent(s)}`}
                          className="block px-5 py-2 text-xs text-gray-600 hover:text-brand-500 hover:bg-gray-50 transition-colors">
                          {s}
                        </Link>
                      ))}
                    </div>
                  )}
                </li>
              ))}
              <li className="ml-auto">
                <Link to="/shop?featured=true"
                  className="block px-5 py-3 text-xs font-semibold uppercase tracking-widest text-brand-500 hover:text-brand-700 transition-colors">
                  ★ Sale
                </Link>
              </li>
            </ul>
          </div>
        </nav>

        {/* Mobile nav */}
        {mobileOpen && (
          <div className="lg:hidden border-t border-gray-100 bg-white animate-slide-up">
            <div className="container-site py-4 space-y-1">
              <Link to="/shop" className="block py-2 text-sm font-semibold uppercase tracking-wider text-gray-900">All Products</Link>
              {categories.map((cat) => (
                <Link key={cat.slug} to={`/shop/${cat.slug}`} className="block py-2 text-sm text-gray-600 pl-2">
                  {cat.name}
                </Link>
              ))}
              <div className="border-t border-gray-100 pt-3 mt-3 space-y-2">
                {user ? (
                  <>
                    <Link to="/profile" className="block py-2 text-sm text-gray-700">My Account</Link>
                    <Link to="/orders" className="block py-2 text-sm text-gray-700">My Orders</Link>
                    <Link to="/wishlist" className="block py-2 text-sm text-gray-700">Wishlist</Link>
                    <button onClick={logout} className="block py-2 text-sm text-red-500">Sign Out</button>
                  </>
                ) : (
                  <div className="flex gap-3 pt-1">
                    <Link to="/login" className="btn-primary flex-1 text-center py-2.5">Sign In</Link>
                    <Link to="/register" className="btn-outline flex-1 text-center py-2.5">Register</Link>
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
