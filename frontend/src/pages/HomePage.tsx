import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import ProductCard from '../components/products/ProductCard';
import NewsletterSection from '../components/layout/NewsletterSection';

const TRUST_BADGES = [
  { icon: 'verified', label: '100% Genuine', desc: 'All products authenticated' },
  { icon: 'local_shipping', label: 'Free Delivery', desc: 'On orders above ₹599' },
  { icon: 'replay', label: '30-Day Returns', desc: 'Hassle-free return policy' },
  { icon: 'support_agent', label: '24/7 Support', desc: 'Dedicated customer care' },
];

const CATEGORIES = [
  { slug: 'mens',    label: "Men's Footwear",    icon: 'male',         desc: 'Formal, casual & sports' },
  { slug: 'womens',  label: "Women's Footwear",  icon: 'female',       desc: 'Heels, flats & sneakers' },
  { slug: 'sports',  label: 'Sports & Athletic', icon: 'sports_soccer',desc: 'Performance footwear' },
  { slug: 'kids',    label: "Kids' Footwear",    icon: 'child_care',   desc: 'Comfortable & flexible' },
  { slug: 'casual',  label: 'Casual',            icon: 'weekend',      desc: 'Everyday styles' },
  { slug: 'formal',  label: 'Formal',            icon: 'business_center', desc: 'Office & occasions' },
  { slug: 'sandals', label: 'Sandals & Slippers',icon: 'beach_access', desc: 'Open & airy designs' },
];

