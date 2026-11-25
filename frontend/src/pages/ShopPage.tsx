import { useState, useEffect } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import ProductCard from '../components/products/ProductCard';

const SORT_OPTIONS = [
  { value: '', label: 'Newest' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'rating', label: 'Rating ▾' },
];

export default function ShopPage() {
  const { category: paramCategory } = useParams<{ category?: string }>();
  const [searchParams] = useSearchParams();
  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get('/categories').then(response => response.data),
  });
  const CATEGORIES = [{ slug: '', label: 'All Footwear' }, ...(categoriesData?.data || []).map((category: any) => ({ slug: category.slug, label: category.name }))];
  const [category, setCategory] = useState(paramCategory || '');
  const [sort, setSort] = useState('');
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [page, setPage] = useState(1);
  const [allProducts, setAllProducts] = useState<any[]>([]);

  useEffect(() => { setCategory(paramCategory || ''); setPage(1); setAllProducts([]); }, [paramCategory]);
  useEffect(() => { setPage(1); setAllProducts([]); }, [category, sort, search, minPrice, maxPrice]);

  const buildQuery = (p = page) => {
    const params: Record<string, string> = { limit: '12', page: String(p) };
    if (category) params.category = category;
    if (search) params.search = search;
    if (minPrice) params.min_price = minPrice;
    if (maxPrice) params.max_price = maxPrice;
    if (sort === 'price_asc') { params.sort = 'price'; params.order = 'asc'; }
    if (sort === 'price_desc') { params.sort = 'price'; params.order = 'desc'; }
    if (sort === 'rating') { params.sort = 'rating'; params.order = 'desc'; }
    return new URLSearchParams(params).toString();
  };

  const { data, isFetching } = useQuery({
    queryKey: ['products', 'shop', category, sort, search, minPrice, maxPrice, page],
    queryFn: () => api.get(`/products?${buildQuery()}`).then(r => r.data),
  } as any);

  useEffect(() => {
    if (!data?.data) return;
    setAllProducts(prev => page === 1 ? data.data : [...prev, ...data.data]);
  }, [data]);

  const hasMore = data?.pagination && page < data.pagination.pages;
  const total = data?.pagination?.total ?? 0;
  const pageTitle = category ? CATEGORIES.find(c => c.slug === category)?.label || category : 'Explore Collection';

  return (
    <div className="bg-surface min-h-screen">
      {/* Hero header */}
      <section className="relative w-full overflow-hidden pb-space-lg">
        <div className="absolute -top-24 right-1/4 w-96 h-96 rounded-full bg-secondary-container/20 blur-3xl pointer-events-none" />
        <div className="container-site">
          <div className="flex items-center gap-space-xs text-on-surface-variant text-body-sm mb-space-sm pt-space-xs">
            <Link to="/" className="hover:text-primary transition-colors">StepUp Lab</Link>
            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            <span className="text-primary font-semibold">{pageTitle}</span>
          </div>
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-space-md mb-space-lg">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-space-xs bg-surface-container px-space-md py-space-xs rounded-full text-label-badge font-bold uppercase tracking-[0.06em] text-primary mb-space-sm">
                <span className="material-symbols-outlined text-[15px] text-secondary">vital_signs</span>
                Explore the collection
              </div>
              <h1 className="text-headline-lg font-semibold text-primary tracking-tight">{pageTitle}</h1>
              {total > 0 && <p className="text-body-md text-on-surface-variant mt-space-xs">Showing {allProducts.length} of {total} products</p>}
            </div>
            <div className="flex items-center gap-space-sm bg-surface-container-lowest p-space-sm rounded-lg shadow-sm">
              <div className="flex items-center gap-space-xs px-space-sm py-space-xs bg-surface-container-low rounded-DEFAULT text-primary">
                <span className="material-symbols-outlined text-[18px]">tune</span>
                <span className="text-label-badge font-bold uppercase">Filters</span>
              </div>
              <div className="flex items-center gap-space-xs px-space-sm py-space-xs bg-surface-container-low rounded-DEFAULT text-secondary">
                <span className="material-symbols-outlined text-[18px]">category</span>
                <span className="text-label-badge font-bold uppercase">Categories</span>
              </div>
            </div>
          </div>

          {/* Category chips */}
          <div className="flex items-center gap-space-xs overflow-x-auto pb-space-sm no-scrollbar">
            {CATEGORIES.map(cat => (
              <button key={cat.slug} onClick={() => setCategory(cat.slug)}
                className={`shrink-0 px-space-lg py-space-sm rounded-full text-label-md font-semibold tracking-[0.04em] transition-all ${
                  category === cat.slug
                    ? 'bg-primary-container text-on-primary shadow-primary'
                    : 'bg-surface-container-low text-on-surface hover:bg-surface-container'
                }`}>
                {cat.label}
                {category === cat.slug && data?.pagination?.total ? ` (${data.pagination.total})` : ''}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Main layout */}
      <section className="w-full pb-space-xl">
        <div className="container-site">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg items-start">

            {/* Sidebar */}
            <aside className="lg:col-span-3 bg-surface-container-low rounded-lg p-space-md shadow-sm sticky top-32">
              <div className="flex items-center justify-between pb-space-sm mb-space-sm">
                <div className="flex items-center gap-space-xs">
                  <span className="material-symbols-outlined text-[18px] text-primary">tune</span>
                  <h2 className="text-title-md font-semibold text-primary">Filters &amp; Specs</h2>
                </div>
                <button onClick={() => { setCategory(''); setSort(''); setSearch(''); setMinPrice(''); setMaxPrice(''); }} className="text-label-badge font-bold uppercase tracking-[0.06em] text-secondary hover:underline">Reset All</button>
              </div>

              {/* Search */}
              <div className="mb-space-md">
                <label className="label">Search</label>
                <form onSubmit={e => { e.preventDefault(); setPage(1); setAllProducts([]); }}>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px] pointer-events-none">search</span>
                    <input type="text" placeholder="Search products..." value={search} onChange={e => setSearch(e.target.value)}
                      className="input-field pl-10 h-11 text-body-sm" />
                  </div>
                </form>
              </div>

              {/* Price range */}
              <div className="mb-space-md">
                <label className="label">Price range (₹)</label>
                <div className="grid grid-cols-2 gap-2">
                  <input type="number" min="0" inputMode="numeric" placeholder="Min" value={minPrice} onChange={e => setMinPrice(e.target.value)} className="input-field h-10 text-body-sm" />
                  <input type="number" min="0" inputMode="numeric" placeholder="Max" value={maxPrice} onChange={e => setMaxPrice(e.target.value)} className="input-field h-10 text-body-sm" />
                </div>
              </div>

              {/* Categories */}
              <div className="mb-space-md">
                <label className="label">Category</label>
                <div className="space-y-1">
                  {CATEGORIES.map(cat => (
                    <button key={cat.slug} onClick={() => setCategory(cat.slug)}
                      className={`w-full flex items-center justify-between px-space-md py-space-xs rounded-full text-body-md transition-all ${
                        category === cat.slug ? 'bg-primary/10 text-primary font-semibold' : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
                      }`}>
                      <span>{cat.label}</span>
                      {category === cat.slug && <span className="material-symbols-outlined text-[16px]">check</span>}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sort */}
              <div>
                <label className="label">Sort By</label>
                <div className="space-y-1">
                  {SORT_OPTIONS.map(opt => (
                    <button key={opt.value} onClick={() => setSort(opt.value)}
                      className={`w-full flex items-center justify-between px-space-md py-space-xs rounded-full text-body-md transition-all ${
                        sort === opt.value ? 'bg-secondary-container text-on-secondary-container font-semibold' : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
                      }`}>
                      <span>{opt.label}</span>
                      {sort === opt.value && <span className="material-symbols-outlined text-[16px]">check</span>}
                    </button>
                  ))}
                </div>
              </div>
            </aside>

            {/* Product grid */}
            <div className="lg:col-span-9">
              {/* Sort bar */}
              <div className="flex items-center justify-between mb-space-md">
                <div className="flex items-center gap-space-xs overflow-x-auto no-scrollbar">
                  {SORT_OPTIONS.map(opt => (
                    <button key={opt.value} onClick={() => setSort(opt.value)}
                      className={`shrink-0 px-space-md py-space-xs rounded-full text-label-md font-semibold tracking-[0.04em] transition-all ${
                        sort === opt.value ? 'bg-primary-container text-on-primary' : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
                      }`}>
                      {opt.label}
                    </button>
                  ))}
                </div>

              </div>

              {/* Grid */}
              {allProducts.length === 0 && !isFetching ? (
                <div className="text-center py-24">
                  <span className="material-symbols-outlined text-[64px] text-outline-variant block mb-space-lg">search_off</span>
                  <h3 className="text-headline-sm font-semibold text-primary mb-space-sm">No products found</h3>
                  <p className="text-body-md text-on-surface-variant mb-space-lg">Try adjusting your filters or search term</p>
                  <button onClick={() => { setCategory(''); setSort(''); setSearch(''); setMinPrice(''); setMaxPrice(''); }} className="btn-primary">Clear Filters</button>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-space-md md:gap-space-lg">
                  {allProducts.map((product: any) => <ProductCard key={product.id} product={product} />)}
                </div>
              )}

              {isFetching && allProducts.length === 0 && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-space-md md:gap-space-lg">
                  {Array(6).fill(0).map((_, i) => <div key={i} className="rounded-DEFAULT bg-surface-container-low animate-pulse aspect-[4/5]" />)}
                </div>
              )}

              {hasMore && (
                <div className="text-center mt-space-xl">
                  <button onClick={() => setPage(p => p + 1)} disabled={isFetching} className="btn-outline px-12 py-space-md text-title-md font-semibold">
                    {isFetching ? 'Loading...' : 'Load More Products'}
                  </button>
                </div>
              )}

              <div className="mt-space-xl rounded-lg bg-gradient-to-r from-primary to-primary-container p-space-xl flex flex-col gap-space-lg md:flex-row md:items-center md:justify-between">
                <div>
                  <span className="text-label-badge font-bold uppercase tracking-[0.06em] text-primary-fixed block mb-1">Find your fit</span>
                  <h3 className="text-headline-sm font-semibold text-on-primary mb-1">Not sure where to start?</h3>
                  <p className="text-body-sm text-on-primary/80">Share your preferences and explore products from the current catalogue.</p>
                </div>
                <Link to="/find-your-fit" className="shrink-0 inline-flex items-center justify-center gap-space-sm bg-on-primary text-primary px-8 py-3.5 rounded-full text-label-md font-semibold hover:bg-primary-fixed transition-all">
                  Find your fit <span aria-hidden="true">→</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
