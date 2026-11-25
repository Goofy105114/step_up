import { useState } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import ProductCard from '../components/products/ProductCard';

const sortOptions = [
  { label: 'Newest', value: 'created_at:desc' },
  { label: 'Price: Low → High', value: 'price:asc' },
  { label: 'Price: High → Low', value: 'price:desc' },
  { label: 'Top Rated', value: 'rating:desc' },
];

const priceRanges = [
  { label: 'All Prices', min: '', max: '' },
  { label: 'Under ₹1,000', min: '0', max: '1000' },
  { label: '₹1,000 – ₹2,500', min: '1000', max: '2500' },
  { label: '₹2,500 – ₹5,000', min: '2500', max: '5000' },
  { label: 'Above ₹5,000', min: '5000', max: '999999' },
];

const categories = [
  { label: "Men's", value: 'mens' },
  { label: "Women's", value: 'womens' },
  { label: "Kids'", value: 'kids' },
  { label: 'Sports', value: 'sports' },
  { label: 'Casual', value: 'casual' },
  { label: 'Formal', value: 'formal' },
  { label: 'Sandals', value: 'sandals' },
];

const catLabels: Record<string, string> = {
  mens: "Men's Footwear", womens: "Women's Footwear", kids: "Kids' Footwear",
  sports: 'Sports & Athletic', casual: 'Casual', formal: 'Formal', sandals: 'Sandals & Slippers',
};

