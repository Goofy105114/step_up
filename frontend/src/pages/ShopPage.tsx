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
  const [searchDraft, setSearchDraft] = useState(searchParams.get('search') || '');
  const [search, setSearch] = useState(searchParams.get('search')?.trim() || '');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [page, setPage] = useState(1);
  const [allProducts, setAllProducts] = useState<any[]>([]);

  const priceRangeInvalid = minPrice !== '' && maxPrice !== '' && Number(minPrice) > Number(maxPrice);

  useEffect(() => {
    setCategory(paramCategory || '');
    setPage(1);
    setAllProducts([]);
  }, [paramCategory]);

  useEffect(() => {
    const nextSearch = searchParams.get('search') || '';
    setSearchDraft(nextSearch);
    setSearch(nextSearch.trim());
  }, [searchParams]);

  useEffect(() => {
    setPage(1);
    setAllProducts([]);
  }, [category, sort, search, minPrice, maxPrice]);

  const resetFilters = () => {
    setCategory('');
    setSort('');
    setSearchDraft('');
    setSearch('');
    setMinPrice('');
    setMaxPrice('');
    setPage(1);
    setAllProducts([]);
  };

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

  const { data, isFetching, isError, refetch } = useQuery<{ data: any[]; pagination: { pages: number; total: number } }>({
    queryKey: ['products', 'shop', category, sort, search, minPrice, maxPrice, page],
    queryFn: () => api.get(`/products?${buildQuery()}`).then(r => r.data),
    enabled: !priceRangeInvalid,
  });

  useEffect(() => {
    if (!data?.data) return;
    setAllProducts(prev => {
      if (page === 1) return data.data;
      const productsById = new Map([...prev, ...data.data].map(product => [product.id, product]));
      return Array.from(productsById.values());
    });
  }, [data, page]);

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
                <button onClick={resetFilters} className="text-label-badge font-bold uppercase tracking-[0.06em] text-secondary hover:underline">Reset All</button>
              </div>

              {/* Search */}
              <div className="mb-space-md">
                <label className="label" htmlFor="shop-search">Search</label>
                <form onSubmit={e => { e.preventDefault(); setSearch(searchDraft.trim()); setPage(1); setAllProducts([]); }}>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px] pointer-events-none">search</span>
                    <input id="shop-search" type="search" placeholder="Search products..." value={searchDraft} onChange={e => setSearchDraft(e.target.value)}
                      className="input-field pl-10 h-11 text-body-sm" />
                  </div>
                  <button type="submit" className="btn-outline mt-2 w-full py-2 text-body-sm">Search products</button>
                </form>
              </div>

              {/* Price range */}
              <div className="mb-space-md">
                <label className="label">Price range (₹)</label>
                <div className="grid grid-cols-2 gap-2">
                  <input type="number" min="0" inputMode="numeric" aria-label="Minimum price in rupees" placeholder="Min" value={minPrice} onChange={e => setMinPrice(e.target.value)} className="input-field h-10 text-body-sm" />
                  <input type="number" min="0" inputMode="numeric" aria-label="Maximum price in rupees" placeholder="Max" value={maxPrice} onChange={e => setMaxPrice(e.target.value)} className="input-field h-10 text-body-sm" />
                </div>
                {priceRangeInvalid && <p role="alert" className="mt-2 text-xs text-error">Maximum price must be greater than or equal to minimum price.</p>}
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
              {priceRangeInvalid ? (
                <div role="alert" className="rounded-lg border border-error/30 bg-surface-container-low p-space-xl text-center">
                  <h3 className="text-title-lg font-semibold text-primary mb-2">Check your price range</h3>
                  <p className="text-body-sm text-on-surface-variant">Enter a maximum price that is at least the minimum price.</p>
                </div>
              ) : isError ? (
                <div role="alert" className="rounded-lg border border-error/30 bg-surface-container-low p-space-xl text-center">
                  <span className="material-symbols-outlined text-[40px] text-error mb-2">cloud_off</span>
                  <h3 className="text-headline-sm font-semibold text-primary mb-2">We couldn't load the collection</h3>
                  <p className="text-body-md text-on-surface-variant mb-space-md">Your filters are still here. Check your connection and try again.</p>
                  <button onClick={() => refetch()} disabled={isFetching} className="btn-primary">{isFetching ? 'Retrying…' : 'Try again'}</button>
                </div>
              ) : allProducts.length === 0 && !isFetching ? (
                <div className="text-center py-24">
                  <span className="material-symbols-outlined text-[64px] text-outline-variant block mb-space-lg">search_off</span>
                  <h3 className="text-headline-sm font-semibold text-primary mb-space-sm">No products found</h3>
                  <p className="text-body-md text-on-surface-variant mb-space-lg">Try adjusting your filters or search term</p>
                  <button onClick={resetFilters} className="btn-primary">Clear Filters</button>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-space-md md:gap-space-lg">
                  {allProducts.map((product: any) => <ProductCard key={product.id} product={product} />)}
                </div>
              )}

              {isFetching && allProducts.length === 0 && !priceRangeInvalid && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-space-md md:gap-space-lg">
                  {Array(6).fill(0).map((_, i) => <div key={i} className="rounded-DEFAULT bg-surface-container-low animate-pulse aspect-[4/5]" />)}
                </div>
              )}

              {hasMore && !isError && (
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
