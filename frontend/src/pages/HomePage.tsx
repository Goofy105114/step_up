import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import ProductCard from '../components/products/ProductCard';

type Product = {
  id: string;
  name: string;
  slug: string;
  primary_image?: string;
};

type Category = {
  id: string;
  name: string;
  slug: string;
  description?: string;
  image_url?: string;
  product_count?: number;
};

export default function HomePage() {
  const { data: featured, isLoading: featuredLoading } = useQuery({
    queryKey: ['products', 'featured'],
    queryFn: () => api.get('/products?featured=true&limit=8').then(r => r.data),
  });
  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get('/categories').then(r => r.data),
  });
  const { data: bestsellers } = useQuery({
    queryKey: ['products', 'bestsellers'],
    queryFn: () => api.get('/products?bestseller=true&limit=4').then(r => r.data),
  });
  const { data: newArrivals } = useQuery({
    queryKey: ['products', 'new-arrivals'],
    queryFn: () => api.get('/products?new_arrival=true&limit=4').then(r => r.data),
  });

  const featuredProducts: Product[] = featured?.data || [];
  const categories: Category[] = categoriesData?.data || [];
  const bestsellerProducts = bestsellers?.data || [];
  const newArrivalProducts = newArrivals?.data || [];
  const heroImage = featuredProducts[0]?.primary_image;

  return (
    <main className="bg-surface text-on-surface">
      <section className="relative overflow-hidden bg-[#e9eee9]">
        <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-[#c6d8ce] blur-3xl opacity-70" />
        <div className="container-site relative grid min-h-[560px] grid-cols-1 items-center gap-10 py-16 lg:grid-cols-2 lg:py-20">
          <div className="max-w-2xl">
            <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/15 bg-white/70 px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-primary">
              <span className="h-2 w-2 rounded-full bg-secondary" />
              Comfort that moves with you
            </p>
            <h1 className="max-w-xl text-4xl font-bold leading-[1.08] tracking-tight text-primary md:text-6xl">
              Every step deserves a better foundation.
            </h1>
            <p className="mt-6 max-w-lg text-base leading-8 text-[#52645d] md:text-lg">
              Discover thoughtfully designed footwear with supportive shapes, considered materials and comfort made for everyday movement.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link to="/shop" className="btn-primary px-7 py-4">
                Explore the collection <span aria-hidden="true">→</span>
              </Link>
              <Link to="/find-your-fit" className="btn-outline px-7 py-4">
                Find your fit
              </Link>
            </div>
            <div className="mt-10 flex flex-wrap gap-x-8 gap-y-3 text-sm text-[#52645d]">
              <span className="flex items-center gap-2"><span className="text-primary">✓</span> Support-led designs</span>
              <span className="flex items-center gap-2"><span className="text-primary">✓</span> Everyday versatility</span>
              <span className="flex items-center gap-2"><span className="text-primary">✓</span> Easy online shopping</span>
            </div>
          </div>
          <div className="relative mx-auto w-full max-w-[560px]">
            <div className="absolute inset-8 rounded-full bg-[#c6d8ce] blur-2xl" />
            <div className="relative aspect-[4/3] overflow-hidden rounded-[2rem] bg-[#dce5df] shadow-2xl">
              {heroImage ? (
                <img src={heroImage} alt={featuredProducts[0]?.name || 'StepUp featured footwear'} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-3 text-primary/60">
                  <span className="text-6xl" aria-hidden="true">✳</span>
                  <span className="text-sm font-semibold tracking-wide">STEPUP</span>
                </div>
              )}
            </div>
            <div className="absolute -bottom-5 left-5 rounded-2xl bg-white px-5 py-4 shadow-xl sm:left-0">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-secondary">Made for daily movement</p>
              <p className="mt-1 text-lg font-semibold text-primary">Find your everyday comfort</p>
            </div>
          </div>
        </div>
      </section>

      <section className="container-site py-16 md:py-20">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-secondary">Explore STEPUP</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-primary md:text-4xl">Shop the collection</h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-on-surface-variant">Browse the categories currently available in our store.</p>
          </div>
          <Link to="/shop" className="hidden text-sm font-semibold text-primary hover:underline sm:inline">View all products →</Link>
        </div>
        {categories.length > 0 ? (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {categories.slice(0, 8).map(category => (
              <Link key={category.id} to={`/shop/${category.slug}`} className="group overflow-hidden rounded-2xl border border-black/5 bg-white transition hover:-translate-y-1 hover:shadow-lg">
                <div className="aspect-[5/4] overflow-hidden bg-[#eef2ee]">
                  {category.image_url ? <img src={category.image_url} alt={category.name} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" /> : <div className="flex h-full items-center justify-center text-4xl text-primary/30" aria-hidden="true">✳</div>}
                </div>
                <div className="flex items-center justify-between gap-2 p-4">
                  <div>
                    <h3 className="font-semibold text-primary">{category.name}</h3>
                    <p className="mt-1 text-xs text-on-surface-variant">{Number(category.product_count || 0)} products</p>
                  </div>
                  <span className="text-xl text-secondary transition group-hover:translate-x-1" aria-hidden="true">→</span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-outline-variant p-10 text-center text-sm text-on-surface-variant">
            {categoriesData ? 'New collections are being prepared. Browse all products to see what is available.' : 'Loading collections…'}
          </div>
        )}
      </section>

      {featuredProducts.length > 0 && (
        <section className="bg-[#f3f5f2] py-16 md:py-20">
          <div className="container-site">
            <div className="mb-8 flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-secondary">A good place to start</p>
                <h2 className="mt-2 text-3xl font-semibold tracking-tight text-primary md:text-4xl">Featured footwear</h2>
              </div>
              <Link to="/shop?featured=true" className="hidden text-sm font-semibold text-primary hover:underline sm:inline">Explore all →</Link>
            </div>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 md:gap-6">
              {featuredProducts.map((product: any) => <ProductCard key={product.id} product={product} />)}
            </div>
          </div>
        </section>
      )}

      {featuredLoading && (
        <section className="container-site py-12">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {[1, 2, 3, 4].map(item => <div key={item} className="aspect-[4/5] animate-pulse rounded-2xl bg-surface-container" />)}
          </div>
        </section>
      )}

      {newArrivalProducts.length > 0 && (
        <section className="container-site py-16 md:py-20">
          <div className="mb-8 flex items-end justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-secondary">Just added</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-primary md:text-4xl">New arrivals</h2>
            </div>
            <Link to="/shop?new_arrival=true" className="text-sm font-semibold text-primary hover:underline">View all →</Link>
          </div>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
            {newArrivalProducts.map((product: any) => <ProductCard key={product.id} product={product} />)}
          </div>
        </section>
      )}

      {bestsellerProducts.length > 0 && (
        <section className="bg-[#f3f5f2] py-16 md:py-20">
          <div className="container-site">
            <div className="mb-8 flex items-end justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-secondary">Customer favourites</p>
                <h2 className="mt-2 text-3xl font-semibold tracking-tight text-primary md:text-4xl">Popular right now</h2>
              </div>
              <Link to="/shop?bestseller=true" className="text-sm font-semibold text-primary hover:underline">View all →</Link>
            </div>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
              {bestsellerProducts.map((product: any) => <ProductCard key={product.id} product={product} />)}
            </div>
          </div>
        </section>
      )}

      <section className="container-site py-16 md:py-20">
        <div className="overflow-hidden rounded-[2rem] bg-primary px-6 py-12 text-white md:px-14 md:py-16">
          <div className="grid items-center gap-8 md:grid-cols-[1.3fr_0.7fr]">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#a9d8c7]">A more considered fit</p>
              <h2 className="mt-3 max-w-xl text-3xl font-semibold tracking-tight md:text-4xl">A little help finding your next pair?</h2>
              <p className="mt-4 max-w-xl leading-7 text-white/75">Answer a few questions about your comfort preferences and daily routine, then explore the products available in the store.</p>
            </div>
            <div className="md:text-right">
              <Link to="/find-your-fit" className="inline-flex items-center justify-center rounded-full bg-white px-7 py-4 text-sm font-bold text-primary transition hover:bg-[#dce9e1]">Find your fit <span className="ml-3">→</span></Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
