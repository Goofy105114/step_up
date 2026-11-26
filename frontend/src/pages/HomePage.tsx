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
  const { data: featured, isLoading: featuredLoading, isError: featuredError, refetch: refetchFeatured, isFetching: featuredFetching } = useQuery({
    queryKey: ['products', 'featured'],
    queryFn: () => api.get('/products?featured=true&limit=8').then(r => r.data),
  });
  const { data: categoriesData, isError: categoriesError, refetch: refetchCategories, isFetching: categoriesFetching } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get('/categories').then(r => r.data),
  });
  const { data: bestsellers, isError: bestsellersError, refetch: refetchBestsellers, isFetching: bestsellersFetching } = useQuery({
    queryKey: ['products', 'bestsellers'],
    queryFn: () => api.get('/products?bestseller=true&limit=4').then(r => r.data),
  });
  const { data: newArrivals, isError: newArrivalsError, refetch: refetchNewArrivals, isFetching: newArrivalsFetching } = useQuery({
    queryKey: ['products', 'new-arrivals'],
    queryFn: () => api.get('/products?new_arrival=true&limit=4').then(r => r.data),
  });
  const { data: studiesData, isError: studiesError, refetch: refetchStudies, isFetching: studiesFetching } = useQuery({
    queryKey: ['clinical-studies', 'homepage'],
    queryFn: () => api.get('/clinical-studies').then(r => r.data),
  });
  const { data: reviewsData, isError: reviewsError, refetch: refetchReviews, isFetching: reviewsFetching } = useQuery({
    queryKey: ['reviews', 'featured'],
    queryFn: () => api.get('/reviews/featured').then(r => r.data),
  });

  const featuredProducts: Product[] = featured?.data || [];
  const categories: Category[] = categoriesData?.data || [];
  const bestsellerProducts = bestsellers?.data || [];
  const newArrivalProducts = newArrivals?.data || [];
  // Editorial visual extracted from the supplied Stitch landing-page code; catalogue product imagery always takes precedence.
  const stitchEditorialImage = 'https://lh3.googleusercontent.com/aida-public/AB6AXuBAcMrHTF7CDnQi3dqN1LXjoDMN2KTZkimZ4ZKkU7l_Nnuo5uki9KJZR4xOr-Dp4szNlpbMqS-dn13rQOWYhSyLosdcIb_A_hUYEe2mxsJQkTMiSJqRHXhld4X79tCg9DUBlVS2Apg87Yv6BIgFA6SuOAOtTMBCnIz1x-qUlp-LP7YBR6AFhhcdClnc4O9owVpvqC73XrSxl2OOBvP4w7Gp2k_bhD8MUj7prlyH5KY';
  const heroImage = featuredProducts[0]?.primary_image || stitchEditorialImage;

  return (
    <main className="bg-surface text-on-surface">
      <section className="relative overflow-hidden bg-[#f5f4f0]">
        <div className="pointer-events-none absolute -right-28 -top-24 h-[28rem] w-[28rem] rounded-full bg-[#dce8df] blur-3xl opacity-70" />
        <div className="container-site relative grid min-h-[570px] grid-cols-1 items-center gap-10 py-12 lg:grid-cols-[0.95fr_1.05fr] lg:gap-14 lg:py-16">
          <div className="max-w-xl">
            <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/15 bg-white/80 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.16em] text-primary">
              <span className="h-2 w-2 rounded-full bg-secondary" />
              Supportive footwear, thoughtfully designed
            </p>
            <h1 className="max-w-xl text-[2.65rem] font-semibold leading-[1.08] tracking-[-0.045em] text-primary md:text-6xl">
              Supportive design meets everyday style.
            </h1>
            <p className="mt-5 max-w-lg text-sm leading-7 text-on-surface-variant md:text-base">
              Explore supportive footwear shaped around comfort, considered materials and the way you move every day.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link to="/shop?search=sandals" className="btn-primary px-6 py-3.5">
                Shop supportive sandals <span aria-hidden="true">→</span>
              </Link>
              <Link to="/find-your-fit" className="btn-outline px-6 py-3.5">
                Find your fit
              </Link>
            </div>
            <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-medium text-on-surface-variant">
              <span className="flex items-center gap-2"><span className="material-symbols-outlined text-[16px] text-secondary">footprint</span> Everyday comfort</span>
              <span className="flex items-center gap-2"><span className="material-symbols-outlined text-[16px] text-secondary">tune</span> Fit-led discovery</span>
              <span className="flex items-center gap-2"><span className="material-symbols-outlined text-[16px] text-secondary">local_shipping</span> Shop online</span>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-[620px]">
            <div className="absolute inset-5 rounded-[2.5rem] bg-[#dce8df] blur-2xl" />
            <div className="relative aspect-[1.12/1] overflow-hidden rounded-[1.75rem] bg-[#e8e5dd] shadow-[0_22px_65px_rgba(27,65,54,0.14)]">
              {heroImage ? (
                <img
                  src={heroImage}
                  alt={featuredProducts[0]?.name || 'STEPUP supportive footwear editorial'}
                  className="h-full w-full object-cover"
                  fetchPriority="high"
                />
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-3 bg-gradient-to-br from-[#e8e5dd] to-[#dce8df] text-primary/65">
                  <span className="material-symbols-outlined text-6xl" aria-hidden="true">footprint</span>
                  <span className="text-xs font-semibold uppercase tracking-[0.18em]">STEPUP</span>
                </div>
              )}
            </div>
            {featuredProducts[0] && (
              <Link
                to={`/product/${featuredProducts[0].slug}`}
                className="absolute -bottom-4 left-4 right-4 flex items-center justify-between gap-4 rounded-2xl border border-black/5 bg-white/95 px-4 py-3 shadow-xl backdrop-blur sm:left-6 sm:right-6 sm:px-5"
              >
                <span className="min-w-0">
                  <span className="block text-[9px] font-bold uppercase tracking-[0.14em] text-secondary">Featured in STEPUP</span>
                  <span className="mt-1 block truncate text-sm font-semibold text-primary">{featuredProducts[0].name}</span>
                </span>
                <span className="material-symbols-outlined shrink-0 text-primary" aria-hidden="true">arrow_forward</span>
              </Link>
            )}
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
        ) : categoriesError ? (
          <div role="alert" className="rounded-2xl border border-error/30 bg-surface-container-low p-8 text-center text-sm text-on-surface-variant">
            <p>We couldn’t load collections right now.</p>
            <button type="button" onClick={() => refetchCategories()} disabled={categoriesFetching} className="btn-primary mt-4 px-5 py-2.5">{categoriesFetching ? 'Retrying…' : 'Try again'}</button>
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-outline-variant p-10 text-center text-sm text-on-surface-variant">
            {categoriesData ? 'New collections are being prepared. Browse all products to see what is available.' : 'Loading collections…'}
          </div>
        )}
      </section>

      {featuredError && !featuredLoading && (
        <section role="alert" className="container-site py-8">
          <div className="rounded-2xl border border-error/30 bg-surface-container-low p-6 text-center">
            <p className="text-sm text-on-surface-variant">Featured products are temporarily unavailable.</p>
            <button type="button" onClick={() => refetchFeatured()} disabled={featuredFetching} className="btn-outline mt-3 px-5 py-2.5">{featuredFetching ? 'Retrying…' : 'Retry featured products'}</button>
          </div>
        </section>
      )}
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

      {newArrivalsError && (
        <section role="alert" className="container-site py-4">
          <p className="text-sm text-on-surface-variant">New arrivals couldn’t be loaded. <button type="button" onClick={() => refetchNewArrivals()} disabled={newArrivalsFetching} className="font-semibold text-primary underline">{newArrivalsFetching ? 'Retrying…' : 'Retry'}</button></p>
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

      {bestsellersError && (
        <section role="alert" className="container-site py-4">
          <p className="text-sm text-on-surface-variant">Popular products couldn’t be loaded. <button type="button" onClick={() => refetchBestsellers()} disabled={bestsellersFetching} className="font-semibold text-primary underline">{bestsellersFetching ? 'Retrying…' : 'Retry'}</button></p>
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

      <section className="bg-[#f4f3ef] py-16 md:py-20">
        <div className="container-site">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-secondary">Evidence & research</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-primary md:text-4xl">Explore the published research</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-on-surface-variant">Read the original sources in STEPUP’s reviewed clinical library. Research summaries are informational and are not a medical diagnosis.</p>
            </div>
            <Link to="/clinical-studies" className="text-sm font-semibold text-primary hover:underline">View research library →</Link>
          </div>
          {studiesError ? (
            <div role="alert" className="rounded-2xl border border-error/30 bg-white p-6 text-sm text-on-surface-variant">
              <p>Published research could not be loaded.</p>
              <button type="button" onClick={() => refetchStudies()} disabled={studiesFetching} className="btn-outline mt-3 px-4 py-2">{studiesFetching ? 'Retrying…' : 'Retry research'}</button>
            </div>
          ) : studiesData?.data?.length ? (
            <div className="grid gap-4 md:grid-cols-3">
              {studiesData.data.slice(0,3).map((study: any) => (
                <article key={study.id} className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-secondary">{study.publication || 'Published research'}{study.publication_date ? ` · ${new Date(study.publication_date).toLocaleDateString('en-IN',{month:'short',year:'numeric'})}` : ''}</p>
                  <h3 className="mt-3 text-base font-semibold leading-6 text-primary">{study.title}</h3>
                  {study.authors && <p className="mt-2 text-xs text-on-surface-variant">{study.authors}</p>}
                  {study.summary && <p className="mt-3 line-clamp-4 text-sm leading-6 text-on-surface-variant">{study.summary}</p>}
                  <a href={study.source_url} target="_blank" rel="noreferrer" className="mt-4 inline-flex text-xs font-semibold text-primary underline underline-offset-4">Read original source ↗</a>
                </article>
              ))}
            </div>
          ) : studiesData ? (
            <p className="rounded-2xl border border-dashed border-outline-variant bg-white p-8 text-center text-sm text-on-surface-variant">No verified studies have been published in the library yet.</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-3">{[1,2,3].map(x => <div key={x} className="h-48 animate-pulse rounded-2xl bg-white" />)}</div>
          )}
        </div>
      </section>

      {(reviewsError || reviewsData?.data?.length > 0) && (
        <section className="container-site py-16 md:py-20">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-secondary">Customer experiences</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-primary md:text-4xl">What customers are saying</h2>
              <p className="mt-2 text-sm text-on-surface-variant">Only approved reviews from actual STEPUP product pages appear here.</p>
            </div>
          </div>
          {reviewsError ? (
            <div role="alert" className="rounded-2xl border border-error/30 bg-surface-container-low p-6 text-sm text-on-surface-variant">
              <p>Customer reviews could not be loaded.</p>
              <button type="button" onClick={() => refetchReviews()} disabled={reviewsFetching} className="btn-outline mt-3 px-4 py-2">{reviewsFetching ? 'Retrying…' : 'Retry reviews'}</button>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-3">
              {reviewsData.data.map((review: any) => (
                <article key={review.id} className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
                  <div className="flex items-center gap-1 text-amber-600" aria-label={`${review.rating} out of 5 stars`}>
                    {Array.from({length:5}).map((_,i) => <span key={i} aria-hidden="true">{i < Number(review.rating) ? '★' : '☆'}</span>)}
                  </div>
                  {review.title && <h3 className="mt-3 font-semibold text-primary">{review.title}</h3>}
                  <p className="mt-2 text-sm leading-6 text-on-surface-variant">{review.body}</p>
                  <div className="mt-5 border-t border-outline-variant/40 pt-3">
                    <p className="text-sm font-semibold text-primary">{review.user_name}</p>
                    <Link to={`/product/${review.product_slug}`} className="mt-1 text-xs text-secondary underline underline-offset-4">{review.product_name}</Link>
                  </div>
                </article>
              ))}
            </div>
          )}
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
