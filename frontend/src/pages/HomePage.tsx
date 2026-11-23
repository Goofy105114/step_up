import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, ChevronLeft, ChevronRight, Truck, Shield, Headphones, RotateCcw } from 'lucide-react';
import api from '../lib/api';
import ProductCard from '../components/products/ProductCard';
import { formatPrice } from '../lib/formatters';

/* ─── Hero slides ─────────────────────────────────────────── */
const slides = [
  {
    tag: 'New Brown Collection',
    headline: 'Summer Sale',
    sub: '30% OFF',
    desc: 'Starting at',
    price: '₹39.99',
    cta: 'Get Yours!',
    href: '/shop',
    bg: 'from-[#f5f0eb] to-[#e8ddd4]',
    img: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=900&auto=format&fit=crop',
    align: 'left',
  },
  {
    tag: 'New Arrivals 2026',
    headline: 'Walk in Style',
    sub: 'New Collection',
    desc: 'From only',
    price: '₹1,999',
    cta: 'Shop Now',
    href: '/shop/womens',
    bg: 'from-[#edf2f7] to-[#dde6ef]',
    img: 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=900&auto=format&fit=crop',
    align: 'right',
  },
  {
    tag: 'Sports Collection',
    headline: 'Run Further',
    sub: 'Go Faster',
    desc: 'Performance shoes from',
    price: '₹2,499',
    cta: 'View Sports',
    href: '/shop/sports',
    bg: 'from-[#1a1a2e] to-[#16213e]',
    img: 'https://images.unsplash.com/photo-1556906781-9a414e2a9c86?w=900&auto=format&fit=crop',
    align: 'left',
    dark: true,
  },
];

