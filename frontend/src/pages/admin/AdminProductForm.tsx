import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import { ArrowLeft, Save, Plus, Trash2, Image, Upload } from 'lucide-react';

interface ProductForm {
  name: string; slug: string; sku: string; description: string; short_description: string;
  category_id: string; base_price: string; sale_price: string;
  material: string; care_instructions: string; tags: string;
  arch_support_level: string; arch_height_mm: string; durometer_shore_a: string;
  calibration_reference: string; calibrated_at: string; calibration_notes: string;
  is_featured: boolean; is_new_arrival: boolean; is_bestseller: boolean; is_active: boolean;
  generic_product_name: string; manufacturer_name: string; packer_name: string; importer_name: string;
  country_of_origin: string; consumer_care_details: string; mrp_inr: string; declarations_verified: boolean;
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
  generic_product_name: '', manufacturer_name: '', packer_name: '', importer_name: '',
  country_of_origin: '', consumer_care_details: '', mrp_inr: '', declarations_verified: false,
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
  const [uploadingImage, setUploadingImage] = useState(false);
  const [newVariant, setNewVariant] = useState<Variant>(emptyVariant);
  const [showAddVariant, setShowAddVariant] = useState(false);
  const [addingStandardSizes, setAddingStandardSizes] = useState(false);

