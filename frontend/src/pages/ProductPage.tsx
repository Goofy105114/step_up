import { useState } from 'react';
import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Heart, ShoppingBag, Star, Truck, RotateCcw, Shield, Share2, Minus, Plus, ChevronDown } from 'lucide-react';
import api from '../lib/api';
import { useCartStore } from '../store/cartStore';
import { useAuthStore } from '../store/authStore';
import { formatPrice, getDiscountPercent } from '../lib/formatters';
import { setSeoTags, setJsonLd } from '../lib/seo';
import toast from 'react-hot-toast';
import ProductCard from '../components/products/ProductCard';
import SizeGuideModal from '../components/products/SizeGuideModal';

export default function ProductPage() {
  const { slug } = useParams<{ slug: string }>();
  const [selColor, setSelColor] = useState('');
  const [selSize, setSelSize] = useState('');
  const [imgIdx, setImgIdx] = useState(0);
  const [qty, setQty] = useState(1);
  const [openTab, setOpenTab] = useState<string | null>('description');
  const [wishlisted, setWishlisted] = useState(false);
  const [showSizeGuide, setShowSizeGuide] = useState(false);
  const { addItem } = useCartStore();
  const { user } = useAuthStore();

  const { data: product, isLoading, isError } = useQuery({
    queryKey: ['product', slug],
    queryFn: () => api.get(`/products/${slug}`).then((r) => r.data.data),
  });
  const { data: related } = useQuery({
    queryKey: ['related', product?.category_id],
    enabled: !!product?.category_id,
    queryFn: () => api.get(`/products?category=${product.category_slug}&limit=4`).then((r) => r.data),
  });

  // Set SEO tags
  useEffect(() => {
    if (product) {
      setSeoTags(
        product.name,
        product.short_description || product.description?.substring(0, 160),
        product.images?.[0]?.image_url,
        window.location.href
      );

      // JSON-LD structured data
      setJsonLd({
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: product.name,
        description: product.description,
        image: product.images?.map((i: any) => i.image_url),
        brand: { '@type': 'Brand', name: 'StepUp' },
        offers: {
          '@type': 'Offer',
          url: window.location.href,
          priceCurrency: 'INR',
          price: product.sale_price || product.base_price,
          availability: product.stock_qty > 0 ? 'InStock' : 'OutOfStock',
        },
        aggregateRating: product.avg_rating ? {
          '@type': 'AggregateRating',
          ratingValue: product.avg_rating,
          reviewCount: product.review_count,
        } : undefined,
      });
    }
  }, [product]);

  if (isLoading) return (
    <div className="container-site py-12 grid md:grid-cols-2 gap-12 animate-pulse">
      <div className="space-y-3">
        <div className="skeleton aspect-square" />
        <div className="grid grid-cols-5 gap-2">{Array(5).fill(0).map((_,i)=><div key={i} className="skeleton aspect-square"/>)}</div>
      </div>
      <div className="space-y-5">
        {[8,4,32,32,12,12,14,14].map((w,i)=><div key={i} className={`skeleton h-${i===0?8:i<3?4:3} w-${w > 20 ? 'full' : w+'/'+(w+10)}`}/>)}
      </div>
    </div>
  );
  if (isError || !product) return (
    <div className="container-site py-24 text-center">
      <h2 className="text-xl font-bold uppercase tracking-widest mb-4">Product Not Found</h2>
      <Link to="/shop" className="btn-primary">Back to Shop</Link>
    </div>
  );

  const price = product.sale_price || product.base_price;
  const colors = [...new Map((product.variants || []).map((v: any) => [v.color, v])).values()] as any[];
  const sizesForColor = selColor
    ? (product.variants || []).filter((v: any) => v.color === selColor)
    : (product.variants || []);
  const selVariant = (product.variants || []).find((v: any) => v.color === selColor && v.size === selSize) as any;
  const inStock = selVariant ? selVariant.stock_qty > 0 : true;

  const handleAdd = async () => {
    if (!user) { toast.error('Please sign in'); return; }
    if (!selColor) { toast.error('Please select a colour'); return; }
    if (!selSize) { toast.error('Please select a size'); return; }
    if (!selVariant) { toast.error('Variant unavailable'); return; }
    await addItem(product.id, selVariant.id, qty);
  };

  const handleWishlist = async () => {
    if (!user) { toast.error('Please sign in'); return; }
    try {
      if (wishlisted) { await api.delete(`/wishlist/${product.id}`); setWishlisted(false); }
      else { await api.post('/wishlist', { product_id: product.id }); setWishlisted(true); toast.success('Added to wishlist ♥'); }
    } catch { /* handled */ }
  };

  const relatedProds = related?.data?.filter((p: any) => p.slug !== slug) || [];

  return (
    <div className="bg-white">
      {/* Breadcrumb */}
      <div className="bg-gray-50 border-b border-gray-200">
        <div className="container-site py-4 text-xs text-gray-500 flex items-center gap-2 flex-wrap">
          <Link to="/" className="hover:text-brand-500">Home</Link><span>/</span>
          <Link to="/shop" className="hover:text-brand-500">Shop</Link><span>/</span>
          {product.category_name && (
            <><Link to={`/shop/${product.category_slug}`} className="hover:text-brand-500">{product.category_name}</Link><span>/</span></>
          )}
          <span className="text-gray-900 font-semibold">{product.name}</span>
        </div>
      </div>

      <div className="container-site py-10">
        <div className="grid md:grid-cols-2 gap-12 lg:gap-20">
          {/* Images */}
          <div className="space-y-3">
            <div className="border border-gray-100 overflow-hidden bg-gray-50 aspect-square">
              {product.images?.[imgIdx]?.url ? (
                <img src={product.images[imgIdx].url} alt={product.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center"><ShoppingBag size={60} className="text-gray-200" /></div>
              )}
            </div>
            {product.images?.length > 1 && (
              <div className="grid grid-cols-5 gap-2">
                {product.images.map((img: any, i: number) => (
                  <button key={i} onClick={() => setImgIdx(i)}
                    className={`aspect-square border-2 overflow-hidden transition-all ${imgIdx === i ? 'border-gray-900' : 'border-gray-100 hover:border-gray-300'}`}>
                    <img src={img.url} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Details */}
          <div className="space-y-5">
            {product.category_name && (
              <Link to={`/shop/${product.category_slug}`}
                className="text-xs uppercase tracking-[0.3em] font-semibold text-brand-500 hover:text-brand-700">
                {product.category_name}
              </Link>
            )}
            <div className="flex items-start justify-between gap-4">
              <h1 className="font-display text-3xl md:text-4xl font-bold text-gray-900 leading-tight">{product.name}</h1>
              <button onClick={() => { navigator.clipboard.writeText(window.location.href); toast.success('Link copied!'); }}
                className="p-2 hover:text-brand-500 transition-colors mt-1 shrink-0">
                <Share2 size={18} />
              </button>
            </div>

            {/* Stars */}
            {product.review_count > 0 && (
              <div className="flex items-center gap-2">
                <div className="flex gap-0.5">
                  {[1,2,3,4,5].map((s) => (
                    <Star key={s} size={14} className={s <= Math.round(product.avg_rating) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200 fill-gray-200'} />
                  ))}
                </div>
                <span className="text-xs text-gray-500">({product.review_count} reviews)</span>
              </div>
            )}

            {/* Price */}
            <div className="flex items-center gap-3 py-3 border-y border-gray-100">
              <span className="text-3xl font-bold text-gray-900">{formatPrice(price)}</span>
              {product.sale_price && (
                <>
                  <span className="text-xl text-gray-400 line-through">{formatPrice(product.base_price)}</span>
                  <span className="bg-brand-500 text-white text-xs font-bold px-2 py-0.5">
                    -{getDiscountPercent(product.base_price, product.sale_price)}%
                  </span>
                </>
              )}
            </div>

            {product.short_description && (
              <p className="text-sm text-gray-500 leading-relaxed">{product.short_description}</p>
            )}

            {/* Color */}
            {colors.length > 0 && (
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-gray-700 mb-3">
                  Colour: <span className="font-normal text-gray-500 normal-case tracking-normal">{selColor || '—'}</span>
                </p>
                <div className="flex flex-wrap gap-2">
                  {colors.map((v: any) => (
                    <button key={v.color} onClick={() => {
                      setSelColor(v.color);
                      setSelSize('');
                      // swap to image matching this colour if available
                      const colourImgIdx = (product.images || []).findIndex(
                        (img: any) => img.alt_text?.toLowerCase().includes(v.color.toLowerCase())
                      );
                      if (colourImgIdx >= 0) setImgIdx(colourImgIdx);
                    }}
                      className={`flex items-center gap-2 px-3 py-2 border text-xs font-medium transition-all ${
                        selColor === v.color ? 'border-gray-900 bg-gray-50' : 'border-gray-200 hover:border-gray-500'}`}>
                      <span className="w-4 h-4 rounded-full border border-gray-300 shrink-0"
                        style={{ backgroundColor: v.color_hex || '#ccc' }} />
                      {v.color}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Size */}
            {sizesForColor.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-bold uppercase tracking-widest text-gray-700">
                    Size: <span className="font-normal text-gray-500 normal-case tracking-normal">{selSize || '—'}</span>
                  </p>
                  <button onClick={() => setShowSizeGuide(true)}
                    className="text-xs text-brand-500 hover:underline uppercase tracking-wider">Size Guide</button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {([...new Set(sizesForColor.map((v: any) => String(v.size)))] as string[]).map((size: string) => {
                    const v = sizesForColor.find((x: any) => x.size === size) as any;
                    const oos = v?.stock_qty === 0;
                    return (
                      <button key={String(size)} disabled={oos} onClick={() => setSelSize(String(size))}
                        className={`min-w-[44px] px-3 py-2 border text-xs font-semibold transition-all relative ${
                          selSize === size ? 'border-gray-900 bg-gray-900 text-white' :
                          oos ? 'border-gray-100 text-gray-300 cursor-not-allowed line-through' :
                          'border-gray-300 hover:border-gray-900 text-gray-700'}`}>
                        {size}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Qty + Add */}
            <div className="flex items-stretch gap-0">
              <div className="flex items-center border border-gray-300">
                <button onClick={() => setQty(Math.max(1, qty - 1))}
                  className="w-11 h-12 flex items-center justify-center hover:bg-gray-50 transition-colors">
                  <Minus size={14} />
                </button>
                <span className="w-12 text-center text-sm font-semibold border-x border-gray-300 py-3">{qty}</span>
                <button onClick={() => setQty(Math.min(selVariant?.stock_qty || 10, qty + 1))}
                  className="w-11 h-12 flex items-center justify-center hover:bg-gray-50 transition-colors">
                  <Plus size={14} />
                </button>
              </div>
              <button onClick={handleAdd} disabled={!inStock}
                className="flex-1 btn-primary flex items-center justify-center gap-2 py-0 h-12">
                <ShoppingBag size={16} />
                {inStock ? 'Add to Cart' : 'Out of Stock'}
              </button>
              <button onClick={handleWishlist}
                className={`w-12 h-12 border flex items-center justify-center transition-all ${
                  wishlisted ? 'bg-brand-500 border-brand-500 text-white' : 'border-gray-300 hover:border-gray-900 text-gray-500'}`}>
                <Heart size={16} fill={wishlisted ? 'currentColor' : 'none'} />
              </button>
            </div>

            {/* Trust badges */}
            <div className="border border-gray-100 divide-y divide-gray-100">
              {[
                { icon: Truck, text: 'Free delivery on orders above ₹599' },
                { icon: RotateCcw, text: '30-day easy returns & exchanges' },
                { icon: Shield, text: '100% genuine product guaranteed' },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-3 px-4 py-3">
                  <Icon size={16} className="text-gray-400 shrink-0" strokeWidth={1.5} />
                  <span className="text-xs text-gray-500">{text}</span>
                </div>
              ))}
            </div>

            {/* Meta */}
            {product.tags?.length > 0 && (
              <p className="text-xs text-gray-400">
                <span className="font-semibold text-gray-600">Tags: </span>
                {product.tags.join(', ')}
              </p>
            )}
          </div>
        </div>

        {/* Accordions */}
        <div className="mt-14 border-t border-gray-200">
          {[
            { key: 'description', label: 'Description' },
            { key: 'material', label: 'Material & Care' },
            { key: 'reviews', label: `Reviews (${product.review_count || 0})` },
            { key: 'shipping', label: 'Shipping & Returns' },
          ].map((tab) => (
            <div key={tab.key} className="border-b border-gray-200">
              <button onClick={() => setOpenTab(openTab === tab.key ? null : tab.key)}
                className="w-full flex items-center justify-between py-5 text-left">
                <span className="text-xs font-bold uppercase tracking-widest text-gray-900">{tab.label}</span>
                <ChevronDown size={16} className={`text-gray-400 transition-transform duration-200 ${openTab === tab.key ? 'rotate-180' : ''}`} />
              </button>
              {openTab === tab.key && (
                <div className="pb-6 text-sm text-gray-500 leading-relaxed animate-slide-up">
                  {tab.key === 'description' && <p>{product.description || 'No description available.'}</p>}
                  {tab.key === 'material' && <p>{product.material || 'Premium materials. Care instructions available on the label.'}</p>}
                  {tab.key === 'reviews' && (
                    <div className="space-y-4">
                      {product.reviews?.length ? product.reviews.map((r: any) => (
                        <div key={r.id} className="border border-gray-100 p-4">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <p className="font-semibold text-sm text-gray-900">{r.user_name}</p>
                              {r.title && <p className="text-sm text-gray-700 mt-0.5">{r.title}</p>}
                            </div>
                            <div className="flex gap-0.5">
                              {[1,2,3,4,5].map((s) => (
                                <Star key={s} size={12} className={s <= r.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200 fill-gray-200'} />
                              ))}
                            </div>
                          </div>
                          {r.body && <p className="text-xs text-gray-500 leading-relaxed">{r.body}</p>}
                        </div>
                      )) : <p className="text-gray-400">No reviews yet. Be the first to review this product!</p>}
                    </div>
                  )}
                  {tab.key === 'shipping' && (
                    <div className="space-y-2">
                      <p>✓ Free standard shipping on orders above ₹599</p>
                      <p>✓ Express delivery available (₹149 extra)</p>
                      <p>✓ Delivered in 3–7 business days</p>
                      <p>✓ 30-day hassle-free returns</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Related products */}
        {relatedProds.length > 0 && (
          <div className="mt-16">
            <div className="text-center mb-10">
              <h2 className="inline-flex items-center gap-4 text-xl font-bold uppercase tracking-widest text-gray-900">
                <span className="block w-12 h-px bg-gray-300" />
                Related Products
                <span className="block w-12 h-px bg-gray-300" />
              </h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
              {relatedProds.slice(0,4).map((p: any) => <ProductCard key={p.id} product={p} />)}
            </div>
          </div>
        )}
      </div>

      <SizeGuideModal isOpen={showSizeGuide} onClose={() => setShowSizeGuide(false)} />
    </div>
  );
}