/* ─── Countdown timer ─────────────────────────────────────── */
function useCountdown(targetHours = 23) {
  const target = new Date();
  target.setHours(target.getHours() + targetHours, 59, 59);
  const [time, setTime] = useState({ h: '00', m: '00', s: '00' });
  useEffect(() => {
    const tick = () => {
      const diff = target.getTime() - Date.now();
      if (diff <= 0) return;
      const h = String(Math.floor(diff / 3600000)).padStart(2, '0');
      const m = String(Math.floor((diff % 3600000) / 60000)).padStart(2, '0');
      const s = String(Math.floor((diff % 60000) / 1000)).padStart(2, '0');
      setTime({ h, m, s });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return time;
}

/* ─── Section heading ─────────────────────────────────────── */
function SectionHeading({ title, highlight, sub }: { title: string; highlight?: string; sub?: string }) {
  return (
    <div className="text-center mb-10">
      <h2 className="inline-flex items-center gap-4 text-2xl font-bold uppercase tracking-widest text-gray-900">
        <span className="block w-16 h-px bg-gray-300" />
        {title}{highlight && <span className="text-brand-500">{highlight}</span>}
        <span className="block w-16 h-px bg-gray-300" />
      </h2>
      {sub && <p className="text-xs text-gray-400 italic mt-2">{sub}</p>}
    </div>
  );
}

/* ─── Main component ──────────────────────────────────────── */
export default function HomePage() {
  const [slide, setSlide] = useState(0);
  const countdown = useCountdown(11);

  useEffect(() => {
    const id = setInterval(() => setSlide((s) => (s + 1) % slides.length), 5000);
    return () => clearInterval(id);
  }, []);

  const { data: featured } = useQuery({
    queryKey: ['products', 'featured'],
    queryFn: () => api.get('/products?featured=true&limit=8').then((r) => r.data),
  });
  const { data: bestsellers } = useQuery({
    queryKey: ['products', 'bestsellers'],
    queryFn: () => api.get('/products?bestseller=true&limit=4').then((r) => r.data),
  });
  const { data: newArrivals } = useQuery({
    queryKey: ['products', 'new'],
    queryFn: () => api.get('/products?new_arrival=true&limit=4').then((r) => r.data),
  });
  const { data: allProducts } = useQuery({
    queryKey: ['products', 'all-home'],
    queryFn: () => api.get('/products?limit=4&sort=rating&order=desc').then((r) => r.data),
  });

  const current = slides[slide];

  return (
    <div className="bg-white">

      {/* ── Announcement ticker ── */}
      <div className="bg-gray-900 text-white text-xs py-2 overflow-hidden">
        <div className="ticker-inner flex whitespace-nowrap gap-16 w-max">
          {Array(4).fill([
            '🚚 Free shipping on orders above ₹599',
            '🎉 Use code WELCOME10 for 10% off',
            '🔄 30-day hassle-free returns',
            '⭐ 50,000+ happy customers',
          ]).flat().map((t, i) => (
            <span key={i} className="tracking-widest uppercase">{t}</span>
          ))}
        </div>
      </div>

      {/* ── Hero slider ── */}
      <section className="relative overflow-hidden" style={{ height: '540px' }}>
        {slides.map((s, i) => (
          <div key={i}
            className={`absolute inset-0 bg-gradient-to-r ${s.bg} transition-opacity duration-700 ${i === slide ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}>
            <div className="container-site h-full flex items-center relative">
              {/* Text */}
              <div className={`relative z-20 max-w-lg ${s.align === 'right' ? 'ml-auto text-right' : ''}`}>
                <span className={`text-xs uppercase tracking-[0.3em] font-semibold ${s.dark ? 'text-gray-300' : 'text-gray-500'} mb-3 block`}>
                  {s.tag}
                </span>
                <h1 className={`font-display text-6xl md:text-7xl font-bold leading-tight ${s.dark ? 'text-white' : 'text-gray-900'}`}>
                  {s.headline}
                </h1>
                <p className={`font-display text-5xl md:text-6xl font-bold italic ${s.dark ? 'text-brand-400' : 'text-brand-500'} -mt-2`}>
                  {s.sub}
                </p>
                <p className={`mt-4 text-sm ${s.dark ? 'text-gray-400' : 'text-gray-500'}`}>
                  {s.desc} <strong className={s.dark ? 'text-white' : 'text-gray-900'}>{s.price}</strong>
                </p>
                <Link to={s.href}
                  className={`inline-flex items-center gap-2 mt-6 px-8 py-3.5 text-xs font-bold uppercase tracking-widest border transition-all ${
                    s.dark
                      ? 'bg-brand-500 text-white border-brand-500 hover:bg-brand-600'
                      : 'bg-gray-900 text-white border-gray-900 hover:bg-gray-700'
                  }`}>
                  {s.cta} <ArrowRight size={14} />
                </Link>
              </div>
              {/* Product image */}
              <div className={`absolute ${s.align === 'right' ? 'left-8' : 'right-0'} bottom-0 h-full flex items-end justify-center pointer-events-none`}
                style={{ width: '55%' }}>
                <img src={s.img} alt={s.headline}
                  className="h-full w-full object-cover object-center opacity-90" />
              </div>
            </div>
          </div>
        ))}

        {/* Arrows */}
        <button onClick={() => setSlide((s) => (s - 1 + slides.length) % slides.length)}
          className="absolute left-4 top-1/2 -translate-y-1/2 z-30 w-10 h-10 bg-white/80 hover:bg-white flex items-center justify-center shadow transition-all">
          <ChevronLeft size={20} />
        </button>
        <button onClick={() => setSlide((s) => (s + 1) % slides.length)}
          className="absolute right-4 top-1/2 -translate-y-1/2 z-30 w-10 h-10 bg-white/80 hover:bg-white flex items-center justify-center shadow transition-all">
          <ChevronRight size={20} />
        </button>

        {/* Dots */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 flex gap-2">
          {slides.map((_, i) => (
            <button key={i} onClick={() => setSlide(i)}
              className={`w-2 h-2 rounded-full transition-all ${i === slide ? 'bg-gray-900 w-6' : 'bg-gray-400'}`} />
          ))}
        </div>
      </section>

      {/* ── Trust bar ── */}
      <section className="border-y border-gray-200 bg-white">
        <div className="container-site py-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: Truck, label: 'Free Shipping & Return', desc: 'Free shipping on all orders over ₹599' },
            { icon: Shield, label: 'Money Back Guarantee', desc: '100% money back guarantee' },
            { icon: Headphones, label: 'Online Support 24/7', desc: 'Get help whenever you need' },
            { icon: RotateCcw, label: 'Secure Payment', desc: 'All transactions are secure' },
          ].map(({ icon: Icon, label, desc }) => (
            <div key={label} className="flex items-center gap-4">
              <Icon size={34} className="text-gray-300 shrink-0" strokeWidth={1} />
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-gray-800">{label}</p>
                <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Featured Products ── */}
      <section className="container-site py-16">
        <SectionHeading title="Featured" highlight="Products" sub="Amazing products added recently in our catalog" />

        {featured?.data?.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
            {featured.data.slice(0, 8).map((p: any) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
            {Array(8).fill(0).map((_, i) => (
              <div key={i} className="border border-gray-100">
                <div className="skeleton aspect-square" />
                <div className="p-4 space-y-2">
                  <div className="skeleton h-3 w-3/4 mx-auto" />
                  <div className="skeleton h-4 w-1/2 mx-auto" />
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="text-center mt-10">
          <Link to="/shop" className="btn-outline inline-flex items-center gap-2">
            View All Products <ArrowRight size={14} />
          </Link>
        </div>
      </section>

      {/* ── Countdown sale banner ── */}
      <section className="bg-gray-900 text-white py-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, #e34f20 0%, transparent 60%)' }} />
        <div className="container-site relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
          <div>
            <span className="text-xs uppercase tracking-[0.3em] text-brand-400 font-semibold">Limited Time Offer</span>
            <h2 className="font-display text-4xl md:text-5xl font-bold mt-2">Summer Sale Ends In</h2>
            <p className="text-gray-400 text-sm mt-2">Use code <strong className="text-white">SUMMER20</strong> for extra 20% off</p>
          </div>
          <div className="flex items-center gap-3">
            {[{ label: 'Hours', val: countdown.h }, { label: 'Minutes', val: countdown.m }, { label: 'Seconds', val: countdown.s }].map(({ label, val }, i) => (
              <div key={label} className="flex items-center gap-3">
                {i > 0 && <span className="text-3xl font-bold text-brand-400">:</span>}
                <div className="text-center bg-white/10 border border-white/20 px-4 py-3 min-w-[72px]">
                  <div className="text-4xl font-bold font-display">{val}</div>
                  <div className="text-xs uppercase tracking-widest text-gray-400 mt-1">{label}</div>
                </div>
              </div>
            ))}
          </div>
          <Link to="/shop" className="btn-brand flex items-center gap-2">
            Shop Now <ArrowRight size={14} />
          </Link>
        </div>
      </section>

      {/* ── Summer Collection grid ── */}
      <section className="container-site py-16">
        <SectionHeading title="Summer" highlight="Collection" sub="Amazing products added recently in our catalog" />
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4" style={{ gridTemplateRows: 'repeat(2, 220px)' }}>
          {/* Large left cell */}
          <Link to="/shop/sports"
            className="row-span-2 relative overflow-hidden bg-gray-900 group">
            <img src="https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&auto=format&fit=crop"
              alt="Sport Shoes" className="w-full h-full object-cover opacity-70 group-hover:scale-105 transition-transform duration-500" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <h3 className="font-display text-4xl font-bold italic text-white drop-shadow-lg">Sport</h3>
                <h3 className="font-display text-4xl font-bold italic text-white drop-shadow-lg">Shoes</h3>
                <span className="mt-3 inline-block border-b-2 border-white text-white text-xs tracking-widest uppercase pb-1 group-hover:border-brand-400 group-hover:text-brand-400 transition-colors">
                  Shop Collection →
                </span>
              </div>
            </div>
          </Link>
          {/* Top-right: For Her */}
          <Link to="/shop/womens"
            className="relative overflow-hidden bg-gray-800 group">
            <img src="https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=400&auto=format&fit=crop"
              alt="For Her" className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-500" />
            <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
              <span className="font-display text-2xl font-bold italic text-white">For Her</span>
            </div>
          </Link>
          {/* Bottom-right: For Him */}
          <Link to="/shop/mens"
            className="relative overflow-hidden bg-gray-700 group">
            <img src="https://images.unsplash.com/photo-1486915309851-b0cc1f8a0084?w=400&auto=format&fit=crop"
              alt="For Him" className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-500" />
            <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
              <span className="font-display text-2xl font-bold italic text-white">For Him</span>
            </div>
          </Link>
          {/* Far right top */}
          <Link to="/shop/womens"
            className="relative overflow-hidden bg-amber-50 group">
            <img src="https://images.unsplash.com/photo-1603487742131-4160ec999306?w=400&auto=format&fit=crop"
              alt="Women" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
          </Link>
          {/* Far right bottom */}
          <Link to="/shop/formal"
            className="relative overflow-hidden bg-gray-100 group">
            <img src="https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?w=400&auto=format&fit=crop"
              alt="Formal" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
          </Link>
        </div>
      </section>

      {/* ── Best Seller Products ── */}
      <section className="bg-gray-50 py-16">
        <div className="container-site">
          <SectionHeading title="Best Seller" highlight="Products" sub="Only the best seller products added recently in our catalog" />
          {bestsellers?.data?.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
              {bestsellers.data.map((p: any) => <ProductCard key={p.id} product={p} />)}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
              {Array(4).fill(0).map((_, i) => (
                <div key={i} className="bg-white border border-gray-100">
                  <div className="skeleton aspect-square" />
                  <div className="p-4 space-y-2">
                    <div className="skeleton h-3 w-3/4 mx-auto" />
                    <div className="skeleton h-4 w-1/2 mx-auto" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── Brand logos ── */}
      <section className="border-y border-gray-200 py-10">
        <div className="container-site">
          <div className="flex flex-wrap items-center justify-center gap-10 opacity-50 hover:opacity-100 transition-opacity">
            {['DAVID\nSMITH', 'RON JONES', 'GOLDENGRID.', 'CLIMB\nMOUNTAIN', 'GOLDEN\nGOLDEN', 'Vani\ngarde'].map((b) => (
              <div key={b} className="font-bold text-gray-700 text-sm tracking-widest whitespace-pre-line text-center uppercase cursor-pointer hover:text-brand-500 transition-colors">
                {b}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── New Arrivals ── */}
      <section className="container-site py-16">
        <SectionHeading title="New" highlight=" Arrivals" sub="Just landed — fresh styles for the season" />
        {newArrivals?.data?.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
            {newArrivals.data.map((p: any) => <ProductCard key={p.id} product={p} />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
            {allProducts?.data?.map((p: any) => <ProductCard key={p.id} product={p} />) ||
              Array(4).fill(0).map((_, i) => (
                <div key={i} className="border border-gray-100">
                  <div className="skeleton aspect-square" />
                  <div className="p-4 space-y-2">
                    <div className="skeleton h-3 w-3/4 mx-auto" />
                    <div className="skeleton h-4 w-1/2 mx-auto" />
                  </div>
                </div>
              ))
            }
          </div>
        )}
      </section>

      {/* ── Testimonials ── */}
      <section className="bg-gray-900 text-white py-16">
        <div className="container-site">
          <SectionHeading title="What Customers" highlight=" Say" sub="Real reviews from verified buyers" />
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { name: 'Priya S.', city: 'Mumbai', rating: 5, text: 'The CloudStep Runner Pro is incredibly comfortable. Wore them for 8-hour shifts — feet feel great. Fast delivery too!' },
              { name: 'Rahul M.', city: 'Bangalore', rating: 5, text: 'Quality far better than expected at this price. The StreetVibe Sneakers look premium and feel even better.' },
              { name: 'Anjali K.', city: 'Delhi', rating: 5, text: 'UrbanGrace heels are gorgeous AND actually comfortable all day. Packaging felt luxurious too.' },
            ].map((t) => (
              <div key={t.name} className="border border-white/10 p-6 space-y-4">
                <div className="flex gap-0.5">
                  {[1,2,3,4,5].map((s) => (
                    <span key={s} className="text-yellow-400 text-sm">★</span>
                  ))}
                </div>
                <p className="text-gray-300 text-sm leading-relaxed italic">"{t.text}"</p>
                <div className="flex items-center gap-3 pt-2 border-t border-white/10">
                  <div className="w-9 h-9 bg-brand-500 flex items-center justify-center font-bold text-sm">
                    {t.name[0]}
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{t.name}</p>
                    <p className="text-xs text-gray-500">{t.city}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Category banner strip ── */}
      <section className="container-site py-16">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[
            { label: "Men's", slug: 'mens', img: 'https://images.unsplash.com/photo-1486915309851-b0cc1f8a0084?w=300&auto=format&fit=crop' },
            { label: "Women's", slug: 'womens', img: 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=300&auto=format&fit=crop' },
            { label: "Kids'", slug: 'kids', img: 'https://images.unsplash.com/photo-1555384843-9e44cdde36b6?w=300&auto=format&fit=crop' },
            { label: 'Sports', slug: 'sports', img: 'https://images.unsplash.com/photo-1556906781-9a414e2a9c86?w=300&auto=format&fit=crop' },
            { label: 'Casual', slug: 'casual', img: 'https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?w=300&auto=format&fit=crop' },
            { label: 'Sandals', slug: 'sandals', img: 'https://images.unsplash.com/photo-1603487742131-4160ec999306?w=300&auto=format&fit=crop' },
          ].map((cat) => (
            <Link key={cat.slug} to={`/shop/${cat.slug}`}
              className="relative overflow-hidden group aspect-square bg-gray-100">
              <img src={cat.img} alt={cat.label}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 opacity-80" />
              <div className="absolute inset-0 flex flex-col items-center justify-end pb-4 bg-gradient-to-t from-black/50 to-transparent">
                <span className="text-white font-bold text-sm uppercase tracking-widest">{cat.label}</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

    </div>
  );
}
