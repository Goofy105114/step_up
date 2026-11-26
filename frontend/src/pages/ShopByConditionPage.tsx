import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import ProductCard from '../components/products/ProductCard';
import api from '../lib/api';

type Category = {
  id: string;
  name: string;
  slug: string;
};

type Product = {
  id: string;
  name: string;
  slug: string;
};

export default function ShopByConditionPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedTag, setSelectedTag] = useState(searchParams.get('tag') || '');
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || '');

  useEffect(() => {
    setSelectedTag(searchParams.get('tag') || '');
    setSelectedCategory(searchParams.get('category') || '');
  }, [searchParams]);

  const { data: tagsData, isLoading: tagsLoading, isError: tagsError, refetch: refetchTags } = useQuery({
    queryKey: ['product-tags'],
    queryFn: () => api.get('/products/tags').then(response => response.data),
  });
  const { data: categoriesData, isLoading: categoriesLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get('/categories').then(response => response.data),
  });

  const tags: string[] = useMemo(
    () => Array.isArray(tagsData?.data) ? tagsData.data : [],
    [tagsData],
  );
  const categories: Category[] = Array.isArray(categoriesData?.data) ? categoriesData.data : [];

  const productQuery = useMemo(() => {
    const params = new URLSearchParams({ limit: '12' });
    if (selectedTag) params.set('tags', selectedTag);
    if (selectedCategory) params.set('category', selectedCategory);
    return params.toString();
  }, [selectedTag, selectedCategory]);

  const {
    data: productsData,
    isLoading: productsLoading,
    isFetching: productsFetching,
    isError: productsError,
    refetch: refetchProducts,
  } = useQuery({
    queryKey: ['products', 'condition-discovery', selectedTag, selectedCategory],
    queryFn: () => api.get(`/products?${productQuery}`).then(response => response.data),
  });

  const products: Product[] = Array.isArray(productsData?.data) ? productsData.data : [];
  const activeCategory = categories.find(category => category.slug === selectedCategory);
  const activeTagLabel = selectedTag.replace(/[-_]/g, ' ');
  const hasFilters = Boolean(selectedTag || selectedCategory);

  const updateFilters = (tag: string, category: string) => {
    setSelectedTag(tag);
    setSelectedCategory(category);
    const next = new URLSearchParams();
    if (tag) next.set('tag', tag);
    if (category) next.set('category', category);
    setSearchParams(next, { replace: true });
  };

  return (
    <main className="min-h-screen bg-[#f8f8f5] text-on-surface">
      <section className="border-b border-[#e4e9e3] bg-[#eef5f0]">
        <div className="container-site py-8 md:py-12">
          <nav aria-label="Breadcrumb" className="mb-7 flex flex-wrap items-center gap-2 text-xs text-on-surface-variant">
            <Link to="/" className="hover:text-primary">Home</Link>
            <span aria-hidden="true">/</span>
            <span className="font-semibold text-primary">Shop by condition</span>
          </nav>
          <div className="max-w-3xl">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-secondary">STEPUP catalogue discovery</p>
            <h1 className="mt-3 text-3xl font-semibold leading-tight tracking-[-0.035em] text-primary md:text-[2.75rem]">
              Find supportive footwear for the way you move.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-on-surface-variant md:text-base">
              Explore available footwear using the support and fit tags maintained in the STEPUP catalogue. Product details, availability and prices are loaded from the live store.
            </p>
          </div>
          <div className="mt-7 flex flex-wrap items-center gap-2">
            <span className="mr-1 text-[10px] font-bold uppercase tracking-[0.12em] text-on-surface-variant">Browse tags</span>
            <button
              type="button"
              onClick={() => updateFilters('', selectedCategory)}
              aria-pressed={!selectedTag}
              className={`rounded-full border px-4 py-2 text-xs font-semibold transition ${!selectedTag ? 'border-primary bg-primary text-white' : 'border-[#d5dfd7] bg-white text-on-surface-variant hover:border-primary hover:text-primary'}`}
            >
              All tags
            </button>
            {tags.map(tag => (
              <button
                key={tag}
                type="button"
                onClick={() => updateFilters(tag === selectedTag ? '' : tag, selectedCategory)}
                aria-pressed={selectedTag === tag}
                className={`rounded-full border px-4 py-2 text-xs font-semibold capitalize transition ${selectedTag === tag ? 'border-primary bg-primary text-white' : 'border-[#d5dfd7] bg-white text-on-surface-variant hover:border-primary hover:text-primary'}`}
              >
                {tag.replace(/[-_]/g, ' ')}
              </button>
            ))}
          </div>
          {tagsError && (
            <div role="alert" className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              <span>Catalogue tags could not be loaded. You can still browse all available products.</span>
              <button type="button" onClick={() => refetchTags()} className="font-semibold underline">Retry</button>
            </div>
          )}
          {tagsLoading && <p className="mt-4 text-xs text-on-surface-variant">Loading catalogue tags…</p>}
        </div>
      </section>

      <section className="container-site py-9 md:py-12">
        <div className="grid gap-7 lg:grid-cols-[230px_minmax(0,1fr)]">
          <aside className="h-fit rounded-2xl border border-[#e4e9e3] bg-white p-5 shadow-[0_5px_24px_rgba(19,61,49,0.04)]">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-bold text-primary">Browse collections</h2>
              {hasFilters && <button type="button" onClick={() => updateFilters('', '')} className="text-[10px] font-bold uppercase tracking-wide text-secondary hover:underline">Reset</button>}
            </div>
            <div className="mt-4 border-t border-[#edf0eb] pt-4">
              <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.13em] text-on-surface-variant">Product category</p>
              {categoriesLoading ? (
                <div className="space-y-2">{[1, 2, 3].map(item => <div key={item} className="h-8 animate-pulse rounded-lg bg-[#f1f4f0]" />)}</div>
              ) : categories.length > 0 ? (
                <div className="space-y-1">
                  <button type="button" onClick={() => updateFilters(selectedTag, '')} aria-pressed={!selectedCategory} className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-xs transition ${!selectedCategory ? 'bg-[#eaf3ed] font-bold text-primary' : 'text-on-surface-variant hover:bg-[#f5f7f4]'}`}>
                    <span>All categories</span><span aria-hidden="true">›</span>
                  </button>
                  {categories.map(category => (
                    <button key={category.id} type="button" onClick={() => updateFilters(selectedTag, category.slug)} aria-pressed={selectedCategory === category.slug} className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-xs capitalize transition ${selectedCategory === category.slug ? 'bg-[#eaf3ed] font-bold text-primary' : 'text-on-surface-variant hover:bg-[#f5f7f4]'}`}>
                      <span>{category.name}</span><span aria-hidden="true">›</span>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-xs leading-5 text-on-surface-variant">Categories will appear here when they are available in the catalogue.</p>
              )}
            </div>
            <div className="mt-5 border-t border-[#edf0eb] pt-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.13em] text-on-surface-variant">Need help choosing?</p>
              <p className="mt-2 text-xs leading-5 text-on-surface-variant">Share your preferences in the fit experience and review the products currently available.</p>
              <Link to="/find-your-fit" className="mt-3 inline-flex items-center gap-2 text-xs font-bold text-primary hover:underline">Take the fit assessment <span aria-hidden="true">→</span></Link>
            </div>
          </aside>

          <div className="min-w-0">
            <div className="mb-5 flex flex-col justify-between gap-3 border-b border-[#e4e9e3] pb-4 sm:flex-row sm:items-end">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-secondary">Current catalogue</p>
                <h2 className="mt-1 text-2xl font-semibold capitalize tracking-tight text-primary">
                  {activeCategory?.name || (selectedTag ? activeTagLabel : 'All supportive footwear')}
                </h2>
                <p className="mt-1 text-xs text-on-surface-variant">
                  {productsData ? `${products.length} products returned by the catalogue` : 'Products are loaded directly from the STEPUP store'}
                </p>
              </div>
              {hasFilters && <button type="button" onClick={() => updateFilters('', '')} className="self-start text-xs font-semibold text-secondary hover:underline sm:self-auto">Clear filters</button>}
            </div>

            {productsError ? (
              <div role="alert" className="rounded-2xl border border-red-200 bg-white p-8 text-center">
                <span className="material-symbols-outlined text-4xl text-red-500" aria-hidden="true">cloud_off</span>
                <h3 className="mt-3 text-lg font-semibold text-primary">We couldn't load this collection</h3>
                <p className="mt-2 text-sm text-on-surface-variant">Your selected filters are still here. Please try again.</p>
                <button type="button" onClick={() => refetchProducts()} disabled={productsFetching} className="btn-primary mt-5">{productsFetching ? 'Retrying…' : 'Try again'}</button>
              </div>
            ) : productsLoading ? (
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                {[1, 2, 3, 4, 5, 6].map(item => <div key={item} className="aspect-[4/5] animate-pulse rounded-2xl bg-[#e9eee8]" />)}
              </div>
            ) : products.length > 0 ? (
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-5">
                {products.map((product: any) => <ProductCard key={product.id} product={product} />)}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-[#d5dfd7] bg-white px-6 py-16 text-center">
                <span className="material-symbols-outlined text-5xl text-[#9aaca1]" aria-hidden="true">inventory_2</span>
                <h3 className="mt-3 text-lg font-semibold text-primary">No matching products right now</h3>
                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-on-surface-variant">There are no active products for this selection. Try another catalogue tag or category.</p>
                <button type="button" onClick={() => updateFilters('', '')} className="btn-primary mt-5">View all products</button>
              </div>
            )}
          </div>
        </div>

        <p className="mt-10 border-t border-[#e4e9e3] pt-5 text-xs leading-6 text-on-surface-variant">
          Catalogue tags describe how products are organised in the store. They are not a medical diagnosis or a treatment recommendation. For persistent foot pain or a medical concern, consult a qualified healthcare professional.
        </p>
      </section>

      <section className="bg-[#e8f1eb] py-10 md:py-14">
        <div className="container-site flex flex-col items-start justify-between gap-6 rounded-2xl md:flex-row md:items-center">
          <div className="max-w-2xl">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-secondary">Personalised fit experience</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-primary md:text-3xl">Not sure which style to explore?</h2>
            <p className="mt-2 text-sm leading-6 text-on-surface-variant">Answer a few questions about your fit preferences and everyday routine before browsing the available collection.</p>
          </div>
          <Link to="/find-your-fit" className="btn-primary shrink-0 px-6 py-3.5">Explore your fit <span aria-hidden="true">→</span></Link>
        </div>
      </section>
    </main>
  );
}
