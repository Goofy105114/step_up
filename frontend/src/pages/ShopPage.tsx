import { useState } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { SlidersHorizontal, ChevronDown, X, Grid3X3, LayoutList } from 'lucide-react';
import api from '../lib/api';
import ProductCard from '../components/products/ProductCard';

const sortOptions = [
  { label: 'Default Sorting', value: 'created_at:desc' },
  { label: 'Newest First', value: 'created_at:asc' },
  { label: 'Price: Low → High', value: 'price:asc' },
  { label: 'Price: High → Low', value: 'price:desc' },
  { label: 'Top Rated', value: 'rating:desc' },
  { label: 'Name A–Z', value: 'name:asc' },
];

const priceRanges = [
  { label: 'All Prices', min: '', max: '' },
  { label: 'Under ₹1,000', min: '0', max: '1000' },
  { label: '₹1,000 – ₹2,500', min: '1000', max: '2500' },
  { label: '₹2,500 – ₹5,000', min: '2500', max: '5000' },
  { label: 'Above ₹5,000', min: '5000', max: '999999' },
];

const catLabels: Record<string, string> = {
  mens: "Men's Footwear", womens: "Women's Footwear", kids: "Kids' Footwear",
  sports: 'Sports & Athletic', casual: 'Casual', formal: 'Formal', sandals: 'Sandals & Slippers',
};

