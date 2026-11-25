import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';

type Category = {
  id: string;
  name: string;
  slug: string;
};

export default function Footer() {
  const { data: categoriesData } = useQuery({
    queryKey: ['categories', 'footer'],
    queryFn: () => api.get('/categories').then(response => response.data),
  });
  const categories: Category[] = categoriesData?.data || [];

  return (
    <footer className="bg-inverse-surface text-inverse-on-surface">
      <div className="border-b border-white/10">
        <div className="container-site flex flex-col gap-2 py-5 text-sm text-white/75 sm:flex-row sm:items-center sm:justify-between">
          <span>STEPUP — footwear for everyday movement.</span>
          <Link to="/shop" className="font-semibold text-white hover:text-secondary transition-colors">Explore the collection →</Link>
        </div>
      </div>

      <div className="container-site py-14">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-1">
            <Link to="/" className="inline-flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary text-2xl">footprint</span>
              <span className="text-2xl font-semibold tracking-tight text-white">STEPUP</span>
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-7 text-white/60">
              Thoughtfully selected footwear with product information drawn from the STEPUP catalogue. Explore available styles and find a pair that suits your everyday routine.
            </p>
          </div>

          <div>
            <h2 className="text-xs font-bold uppercase tracking-[0.16em] text-white">Shop</h2>
            <ul className="mt-4 space-y-3">
              <li><Link to="/shop" className="text-sm text-white/65 hover:text-white">All products</Link></li>
              <li><Link to="/shop-by-condition" className="text-sm text-white/65 hover:text-white">Shop by condition</Link></li>
              {categories.slice(0, 5).map(category => (
                <li key={category.id}><Link to={`/shop/${category.slug}`} className="text-sm text-white/65 hover:text-white">{category.name}</Link></li>
              ))}
              {categories.length === 0 && !categoriesData && <li className="text-sm text-white/45">Loading collections…</li>}
            </ul>
          </div>

          <div>
            <h2 className="text-xs font-bold uppercase tracking-[0.16em] text-white">Discover</h2>
            <ul className="mt-4 space-y-3">
              <li><Link to="/find-your-fit" className="text-sm text-white/65 hover:text-white">Find your fit</Link></li>
              <li><Link to="/clinical-studies" className="text-sm text-white/65 hover:text-white">Research library</Link></li>
              <li><Link to="/wishlist" className="text-sm text-white/65 hover:text-white">Wishlist</Link></li>
            </ul>
          </div>

          <div>
            <h2 className="text-xs font-bold uppercase tracking-[0.16em] text-white">Your account</h2>
            <ul className="mt-4 space-y-3">
              <li><Link to="/profile" className="text-sm text-white/65 hover:text-white">Profile</Link></li>
              <li><Link to="/orders" className="text-sm text-white/65 hover:text-white">Orders</Link></li>
              <li><Link to="/login" className="text-sm text-white/65 hover:text-white">Sign in</Link></li>
              <li><Link to="/register" className="text-sm text-white/65 hover:text-white">Create account</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-white/10 pt-6 text-xs text-white/45 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} STEPUP. All rights reserved.</p>
          <p>Product information is provided for general shopping purposes and is not medical advice.</p>
        </div>
      </div>
    </footer>
  );
}