export default function ShopPage() {
  const { category } = useParams();
  const [sp, setSp] = useSearchParams();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const page = parseInt(sp.get('page') || '1');
  const sort = sp.get('sort') || 'created_at:desc';
  const search = sp.get('search') || '';
  const minPrice = sp.get('min_price') || '';
  const maxPrice = sp.get('max_price') || '';
  const featured = sp.get('featured') || '';
  const newArrival = sp.get('new_arrival') || '';
  const bestseller = sp.get('bestseller') || '';
  const [sortKey, sortOrder] = sort.split(':');

  const LIMIT = 12;

  const { data, isLoading } = useQuery({
    queryKey: ['products', category, page, sort, search, minPrice, maxPrice, featured, newArrival, bestseller],
    queryFn: () => {
      const p = new URLSearchParams({
        limit: String(LIMIT), page: String(page), sort: sortKey, order: sortOrder,
        ...(category && { category }),
        ...(search && { search }),
        ...(minPrice && { min_price: minPrice }),
        ...(maxPrice && { max_price: maxPrice }),
        ...(featured && { featured }),
        ...(newArrival && { new_arrival: newArrival }),
        ...(bestseller && { bestseller }),
      });
      return api.get(`/products?${p}`).then((r) => r.data);
    },
  });

  const setParam = (key: string, val: string | null) => {
    const next = new URLSearchParams(sp);
    if (val) next.set(key, val); else next.delete(key);
    next.delete('page');
    setSp(next);
  };

  const title = category ? catLabels[category] || category
    : search ? `Results for "${search}"`
    : featured === 'true' ? 'Featured Products'
    : newArrival === 'true' ? 'New Arrivals'
    : bestseller === 'true' ? 'Bestsellers'
    : 'All Products';

  const totalPages = data?.pagination?.pages || 1;
  const totalProducts = data?.pagination?.total || 0;

  // Active filter chips
  const activeFilters: { label: string; clear: () => void }[] = [];
  if (minPrice || maxPrice) {
    const rangeLabel = priceRanges.find(r => r.min === minPrice && r.max === maxPrice)?.label || 'Custom price';
    activeFilters.push({ label: rangeLabel, clear: () => { setParam('min_price', null); setParam('max_price', null); } });
  }
  if (featured === 'true') activeFilters.push({ label: 'Featured', clear: () => setParam('featured', null) });
  if (newArrival === 'true') activeFilters.push({ label: 'New Arrivals', clear: () => setParam('new_arrival', null) });
  if (bestseller === 'true') activeFilters.push({ label: 'Bestsellers', clear: () => setParam('bestseller', null) });
  if (search) activeFilters.push({ label: `"${search}"`, clear: () => setParam('search', null) });

  return (
    <div className="bg-surface min-h-screen">
      {/* Breadcrumb */}
      <div className="bg-surface-container-low border-b border-outline/10">
        <div className="container-site py-space-md">
          <nav className="flex items-center gap-space-xs text-body-sm text-on-surface-variant">
            <Link to="/" className="hover:text-primary transition-colors">Home</Link>
            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            {category && (
              <>
                <Link to="/shop" className="hover:text-primary transition-colors">Shop</Link>
                <span className="material-symbols-outlined text-[14px]">chevron_right</span>
              </>
            )}
            <span className="text-on-surface font-semibold">{title}</span>
          </nav>
        </div>
      </div>

      <div className="container-site py-space-xl">
        {/* Header row */}
        <div className="flex flex-wrap items-start justify-between gap-space-md mb-space-lg">
          <div>
            <h1 className="text-headline-sm text-on-surface">{title}</h1>
            {!isLoading && (
              <p className="text-body-sm text-on-surface-variant mt-space-xs">
                {totalProducts} {totalProducts === 1 ? 'product' : 'products'} found
              </p>
            )}
          </div>

          {/* Mobile filter toggle */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden btn-outline gap-space-xs"
          >
            <span className="material-symbols-outlined text-[18px]">tune</span>
            Filters
          </button>
        </div>

        {/* Active filter chips */}
        {activeFilters.length > 0 && (
          <div className="flex flex-wrap items-center gap-space-sm mb-space-lg">
            <span className="text-label-md text-on-surface-variant">Active:</span>
            {activeFilters.map((f) => (
              <button
                key={f.label}
                onClick={f.clear}
                className="inline-flex items-center gap-1 px-space-md py-1 rounded-full bg-primary-container text-on-primary text-label-badge hover:bg-primary transition-colors"
              >
                {f.label}
                <span className="material-symbols-outlined text-[14px]">close</span>
              </button>
            ))}
            <button
              onClick={() => setSp({})}
              className="text-body-sm text-on-surface-variant hover:text-error transition-colors underline"
            >
              Clear all
            </button>
          </div>
        )}

        <div className="flex gap-space-xl">
          {/* ── Sidebar ── */}
          <aside className={`w-64 shrink-0 ${sidebarOpen ? 'block' : 'hidden'} lg:block`}>
            <div className="sticky top-24 space-y-space-md">
              {/* Sort */}
              <div className="card p-space-lg">
                <h3 className="text-label-md font-bold text-on-surface mb-space-md flex items-center gap-space-xs">
                  <span className="material-symbols-outlined text-[18px] text-primary">swap_vert</span>
                  Sort By
                </h3>
                <div className="flex flex-wrap gap-space-sm">
                  {sortOptions.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setParam('sort', opt.value)}
                      className={`px-space-md py-1.5 rounded-full text-label-badge transition-all ${
                        sort === opt.value
                          ? 'bg-primary-container text-on-primary'
                          : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Categories */}
              <div className="card p-space-lg">
                <h3 className="text-label-md font-bold text-on-surface mb-space-md flex items-center gap-space-xs">
                  <span className="material-symbols-outlined text-[18px] text-primary">category</span>
                  Category
                </h3>
                <div className="space-y-space-sm">
                  <label className="flex items-center gap-space-sm cursor-pointer group">
                    <input
                      type="radio" name="cat" checked={!category}
                      onChange={() => setSp({})}
                      className="sr-only"
                    />
                    <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${
                      !category ? 'border-primary bg-primary' : 'border-outline-variant group-hover:border-primary'
                    }`}>
                      {!category && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </span>
                    <span className={`text-body-sm transition-colors ${!category ? 'text-primary font-semibold' : 'text-on-surface-variant group-hover:text-on-surface'}`}>
                      All Products
                    </span>
                  </label>
                  {categories.map((cat) => (
                    <label key={cat.value} className="flex items-center gap-space-sm cursor-pointer group">
                      <input
                        type="radio" name="cat" checked={category === cat.value}
                        onChange={() => window.location.href = `/shop/${cat.value}`}
                        className="sr-only"
                      />
                      <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${
                        category === cat.value ? 'border-primary bg-primary' : 'border-outline-variant group-hover:border-primary'
                      }`}>
                        {category === cat.value && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </span>
                      <span className={`text-body-sm transition-colors ${category === cat.value ? 'text-primary font-semibold' : 'text-on-surface-variant group-hover:text-on-surface'}`}>
                        {cat.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Price Range */}
              <div className="card p-space-lg">
                <h3 className="text-label-md font-bold text-on-surface mb-space-md flex items-center gap-space-xs">
                  <span className="material-symbols-outlined text-[18px] text-primary">sell</span>
                  Price Range
                </h3>
                <div className="space-y-space-sm">
                  {priceRanges.map((r) => (
                    <label key={r.label} className="flex items-center gap-space-sm cursor-pointer group">
                      <input
                        type="radio" name="price"
                        checked={minPrice === r.min && maxPrice === r.max}
                        onChange={() => { setParam('min_price', r.min || null); setParam('max_price', r.max || null); }}
                        className="sr-only"
                      />
                      <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${
                        minPrice === r.min && maxPrice === r.max
                          ? 'border-primary bg-primary'
                          : 'border-outline-variant group-hover:border-primary'
                      }`}>
                        {minPrice === r.min && maxPrice === r.max && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </span>
                      <span className={`text-body-sm transition-colors ${
                        minPrice === r.min && maxPrice === r.max ? 'text-primary font-semibold' : 'text-on-surface-variant group-hover:text-on-surface'
                      }`}>
                        {r.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Collections */}
              <div className="card p-space-lg">
                <h3 className="text-label-md font-bold text-on-surface mb-space-md flex items-center gap-space-xs">
                  <span className="material-symbols-outlined text-[18px] text-primary">collections_bookmark</span>
                  Collections
                </h3>
                <div className="space-y-space-sm">
                  {([
                    ['Featured', 'featured', 'star'],
                    ['New Arrivals', 'new_arrival', 'new_releases'],
                    ['Bestsellers', 'bestseller', 'trending_up'],
                  ] as [string, string, string][]).map(([label, key, icon]) => (
                    <label key={key} className="flex items-center gap-space-sm cursor-pointer group">
                      <input
                        type="checkbox" checked={sp.get(key) === 'true'}
                        onChange={(e) => setParam(key, e.target.checked ? 'true' : null)}
                        className="sr-only"
                      />
                      <span className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                        sp.get(key) === 'true' ? 'border-primary bg-primary' : 'border-outline-variant group-hover:border-primary'
                      }`}>
                        {sp.get(key) === 'true' && (
                          <span className="material-symbols-outlined text-white text-[12px]" style={{ fontVariationSettings: "'FILL' 1" }}>check</span>
                        )}
                      </span>
                      <span className="material-symbols-outlined text-[16px] text-on-surface-variant">{icon}</span>
                      <span className={`text-body-sm transition-colors ${sp.get(key) === 'true' ? 'text-primary font-semibold' : 'text-on-surface-variant group-hover:text-on-surface'}`}>
                        {label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Clear */}
              {activeFilters.length > 0 && (
                <button
                  onClick={() => setSp({})}
                  className="w-full btn-outline text-label-badge gap-space-xs"
                >
                  <span className="material-symbols-outlined text-[16px]">filter_alt_off</span>
                  Clear All Filters
                </button>
              )}
            </div>
          </aside>

          {/* ── Main content ── */}
          <div className="flex-1 min-w-0">
            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-space-lg">
                {Array(9).fill(0).map((_, i) => (
                  <div key={i} className="card overflow-hidden animate-pulse">
                    <div className="aspect-[4/5] bg-surface-container" />
                    <div className="p-space-md space-y-space-sm">
                      <div className="h-3 w-1/2 rounded-full bg-surface-container" />
                      <div className="h-4 w-3/4 rounded-full bg-surface-container" />
                      <div className="h-4 w-1/4 rounded-full bg-surface-container" />
                    </div>
                  </div>
                ))}
              </div>
            ) : !data?.data?.length ? (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <div className="w-24 h-24 rounded-full bg-surface-container flex items-center justify-center mb-space-lg">
                  <span className="material-symbols-outlined text-[48px] text-on-surface-variant">search_off</span>
                </div>
                <h3 className="text-headline-sm text-on-surface mb-space-sm">No Products Found</h3>
                <p className="text-body-md text-on-surface-variant mb-space-xl max-w-sm">
                  Try adjusting your filters or search term to discover more products.
                </p>
                <Link to="/shop" className="btn-primary">
                  <span className="material-symbols-outlined text-[18px]">storefront</span>
                  Browse All Products
                </Link>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-space-lg">
                  {data.data.map((p: any) => <ProductCard key={p.id} product={p} />)}
                </div>

                {/* Load more / Pagination */}
                {totalPages > 1 && (
                  <div className="mt-space-xl flex flex-col items-center gap-space-md">
                    {page < totalPages && (
                      <button
                        onClick={() => setParam('page', String(page + 1))}
                        className="btn-primary gap-space-sm"
                      >
                        <span className="material-symbols-outlined text-[18px]">expand_more</span>
                        Load More Products
                      </button>
                    )}
                    <div className="flex items-center gap-space-xs">
                      <button
                        onClick={() => setParam('page', String(page - 1))}
                        disabled={page === 1}
                        className="w-9 h-9 rounded-full bg-surface-container flex items-center justify-center hover:bg-primary-container hover:text-on-primary transition-colors disabled:opacity-30"
                      >
                        <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                      </button>
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                        <button
                          key={p}
                          onClick={() => setParam('page', String(p))}
                          className={`w-9 h-9 rounded-full text-label-md transition-colors ${
                            page === p
                              ? 'bg-primary-container text-on-primary'
                              : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
                          }`}
                        >
                          {p}
                        </button>
                      ))}
                      <button
                        onClick={() => setParam('page', String(page + 1))}
                        disabled={page === totalPages}
                        className="w-9 h-9 rounded-full bg-surface-container flex items-center justify-center hover:bg-primary-container hover:text-on-primary transition-colors disabled:opacity-30"
                      >
                        <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                      </button>
                    </div>
                    <p className="text-body-sm text-on-surface-variant">
                      Page {page} of {totalPages}
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