export default function HomePage() {
  const [currentSlide, setCurrentSlide] = useState(0);

  const { data: featuredData } = useQuery({
    queryKey: ['products', 'featured'],
    queryFn: () => api.get('/products?featured=true&limit=8').then(r => r.data),
  });
  const { data: bestsellersData } = useQuery({
    queryKey: ['products', 'bestsellers'],
    queryFn: () => api.get('/products?bestseller=true&limit=4').then(r => r.data),
  });
  const { data: newArrivalsData } = useQuery({
    queryKey: ['products', 'new'],
    queryFn: () => api.get('/products?new_arrival=true&limit=4').then(r => r.data),
  });

  const featured = featuredData?.data || [];
  const bestsellers = bestsellersData?.data || [];
  const newArrivals = newArrivalsData?.data || [];

  const heroSlides = [
    {
      tag: 'New Collection 2026',
      title: 'Premium Footwear,\nBuilt to Move.',
      sub: 'From high-performance running shoes to Scandinavian-inspired everyday styles — crafted for people who refuse to compromise.',
      cta: 'Shop All Products',
      href: '/shop',
      bg: 'from-surface via-surface-container-low to-surface',
      img: featured[0]?.primary_image || 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=900&auto=format',
    },
    {
      tag: "Women's Collection",
      title: "Walk in Style,\nAll Day Long.",
      sub: "Engineered for comfort and designed for elegance. Our women's collection blends form and function seamlessly.",
      cta: "Shop Women's",
      href: '/shop/womens',
      bg: 'from-primary-fixed/10 via-surface to-surface',
      img: featured[1]?.primary_image || 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=900&auto=format',
    },
    {
      tag: 'Sports Performance',
      title: 'Train Harder.\nRecover Faster.',
      sub: 'Professional-grade sports footwear with advanced cushioning technology for every athlete.',
      cta: 'Shop Sports',
      href: '/shop/sports',
      bg: 'from-primary/5 via-surface to-surface',
      img: featured[2]?.primary_image || 'https://images.unsplash.com/photo-1556906781-9a414e2a9c86?w=900&auto=format',
    },
  ];

  useEffect(() => {
    const id = setInterval(() => setCurrentSlide(s => (s + 1) % heroSlides.length), 5000);
    return () => clearInterval(id);
  }, [heroSlides.length]);

  const slide = heroSlides[currentSlide];

  return (
    <div className="bg-surface">

      {/* ── Trust bar ── */}
      <section className="w-full bg-surface-container py-space-md">
        <div className="container-site">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-space-md">
            {TRUST_BADGES.map(({ icon, label, desc }) => (
              <div key={label} className="flex items-center gap-space-sm justify-center md:justify-start">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                  <span className="material-symbols-outlined text-[22px]">{icon}</span>
                </div>
                <div>
                  <p className="text-title-md font-semibold text-primary leading-tight">{label}</p>
                  <p className="text-body-sm text-on-surface-variant">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Hero ── */}
      <section className={`relative overflow-hidden py-space-xl bg-gradient-to-b ${slide.bg} transition-all duration-700`}>
        <div className="container-site">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-xl items-center min-h-[480px]">
            {/* Text */}
            <div className="lg:col-span-6 flex flex-col items-start gap-space-md animate-fade-in">
              <div className="inline-flex items-center gap-space-xs bg-surface-container-highest px-space-md py-1 rounded-full">
                <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
                <span className="text-label-badge font-bold uppercase tracking-[0.06em] text-secondary">{slide.tag}</span>
              </div>
              <h1 className="text-display-hero-mobile md:text-display-hero font-bold text-primary tracking-tight whitespace-pre-line">
                {slide.title}
              </h1>
              <p className="text-body-lg text-on-surface-variant max-w-xl">{slide.sub}</p>
              <div className="flex flex-col sm:flex-row gap-space-md pt-space-xs">
                <Link to={slide.href} className="btn-primary px-8 py-4 text-title-md font-semibold shadow-lg">
                  {slide.cta}
                  <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
                </Link>
                <Link to="/find-your-fit" className="btn-outline px-7 py-4 text-title-md font-semibold">
                  <span className="material-symbols-outlined text-[20px]">psychology_alt</span>
                  Find Your Size
                </Link>
              </div>
              {/* Social proof */}
              <div className="flex items-center gap-space-md pt-space-xs">
                <div className="flex -space-x-2">
                  {['bg-primary-fixed', 'bg-secondary-fixed', 'bg-tertiary-fixed'].map((bg, i) => (
                    <div key={i} className={`w-10 h-10 rounded-full ${bg} flex items-center justify-center text-primary`}>
                      <span className="material-symbols-outlined text-[18px]">person</span>
                    </div>
                  ))}
                </div>
                <div>
                  <div className="flex items-center gap-1 text-[#f59e0b]">
                    {[1,2,3,4,5].map(i => <span key={i} className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>)}
                    <span className="text-title-md font-semibold text-primary ml-1">4.8 / 5</span>
                  </div>
                  <p className="text-body-sm text-on-surface-variant">Over <strong className="text-on-surface">50,000+</strong> happy customers</p>
                </div>
              </div>
            </div>

            {/* Image */}
            <div className="lg:col-span-6 relative flex justify-center">
              <div className="relative w-full max-w-lg aspect-square rounded-lg bg-surface-container-low overflow-hidden shadow-card-hover">
                <img
                  src={slide.img}
                  alt={slide.title}
                  className="w-full h-full object-cover transition-all duration-700"
                />
                {/* Floating callouts */}
                <div className="absolute top-4 left-4 bg-surface/90 backdrop-blur-md px-space-md py-space-xs rounded-full shadow-card flex items-center gap-space-xs">
                  <span className="w-2 h-2 rounded-full bg-primary" />
                  <span className="text-label-badge font-bold uppercase tracking-[0.06em] text-primary">Premium Quality</span>
                </div>
                <div className="absolute bottom-4 right-4 bg-surface/90 backdrop-blur-md px-space-md py-space-xs rounded-full shadow-card flex items-center gap-space-xs">
                  <span className="w-2 h-2 rounded-full bg-secondary" />
                  <span className="text-label-badge font-bold uppercase tracking-[0.06em] text-secondary">Free Returns</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Slide indicators */}
        <div className="flex justify-center gap-space-sm mt-space-lg pb-space-xs">
          {heroSlides.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentSlide(i)}
              className={`h-1.5 rounded-full transition-all duration-300 ${i === currentSlide ? 'w-8 bg-primary' : 'w-2 bg-outline-variant'}`}
            />
          ))}
        </div>
      </section>

      {/* ── Categories ── */}
      <section className="py-space-xl bg-surface">
        <div className="container-site">
          <div className="flex items-end justify-between mb-space-lg">
            <div>
              <div className="inline-flex items-center gap-space-xs bg-surface-container px-space-md py-space-xs rounded-full text-label-badge font-bold uppercase tracking-[0.06em] text-primary mb-space-sm">
                <span className="material-symbols-outlined text-[15px] text-secondary">category</span>
                Shop by Category
              </div>
              <h2 className="text-headline-lg-mobile md:text-headline-lg font-semibold text-primary tracking-tight">Find Your Perfect Style</h2>
            </div>
            <Link to="/shop" className="hidden md:flex items-center gap-1 text-label-md font-semibold text-secondary hover:text-primary transition-colors">
              View All <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-space-sm md:gap-space-md">
            {CATEGORIES.map((cat) => (
              <Link
                key={cat.slug}
                to={`/shop/${cat.slug}`}
                className="group flex flex-col items-center gap-space-xs p-space-md rounded-DEFAULT bg-surface-container-low hover:bg-primary-container hover:text-on-primary shadow-sm hover:shadow-primary transition-all duration-200 text-center"
              >
                <div className="w-12 h-12 rounded-full bg-surface-container-lowest group-hover:bg-primary flex items-center justify-center text-primary group-hover:text-on-primary shadow-sm transition-all">
                  <span className="material-symbols-outlined text-[22px]">{cat.icon}</span>
                </div>
                <span className="text-label-md font-semibold text-on-surface group-hover:text-on-primary transition-colors leading-tight">{cat.label}</span>
                <span className="text-body-sm text-on-surface-variant group-hover:text-on-primary/80 transition-colors hidden md:block">{cat.desc}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Featured Products ── */}
      {featured.length > 0 && (
        <section className="py-space-xl bg-surface-container-low">
          <div className="container-site">
            <div className="flex items-end justify-between mb-space-lg">
              <div>
                <div className="inline-flex items-center gap-space-xs bg-surface-container-highest px-space-md py-space-xs rounded-full text-label-badge font-bold uppercase tracking-[0.06em] text-primary mb-space-sm">
                  <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
                  Featured Collection
                </div>
                <h2 className="text-headline-lg-mobile md:text-headline-lg font-semibold text-primary tracking-tight">Editor's Picks</h2>
                <p className="text-body-md text-on-surface-variant mt-1">Handpicked styles from our premium catalog</p>
              </div>
              <Link to="/shop?featured=true" className="hidden md:flex items-center gap-1 text-label-md font-semibold text-secondary hover:text-primary transition-colors">
                See All <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-space-md md:gap-space-lg">
              {featured.map((product: any) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Find Your Fit Banner ── */}
      <section className="py-space-xl bg-surface">
        <div className="container-site">
          <div className="relative overflow-hidden rounded-lg bg-gradient-to-br from-primary to-primary-container p-space-xl md:p-16 shadow-card-hover">
            {/* Background decoration */}
            <div className="absolute -top-16 -right-16 w-80 h-80 rounded-full bg-secondary/10 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-10 -left-10 w-64 h-64 rounded-full bg-primary-fixed/10 blur-2xl pointer-events-none" />

            <div className="relative grid grid-cols-1 lg:grid-cols-2 gap-space-xl items-center">
              <div>
                <div className="inline-flex items-center gap-space-xs bg-on-primary/10 px-space-md py-space-xs rounded-full text-label-badge font-bold uppercase tracking-[0.06em] text-primary-fixed mb-space-md">
                  <span className="material-symbols-outlined text-[15px]">psychology_alt</span>
                  60-Second Quiz
                </div>
                <h2 className="text-headline-lg-mobile md:text-headline-lg font-semibold text-on-primary tracking-tight mb-space-md">
                  Not Sure Which Style Fits You?
                </h2>
                <p className="text-body-lg text-on-primary/80 mb-space-lg max-w-lg">
                  Answer 5 quick questions about your foot type, activity level, and preferences. We'll recommend the perfect StepUp shoe for you.
                </p>
                <div className="flex flex-col sm:flex-row gap-space-md">
                  <Link to="/find-your-fit" className="inline-flex items-center justify-center gap-space-sm bg-on-primary text-primary px-8 py-4 rounded-full text-title-md font-semibold shadow-lg hover:bg-primary-fixed transition-all duration-300">
                    Take the Quiz
                    <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
                  </Link>
                  <Link to="/shop" className="inline-flex items-center justify-center gap-space-sm bg-transparent text-on-primary px-7 py-4 rounded-full text-title-md font-semibold border-2 border-on-primary/40 hover:border-on-primary hover:bg-on-primary/10 transition-all duration-300">
                    Browse All Styles
                  </Link>
                </div>
              </div>
              <div className="hidden lg:grid grid-cols-3 gap-space-sm">
                {[
                  { icon: 'directions_run', label: 'Running', count: '12 styles' },
                  { icon: 'business_center', label: 'Formal', count: '8 styles' },
                  { icon: 'sports_soccer', label: 'Sports', count: '15 styles' },
                  { icon: 'beach_access', label: 'Sandals', count: '10 styles' },
                  { icon: 'male', label: "Men's", count: '20 styles' },
                  { icon: 'female', label: "Women's", count: '18 styles' },
                ].map(({ icon, label, count }) => (
                  <div key={label} className="bg-on-primary/10 backdrop-blur-sm rounded-DEFAULT p-space-md text-center border border-on-primary/10 hover:bg-on-primary/15 transition-colors cursor-pointer">
                    <span className="material-symbols-outlined text-[28px] text-on-primary block mb-1">{icon}</span>
                    <p className="text-label-md font-semibold text-on-primary leading-tight">{label}</p>
                    <p className="text-body-sm text-on-primary/60">{count}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── New Arrivals ── */}
      {newArrivals.length > 0 && (
        <section className="py-space-xl bg-surface-container-low">
          <div className="container-site">
            <div className="flex items-end justify-between mb-space-lg">
              <div>
                <div className="inline-flex items-center gap-space-xs bg-secondary-container px-space-md py-space-xs rounded-full text-label-badge font-bold uppercase tracking-[0.06em] text-on-secondary-container mb-space-sm">
                  <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
                  Just Dropped
                </div>
                <h2 className="text-headline-lg-mobile md:text-headline-lg font-semibold text-primary tracking-tight">New Arrivals</h2>
              </div>
              <Link to="/shop?new_arrival=true" className="hidden md:flex items-center gap-1 text-label-md font-semibold text-secondary hover:text-primary transition-colors">
                View All <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-space-md md:gap-space-lg">
              {newArrivals.map((product: any) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Bestsellers ── */}
      {bestsellers.length > 0 && (
        <section className="py-space-xl bg-surface">
          <div className="container-site">
            <div className="flex items-end justify-between mb-space-lg">
              <div>
                <div className="inline-flex items-center gap-space-xs bg-surface-container px-space-md py-space-xs rounded-full text-label-badge font-bold uppercase tracking-[0.06em] text-primary mb-space-sm">
                  <span className="material-symbols-outlined text-[15px] text-secondary">trending_up</span>
                  Customer Favourites
                </div>
                <h2 className="text-headline-lg-mobile md:text-headline-lg font-semibold text-primary tracking-tight">Bestsellers</h2>
              </div>
              <Link to="/shop?bestseller=true" className="hidden md:flex items-center gap-1 text-label-md font-semibold text-secondary hover:text-primary transition-colors">
                See All <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-space-md md:gap-space-lg">
              {bestsellers.map((product: any) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Why StepUp ── */}
      <section className="py-space-xl bg-surface-container-low">
        <div className="container-site">
          <div className="text-center mb-space-xl">
            <div className="inline-flex items-center gap-space-xs bg-surface-container-highest px-space-md py-space-xs rounded-full text-label-badge font-bold uppercase tracking-[0.06em] text-primary mb-space-md">
              <span className="material-symbols-outlined text-[15px] text-secondary">verified</span>
              The StepUp Difference
            </div>
            <h2 className="text-headline-lg-mobile md:text-headline-lg font-semibold text-primary tracking-tight">Why 50,000+ Customers Choose Us</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-space-lg">
            {[
              {
                icon: 'verified_user',
                title: '100% Genuine Products',
                desc: 'Every product is sourced directly from verified manufacturers and undergoes quality checks before shipping.',
                color: 'text-primary',
                bg: 'bg-primary/8',
              },
              {
                icon: 'local_shipping',
                title: 'Fast & Free Delivery',
                desc: 'Free express delivery on orders above ₹599. Most orders delivered within 2-4 business days across India.',
                color: 'text-secondary',
                bg: 'bg-secondary-container/40',
              },
              {
                icon: 'replay',
                title: '30-Day Easy Returns',
                desc: 'Changed your mind? No problem. Return or exchange within 30 days — completely hassle-free.',
                color: 'text-tertiary',
                bg: 'bg-tertiary-fixed/40',
              },
            ].map(({ icon, title, desc, color, bg }) => (
              <div key={title} className="card p-space-xl flex flex-col gap-space-md">
                <div className={`w-14 h-14 rounded-DEFAULT ${bg} flex items-center justify-center ${color}`}>
                  <span className="material-symbols-outlined text-[28px]">{icon}</span>
                </div>
                <h3 className="text-headline-sm font-semibold text-primary">{title}</h3>
                <p className="text-body-md text-on-surface-variant leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Newsletter ── */}
      <NewsletterSection />
    </div>
  );
}