  const { data: categories, isLoading: categoriesLoading, isError: categoriesError, refetch: refetchCategories, isFetching: categoriesFetching } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get('/categories').then((r) => r.data.data),
  });

  // Load existing product data
  const { data: productData, isLoading: productLoading, isError: productError, refetch: refetchProduct, isFetching: productFetching } = useQuery({
    queryKey: ['admin-product', id],
    enabled: isEdit,
    queryFn: () => api.get(`/admin/products/${id}`).then((r) => r.data.data),
  });

  const { data: priceHistoryData, isLoading: priceHistoryLoading } = useQuery({
    queryKey: ['admin-product-price-history', id],
    enabled: isEdit,
    queryFn: () => api.get(`/admin/products/${id}/price-history`).then((r) => r.data.data),
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
      generic_product_name: productData.generic_product_name || '',
      manufacturer_name: productData.manufacturer_name || '',
      packer_name: productData.packer_name || '',
      importer_name: productData.importer_name || '',
      country_of_origin: productData.country_of_origin || '',
      consumer_care_details: productData.consumer_care_details || '',
      mrp_inr: productData.mrp_inr ?? '',
      declarations_verified: productData.declarations_verified === true,
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
    onError: (error: any) => toast.error(error.response?.data?.message || 'Unable to update stock'),
  });

  const addVariantMutation = useMutation({
    mutationFn: (data: any) => api.post(`/admin/products/${id}/variants`, data),
    onSuccess: () => {
      toast.success('Variant added');
      setNewVariant(emptyVariant);
      setShowAddVariant(false);
      qc.invalidateQueries({ queryKey: ['admin-product', id] });
    },
    onError: (error: any) => toast.error(error.response?.data?.message || 'Unable to add variant'),
  });


  const addStandardSizes = async () => {
    if (!id || addingStandardSizes) return;
    setAddingStandardSizes(true);
    const targetColor = variants[0]?.color || 'Black';
    const targetHex = variants[0]?.color_hex || '#202820';
    const existing = new Set(variants.filter(v => v.color.trim().toLowerCase() === targetColor.toLowerCase()).map(v => String(v.size)));
    const missing = ['6', '7', '8', '9', '10', '11'].filter(size => !existing.has(size));
    if (!missing.length) {
      toast.success('Sizes 6–11 are already set up for this colour');
      setAddingStandardSizes(false);
      return;
    }
    try {
      for (const size of missing) {
        const skuBase = (form.sku || form.slug || 'STEPUP').toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-|-$/g, '');
        await api.post(`/admin/products/${id}/variants`, {
          size, color: targetColor, color_hex: targetHex, stock_qty: 0, price_adj: 0,
          sku: `${skuBase}-BLK-${size}`.slice(0, 150),
        });
      }
      toast.success(`Added sizes ${missing.join(', ')} with zero stock. Set actual stock quantities before publishing.`);
      await qc.invalidateQueries({ queryKey: ['admin-product', id] });
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Some sizes could not be added. Refresh the product to review variants.');
      await qc.invalidateQueries({ queryKey: ['admin-product', id] });
    } finally {
      setAddingStandardSizes(false);
    }
  };

  const deleteVariantMutation = useMutation({
    mutationFn: (variantId: string) => api.delete(`/admin/products/${id}/variants/${variantId}`),
    onSuccess: () => { toast.success('Variant removed'); qc.invalidateQueries({ queryKey: ['admin-product', id] }); },
    onError: (error: any) => toast.error(error.response?.data?.message || 'Unable to remove variant'),
  });

  const addImageMutation = useMutation({
    mutationFn: (url: string) => api.post(`/admin/products/${id}/images`, { url, is_primary: images.length === 0 }),
    onSuccess: () => { toast.success('Image added'); setNewImageUrl(''); qc.invalidateQueries({ queryKey: ['admin-product', id] }); },
    onError: (error: any) => toast.error(error.response?.data?.message || 'Unable to add image'),
  });

  const uploadProductImage = async (file: File) => {
    if (!id || uploadingImage) return;
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Choose a JPG, PNG, WebP or AVIF image');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image must be 10 MB or smaller');
      return;
    }

    setUploadingImage(true);
    try {
      const signatureResponse = await api.post(`/admin/products/${id}/images/upload-signature`);
      const signature = signatureResponse.data.data;
      const uploadBody = new FormData();
      uploadBody.append('file', file);
      uploadBody.append('api_key', signature.api_key);
      uploadBody.append('timestamp', String(signature.timestamp));
      uploadBody.append('folder', signature.folder);
      uploadBody.append('allowed_formats', signature.allowed_formats);
      uploadBody.append('signature', signature.signature);

      const cloudResponse = await fetch(`https://api.cloudinary.com/v1_1/${signature.cloud_name}/image/upload`, {
        method: 'POST',
        body: uploadBody,
      });
      const uploaded = await cloudResponse.json();
      if (!cloudResponse.ok || typeof uploaded.secure_url !== 'string') {
        throw new Error(uploaded.error?.message || 'Cloud image upload failed');
      }
      await addImageMutation.mutateAsync(uploaded.secure_url);
    } catch (error: any) {
      toast.error(error.response?.data?.message || error.message || 'Unable to upload product image');
    } finally {
      setUploadingImage(false);
    }
  };

  const deleteImageMutation = useMutation({
    mutationFn: (imageId: string) => api.delete(`/admin/products/${id}/images/${imageId}`),
    onSuccess: () => { toast.success('Image removed'); qc.invalidateQueries({ queryKey: ['admin-product', id] }); },
    onError: (error: any) => toast.error(error.response?.data?.message || 'Unable to remove image'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const basePrice = Number(form.base_price);
    const salePrice = form.sale_price === '' ? null : Number(form.sale_price);
    const archHeight = form.arch_height_mm === '' ? null : Number(form.arch_height_mm);
    const durometer = form.durometer_shore_a === '' ? null : Number(form.durometer_shore_a);
    if (!form.name.trim() || !form.slug.trim() || form.base_price.trim() === '') {
      toast.error('Name, slug and base price are required'); return;
    }
    if (!Number.isFinite(basePrice) || basePrice <= 0) { toast.error('Base price must be greater than ₹0'); return; }
    if (salePrice !== null && (!Number.isFinite(salePrice) || salePrice < 0 || salePrice >= basePrice)) { toast.error('Sale price must be below the base price'); return; }
    if (archHeight !== null && (!Number.isFinite(archHeight) || archHeight <= 0)) { toast.error('Arch height must be greater than 0 mm'); return; }
    if (durometer !== null && (!Number.isFinite(durometer) || durometer < 0 || durometer > 100)) { toast.error('Durometer must be between 0 and 100 Shore A'); return; }
    saveMutation.mutate({
      ...form,
      sku: form.sku.trim() || null,
      care_instructions: form.care_instructions.trim() || null,
      arch_support_level: form.arch_support_level || null,
      arch_height_mm: archHeight,
      durometer_shore_a: durometer,
      calibration_reference: form.calibration_reference.trim() || null,
      calibrated_at: form.calibrated_at || null,
      calibration_notes: form.calibration_notes.trim() || null,
      base_price: basePrice,
      sale_price: salePrice,
      generic_product_name: form.generic_product_name.trim() || null,
      manufacturer_name: form.manufacturer_name.trim() || null,
      packer_name: form.packer_name.trim() || null,
      importer_name: form.importer_name.trim() || null,
      country_of_origin: form.country_of_origin.trim() || null,
      consumer_care_details: form.consumer_care_details.trim() || null,
      mrp_inr: form.mrp_inr === '' ? null : Number(form.mrp_inr),
      declarations_verified: form.declarations_verified,
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

      {isEdit && productLoading && <div role="status" className="bg-white border border-gray-200 p-8 text-center text-sm text-gray-500">Loading product details…</div>}
      {isEdit && productError && <div role="alert" className="bg-white border border-red-200 p-6 text-sm"><p className="text-red-700">Unable to load this product. No placeholder values have been loaded.</p><button type="button" onClick={() => refetchProduct()} disabled={productFetching} className="btn-outline mt-3 px-4 py-2 text-xs">{productFetching ? 'Retrying…' : 'Retry loading product'}</button></div>}
      {(!isEdit || (!productLoading && !productError && productData)) && <form onSubmit={handleSubmit} className="space-y-6">

        {/* Basic info */}
        <div className="bg-white border border-gray-200 p-6 space-y-4">
          <div><h2 className="text-xs font-bold uppercase tracking-widest text-gray-700 pb-3 border-b border-gray-100">Basic Information</h2><p className="mt-2 text-xs text-gray-500">Product photos are optional. You can create the product now and add photography later.</p></div>
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
            {isEdit && (
              <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-4 sm:col-span-2">
                <h3 className="text-sm font-bold text-gray-900">Price history & promotion evidence</h3>
                {priceHistoryLoading ? <p className="mt-2 text-xs text-gray-500">Loading price history…</p> : priceHistoryData ? (
                  <>
                    <p className="mt-2 text-sm text-gray-700">{priceHistoryData.disclosure?.history_complete
                      ? 'At least 30 days of continuous price history is recorded.'
                      : 'A 30-day comparison is not yet available. No historical prices have been invented.'}</p>
                    {priceHistoryData.disclosure?.prior_30_day_lowest_price !== null && priceHistoryData.disclosure?.prior_30_day_lowest_price !== undefined && (
                      <p className="mt-1 text-xs text-gray-600">Lowest recorded price in prior 30 days: ₹{Number(priceHistoryData.disclosure.prior_30_day_lowest_price).toFixed(2)}</p>
                    )}
                    <p className="mt-1 text-xs text-gray-500">{priceHistoryData.disclosure?.reason || 'This price can be compared against the previous 30-day low.'}</p>
                    <div className="mt-3 space-y-1">
                      {priceHistoryData.history?.slice(0, 5).map((entry: any) => (
                        <p key={entry.valid_from} className="text-xs text-gray-500">{new Date(entry.valid_from).toLocaleString('en-IN')} · ₹{Number(entry.effective_price).toFixed(2)} · {entry.change_type.replace('_', ' ')}</p>
                      ))}
                    </div>
                  </>
                ) : <p className="mt-2 text-xs text-amber-700">Price history is unavailable. Confirm that the reviewed price-history migration has been applied before publishing promotions.</p>}
              </div>
            )}
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
              {categoriesLoading && <p className="mt-1 text-xs text-gray-400">Loading categories…</p>}
              {categoriesError && <div role="alert" className="mt-1 text-xs text-red-600">Categories could not be loaded. <button type="button" onClick={() => refetchCategories()} disabled={categoriesFetching} className="underline">{categoriesFetching ? 'Retrying…' : 'Retry'}</button></div>}
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

        {/* Legal / packaged commodity declarations */}
        <div className="bg-white border border-gray-200 p-6 space-y-4">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-widest text-gray-700 pb-3 border-b border-gray-100">Product Legal Declarations</h2>
            <p className="mt-2 text-xs leading-5 text-gray-500">Enter details exactly as supported by the product label, packaging and supplier records. Applicability depends on the product and seller role. Unverified details are not displayed publicly.</p>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div><label className="label">Generic / common product name</label><input value={form.generic_product_name} onChange={e => setField('generic_product_name', e.target.value)} className="input-field" maxLength={255} /></div>
            <div><label className="label">Country of origin</label><input value={form.country_of_origin} onChange={e => setField('country_of_origin', e.target.value)} className="input-field" maxLength={120} placeholder="As stated on the product/package" /></div>
            <div><label className="label">Manufacturer name</label><input value={form.manufacturer_name} onChange={e => setField('manufacturer_name', e.target.value)} className="input-field" maxLength={255} /></div>
            <div><label className="label">Packer name (if applicable)</label><input value={form.packer_name} onChange={e => setField('packer_name', e.target.value)} className="input-field" maxLength={255} /></div>
            <div><label className="label">Importer name (if applicable)</label><input value={form.importer_name} onChange={e => setField('importer_name', e.target.value)} className="input-field" maxLength={255} /></div>
            <div><label className="label">MRP (₹)</label><input type="number" min="0.01" step="0.01" value={form.mrp_inr} onChange={e => setField('mrp_inr', e.target.value)} className="input-field" placeholder="As printed on package" /></div>
          </div>
          <div><label className="label">Consumer care contact / address as declared on package</label><textarea rows={2} value={form.consumer_care_details} onChange={e => setField('consumer_care_details', e.target.value)} className="input-field resize-y" maxLength={2000} /></div>
          <label className="flex items-start gap-3 text-xs text-gray-700">
            <input type="checkbox" checked={form.declarations_verified} onChange={e => setField('declarations_verified', e.target.checked)} className="mt-0.5 h-4 w-4" />
            <span><strong>Verify these declarations for public display.</strong> I have checked the applicable fields against authentic packaging/supplier records and confirmed which manufacturer, packer or importer details apply.</span>
          </label>
          <p className="text-xs text-amber-700">Changing any declaration field resets verification. Do not mark verified based on assumptions or catalogue copy.</p>
        </div>

        {/* Flags */}
        <div className="bg-white border border-gray-200 p-6">
          <h2 className="text-xs font-bold uppercase tracking-widest text-gray-700 pb-3 border-b border-gray-100 mb-4">Visibility & Badges</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {([['is_active', 'Active'], ['is_featured', 'Featured'], ['is_new_arrival', 'New Arrival'], ['is_bestseller', 'Bestseller']] as [keyof ProductForm, string][]).map(([key, label]) => (
              <label key={key} className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={Boolean(form[key])} onChange={(e) => setField(key, e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500" />
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
      </form>}

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
                <button type="button" aria-label={`Remove image ${img.alt_text || img.url}`} disabled={deleteImageMutation.isPending} onClick={() => deleteImageMutation.mutate(img.id)}
                  className="absolute top-1 right-1 bg-red-500 text-white p-1 opacity-0 group-hover:opacity-100 focus:opacity-100 disabled:opacity-50 transition-opacity">
                  <Trash2 size={10} />
                </button>
              </div>
            ))}
          </div>
          {!images.length && <p className="text-xs text-gray-500">No product images have been added yet.</p>}
          <div className="space-y-3">
            <label className="flex flex-col sm:flex-row sm:items-center gap-3 border border-dashed border-gray-300 p-4 cursor-pointer hover:border-brand-500 transition-colors">
              <span className="flex items-center gap-2 text-sm font-semibold text-gray-700"><Upload size={16} /> Upload product photo</span>
              <span className="text-xs text-gray-400">JPG, PNG, WebP or AVIF · Max 10 MB</span>
              <input type="file" accept="image/jpeg,image/png,image/webp,image/avif" disabled={uploadingImage || addImageMutation.isPending}
                onChange={(e) => { const file = e.target.files?.[0]; if (file) void uploadProductImage(file); e.currentTarget.value = ''; }}
                className="text-xs sm:ml-auto" />
            </label>
            {uploadingImage && <p role="status" className="text-xs text-brand-700">Uploading image securely…</p>}
            <div className="flex gap-3">
              <input type="url" value={newImageUrl} onChange={(e) => setNewImageUrl(e.target.value)}
                className="input-field flex-1" placeholder="Or paste an existing HTTPS image URL" />
              <button type="button" disabled={!/^https:\/\//i.test(newImageUrl.trim()) || addImageMutation.isPending || uploadingImage}
                onClick={() => addImageMutation.mutate(newImageUrl.trim())}
                className="btn-primary px-5 flex items-center gap-2 shrink-0">
                <Plus size={14} /> Add URL
              </button>
            </div>
          </div>
          <p className="text-xs text-gray-400">The first image becomes the primary product photo. Uploaded files are stored in the company Cloudinary account.</p>
        </div>
      )}

      {/* Variants / Stock — only shown for existing products */}
      {isEdit && (
        <div className="bg-white border border-gray-200 p-6 space-y-4 mt-6">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <h2 className="text-xs font-bold uppercase tracking-widest text-gray-700">Variants & Stock</h2>
            <button type="button" onClick={addStandardSizes} disabled={addingStandardSizes} className="btn-outline text-xs py-1.5 px-4">{addingStandardSizes ? "Adding sizes…" : "Quick add sizes 6–11"}</button>
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
                      <input type="number" defaultValue={v.stock_qty} min="0" step="1" aria-label={`Stock quantity for size ${v.size}, ${v.color}`}
                        onBlur={(e) => {
                          const val = Number(e.target.value);
                          if (!Number.isInteger(val) || val < 0) { toast.error('Stock must be a whole number of 0 or more'); e.target.value = String(v.stock_qty); return; }
                          if (val !== v.stock_qty) updateVariantMutation.mutate({ variantId: v.id!, data: { stock_qty: val } });
                        }}
                        className="w-20 border border-gray-200 px-2 py-1 text-xs text-center focus:outline-none focus:border-brand-400" />
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-500">₹{v.price_adj}</td>
                    <td className="px-3 py-2">
                      <button type="button" aria-label={`Remove variant size ${v.size}, ${v.color}`} disabled={deleteVariantMutation.isPending} onClick={() => deleteVariantMutation.mutate(v.id!)}
                        className="text-red-400 hover:text-red-600 disabled:opacity-50 transition-colors p-1">
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
          <p className="text-xs text-gray-400">The quick size shortcut adds UK sizes 6–11 in Black in the first existing colour (or Black for a new product), with stock set to 0. Enter verified stock quantities before making them available to customers.</p>
        </div>
      )}
    </div>
  );
}
