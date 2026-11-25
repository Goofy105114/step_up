import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import { ArrowLeft, Save, Plus, Trash2, Image } from 'lucide-react';

interface ProductForm {
  name: string; slug: string; sku: string; description: string; short_description: string;
  category_id: string; base_price: string; sale_price: string;
  material: string; care_instructions: string; tags: string;
  arch_support_level: string; arch_height_mm: string; durometer_shore_a: string;
  calibration_reference: string; calibrated_at: string; calibration_notes: string;
  is_featured: boolean; is_new_arrival: boolean; is_bestseller: boolean; is_active: boolean;
}

interface Variant {
  id?: string; size: string; color: string; color_hex: string;
  stock_qty: number; price_adj: number; sku: string;
}

interface ProductImage { id: string; url: string; alt_text: string; is_primary: boolean; }

const emptyForm: ProductForm = {
  name: '', slug: '', sku: '', description: '', short_description: '',
  category_id: '', base_price: '', sale_price: '',
  material: '', care_instructions: '', tags: '',
  arch_support_level: '', arch_height_mm: '', durometer_shore_a: '',
  calibration_reference: '', calibrated_at: '', calibration_notes: '',
  is_featured: false, is_new_arrival: false, is_bestseller: false, is_active: true,
};

const emptyVariant: Variant = { size: '', color: '', color_hex: '#000000', stock_qty: 0, price_adj: 0, sku: '' };