export default function ShopPage() {
  const { category } = useParams();
  const [sp, setSp] = useSearchParams();
  const [showFilters, setShowFilters] = useState(false);
  const [cols, setCols] = useState<4 | 3>(4);

  const page = parseInt(sp.get('page') || '1');
  const sort = sp.get('sort') || 'created_at:desc';
  const search = sp.get('search') || '';
  const minPrice = sp.get('min_price') || '';
  const maxPrice = sp.get('max_price') || '';
  const featured = sp.get('featured') || '';
  const newArrival = sp.get('new_arrival') || '';
  const bestseller = sp.get('bestseller') || '';
  const [sortKey, sortOrder] = sort.split(':');

  const { data, isLoading } = useQuery({
    queryKey: ['products', category, page, sort, search, minPrice, maxPrice, featured, newArrival, bestseller],
    queryFn: () => {
      const p = new URLSearchParams({
        limit: '12', page: String(page), sort: sortKey, order: sortOrder,
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

  return (
    <div className="bg-white min-h-screen">
      {/* Breadcrumb */}
      <div className="bg-gray-50 border-b border-gray-200">
        <div className="container-site py-4 flex items-center gap-2 text-xs text-gray-500">
          <Link to="/" className="hover:text-brand-500 transition-colors">Home</Link>
          <span>/</span>
          {category && <><Link to="/shop" className="hover:text-brand-500 transition-colors">Shop</Link><span>/</span></>}
          <span className="text-gray-900 font-semibold uppercase tracking-wider">{title}</span>
        </div>
      </div>

      <div className="container-site py-10">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6 pb-5 border-b border-gray-200">
          <div>
            <h1 className="text-lg font-bold uppercase tracking-widest text-gray-900">{title}</h1>
            {data && <p className="text-xs text-gray-400 mt-0.5">{data.pagination?.total} products found</p>}
          </div>
          <div className="flex items-center gap-3">
            {/* Sort */}
            <div className="relative group">
              <button className="flex items-center gap-2 border border-gray-300 px-4 py-2 text-xs uppercase tracking-wider hover:border-gray-900 transition-colors">
                {sortOptions.find((s) => s.value === sort)?.label || 'Sort by'}
                <ChevronDown size={12} />
              </button>
              <div className="absolute right-0 top-full mt-px w-52 bg-white border border-gray-200 shadow-lg py-1 z-30 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                {sortOptions.map((opt) => (
                  <button key={opt.value} onClick={() => setParam('sort', opt.value)}
                    className={`w-full text-left px-4 py-2.5 text-xs hover:bg-gray-50 transition-colors ${sort === opt.value ? 'text-brand-500 font-semibold' : 'text-gray-700'}`}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Filter toggle */}
            <button onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 border border-gray-300 px-4 py-2 text-xs uppercase tracking-wider hover:border-gray-900 transition-colors">
              <SlidersHorizontal size={13} /> Filters
            </button>

            {/* Grid/list */}
            <div className="hidden md:flex items-center border border-gray-200">
              <button onClick={() => setCols(4)} className={`p-2 transition-colors ${cols === 4 ? 'bg-gray-900 text-white' : 'hover:bg-gray-50 text-gray-500'}`}>
                <Grid3X3 size={15} />
              </button>
              <button onClick={() => setCols(3)} className={`p-2 transition-colors ${cols === 3 ? 'bg-gray-900 text-white' : 'hover:bg-gray-50 text-gray-500'}`}>
                <LayoutList size={15} />
              </button>
            </div>
          </div>
        </div>

        {/* Filter panel */}
        {showFilters && (
          <div className="bg-gray-50 border border-gray-200 p-6 mb-6 animate-slide-up">
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Price */}
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-gray-700 mb-3">Price Range</p>
                <div className="space-y-2">
                  {priceRanges.map((r) => (
                    <label key={r.label} className="flex items-center gap-2 cursor-pointer group">
                      <input type="radio" name="price" onChange={() => { setParam('min_price', r.min || null); setParam('max_price', r.max || null); }}
                        checked={minPrice === r.min && maxPrice === r.max}
                        className="accent-brand-500 cursor-pointer" />
                      <span className="text-xs text-gray-600 group-hover:text-brand-500 transition-colors">{r.label}</span>
                    </label>
                  ))}
                </div>
              </div>
              {/* Collections */}
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-gray-700 mb-3">Collections</p>
                <div className="space-y-2">
                  {[['Featured', 'featured'], ['New Arrivals', 'new_arrival'], ['Bestsellers', 'bestseller']].map(([label, key]) => (
                    <label key={key} className="flex items-center gap-2 cursor-pointer group">
                      <input type="checkbox" checked={sp.get(key) === 'true'}
                        onChange={(e) => setParam(key, e.target.checked ? 'true' : null)}
                        className="accent-brand-500 cursor-pointer" />
                      <span className="text-xs text-gray-600 group-hover:text-brand-500 transition-colors">{label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <button onClick={() => { setSp({}); }}
              className="mt-5 text-xs text-brand-500 hover:text-brand-700 font-semibold flex items-center gap-1 uppercase tracking-wider">
              <X size={12} /> Clear All Filters
            </button>
          </div>
        )}

        {/* Products */}
        {isLoading ? (
          <div className={`grid grid-cols-2 md:grid-cols-${cols} gap-5`}>
            {Array(12).fill(0).map((_, i) => (
              <div key={i} className="border border-gray-100">
                <div className="skeleton aspect-square" />
                <div className="p-4 space-y-2 text-center">
                  <div className="skeleton h-3 w-1/2 mx-auto" />
                  <div className="skeleton h-4 w-3/4 mx-auto" />
                  <div className="skeleton h-4 w-1/4 mx-auto" />
                </div>
              </div>
            ))}
          </div>
        ) : !data?.data?.length ? (
          <div className="text-center py-24">
            <p className="text-6xl mb-6">👟</p>
            <h3 className="text-lg font-bold uppercase tracking-widest text-gray-700 mb-2">No Products Found</h3>
            <p className="text-sm text-gray-400 mb-6">Try adjusting your filters or search term</p>
            <Link to="/shop" className="btn-outline">Browse All Products</Link>
          </div>
        ) : (
          <>
            <div className={`grid grid-cols-2 md:grid-cols-${cols} gap-5`}>
              {data.data.map((p: any) => <ProductCard key={p.id} product={p} />)}
            </div>

            {/* Pagination */}
            {data.pagination?.pages > 1 && (
              <div className="flex justify-center items-center gap-1 mt-10">
                <button onClick={() => setParam('page', String(page - 1))} disabled={page === 1}
                  className="w-10 h-10 border border-gray-300 flex items-center justify-center hover:bg-gray-900 hover:text-white hover:border-gray-900 transition-colors disabled:opacity-30 text-sm">
                  ‹
                </button>
                {Array.from({ length: data.pagination.pages }, (_, i) => i + 1).map((p) => (
                  <button key={p} onClick={() => setParam('page', String(p))}
                    className={`w-10 h-10 border text-sm font-medium transition-colors ${
                      page === p ? 'bg-gray-900 text-white border-gray-900' : 'border-gray-300 hover:bg-gray-900 hover:text-white hover:border-gray-900'}`}>
                    {p}
                  </button>
                ))}
                <button onClick={() => setParam('page', String(page + 1))} disabled={page === data.pagination.pages}
                  className="w-10 h-10 border border-gray-300 flex items-center justify-center hover:bg-gray-900 hover:text-white hover:border-gray-900 transition-colors disabled:opacity-30 text-sm">
                  ›
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
