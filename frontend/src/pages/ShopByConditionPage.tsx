import { useQueries, useQuery } from '@tanstack/react-query';
import ProductCard from '../components/products/ProductCard';
import api from '../lib/api';

export default function ShopByConditionPage() {
  const { data: tagsData, isLoading: tagsLoading } = useQuery({
    queryKey: ['product-tags'],
    queryFn: () => api.get('/products/tags').then(response => response.data),
  });
  const tags: string[] = tagsData?.data || [];
  const results = useQueries({
    queries: tags.map(tag => ({
      queryKey: ['products', 'tag', tag],
      queryFn: () => api.get(`/products?tags=${encodeURIComponent(tag)}&limit=4`).then(response => response.data),
    })),
  });

  return (
    <main className="min-h-screen bg-surface">
      <section className="bg-[#e9eee9] py-16 md:py-20">
        <div className="container-site">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-secondary">Explore the catalogue</p>
          <h1 className="mt-3 max-w-3xl text-4xl font-semibold tracking-tight text-primary md:text-5xl">Find a style that fits your everyday routine.</h1>
          <p className="mt-5 max-w-2xl text-base leading-8 text-[#52645d]">Browse products using the tags currently maintained in the STEPUP catalogue. Each collection reflects the information attached to available product listings.</p>
        </div>
      </section>
      <section className="container-site space-y-14 py-14 md:py-20">
        {tagsLoading && (
          <div className="rounded-2xl border border-dashed border-outline-variant bg-white/60 p-8 text-center text-sm text-on-surface-variant">Loading catalogue tags…</div>
        )}
        {!tagsLoading && tags.length === 0 && (
          <div className="rounded-2xl border border-dashed border-outline-variant bg-white/60 p-10 text-center">
            <h2 className="text-xl font-semibold text-primary">No catalogue tags available yet</h2>
            <p className="mt-3 text-sm leading-7 text-on-surface-variant">Products will appear here when support and comfort tags have been added to their catalogue records.</p>
          </div>
        )}
        {tags.map((tag, index) => {
          const query = results[index];
          const products = query?.data?.data || [];
          const label = tag.replace(/[-_]/g, ' ');
          return (
            <section key={tag} aria-labelledby={`tag-${index}`}>
              <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
                <div>
                  <h2 id={`tag-${index}`} className="text-2xl font-semibold capitalize text-primary md:text-3xl">{label}</h2>
                  <p className="mt-2 text-sm text-on-surface-variant">Products carrying the “{tag}” catalogue tag.</p>
                </div>
                <span className="text-xs font-medium text-on-surface-variant">{query?.isLoading ? 'Loading products…' : `${products.length} shown`}</span>
              </div>
              {products.length > 0 ? (
                <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
                  {products.map((product: any) => <ProductCard key={product.id} product={product} />)}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-outline-variant bg-white/60 p-7 text-sm text-on-surface-variant">
                  {query?.isLoading ? 'Checking the current catalogue…' : 'No active products currently use this tag.'}
                </div>
              )}
            </section>
          );
        })}
        <p className="border-t border-outline-variant/50 pt-6 text-xs leading-6 text-on-surface-variant">
          Catalogue tags are product discovery labels, not a medical diagnosis or treatment recommendation. If you have persistent foot pain or a medical condition, consult a qualified healthcare professional.
        </p>
      </section>
    </main>
  );
}
