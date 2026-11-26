import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import { formatPrice } from '../../lib/formatters';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import { Package } from 'lucide-react';

export default function AdminProducts() {
  const qc = useQueryClient();

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['admin', 'products'],
    queryFn: () => api.get('/admin/products').then((r) => r.data),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
      api.patch(`/admin/products/${id}`, { is_active }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin', 'products'] }); toast.success('Product status updated'); },
    onError: (error: any) => toast.error(error.response?.data?.message || 'Unable to update product status'),
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-lg font-bold uppercase tracking-widest text-gray-900">Products</h1>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400">{isLoading || isError ? '—' : `${data?.data?.length || 0} products`}</span>
          <Link to="/admin/products/new" className="btn-primary text-xs py-2 px-4 flex items-center gap-1.5">
            + Add Product
          </Link>
        </div>
      </div>

      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-400">Loading…</div>
        ) : isError ? (
          <div role="alert" className="p-8 text-center"><p className="text-sm text-red-600">Unable to load products.</p><button type="button" onClick={() => refetch()} disabled={isFetching} className="btn-outline mt-3 px-4 py-2 text-xs">{isFetching ? 'Retrying…' : 'Try again'}</button></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>{['Product','Category','Price','Stock','Status',''].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                ))}</tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {(data?.data || []).map((p: any) => (
                  <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gray-100 overflow-hidden shrink-0">
                          {p.primary_image
                            ? <img src={p.primary_image} alt="" className="w-full h-full object-cover" />
                            : <div className="w-full h-full flex items-center justify-center"><Package size={16} className="text-gray-300" /></div>}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 line-clamp-1">{p.name}</p>
                          <p className="text-xs text-gray-400 font-mono">{p.sku || '—'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{p.category_name || '—'}</td>
                    <td className="px-4 py-3 font-semibold text-gray-900">
                      {formatPrice(parseFloat(p.sale_price || p.base_price))}
                      {p.sale_price && <span className="text-xs text-gray-400 ml-1 line-through">{formatPrice(parseFloat(p.base_price))}</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-sm font-semibold ${parseInt(p.total_stock) < 10 ? 'text-red-600' : 'text-green-600'}`}>
                        {p.total_stock}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button type="button" disabled={toggleMutation.isPending} aria-label={`${p.is_active ? 'Deactivate' : 'Activate'} ${p.name}`} onClick={() => toggleMutation.mutate({ id: p.id, is_active: !p.is_active })}
                        className={`badge cursor-pointer ${p.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {p.is_active ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Link to={`/product/${p.slug}`} target="_blank"
                          className="text-xs text-brand-600 hover:text-brand-800 font-medium">View</Link>
                        <Link to={`/admin/products/${p.id}/edit`}
                          className="text-xs text-gray-500 hover:text-gray-900 font-medium">Edit</Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!data?.data?.length && (
              <div className="text-center py-12 text-gray-400">No products found</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
