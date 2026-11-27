import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';

type BusinessDisclosures = { legal_name: string; registered_address: string; customer_care_email: string; customer_care_phone: string; grievance_officer_name: string; grievance_officer_designation: string; grievance_email: string; grievance_phone: string; gstin: string | null };

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
  const { data: disclosures } = useQuery({
    queryKey: ['legal-business-disclosures'],
    queryFn: () => api.get('/legal/business-disclosures').then(response => response.data.data as BusinessDisclosures | null),
    retry: false,
  });

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
              <li><Link to="/about" className="text-sm text-white/65 hover:text-white">About STEPUP</Link></li>
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

        <div className="mt-12 border-t border-white/10 pt-6">
          <nav aria-label="Legal policies" className="mb-5 flex flex-wrap gap-x-5 gap-y-2 text-xs text-white/60">
            <Link to="/policies/privacy" className="hover:text-white">Privacy</Link>
            <Link to="/policies/terms" className="hover:text-white">Terms</Link>
            <Link to="/policies/shipping" className="hover:text-white">Shipping</Link>
            <Link to="/policies/returns" className="hover:text-white">Returns & refunds</Link>
          </nav>
          {disclosures && <div className="mb-5 grid gap-2 text-xs leading-5 text-white/60 sm:grid-cols-2">
            <div><p className="font-semibold text-white/80">{disclosures.legal_name}</p><p>{disclosures.registered_address}</p></div>
            <div><p>Customer care: <a href={`mailto:${disclosures.customer_care_email}`} className="underline hover:text-white">{disclosures.customer_care_email}</a> · {disclosures.customer_care_phone}</p>
              <p>Grievance officer: {disclosures.grievance_officer_name} ({disclosures.grievance_officer_designation})</p>
              <p>Grievance contact: <a href={`mailto:${disclosures.grievance_email}`} className="underline hover:text-white">{disclosures.grievance_email}</a> · {disclosures.grievance_phone}</p>
              {disclosures.gstin && <p>GSTIN: {disclosures.gstin}</p>}
            </div>
          </div>}
          <div className="flex flex-col gap-3 text-xs text-white/45 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} STEPUP. All rights reserved.</p>
          <p>Product information is provided for general shopping purposes and is not medical advice.</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
