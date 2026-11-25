import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import { useAuthStore } from '../store/authStore';
import { useCartStore } from '../store/cartStore';
import toast from 'react-hot-toast';

export default function ProductPage() {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuthStore();
  const { fetchCart } = useCartStore();
  const [selectedColor, setSelectedColor] = useState('');
  const [selectedVariant, setSelectedVariant] = useState<any>(null);
  const [addingCart, setAddingCart] = useState(false);
  const [wishlisted, setWishlisted] = useState(false);
  const [activeImg, setActiveImg] = useState(0);
  const [heatmap, setHeatmap] = useState(false);
  const [openSpec, setOpenSpec] = useState<number | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['product', slug],
    queryFn: () => api.get(`/products/${slug}`).then(r => r.data.data),
  });

  const product = data;

  useEffect(() => {
    if (product?.variants?.length) {
      const first = product.variants[0];
      setSelectedColor(first.color);
      setSelectedVariant(first);
    }
  }, [product]);

  const colors = product ? [...new Set<string>(product.variants?.map((v: any) => v.color))] : [];
  const sizesForColor = product ? product.variants?.filter((v: any) => v.color === selectedColor) : [];

  const handleColorSelect = (color: string) => {
    setSelectedColor(color);
    const v = product.variants.find((v: any) => v.color === color);
    setSelectedVariant(v);
  };

  const addToCart = async () => {
    if (!user) { toast.error('Please sign in to add items to cart'); return; }
    if (!selectedVariant) { toast.error('Please select a size'); return; }
    if (selectedVariant.stock_qty < 1) { toast.error('Out of stock'); return; }
    setAddingCart(true);
    try {
      await api.post('/cart/items', { product_id: product.id, variant_id: selectedVariant.id, quantity: 1 });
      await fetchCart();
      toast.success(`${product.name} added to bag!`);
    } catch (e: any) { toast.error(e.response?.data?.message || 'Failed to add'); }
    finally { setAddingCart(false); }
  };

  const toggleWishlist = async () => {
    if (!user) { toast.error('Please sign in'); return; }
    try {
      if (wishlisted) await api.delete(`/wishlist/${product.id}`);
      else await api.post('/wishlist', { product_id: product.id });
      setWishlisted(!wishlisted);
      toast.success(wishlisted ? 'Removed from wishlist' : 'Saved to wishlist ❤️');
    } catch {}
  };

  if (isLoading) return (
    <div className="bg-surface min-h-screen flex items-center justify-center">
      <div className="text-center">
        <span className="material-symbols-outlined text-[48px] text-outline-variant animate-pulse block mb-4">shoe</span>
        <p className="text-body-md text-on-surface-variant">Loading product...</p>
      </div>
    </div>
  );

  if (!product) return (
    <div className="bg-surface min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h2 className="text-headline-md font-semibold text-primary mb-4">Product not found</h2>
        <Link to="/shop" className="btn-primary">Back to Shop</Link>
      </div>
    </div>
  );

  const images = product.images?.length ? product.images.map((i: any) => i.url) : product.primary_image ? [product.primary_image] : [];
  const basePrice = parseFloat(product.base_price);
  const salePrice = product.sale_price ? parseFloat(product.sale_price) : null;
  const discount = salePrice ? Math.round(((basePrice - salePrice) / basePrice) * 100) : 0;

  const SPECS = [
    { icon: 'arrow_upload_progress', title: 'Carbon Fiber Plate Propulsion', desc: 'Full-length dual-density energy rebound system engineered for calcaneal load distribution.' },
    { icon: 'layers', title: 'Breathable Engineered FlyWeave', desc: 'Zonal support with zero-chafing lock-down system and moisture management.' },
    { icon: 'local_shipping', title: 'Free Express Delivery & 30-Day Trial', desc: 'From top exchange program. HSA/FSA auto-itemized receipt included.' },
  ];

  return (
    <div className="bg-surface min-h-screen">
      {/* Breadcrumb */}
      <div className="w-full bg-surface-container-low py-space-sm px-margin-mobile md:px-margin">
        <div className="max-w-site mx-auto flex flex-wrap items-center justify-between gap-space-sm text-on-surface-variant text-label-md font-semibold">
          <div className="flex items-center gap-space-xs">
            <Link to="/shop" className="hover:text-primary transition-colors">Recovery Footwear</Link>
            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            <Link to={`/shop/${product.category_slug || product.category_name?.toLowerCase()}`} className="hover:text-primary transition-colors">{product.category_name}</Link>
            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            <span className="text-primary font-semibold">{product.name}</span>
          </div>
          <div className="flex items-center gap-space-md">
            <span className="inline-flex items-center gap-1.5 text-secondary font-semibold">
              <span className="inline-block w-2 h-2 rounded-full bg-secondary animate-pulse" />
              In Stock
            </span>
            <span className="hidden md:inline text-on-surface-variant text-body-sm">Prescription-Grade Contours without Rx</span>
          </div>
        </div>
      </div>

      <section className="max-w-site mx-auto px-margin-mobile md:px-margin pt-space-lg pb-space-xl">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-xl items-start">

          {/* Gallery */}
          <div className="lg:col-span-7 flex flex-col gap-space-md">
            <div className="relative w-full rounded-lg bg-surface-container-lowest shadow-card overflow-hidden min-h-[460px] flex flex-col items-center justify-center">
              {/* Badge cluster */}
              <div className="absolute top-space-md left-space-md z-10 flex flex-col gap-space-xs">
                {product.is_new_arrival && (
                  <span className="inline-flex items-center gap-1 bg-surface-container-high/90 backdrop-blur-md px-space-md py-1 rounded-full text-primary text-label-badge font-bold uppercase tracking-[0.06em] shadow-sm">
                    <span className="material-symbols-outlined text-[14px] text-tertiary">verified_user</span>
                    APMA Accepted
                  </span>
                )}
                {discount > 0 && (
                  <span className="inline-flex items-center gap-1 bg-secondary-container text-on-secondary-container px-space-md py-1 rounded-full text-label-badge font-bold uppercase tracking-[0.06em]">
                    -{discount}% OFF
                  </span>
                )}
              </div>

              {/* Heatmap toggle */}
              <div className="absolute top-space-md right-space-md z-10">
                <button onClick={() => setHeatmap(!heatmap)}
                  className="inline-flex items-center gap-1.5 px-space-md py-2 rounded-full text-label-md font-semibold bg-surface-container hover:bg-surface-container-high text-primary shadow-sm transition-all">
                  <span className="material-symbols-outlined text-[16px] text-secondary">thermostat</span>
                  {heatmap ? 'View Product' : 'View Pressure Map'}
                </button>
              </div>

              {!heatmap ? (
                <img src={images[activeImg] || 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800'}
                  alt={product.name}
                  className="w-full max-h-[420px] object-contain transition-all duration-300 hover:scale-[1.02] p-space-lg" />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-space-lg text-center">
                  <svg className="w-full max-w-[300px] max-h-[280px] text-primary" fill="none" viewBox="0 0 200 320">
                    <path d="M60 20 C110 15, 145 40, 145 90 C145 140, 150 170, 140 210 C130 250, 125 310, 95 325 C65 330, 45 305, 45 250 C45 200, 35 150, 38 100 C40 60, 45 25, 60 20 Z" fill="#E4E2DF" stroke="currentColor" strokeOpacity="0.2" strokeWidth="2"/>
                    <circle cx="85" cy="275" fill="#8ed4c4" fillOpacity="0.45" r="28"/>
                    <circle cx="85" cy="275" fill="#006b5f" fillOpacity="0.8" r="16"/>
                    <text fill="#FFFFFF" fontSize="8" fontWeight="700" textAnchor="middle" x="85" y="278">68% RELIEF</text>
                    <path d="M48 140 C52 110, 75 120, 85 145 C95 170, 70 210, 52 200 Z" fill="#6df5e1" fillOpacity="0.6"/>
                    <text fill="#004339" fontSize="7" fontWeight="700" textAnchor="middle" x="75" y="170">ARCH REST</text>
                    <ellipse cx="95" cy="85" fill="#8ed4c4" fillOpacity="0.5" rx="35" ry="25"/>
                    <ellipse cx="95" cy="85" fill="#006b5f" fillOpacity="0.75" rx="20" ry="14"/>
                    <text fill="#FFFFFF" fontSize="8" fontWeight="700" textAnchor="middle" x="95" y="88">LOAD BALANCE</text>
                  </svg>
                  <p className="text-label-badge font-bold uppercase tracking-[0.06em] text-secondary mt-space-sm">Clinical Baropodometric Gait Data: Heel Peak Load Shifted</p>
                </div>
              )}

              <div className="absolute bottom-space-md left-1/2 -translate-x-1/2 bg-surface-container-lowest/90 backdrop-blur-md px-space-md py-1.5 rounded-full shadow-sm flex items-center gap-space-md text-on-surface-variant text-label-badge font-bold uppercase tracking-[0.06em]">
                <span className="flex items-center gap-1 text-primary"><span className="material-symbols-outlined text-[14px]">360</span> {images.length} Medically Scanned Angles</span>
                <span className="opacity-30">|</span>
                <span className="text-tertiary font-bold">HSA/FSA Eligible</span>
              </div>
            </div>

            {/* Thumbnails */}
            {images.length > 1 && (
              <div className="grid grid-cols-4 gap-space-sm">
                {images.map((img: string, i: number) => (
                  <button key={i} onClick={() => setActiveImg(i)}
                    className={`relative rounded-DEFAULT overflow-hidden bg-surface-container-lowest p-1 shadow-sm transition-all focus:outline-none ${i === activeImg ? 'ring-2 ring-primary' : 'hover:shadow-card'}`}>
                    <img src={img} alt={`View ${i+1}`} className="w-full aspect-[4/3] object-cover rounded-sm" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product info */}
          <div className="lg:col-span-5 flex flex-col gap-space-lg">
            {/* Brand + rating */}
            <div>
              <div className="flex items-center gap-space-xs mb-space-xs">
                <span className="text-label-badge font-bold uppercase tracking-[0.06em] text-secondary">{(product.brand || 'StepUp').toUpperCase()} PERFORMANCE</span>
                {product.is_bestseller && (
                  <span className="inline-flex items-center gap-1 bg-tertiary-fixed text-tertiary px-space-sm py-0.5 rounded-full text-label-badge font-bold">
                    <span className="material-symbols-outlined text-[13px]">verified_user</span>Top Rated
                  </span>
                )}
              </div>
              <h1 className="text-headline-lg font-semibold text-primary tracking-tight mb-space-sm">{product.name}</h1>

              {product.avg_rating > 0 && (
                <div className="flex items-center gap-space-sm mb-space-sm">
                  <div className="flex items-center gap-0.5 text-[#f59e0b]">
                    {[1,2,3,4,5].map(i => (
                      <span key={i} className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: i <= Math.round(parseFloat(product.avg_rating)) ? "'FILL' 1" : "'FILL' 0" }}>star</span>
                    ))}
                  </div>
                  <span className="text-title-md font-semibold text-primary">{parseFloat(product.avg_rating).toFixed(1)}</span>
                  <span className="text-body-sm text-on-surface-variant">({product.review_count} verified reviews)</span>
                </div>
              )}

              {/* Price */}
              <div className="flex items-center gap-space-md">
                <span className="text-display-hero-mobile font-bold text-primary">
                  ₹{(salePrice ?? basePrice).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </span>
                {salePrice && <span className="text-title-md text-on-surface-variant line-through">₹{basePrice.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>}
                {discount > 0 && <span className="inline-flex items-center gap-1 bg-secondary-container text-on-secondary-container px-space-sm py-0.5 rounded-full text-label-badge font-bold">-{discount}% OFF</span>}
              </div>
            </div>

            {/* Color picker */}
            {colors.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-space-sm">
                  <label className="label mb-0">Select Color: <span className="text-primary">{selectedColor}</span></label>
                  <span className="text-label-badge font-bold text-on-surface-variant uppercase">{colors.length} Colorways</span>
                </div>
                <div className="flex flex-wrap gap-space-sm">
                  {colors.map((color: string) => {
                    const v = product.variants.find((v: any) => v.color === color);
                    return (
                      <button key={color} onClick={() => handleColorSelect(color)}
                        className={`flex items-center gap-space-xs px-space-md py-space-xs rounded-full border-2 transition-all ${selectedColor === color ? 'border-primary bg-surface-container' : 'border-outline-variant hover:border-primary'}`}>
                        <span className="w-4 h-4 rounded-full border border-outline-variant/30 shrink-0" style={{ background: v?.color_hex || '#888' }} />
                        <span className="text-body-sm font-semibold text-on-surface">{color}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Size picker */}
            {sizesForColor?.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-space-sm">
                  <label className="label mb-0">Select US Size</label>
                  <button className="text-label-md font-semibold text-secondary hover:text-primary transition-colors">↑ Size Guide</button>
                </div>
                <div className="flex flex-wrap gap-space-sm">
                  {sizesForColor.map((v: any) => (
                    <button key={v.id} onClick={() => v.stock_qty > 0 && setSelectedVariant(v)} disabled={v.stock_qty < 1}
                      className={`w-14 h-14 rounded-DEFAULT border-2 text-title-md font-semibold transition-all ${
                        selectedVariant?.id === v.id ? 'border-primary bg-primary text-on-primary shadow-primary' :
                        v.stock_qty < 1 ? 'border-outline-variant text-outline line-through cursor-not-allowed opacity-50' :
                        'border-outline-variant hover:border-primary text-on-surface'
                      }`}>
                      {v.size}
                    </button>
                  ))}
                </div>
                {selectedVariant && (
                  <p className={`text-body-sm font-semibold mt-space-sm flex items-center gap-1 ${selectedVariant.stock_qty > 10 ? 'text-secondary' : selectedVariant.stock_qty > 0 ? 'text-tertiary' : 'text-error'}`}>
                    <span className="material-symbols-outlined text-[16px]">{selectedVariant.stock_qty > 0 ? 'check_circle' : 'cancel'}</span>
                    {selectedVariant.stock_qty > 10 ? 'In Stock — Ready to Ship'
                      : selectedVariant.stock_qty > 0 ? `⚡ Only ${selectedVariant.stock_qty} Left — Limited Clinical Batch`
                      : 'Out of Stock'}
                  </p>
                )}
              </div>
            )}

            {/* CTA buttons */}
            <div className="flex gap-space-sm">
              <button onClick={addToCart} disabled={addingCart || (selectedVariant && selectedVariant.stock_qty < 1)}
                className="flex-1 h-14 bg-surface-container-high text-on-surface rounded-full text-label-md font-semibold flex items-center justify-center gap-space-xs hover:bg-surface-container-highest transition-all border border-outline-variant disabled:opacity-50">
                <span className="material-symbols-outlined text-[20px]">shopping_bag</span>
                {addingCart ? 'Adding...' : 'Add to Bag'}
              </button>
              <button onClick={addToCart} disabled={addingCart || (selectedVariant && selectedVariant.stock_qty < 1)}
                className="flex-1 h-14 bg-primary-container text-on-primary rounded-full text-label-md font-semibold flex items-center justify-center gap-space-xs shadow-primary hover:bg-primary transition-all disabled:opacity-50">
                <span className="material-symbols-outlined text-[20px]">bolt</span>
                {addingCart ? '...' : `Buy Now · ₹${(salePrice ?? basePrice).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}
              </button>
            </div>

            {/* Wishlist */}
            <button onClick={toggleWishlist} className="flex items-center justify-center gap-space-xs text-on-surface-variant hover:text-primary transition-colors text-body-sm font-semibold">
              <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: wishlisted ? "'FILL' 1" : "'FILL' 0" }}>favorite</span>
              {wishlisted ? 'Saved to Wishlist' : 'Save to Wishlist'}
            </button>

            {/* Engineered Specs */}
            <div>
              <h3 className="text-title-md font-semibold text-on-surface mb-space-sm">Engineered Specifications</h3>
              <div className="divide-y divide-outline-variant/20">
                {SPECS.map((spec, i) => (
                  <button key={i} onClick={() => setOpenSpec(openSpec === i ? null : i)}
                    className="w-full flex items-center gap-space-md py-space-md text-left hover:bg-surface-container-low transition-colors">
                    <div className="w-9 h-9 rounded-DEFAULT bg-surface-container flex items-center justify-center text-secondary shrink-0">
                      <span className="material-symbols-outlined text-[18px]">{spec.icon}</span>
                    </div>
                    <div className="flex-1">
                      <span className="text-body-md font-semibold text-on-surface">{spec.title}</span>
                      {openSpec === i && <p className="text-body-sm text-on-surface-variant mt-1">{spec.desc}</p>}
                    </div>
                    <span className="material-symbols-outlined text-[20px] text-outline">{openSpec === i ? 'expand_less' : 'expand_more'}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Description */}
            {product.description && (
              <div className="bg-surface-container-low rounded-DEFAULT p-space-md">
                <h4 className="text-label-md font-semibold text-on-surface-variant uppercase tracking-[0.04em] mb-space-xs">About This Product</h4>
                <p className="text-body-md text-on-surface-variant leading-relaxed">{product.description}</p>
              </div>
            )}

            {/* Trust row */}
            <div className="grid grid-cols-3 gap-space-sm">
              {[
                { icon: 'verified', label: '100% Authentic', desc: 'APMA Verified' },
                { icon: 'replay', label: '30-Day Returns', desc: 'Hassle-free' },
                { icon: 'local_shipping', label: 'Free Delivery', desc: 'Orders over ₹599' },
              ].map(({ icon, label, desc }) => (
                <div key={label} className="card p-space-sm text-center">
                  <span className="material-symbols-outlined text-[22px] text-secondary block mb-1">{icon}</span>
                  <p className="text-label-badge font-bold text-on-surface">{label}</p>
                  <p className="text-body-sm text-on-surface-variant">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
