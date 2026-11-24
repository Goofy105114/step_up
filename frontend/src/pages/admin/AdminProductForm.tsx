import { useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import { ArrowLeft, Save } from 'lucide-react';

interface ProductForm {
  name: string; slug: string; description: string; short_description: string;
  category_id: string; base_price: string; sale_price: string;
  material: string; tags: string;
  is_featured: boolean; is_new_arrival: boolean; is_bestseller: boolean; is_active: boolean;
}

const empty: ProductForm = {
  name: '', slug: '', description: '', short_description: '',
  category_id: '', base_price: '', sale_price: '',
  material: '', tags: '',
  is_featured: false, is_new_arrival: false, is_bestseller: false, is_active: true,
};

export default function AdminProductForm() {
  const { id } = useParams<{ id?: string }>();
  const isEdit = !!id;
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [form, setForm] = useState<ProductForm>(empty);
  const [loaded, setLoaded] = useState(false);

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get('/categories').then((r) => r.data.data),
  });

  // Load existing product for edit
  useQuery({
    queryKey: ['admin-product', id],
    enabled: isEdit && !loaded,
    queryFn: () => api.get(`/products/${id}`).then((r) => r.data.data),
    onSuccess: (data: any) => {
      setForm({
        name: data.name || '', slug: data.slug || '',
        description: data.description || '', short_description: data.short_description || '',
        category_id: data.category_id || '', base_price: data.base_price || '',
        sale_price: data.sale_price || '', material: data.material || '',
        tags: (data.tags || []).join(', '),
        is_featured: data.is_featured, is_new_arrival: data.is_new_arrival,
        is_bestseller: data.is_bestseller, is_active: data.is_active,
      });
      setLoaded(true);
    },
  } as any);

  const saveMutation = useMutation({
    mutationFn: (payload: any) => isEdit
      ? api.patch(`/admin/products/${id}`, payload)
      : api.post('/admin/products', payload),
    onSuccess: () => {
      toast.success(isEdit ? 'Product updated!' : 'Product created!');
      qc.invalidateQueries({ queryKey: ['admin', 'products'] });
      navigate('/admin/products');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.slug || !form.base_price) {
      toast.error('Name, slug and base price are required'); return;
    }
    saveMutation.mutate({
      ...form,
      base_price: parseFloat(form.base_price),
      sale_price: form.sale_price ? parseFloat(form.sale_price) : null,
      tags: form.tags ? form.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
    });
  };

  const autoSlug = (name: string) =>
    name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  const set = (key: keyof ProductForm, val: string | boolean) =>
    setForm((f) => ({ ...f, [key]: val }));

  return (
    <div className="max-w-3xl animate-fade-in">
      <div className="flex items-center gap-4 mb-6">
        <Link to="/admin/products" className="p-2 hover:bg-gray-100 transition-colors rounded">
          <ArrowLeft size={18} />
        </Link>
        <h1 className="text-lg font-bold uppercase tracking-widest text-gray-900">
          {isEdit ? 'Edit Product' : 'Add New Product'}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic info */}
        <div className="bg-white border border-gray-200 p-6 space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-widest text-gray-700 pb-3 border-b border-gray-100">
            Basic Information
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1.5 block">
                Product Name *
              </label>
              <input value={form.name} onChange={(e) => {
                set('name', e.target.value);
                if (!isEdit) set('slug', autoSlug(e.target.value));
              }} className="input-field" placeholder="e.g. CloudStep Runner Pro" required />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1.5 block">Slug *</label>
              <input value={form.slug} onChange={(e) => set('slug', e.target.value)}
                className="input-field font-mono text-xs" placeholder="cloudstep-runner-pro" required />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1.5 block">
              Short Description
            </label>
            <input value={form.short_description} onChange={(e) => set('short_description', e.target.value)}
              className="input-field" placeholder="One-line summary shown in product cards" />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1.5 block">
              Full Description
            </label>
            <textarea value={form.description} onChange={(e) => set('description', e.target.value)}
              rows={4} className="input-field resize-none" placeholder="Detailed product description…" />
          </div>
        </div>

        {/* Pricing & Category */}
        <div className="bg-white border border-gray-200 p-6 space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-widest text-gray-700 pb-3 border-b border-gray-100">
            Pricing & Category
          </h2>
          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1.5 block">
                Base Price (₹) *
              </label>
              <input type="number" min="0" step="0.01" value={form.base_price}
                onChange={(e) => set('base_price', e.target.value)}
                className="input-field" placeholder="2499.00" required />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1.5 block">
                Sale Price (₹)
              </label>
              <input type="number" min="0" step="0.01" value={form.sale_price}
                onChange={(e) => set('sale_price', e.target.value)}
                className="input-field" placeholder="Leave blank if no sale" />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1.5 block">
                Category
              </label>
              <select value={form.category_id} onChange={(e) => set('category_id', e.target.value)}
                className="input-field">
                <option value="">Select category</option>
                {(categories || []).map((c: any) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1.5 block">Material</label>
            <input value={form.material} onChange={(e) => set('material', e.target.value)}
              className="input-field" placeholder="e.g. Genuine leather upper, rubber sole" />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1.5 block">
              Tags (comma separated)
            </label>
            <input value={form.tags} onChange={(e) => set('tags', e.target.value)}
              className="input-field" placeholder="running, sports, mens, cushioning" />
          </div>
        </div>

        {/* Flags */}
        <div className="bg-white border border-gray-200 p-6">
          <h2 className="text-xs font-bold uppercase tracking-widest text-gray-700 pb-3 border-b border-gray-100 mb-4">
            Visibility & Badges
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {([
              ['is_active', 'Active'],
              ['is_featured', 'Featured'],
              ['is_new_arrival', 'New Arrival'],
              ['is_bestseller', 'Bestseller'],
            ] as [keyof ProductForm, string][]).map(([key, label]) => (
              <label key={key} className="flex items-center gap-3 cursor-pointer">
                <div onClick={() => set(key, !form[key])}
                  className={`w-11 h-6 rounded-full transition-colors relative ${form[key] ? 'bg-brand-500' : 'bg-gray-200'}`}>
                  <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form[key] ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </div>
                <span className="text-xs font-medium text-gray-700">{label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Submit */}
        <div className="flex items-center gap-4">
          <button type="submit" disabled={saveMutation.isPending}
            className="btn-primary flex items-center gap-2 px-8">
            <Save size={16} />
            {saveMutation.isPending ? 'Saving…' : isEdit ? 'Update Product' : 'Create Product'}
          </button>
          <Link to="/admin/products" className="btn-outline px-8">Cancel</Link>
        </div>
      </form>
    </div>
  );
}
