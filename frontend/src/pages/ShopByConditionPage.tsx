import { useQueries } from '@tanstack/react-query';
import ProductCard from '../components/products/ProductCard';
import api from '../lib/api';

const CONDITIONS = [
  { tag: 'plantar-fasciitis', title: 'Plantar fascia support', description: 'Explore products tagged for plantar fascia support.' },
  { tag: 'heel-pain', title: 'Heel comfort', description: 'Explore products tagged for heel comfort.' },
  { tag: 'flat-feet', title: 'Flat-foot support', description: 'Explore products tagged for flat-foot support.' },
  { tag: 'arch-support', title: 'Arch support', description: 'Explore products tagged for arch support.' },
  { tag: 'overpronation', title: 'Stability support', description: 'Explore products tagged for stability and overpronation.' },
  { tag: 'metatarsalgia', title: 'Forefoot comfort', description: 'Explore products tagged for forefoot comfort.' },
];

export default function ShopByConditionPage() {
  const results = useQueries({
    queries: CONDITIONS.map(condition => ({
      queryKey: ['products', 'condition', condition.tag],
      queryFn: () => api.get(`/products?tags=${encodeURIComponent(condition.tag)}&limit=4`).then(response => response.data),
    })),
  });

  return (
    <main className="min-h-screen bg-surface">
      <section className="bg-[#e9eee9] py-16 md:py-20">
        <div className="container-site">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-secondary">Shop by need</p>
          <h1 className="mt-3 max-w-3xl text-4xl font-semibold tracking-tight text-primary md:text-5xl">Find footwear for the way you move.</h1>
          <p className="mt-5 max-w-2xl text-base leading-8 text-[#52645d]">Browse products using the support and comfort tags maintained in our catalogue. Product availability comes directly from the STEPUP store.</p>
        </div>
      </section>
      <section className="container-site space-y-14 py-14 md:py-20">
        {CONDITIONS.map((condition, index) => {
          const query = results[index];
          const products = query.data?.data || [];
          return (
            <section key={condition.tag} aria-labelledby={condition.tag}>
              <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
                <div>
                  <h2 id={condition.tag} className="text-2xl font-semibold text-primary md:text-3xl">{condition.title}</h2>
                  <p className="mt-2 text-sm text-on-surface-variant">{condition.description}</p>
                </div>
                <span className="text-xs font-medium text-on-surface-variant">{query.isLoading ? 'Loading catalogue…' : `${products.length} shown`}</span>
              </div>
              {products.length > 0 ? (
                <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
                  {products.map((product: any) => <ProductCard key={product.id} product={product} />)}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-outline-variant bg-white/60 p-7 text-sm text-on-surface-variant">
                  {query.isLoading ? 'Checking the current catalogue…' : 'No products are currently tagged for this need. Please check back as the catalogue is updated.'}
                </div>
              )}
            </section>
          );
        })}
        <p className="border-t border-outline-variant/50 pt-6 text-xs leading-6 text-on-surface-variant">
          Product tags are catalogue information, not a medical diagnosis or treatment recommendation. If you have persistent foot pain or a medical condition, consult a qualified healthcare professional.
        </p>
      </section>
    </main>
  );
}