export default function AdminProductForm() {
  const { id } = useParams<{ id?: string }>();
  const isEdit = !!id;
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [images, setImages] = useState<ProductImage[]>([]);
  const [newImageUrl, setNewImageUrl] = useState('');
  const [newVariant, setNewVariant] = useState<Variant>(emptyVariant);
  const [showAddVariant, setShowAddVariant] = useState(false);

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get('/categories').then((r) => r.data.data),
  });

  // Load existing product data
  const { data: productData } = useQuery({
    queryKey: ['admin-product', id],
    enabled: isEdit,
    queryFn: () => api.get(`/admin/products/${id}`).then((r) => r.data.data),
  });

  useEffect(() => {
    if (!productData) return;
    setForm({
      name: productData.name || '',
      slug: productData.slug || '',
      sku: productData.sku || '',
      description: productData.description || '',
      short_description: productData.short_description || '',
      category_id: productData.category_id || '',
      base_price: productData.base_price || '',
      sale_price: productData.sale_price || '',
      material: productData.material || '',
      care_instructions: productData.care_instructions || '',
      arch_support_level: productData.arch_support_level || '',
      arch_height_mm: productData.arch_height_mm ?? '',
      durometer_shore_a: productData.durometer_shore_a ?? '',
      calibration_reference: productData.calibration_reference || '',
      calibrated_at: productData.calibrated_at ? String(productData.calibrated_at).slice(0, 10) : '',
      calibration_notes: productData.calibration_notes || '',
      tags: (productData.tags || []).join(', '),
      is_featured: productData.is_featured ?? false,
      is_new_arrival: productData.is_new_arrival ?? false,
      is_bestseller: productData.is_bestseller ?? false,
      is_active: productData.is_active ?? true,
    });
    setVariants(productData.variants || []);
    setImages(productData.images || []);
  }, [productData]);

  const saveMutation = useMutation({
    mutationFn: (payload: any) => isEdit
      ? api.patch(`/admin/products/${id}`, payload)
      : api.post('/admin/products', payload),
    onSuccess: () => {
      toast.success(isEdit ? 'Product updated!' : 'Product created!');
      qc.invalidateQueries({ queryKey: ['admin', 'products'] });
      navigate('/admin/products');
    },
    onError: (error: any) => toast.error(error.response?.data?.message || 'Unable to save product'),
  });

  const updateVariantMutation = useMutation({
    mutationFn: ({ variantId, data }: { variantId: string; data: any }) =>
      api.patch(`/admin/products/${id}/variants/${variantId}`, data),
    onSuccess: () => { toast.success('Stock updated'); qc.invalidateQueries({ queryKey: ['admin-product', id] }); },
  });

  const addVariantMutation = useMutation({
    mutationFn: (data: any) => api.post(`/admin/products/${id}/variants`, data),
    onSuccess: () => {
      toast.success('Variant added');
      setNewVariant(emptyVariant);
      setShowAddVariant(false);
      qc.invalidateQueries({ queryKey: ['admin-product', id] });
    },
  });

  const deleteVariantMutation = useMutation({
    mutationFn: (variantId: string) => api.delete(`/admin/products/${id}/variants/${variantId}`),
    onSuccess: () => { toast.success('Variant removed'); qc.invalidateQueries({ queryKey: ['admin-product', id] }); },
  });

  const addImageMutation = useMutation({
    mutationFn: (url: string) => api.post(`/admin/products/${id}/images`, { url, is_primary: images.length === 0 }),
    onSuccess: () => { toast.success('Image added'); setNewImageUrl(''); qc.invalidateQueries({ queryKey: ['admin-product', id] }); },
  });

  const deleteImageMutation = useMutation({
    mutationFn: (imageId: string) => api.delete(`/admin/products/${id}/images/${imageId}`),
    onSuccess: () => { toast.success('Image removed'); qc.invalidateQueries({ queryKey: ['admin-product', id] }); },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.slug || !form.base_price) {
      toast.error('Name, slug and base price are required'); return;
    }
    saveMutation.mutate({
      ...form,
      sku: form.sku.trim() || null,
      care_instructions: form.care_instructions.trim() || null,
      arch_support_level: form.arch_support_level || null,
      arch_height_mm: form.arch_height_mm === '' ? null : Number(form.arch_height_mm),
      durometer_shore_a: form.durometer_shore_a === '' ? null : Number(form.durometer_shore_a),
      calibration_reference: form.calibration_reference.trim() || null,
      calibrated_at: form.calibrated_at || null,
      calibration_notes: form.calibration_notes.trim() || null,
      base_price: parseFloat(form.base_price),
      sale_price: form.sale_price ? parseFloat(form.sale_price) : null,
      tags: form.tags ? form.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
    });
  };

  const autoSlug = (name: string) =>
    name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  const setField = (key: keyof ProductForm, val: string | boolean) =>
    setForm((f) => ({ ...f, [key]: val }));

  return (
    <div className="max-w-4xl animate-fade-in">
      <div className="flex items-center gap-4 mb-6">
        <Link to="/admin/products" className="p-2 hover:bg-gray-100 transition-colors">
          <ArrowLeft size={18} />
        </Link>
        <h1 className="text-lg font-bold uppercase tracking-widest text-gray-900">
          {isEdit ? 'Edit Product' : 'Add New Product'}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* Basic info */}
        <div className="bg-white border border-gray-200 p-6 space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-widest text-gray-700 pb-3 border-b border-gray-100">Basic Information</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Product Name *</label>
              <input value={form.name} onChange={(e) => { setField('name', e.target.value); if (!isEdit) setField('slug', autoSlug(e.target.value)); }}
                className="input-field" placeholder="e.g. CloudStep Runner Pro" required />
            </div>
            <div>
              <label className="label">Slug *</label>
              <input value={form.slug} onChange={(e) => setField('slug', e.target.value)}
                className="input-field font-mono text-xs" placeholder="product-url-slug" required />
            </div>
            <div>
              <label className="label">Product SKU</label>
              <input value={form.sku} onChange={(e) => setField('sku', e.target.value)}
                className="input-field font-mono text-xs" placeholder="Optional catalogue SKU" />
            </div>
          </div>
          <div>
            <label className="label">Short Description</label>
            <input value={form.short_description} onChange={(e) => setField('short_description', e.target.value)}
              className="input-field" placeholder="One-line summary shown in product cards" />
          </div>
          <div>
            <label className="label">Full Description</label>
            <textarea value={form.description} onChange={(e) => setField('description', e.target.value)}
              rows={4} className="input-field resize-none" placeholder="Detailed product description…" />
          </div>
        </div>

        {/* Pricing & Category */}
        <div className="bg-white border border-gray-200 p-6 space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-widest text-gray-700 pb-3 border-b border-gray-100">Pricing & Category</h2>
          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <label className="label">Base Price (₹) *</label>
              <input type="number" min="0" step="0.01" value={form.base_price}
                onChange={(e) => setField('base_price', e.target.value)} className="input-field" placeholder="2499.00" required />
            </div>
            <div>
              <label className="label">Sale Price (₹)</label>
              <input type="number" min="0" step="0.01" value={form.sale_price}
                onChange={(e) => setField('sale_price', e.target.value)} className="input-field" placeholder="Leave blank if no sale" />
            </div>
            <div>
              <label className="label">Category</label>
              <select value={form.category_id} onChange={(e) => setField('category_id', e.target.value)} className="input-field">
                <option value="">Select category</option>
                {(categories || []).map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Material</label>
              <input value={form.material} onChange={(e) => setField('material', e.target.value)}
                className="input-field" placeholder="Material details from supplier" />
            </div>
            <div>
              <label className="label">Care Instructions</label>
              <input value={form.care_instructions} onChange={(e) => setField('care_instructions', e.target.value)}
                className="input-field" placeholder="Care guidance supplied for this product" />
            </div>
          </div>
          <div>
            <label className="label">Catalogue Tags (comma separated)</label>
            <input value={form.tags} onChange={(e) => setField('tags', e.target.value)}
              className="input-field" placeholder="Add tags from your product catalogue" />
          </div>
        </div>

        {/* Product support profile and calibration */}
        <div className="bg-white border border-gray-200 p-6 space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-widest text-gray-700 pb-3 border-b border-gray-100">Support Profile & Calibration</h2>
          <p className="text-xs leading-5 text-gray-500">Enter measurements only from the product specification or a recorded calibration. Leave fields blank when the information has not been verified.</p>
          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <label className="label">Arch Support Level</label>
              <select value={form.arch_support_level} onChange={(e) => setField('arch_support_level', e.target.value)} className="input-field">
                <option value="">Not specified</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            <div>
              <label className="label">Arch Height (mm)</label>
              <input type="number" min="0.1" step="0.1" value={form.arch_height_mm} onChange={(e) => setField('arch_height_mm', e.target.value)} className="input-field" placeholder="Measured value" />
            </div>
            <div>
              <label className="label">Durometer (Shore A)</label>
              <input type="number" min="0" max="100" step="0.1" value={form.durometer_shore_a} onChange={(e) => setField('durometer_shore_a', e.target.value)} className="input-field" placeholder="Measured value" />
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Calibration Reference</label>
              <input value={form.calibration_reference} onChange={(e) => setField('calibration_reference', e.target.value)} className="input-field" placeholder="Lab or instrument reference" />
            </div>
            <div>
              <label className="label">Calibration Date</label>
              <input type="date" value={form.calibrated_at} onChange={(e) => setField('calibrated_at', e.target.value)} className="input-field" />
            </div>
          </div>
          <div>
            <label className="label">Calibration Notes</label>
            <textarea rows={3} value={form.calibration_notes} onChange={(e) => setField('calibration_notes', e.target.value)} className="input-field resize-y" placeholder="Optional notes from the verified measurement record" />
          </div>
        </div>

        {/* Flags */}
        <div className="bg-white border border-gray-200 p-6">
          <h2 className="text-xs font-bold uppercase tracking-widest text-gray-700 pb-3 border-b border-gray-100 mb-4">Visibility & Badges</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {(['is_active', 'Active'], ['is_featured', 'Featured'], ['is_new_arrival', 'New Arrival'], ['is_bestseller', 'Bestseller']) && (
              [['is_active', 'Active'], ['is_featured', 'Featured'], ['is_new_arrival', 'New Arrival'], ['is_bestseller', 'Bestseller']] as [keyof ProductForm, string][]
            ).map(([key, label]) => (
              <label key={key} className="flex items-center gap-3 cursor-pointer" onClick={() => setField(key, !form[key])}>
                <div className={`w-11 h-6 rounded-full transition-colors relative ${form[key] ? 'bg-brand-500' : 'bg-gray-200'}`}>
                  <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form[key] ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </div>
                <span className="text-xs font-medium text-gray-700">{label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Submit */}
        <div className="flex items-center gap-4">
          <button type="submit" disabled={saveMutation.isPending} className="btn-primary flex items-center gap-2 px-8">
            <Save size={16} />
            {saveMutation.isPending ? 'Saving…' : isEdit ? 'Update Product' : 'Create Product'}
          </button>
          <Link to="/admin/products" className="btn-outline px-8">Cancel</Link>
        </div>
      </form>

      {/* Images — only shown after product is created */}
      {isEdit && (
        <div className="bg-white border border-gray-200 p-6 space-y-4 mt-6">
          <h2 className="text-xs font-bold uppercase tracking-widest text-gray-700 pb-3 border-b border-gray-100 flex items-center gap-2">
            <Image size={14} /> Product Images
          </h2>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
            {images.map((img) => (
              <div key={img.id} className="relative group aspect-square border border-gray-200 overflow-hidden">
                <img src={img.url} alt={img.alt_text || ''} className="w-full h-full object-cover" />
                {img.is_primary && (
                  <span className="absolute top-1 left-1 bg-brand-500 text-white text-[9px] px-1.5 py-0.5 font-bold uppercase">Primary</span>
                )}
                <button onClick={() => deleteImageMutation.mutate(img.id)}
                  className="absolute top-1 right-1 bg-red-500 text-white p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Trash2 size={10} />
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-3">
            <input value={newImageUrl} onChange={(e) => setNewImageUrl(e.target.value)}
              className="input-field flex-1" placeholder="Paste image URL (e.g. https://images.unsplash.com/…)" />
            <button type="button" disabled={!newImageUrl || addImageMutation.isPending}
              onClick={() => addImageMutation.mutate(newImageUrl)}
              className="btn-primary px-5 flex items-center gap-2 shrink-0">
              <Plus size={14} /> Add
            </button>
          </div>
          <p className="text-xs text-gray-400">Paste any public image URL. First image added becomes the primary image.</p>
        </div>
      )}

      {/* Variants / Stock — only shown for existing products */}
      {isEdit && (
        <div className="bg-white border border-gray-200 p-6 space-y-4 mt-6">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <h2 className="text-xs font-bold uppercase tracking-widest text-gray-700">Variants & Stock</h2>
            <button type="button" onClick={() => setShowAddVariant(!showAddVariant)}
              className="btn-outline text-xs py-1.5 px-4 flex items-center gap-1.5">
              <Plus size={13} /> Add Variant
            </button>
          </div>

          {/* Add variant form */}
          {showAddVariant && (
            <div className="bg-gray-50 border border-gray-200 p-4 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-600">New Variant</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[
                  ['Size', 'size', 'text', '8'],
                  ['Color', 'color', 'text', 'Black'],
                  ['SKU', 'sku', 'text', 'PROD-BLK-8'],
                  ['Stock Qty', 'stock_qty', 'number', '0'],
                  ['Price Adj (₹)', 'price_adj', 'number', '0'],
                ].map(([label, key, type, placeholder]) => (
                  <div key={key}>
                    <label className="label">{label}</label>
                    <input type={type} value={(newVariant as any)[key]}
                      onChange={(e) => setNewVariant((v) => ({ ...v, [key]: type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value }))}
                      className="input-field" placeholder={placeholder} />
                  </div>
                ))}
                <div>
                  <label className="label">Color Hex</label>
                  <div className="flex gap-2">
                    <input type="color" value={newVariant.color_hex}
                      onChange={(e) => setNewVariant((v) => ({ ...v, color_hex: e.target.value }))}
                      className="w-10 h-10 border border-gray-200 cursor-pointer p-0.5" />
                    <input value={newVariant.color_hex}
                      onChange={(e) => setNewVariant((v) => ({ ...v, color_hex: e.target.value }))}
                      className="input-field flex-1 font-mono text-xs" />
                  </div>
                </div>
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => addVariantMutation.mutate(newVariant)}
                  disabled={!newVariant.size || !newVariant.color || addVariantMutation.isPending}
                  className="btn-primary text-xs py-2 px-6">
                  {addVariantMutation.isPending ? 'Adding…' : 'Add Variant'}
                </button>
                <button type="button" onClick={() => setShowAddVariant(false)} className="btn-outline text-xs py-2 px-6">Cancel</button>
              </div>
            </div>
          )}

          {/* Variants table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {['Size', 'Color', 'SKU', 'Stock', 'Price Adj', ''].map((h) => (
                    <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {variants.map((v) => (
                  <tr key={v.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 font-medium">{v.size}</td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border border-gray-200" style={{ background: v.color_hex }} />
                        {v.color}
                      </div>
                    </td>
                    <td className="px-3 py-2 font-mono text-xs text-gray-500">{v.sku || '—'}</td>
                    <td className="px-3 py-2">
                      <input type="number" defaultValue={v.stock_qty} min="0"
                        onBlur={(e) => {
                          const val = parseInt(e.target.value);
                          if (val !== v.stock_qty) updateVariantMutation.mutate({ variantId: v.id!, data: { stock_qty: val } });
                        }}
                        className="w-20 border border-gray-200 px-2 py-1 text-xs text-center focus:outline-none focus:border-brand-400" />
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-500">₹{v.price_adj}</td>
                    <td className="px-3 py-2">
                      <button onClick={() => deleteVariantMutation.mutate(v.id!)}
                        className="text-red-400 hover:text-red-600 transition-colors p-1">
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!variants.length && (
              <div className="text-center py-8 text-xs text-gray-400">No variants yet — click "Add Variant" to add sizes and colors</div>
            )}
          </div>
          <p className="text-xs text-gray-400">Click the stock number and type a new value, then click away to save.</p>
        </div>
      )}
    </div>
  );
}
