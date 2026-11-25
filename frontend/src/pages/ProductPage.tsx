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
  const [activeImg, setActiveImg] = useState(0);
  const queryClient = useQueryClient();
  const { data: wishlistData } = useQuery({
    queryKey: ['wishlist'],
    queryFn: () => api.get('/wishlist').then(response => response.data),
    enabled: !!user,
  });
  const wishlisted = wishlistData?.data?.some((item: any) => item.product_id === product?.id) || false;
  const [openSpec, setOpenSpec] = useState<number | null>(null);
  const [sizeGuideOpen, setSizeGuideOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['product', slug],
    queryFn: () => api.get(`/products/${slug}`).then(r => r.data.data),
  });

  const product = data;

  useEffect(() => {
    if (product?.variants?.length) {
      const first = product.variants.find((variant: any) => Number(variant.stock_qty) > 0) || product.variants[0];
      setSelectedColor(first.color);
      setSelectedVariant(first);
    }
  }, [product]);

  const colors = product ? [...new Set<string>(product.variants?.map((v: any) => v.color))] : [];
  const sizesForColor = product ? product.variants?.filter((v: any) => v.color === selectedColor) : [];

  const handleColorSelect = (color: string) => {
    setSelectedColor(color);
    const colorVariants = product.variants.filter((v: any) => v.color === color);
    const v = colorVariants.find((variant: any) => Number(variant.stock_qty) > 0) || colorVariants[0];
    setSelectedVariant(v);
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

  const toggleWishlist = async () => {
    if (!user) { toast.error('Please sign in'); return; }
    try {
      if (wishlisted) await api.delete(`/wishlist/${product.id}`);
      else await api.post('/wishlist', { product_id: product.id });
      await queryClient.invalidateQueries({ queryKey: ['wishlist'] });
      toast.success(wishlisted ? 'Removed from wishlist' : 'Saved to wishlist ❤️');
    } catch (e: any) { toast.error(e.response?.data?.message || 'Unable to update wishlist'); }
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
  const hasAvailableStock = product.variants?.some((variant: any) => Number(variant.stock_qty) > 0) || false;
  const basePrice = parseFloat(product.base_price);
  const salePrice = product.sale_price ? parseFloat(product.sale_price) : null;
  const discount = salePrice ? Math.round(((basePrice - salePrice) / basePrice) * 100) : 0;

  const SPECS = [
    { icon: 'arrow_upload_progress', title: 'Product construction', desc: 'See the product description and materials listed for this item.' },
    { icon: 'layers', title: 'Materials & care', desc: 'Refer to the product details for material and care information.' },
    { icon: 'local_shipping', title: 'Delivery & returns', desc: 'Review the current delivery and return information at checkout.' },
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
                <div className="flex min-h-[420px] w-full flex-col items-center justify-center gap-3 text-on-surface-variant">
                  <span className="material-symbols-outlined text-5xl text-outline-variant">image</span>
                  <span className="text-sm">No product images available</span>
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
              <button onClick={addToCart} disabled={addingCart || (selectedVariant && selectedVariant.stock_qty < 1)}
                className="flex-1 h-14 bg-surface-container-high text-on-surface rounded-full text-label-md font-semibold flex items-center justify-center gap-space-xs hover:bg-surface-container-highest transition-all border border-outline-variant disabled:opacity-50">
                <span className="material-symbols-outlined text-[20px]">shopping_bag</span>
                {addingCart ? 'Adding...' : 'Add to Bag'}
              </button>
              <button onClick={() => addToCart(true)} disabled={addingCart || (selectedVariant && selectedVariant.stock_qty < 1)}
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
