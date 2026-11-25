import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import ProductCard from '../components/products/ProductCard';

export default function HomePage() {
  const { data: featured } = useQuery({
    queryKey: ['products', 'featured'],
    queryFn: () => api.get('/products?featured=true&limit=8').then(r => r.data),
  });
  const { data: bestsellers } = useQuery({
    queryKey: ['products', 'bestsellers'],
    queryFn: () => api.get('/products?bestseller=true&limit=4').then(r => r.data),
  });
  const { data: newArrivals } = useQuery({
    queryKey: ['products', 'new'],
    queryFn: () => api.get('/products?new_arrival=true&limit=4').then(r => r.data),
  });

  const featuredProducts = featured?.data || [];
  const bestsellerProducts = bestsellers?.data || [];
  const newArrivalProducts = newArrivals?.data || [];

  return (
    <div className="bg-surface">

      {/* ── Clinical Proof Strip ── */}
      <section className="w-full bg-surface-container py-space-md">
        <div className="container-site">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-space-md items-center">
            {[
              { icon: 'verified', label: 'APMA Accepted', desc: 'American Podiatric Medical Seal' },
              { icon: 'healing', label: '98% Pain Relief', desc: 'Documented calcaneal relief' },
              { icon: 'calendar_today', label: '60-Day Trial', desc: '100% pain-free walk guarantee' },
              { icon: 'receipt_long', label: 'HSA/FSA Eligible', desc: 'Auto-itemized claim receipt' },
            ].map(({ icon, label, desc }) => (
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
      <section className="relative w-full py-space-xl overflow-hidden bg-gradient-to-b from-surface via-surface-container-low to-surface">
        <div className="container-site">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-xl items-center">
            <div className="lg:col-span-6 flex flex-col items-start gap-space-md">
              <div className="inline-flex items-center gap-space-xs bg-surface-container-highest px-space-md py-1 rounded-full">
                <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
                <span className="text-label-badge font-bold uppercase tracking-[0.06em] text-secondary">Podiatric Surgeon Bio-Architecture</span>
              </div>
              <h1 className="text-display-hero-mobile md:text-display-hero font-bold text-primary tracking-tight">
                Clinical Arch Support Meets Everyday Style.
              </h1>
              <p className="text-body-lg text-on-surface-variant max-w-xl">
                Engineered by podiatric surgeons to eliminate plantar fasciitis pain and calcaneal stress without looking like clunky orthopedic shoes.
              </p>
              <div className="flex flex-col sm:flex-row gap-space-md pt-space-xs">
                <Link to="/shop" className="inline-flex items-center justify-center bg-primary-container text-on-primary px-8 py-4 rounded-full text-title-md font-semibold shadow-primary hover:bg-primary transition-all duration-300 gap-space-sm">
                  Shop Plantar Relief Sandals
                  <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
                </Link>
                <Link to="/find-your-fit" className="inline-flex items-center justify-center bg-transparent text-primary-container px-7 py-4 rounded-full text-title-md font-semibold border-2 border-primary-container hover:bg-secondary-container/20 transition-all duration-300 gap-space-sm">
                  <span className="material-symbols-outlined text-[20px]">psychology_alt</span>
                  Take 60-Sec Arch Quiz
                </Link>
              </div>
              <div className="flex items-center gap-space-md pt-space-md">
                <div className="flex -space-x-2">
                  {['bg-primary-fixed', 'bg-secondary-fixed', 'bg-tertiary-fixed'].map((bg, i) => (
                    <div key={i} className={`w-10 h-10 rounded-full ${bg} flex items-center justify-center`}>
                      <span className="material-symbols-outlined text-[18px] text-primary">person</span>
                    </div>
                  ))}
                </div>
                <div>
                  <div className="flex items-center gap-1 text-[#f59e0b]">
                    {[1,2,3,4,5].map(i => <span key={i} className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>)}
                    <span className="text-title-md font-semibold text-primary ml-1">4.9 / 5</span>
                  </div>
                  <p className="text-body-sm text-on-surface-variant">Over <strong className="text-on-surface">140,000+</strong> pain-free steps taken by 8,400+ verified patients</p>
                </div>
              </div>
            </div>

            <div className="lg:col-span-6 relative flex justify-center">
              <div className="relative w-full max-w-lg aspect-square rounded-lg bg-surface-container-low overflow-hidden shadow-card-hover">
                {featuredProducts[0]?.primary_image ? (
                  <img src={featuredProducts[0].primary_image} alt="Featured product" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="material-symbols-outlined text-[80px] text-outline-variant">shoe</span>
                  </div>
                )}
                <div className="absolute -top-3 left-4 bg-surface/95 backdrop-blur-md px-space-md py-space-xs rounded-full shadow-card flex items-center gap-space-xs">
                  <span className="w-2.5 h-2.5 rounded-full bg-primary" />
                  <div>
                    <span className="text-label-badge font-bold uppercase tracking-[0.06em] text-primary">22mm Deep Heel Cup</span>
                    <p className="text-body-sm text-on-surface-variant leading-none">Aligns calcaneus &amp; spine</p>
                  </div>
                </div>
                <div className="absolute top-1/2 -right-4 -translate-y-1/2 bg-surface/95 backdrop-blur-md px-space-md py-space-xs rounded-full shadow-card flex items-center gap-space-xs">
                  <span className="w-2.5 h-2.5 rounded-full bg-secondary" />
                  <div>
                    <span className="text-label-badge font-bold uppercase tracking-[0.06em] text-secondary">Plantar Fascia Bridge</span>
                    <p className="text-body-sm text-on-surface-variant leading-none">Continuous arch cradle</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Shop by Category ── */}
      <section className="py-space-xl bg-surface-container-low">
        <div className="container-site">
          <div className="flex items-end justify-between mb-space-lg">
            <div>
              <div className="inline-flex items-center gap-space-xs bg-surface-container-highest px-space-md py-space-xs rounded-full text-label-badge font-bold uppercase tracking-[0.06em] text-primary mb-space-sm">
                <span className="material-symbols-outlined text-[15px] text-secondary">vital_signs</span>
                Shop by Condition
              </div>
              <h2 className="text-headline-lg-mobile md:text-headline-lg font-semibold text-primary tracking-tight">Targeted Footwear for Your Needs</h2>
            </div>
            <Link to="/shop" className="hidden md:flex items-center gap-1 text-label-md font-semibold text-secondary hover:text-primary transition-colors">
              View All <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </Link>
          </div>
          <div className="flex items-center gap-space-xs overflow-x-auto pb-space-sm no-scrollbar">
            {[
              { label: 'All Footwear', value: '', count: `${featuredProducts.length + bestsellerProducts.length}` },
              { label: "Men's", value: 'mens', count: '' },
              { label: "Women's", value: 'womens', count: '' },
              { label: 'Sports', value: 'sports', count: '' },
              { label: "Kids'", value: 'kids', count: '' },
              { label: 'Sandals', value: 'sandals', count: '' },
            ].map((cat) => (
              <Link
                key={cat.value}
                to={cat.value ? `/shop/${cat.value}` : '/shop'}
                className="shrink-0 flex items-center gap-space-xs bg-surface-container-lowest text-on-surface hover:bg-primary-container hover:text-on-primary px-space-lg py-space-sm rounded-full text-label-md font-semibold transition-all shadow-sm"
              >
                <span>{cat.label}</span>
                {cat.count && <span className="bg-primary-container/20 text-primary px-2 py-0.5 rounded-full text-label-badge font-bold">{cat.count} Styles</span>}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Featured Products ── */}
      {featuredProducts.length > 0 && (
        <section className="py-space-xl bg-surface">
          <div className="container-site">
            <div className="flex items-end justify-between mb-space-lg">
              <div>
                <span className="text-label-badge font-bold uppercase tracking-[0.06em] text-secondary block mb-1">Editor's Selection</span>
                <h2 className="text-headline-lg-mobile md:text-headline-lg font-semibold text-primary tracking-tight">Trending Drops</h2>
                <p className="text-body-md text-on-surface-variant mt-1">Just landed from the design lab</p>
              </div>
              <Link to="/shop?featured=true" className="hidden md:flex items-center gap-1 text-label-md font-semibold text-secondary hover:text-primary transition-colors">
                See All (24) <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-space-md md:gap-space-lg">
              {featuredProducts.map((product: any) => <ProductCard key={product.id} product={product} />)}
            </div>
          </div>
        </section>
      )}

      {/* ── Find Your Fit Banner ── */}
      <section className="py-space-xl bg-surface-container-low">
        <div className="container-site">
          <div className="relative overflow-hidden rounded-lg bg-gradient-to-br from-primary to-primary-container p-space-xl md:p-16 shadow-card-hover">
            <div className="absolute -top-16 -right-16 w-80 h-80 rounded-full bg-secondary/10 blur-3xl pointer-events-none" />
            <div className="relative grid grid-cols-1 lg:grid-cols-2 gap-space-xl items-center">
              <div>
                <div className="inline-flex items-center gap-space-xs bg-on-primary/10 px-space-md py-space-xs rounded-full text-label-badge font-bold uppercase tracking-[0.06em] text-primary-fixed mb-space-md">
                  <span className="material-symbols-outlined text-[15px]">psychology_alt</span>
                  60-Second Arch Quiz
                </div>
                <h2 className="text-headline-lg-mobile md:text-headline-lg font-semibold text-on-primary tracking-tight mb-space-md">
                  Not Sure Which Style Fits Your Arch?
                </h2>
                <p className="text-body-lg text-on-primary/80 mb-space-lg max-w-lg">
                  Answer 5 quick biomechanical questions about your foot type, activity level, and pain points. Our clinical algorithm recommends the perfect StepUp shoe for your arch profile.
                </p>
                <div className="flex flex-col sm:flex-row gap-space-md">
                  <Link to="/find-your-fit" className="inline-flex items-center justify-center gap-space-sm bg-on-primary text-primary px-8 py-4 rounded-full text-title-md font-semibold shadow-lg hover:bg-primary-fixed transition-all duration-300">
                    Take the Arch Quiz
                    <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
                  </Link>
                  <Link to="/shop" className="inline-flex items-center justify-center gap-space-sm bg-transparent text-on-primary px-7 py-4 rounded-full text-title-md font-semibold border-2 border-on-primary/40 hover:border-on-primary hover:bg-on-primary/10 transition-all duration-300">
                    Browse All Styles
                  </Link>
                </div>
              </div>
              <div className="hidden lg:grid grid-cols-3 gap-space-sm">
                {[
                  { icon: 'arrow_upload_progress', label: 'Heel Strike', desc: 'Deep calcaneal cradle' },
                  { icon: 'timeline', label: 'Arch Support', desc: '34mm dynamic lift' },
                  { icon: 'lens_blur', label: 'Metatarsal', desc: 'Transverse met dome' },
                  { icon: 'swap_driving_apps', label: 'Overpronation', desc: 'Subtalar stabilizer' },
                  { icon: 'directions_run', label: 'Running', desc: 'Calcaneal alignment' },
                  { icon: 'spa', label: 'Recovery', desc: 'Zero-drop neutral' },
                ].map(({ icon, label, desc }) => (
                  <div key={label} className="bg-on-primary/10 backdrop-blur-sm rounded-DEFAULT p-space-md text-center border border-on-primary/10 hover:bg-on-primary/15 transition-colors cursor-pointer">
                    <span className="material-symbols-outlined text-[28px] text-on-primary block mb-1">{icon}</span>
                    <p className="text-label-md font-semibold text-on-primary leading-tight">{label}</p>
                    <p className="text-body-sm text-on-primary/60">{desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── New Arrivals ── */}
      {newArrivalProducts.length > 0 && (
        <section className="py-space-xl bg-surface">
          <div className="container-site">
            <div className="flex items-end justify-between mb-space-lg">
              <div>
                <div className="inline-flex items-center gap-space-xs bg-secondary-container px-space-md py-space-xs rounded-full text-label-badge font-bold uppercase tracking-[0.06em] text-on-secondary-container mb-space-sm">
                  <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
                  Clinical Batch 2026
                </div>
                <h2 className="text-headline-lg-mobile md:text-headline-lg font-semibold text-primary tracking-tight">New Arrivals</h2>
              </div>
              <Link to="/shop?new_arrival=true" className="hidden md:flex items-center gap-1 text-label-md font-semibold text-secondary hover:text-primary transition-colors">
                View All <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-space-md md:gap-space-lg">
              {newArrivalProducts.map((product: any) => <ProductCard key={product.id} product={product} />)}
            </div>
          </div>
        </section>
      )}

      {/* ── Bestsellers ── */}
      {bestsellerProducts.length > 0 && (
        <section className="py-space-xl bg-surface-container-low">
          <div className="container-site">
            <div className="flex items-end justify-between mb-space-lg">
              <div>
                <span className="text-label-badge font-bold uppercase tracking-[0.06em] text-secondary block mb-1">Patient Verified</span>
                <h2 className="text-headline-lg-mobile md:text-headline-lg font-semibold text-primary tracking-tight">Bestsellers</h2>
              </div>
              <Link to="/shop?bestseller=true" className="hidden md:flex items-center gap-1 text-label-md font-semibold text-secondary hover:text-primary transition-colors">
                See All <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-space-md md:gap-space-lg">
              {bestsellerProducts.map((product: any) => <ProductCard key={product.id} product={product} />)}
            </div>
          </div>
        </section>
      )}

      {/* ── Why StepUp ── */}
      <section className="py-space-xl bg-surface">
        <div className="container-site">
          <div className="text-center mb-space-xl">
            <div className="inline-flex items-center gap-space-xs bg-surface-container-highest px-space-md py-space-xs rounded-full text-label-badge font-bold uppercase tracking-[0.06em] text-primary mb-space-md">
              <span className="material-symbols-outlined text-[15px] text-secondary">biotech</span>
              Peer-Reviewed Podiatric Science
            </div>
            <h2 className="text-headline-lg-mobile md:text-headline-lg font-semibold text-primary tracking-tight">The StepUp Orthopedic Difference</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-space-lg">
            {[
              { icon: 'verified_user', title: '94.2% Calcaneal Pain Relief', desc: 'Statistically significant reduction in morning initial-step plantar fascia pain within a 14-day daily wear cohort (n=840 patients; p < 0.001).', color: 'text-primary', bg: 'bg-primary/8' },
              { icon: 'speed', title: '67.4% Peak Pressure Offload', desc: 'Measured at the medial plantar tuberosity via high-density capacitive insole telemetry matrices during heel strike phase. Peak: 74 → 24 PSI.', color: 'text-secondary', bg: 'bg-secondary-container/40' },
              { icon: 'accessibility_new', title: 'Zero-Drop Postural Alignment', desc: 'Neutralizes kinetic Achilles tendon strain while stabilizing the subtalar joint and engaging the passive Windlass mechanism leverage.', color: 'text-tertiary', bg: 'bg-tertiary-fixed/40' },
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
          <div className="text-center mt-space-xl">
            <Link to="/clinical-studies" className="inline-flex items-center gap-space-sm text-label-md font-semibold text-secondary hover:text-primary transition-colors">
              <span className="material-symbols-outlined text-[18px]">article</span>
              Read Full Clinical Studies
              <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
}
