import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { useAuthStore } from '../store/authStore';
import SizeGuideModal from '../components/products/SizeGuideModal';
import { useCartStore } from '../store/cartStore';
import toast from 'react-hot-toast';

export default function ProductPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { fetchCart } = useCartStore();
  const [selectedColor, setSelectedColor] = useState('');
  const [selectedVariant, setSelectedVariant] = useState<any>(null);
  const [addingCart, setAddingCart] = useState(false);
  const [wishlistUpdating, setWishlistUpdating] = useState(false);
  const [activeImg, setActiveImg] = useState(0);
  const queryClient = useQueryClient();
  const { data: wishlistData } = useQuery({
    queryKey: ['wishlist'],
    queryFn: () => api.get('/wishlist').then(response => response.data),
    enabled: !!user,
  });
  const [openSpec, setOpenSpec] = useState<number | null>(null);
  const [sizeGuideOpen, setSizeGuideOpen] = useState(false);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewTitle, setReviewTitle] = useState('');
  const [reviewBody, setReviewBody] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['product', slug],
    queryFn: () => api.get(`/products/${slug}`).then(r => r.data.data),
  });

  const product = data;
  const wishlisted = wishlistData?.data?.some((item: any) => item.product_id === product?.id) || false;

  useEffect(() => {
    if (product?.variants?.length) {
      setSelectedColor(product.variants[0].color);
      setSelectedVariant(null);
    } else {
      setSelectedColor('');
      setSelectedVariant(null);
    }
  }, [product]);

  const colors = product ? [...new Set<string>(product.variants?.map((v: any) => v.color))] : [];
  const sizesForColor = product ? product.variants?.filter((v: any) => v.color === selectedColor).sort((a: any, b: any) => {
    const aSize = Number(a.size);
    const bSize = Number(b.size);
    if (Number.isFinite(aSize) && Number.isFinite(bSize)) return aSize - bSize;
    return String(a.size).localeCompare(String(b.size));
  }) : [];

  const handleColorSelect = (color: string) => {
    setSelectedColor(color);
    setSelectedVariant(null);
  };

  const addToCart = async (goToCheckout = false) => {
    if (!user) { toast.error('Please sign in to add items to cart'); return; }
    if (!selectedVariant) { toast.error('Please select a size'); return; }
    if (selectedVariant.stock_qty < 1) { toast.error('Out of stock'); return; }
    setAddingCart(true);
    try {
      await api.post('/cart/items', { product_id: product.id, variant_id: selectedVariant.id, quantity: 1 });
      await fetchCart();
      toast.success(`${product.name} added to bag!`);
      if (goToCheckout) navigate('/checkout');
    } catch (e: any) { toast.error(e.response?.data?.message || 'Failed to add'); }
    finally { setAddingCart(false); }
  };

  const submitReview = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user) {
      toast.error('Please sign in to write a review');
      return;
    }
    if (!reviewRating) {
      toast.error('Choose a star rating first');
      return;
    }
    setReviewSubmitting(true);
    try {
      await api.post('/reviews', {
        product_id: product.id,
        rating: reviewRating,
        title: reviewTitle.trim(),
        body: reviewBody.trim(),
      });
      toast.success('Review submitted. It will appear after moderation.');
      setReviewRating(0);
      setReviewTitle('');
      setReviewBody('');
      await queryClient.invalidateQueries({ queryKey: ['product', slug] });
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Could not submit your review');
    } finally {
      setReviewSubmitting(false);
    }
  };

  const toggleWishlist = async () => {
    if (!user) { toast.error('Please sign in'); return; }
    if (wishlistUpdating) return;
    setWishlistUpdating(true);
    try {
      if (wishlisted) await api.delete(`/wishlist/${product.id}`);
      else await api.post('/wishlist', { product_id: product.id });
      await queryClient.invalidateQueries({ queryKey: ['wishlist'] });
      toast.success(wishlisted ? 'Removed from wishlist' : 'Saved to wishlist ❤️');
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Unable to update wishlist');
    } finally {
      setWishlistUpdating(false);
    }
  };

  if (isLoading) return (
    <div className="bg-surface min-h-screen flex items-center justify-center">
      <div className="text-center">
        <span className="material-symbols-outlined text-[48px] text-outline-variant animate-pulse block mb-4">shoe</span>
        <p className="text-body-md text-on-surface-variant">Loading product...</p>
      </div>
    </div>
  );

  if (isError) return (
    <div className="bg-surface min-h-screen flex items-center justify-center px-6">
      <div role="alert" className="max-w-md text-center">
        <span className="material-symbols-outlined text-[48px] text-error mb-4 block" aria-hidden="true">cloud_off</span>
        <h2 className="text-headline-md font-semibold text-primary mb-3">Product details are temporarily unavailable</h2>
        <p className="text-body-md text-on-surface-variant mb-6">We couldn't retrieve this product from the STEPUP catalogue. Please try again.</p>
        <button type="button" onClick={() => refetch()} className="btn-primary">Retry</button>
        <Link to="/shop" className="ml-4 text-body-md font-semibold text-primary hover:underline">Back to Shop</Link>
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
  const hasAvailableStock = product.variants?.some((variant: any) => Number(variant.stock_qty) > 0) || false;
  const basePrice = parseFloat(product.base_price);
  const salePrice = product.sale_price ? parseFloat(product.sale_price) : null;
  const prior30DayPrice = product.price_disclosure?.discount_comparison_eligible ? Number(product.price_disclosure.prior_30_day_lowest_price) : null;
  const currentDisplayPrice = salePrice ?? basePrice;
  const discount = prior30DayPrice && prior30DayPrice > currentDisplayPrice ? Math.round(((prior30DayPrice - currentDisplayPrice) / prior30DayPrice) * 100) : 0;

  const SPECS = [
    ...(product.material ? [{ icon: 'layers', title: 'Material', desc: product.material }] : []),
    ...(product.arch_support_level ? [{ icon: 'footprint', title: 'Arch support', desc: `${product.arch_support_level} support` }] : []),
    ...(product.arch_height_mm ? [{ icon: 'straighten', title: 'Arch height', desc: `${product.arch_height_mm} mm` }] : []),
    ...(product.durometer_shore_a !== null && product.durometer_shore_a !== undefined ? [{ icon: 'tune', title: 'Cushion firmness', desc: `${product.durometer_shore_a} Shore A` }] : []),
    ...(product.care_instructions ? [{ icon: 'hand', title: 'Care instructions', desc: product.care_instructions }] : []),
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
            <span className={`inline-flex items-center gap-1.5 font-semibold ${hasAvailableStock ? "text-secondary" : "text-error"}`}>
              <span className={`inline-block w-2 h-2 rounded-full ${hasAvailableStock ? "bg-secondary" : "bg-error"}`} />
              {hasAvailableStock ? "In stock" : "Out of stock"}
            </span>
            <span className="hidden md:inline text-on-surface-variant text-body-sm">Product details and available variants</span>
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
                    Product highlight
                  </span>
                )}
                {discount > 0 && (
                  <span className="inline-flex items-center gap-1 bg-secondary-container text-on-secondary-container px-space-md py-1 rounded-full text-label-badge font-bold uppercase tracking-[0.06em]">
                    -{discount}% OFF
                  </span>
                )}
              </div>

              {images[activeImg] ? (
                <img src={images[activeImg]} alt={product.name} className="w-full max-h-[420px] object-contain transition-all duration-300 hover:scale-[1.02] p-space-lg" />
              ) : (
                <div className="relative flex min-h-[420px] w-full flex-col items-center justify-center overflow-hidden bg-[radial-gradient(ellipse_at_50%_42%,#ffffff_0%,#edf2ed_48%,#dce7df_100%)] text-primary">
                  <div className="absolute -right-12 -top-12 h-64 w-64 rounded-full border border-primary/10" />
                  <div className="absolute -bottom-20 -left-12 h-72 w-72 rounded-full border border-primary/10" />
                  <span className="material-symbols-outlined relative text-[112px] text-primary/40">steps</span>
                  <span className="relative mt-4 text-xs font-bold uppercase tracking-[0.24em]">STEPUP</span>
                  <span className="relative mt-2 text-xs text-on-surface-variant">Product photography coming soon</span>
                </div>
              )}

              <div className="absolute bottom-space-md left-1/2 -translate-x-1/2 bg-surface-container-lowest/90 backdrop-blur-md px-space-md py-1.5 rounded-full shadow-sm flex items-center gap-space-md text-on-surface-variant text-label-badge font-bold uppercase tracking-[0.06em]">
                <span className="flex items-center gap-1 text-primary"><span className="material-symbols-outlined text-[14px]">360</span> {images.length} Product Images</span>
                <span className="opacity-30">|</span>
                
              </div>
            </div>

            {/* Thumbnails */}
            {images.length > 1 && (
              <div className="grid grid-cols-4 gap-space-sm">
                {images.map((img: string, i: number) => (
                  <button key={i} type="button" onClick={() => setActiveImg(i)} aria-label={`Show product image ${i + 1}`} aria-pressed={i === activeImg}
                    className={`relative rounded-DEFAULT overflow-hidden bg-surface-container-lowest p-1 shadow-sm transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary ${i === activeImg ? 'ring-2 ring-primary' : 'hover:shadow-card'}`}>
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
                    <span className="material-symbols-outlined text-[13px]">verified_user</span>Bestseller
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
                  <span className="text-body-sm text-on-surface-variant">({product.review_count} customer reviews)</span>
                </div>
              )}

              {/* Price */}
              <div className="flex items-center gap-space-md">
                <span className="text-display-hero-mobile font-bold text-primary">
                  {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(salePrice ?? basePrice)}
                </span>
                {discount > 0 && prior30DayPrice !== null && <span className="text-title-md text-on-surface-variant line-through">{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(prior30DayPrice)}</span>}
                {discount > 0 && <span className="inline-flex items-center gap-1 bg-secondary-container text-on-secondary-container px-space-sm py-0.5 rounded-full text-label-badge font-bold">-{discount}% OFF</span>}
                {salePrice !== null && discount === 0 && <span className="text-xs text-on-surface-variant">Offer price</span>}
                {discount > 0 && <p className="mt-1 text-xs text-on-surface-variant">Compared with the lowest price recorded during the previous 30 days.</p>}
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
                  <label className="label mb-0">Select UK Size</label>
                  <button onClick={() => setSizeGuideOpen(true)} className="text-label-md font-semibold text-secondary hover:text-primary transition-colors">↑ Size Guide</button>
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
                {!selectedVariant && <p className="text-body-sm text-on-surface-variant mt-space-sm">Choose an available size to continue.</p>}
                {selectedVariant && (
                  <p className={`text-body-sm font-semibold mt-space-sm flex items-center gap-1 ${selectedVariant.stock_qty > 10 ? 'text-secondary' : selectedVariant.stock_qty > 0 ? 'text-tertiary' : 'text-error'}`}>
                    <span className="material-symbols-outlined text-[16px]">{selectedVariant.stock_qty > 0 ? 'check_circle' : 'cancel'}</span>
                    {selectedVariant.stock_qty > 10 ? 'In Stock — Ready to Ship'
                      : selectedVariant.stock_qty > 0 ? `⚡ Only ${selectedVariant.stock_qty} Left — Limited stock`
                      : 'Out of Stock'}
                  </p>
                )}
              </div>
            )}

            {/* CTA buttons */}
            <div className="flex gap-space-sm">
              <button onClick={() => addToCart()} disabled={addingCart || !selectedVariant || Number(selectedVariant.stock_qty) < 1}
                className="flex-1 h-14 bg-surface-container-high text-on-surface rounded-full text-label-md font-semibold flex items-center justify-center gap-space-xs hover:bg-surface-container-highest transition-all border border-outline-variant disabled:opacity-50">
                <span className="material-symbols-outlined text-[20px]">shopping_bag</span>
                {addingCart ? 'Adding...' : 'Add to Bag'}
              </button>
              <button onClick={() => addToCart(true)} disabled={addingCart || !selectedVariant || Number(selectedVariant.stock_qty) < 1}
                className="flex-1 h-14 bg-primary-container text-on-primary rounded-full text-label-md font-semibold flex items-center justify-center gap-space-xs shadow-primary hover:bg-primary transition-all disabled:opacity-50">
                <span className="material-symbols-outlined text-[20px]">bolt</span>
                {addingCart ? '...' : `Buy Now · ${new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(salePrice ?? basePrice)}`}
              </button>
            </div>

            {/* Wishlist */}
            <button type="button" onClick={toggleWishlist} disabled={wishlistUpdating} aria-pressed={wishlisted}
              className="flex items-center justify-center gap-space-xs text-on-surface-variant hover:text-primary transition-colors text-body-sm font-semibold disabled:opacity-50 disabled:cursor-wait">
              <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: wishlisted ? "'FILL' 1" : "'FILL' 0" }}>favorite</span>
              {wishlistUpdating ? 'Updating wishlist…' : wishlisted ? 'Saved to Wishlist' : 'Save to Wishlist'}
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

            {/* Verified legal product declarations */}
            {product.declarations_verified === true && (
              <section className="rounded-xl border border-outline-variant/40 bg-surface-container-low p-4 space-y-2">
                <h3 className="text-label-md font-semibold uppercase tracking-wide text-on-surface">Product & package declarations</h3>
                {product.generic_product_name && <p className="text-sm text-on-surface-variant"><strong>Product:</strong> {product.generic_product_name}</p>}
                {product.mrp_inr !== null && product.mrp_inr !== undefined && <p className="text-sm text-on-surface-variant"><strong>MRP:</strong> {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(Number(product.mrp_inr))}</p>}
                {product.country_of_origin && <p className="text-sm text-on-surface-variant"><strong>Country of origin:</strong> {product.country_of_origin}</p>}
                {product.manufacturer_name && <p className="text-sm text-on-surface-variant"><strong>Manufacturer:</strong> {product.manufacturer_name}</p>}
                {product.packer_name && <p className="text-sm text-on-surface-variant"><strong>Packer:</strong> {product.packer_name}</p>}
                {product.importer_name && <p className="text-sm text-on-surface-variant"><strong>Importer:</strong> {product.importer_name}</p>}
                {product.consumer_care_details && <p className="text-sm text-on-surface-variant whitespace-pre-line"><strong>Consumer care:</strong> {product.consumer_care_details}</p>}
              </section>
            )}

            {/* Description */}
            {product.description && (
              <div className="bg-surface-container-low rounded-DEFAULT p-space-md">
                <h4 className="text-label-md font-semibold text-on-surface-variant uppercase tracking-[0.04em] mb-space-xs">About This Product</h4>
                <p className="text-body-md text-on-surface-variant leading-relaxed">{product.description}</p>
              </div>
            )}

            <section id="customer-reviews" className="scroll-mt-28 border-t border-outline-variant/30 pt-space-lg">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div><p className="text-label-badge font-bold uppercase tracking-widest text-secondary">Customer feedback</p><h2 className="mt-1 text-title-lg font-semibold text-primary">Reviews & ratings</h2></div>
                <span className="text-sm text-on-surface-variant">{Number(product.review_count || 0)} reviews · {Number(product.avg_rating || 0).toFixed(1)} / 5</span>
              </div>
              <div className="mt-4 space-y-3">
                {(product.reviews || []).map((review: any) => <article key={review.id} className="rounded-xl border border-outline-variant/40 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2"><div className="flex items-center gap-1 text-amber-500">{[1,2,3,4,5].map(star => <span key={star} className="material-symbols-outlined text-[16px]" style={{fontVariationSettings: star <= Number(review.rating) ? "'FILL' 1" : "'FILL' 0"}}>star</span>)}</div><span className="text-xs text-on-surface-variant">{review.created_at ? new Date(review.created_at).toLocaleDateString('en-IN') : ''}</span></div>
                  {review.title && <h3 className="mt-2 text-sm font-semibold text-primary">{review.title}</h3>}
                  <p className="mt-1 text-sm leading-6 text-on-surface-variant">{review.body}</p><p className="mt-2 text-xs font-semibold text-on-surface">{review.user_name || 'STEPUP customer'}</p>
                </article>)}
                {!product.reviews?.length && <p className="rounded-xl bg-surface-container-low p-4 text-sm text-on-surface-variant">No approved reviews yet. Be the first to share your experience.</p>}
              </div>
              <form onSubmit={submitReview} className="mt-5 rounded-2xl bg-surface-container-low p-4 sm:p-5">
                <h3 className="text-sm font-semibold text-primary">Write a review</h3>
                <p className="mt-1 text-xs text-on-surface-variant">Your review is checked before appearing publicly.</p>
                <div className="mt-3 flex items-center gap-1" role="radiogroup" aria-label="Choose rating">
                  {[1,2,3,4,5].map(star => <button key={star} type="button" role="radio" aria-checked={reviewRating === star} aria-label={`${star} star${star > 1 ? 's' : ''}`} onClick={() => setReviewRating(star)} className="rounded p-1 text-amber-500 transition hover:scale-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"><span className="material-symbols-outlined text-2xl" style={{fontVariationSettings: star <= reviewRating ? "'FILL' 1" : "'FILL' 0"}}>star</span></button>)}
                  <span className="ml-2 text-xs text-on-surface-variant">{reviewRating ? `${reviewRating} out of 5` : 'Select a rating'}</span>
                </div>
                <input value={reviewTitle} onChange={event => setReviewTitle(event.target.value)} maxLength={255} placeholder="Review title (optional)" className="input-field mt-3 w-full" />
                <textarea value={reviewBody} onChange={event => setReviewBody(event.target.value)} maxLength={3000} rows={4} placeholder="What did you think about the fit, comfort and quality?" className="input-field mt-3 w-full resize-y" />
                <button type="submit" disabled={reviewSubmitting || !reviewRating} className="btn-primary mt-3 disabled:opacity-50">{reviewSubmitting ? 'Submitting…' : 'Submit review'}</button>
              </form>
            </section>

            {/* Trust row */}
            <div className="grid grid-cols-3 gap-space-sm">
              {[
                { icon: 'verified', label: 'Product details', desc: 'Catalogue information' },
                { icon: 'replay', label: 'Returns', desc: 'See checkout details' },
                { icon: 'local_shipping', label: 'Delivery', desc: 'See checkout details' },
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
      <SizeGuideModal isOpen={sizeGuideOpen} onClose={() => setSizeGuideOpen(false)} />
    </div>
  );
}
