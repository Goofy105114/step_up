import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import { formatPrice, formatDate } from '../../lib/formatters';

export default function AdminUsers() {
  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['admin', 'users'],
    queryFn: () => api.get('/admin/users').then((r) => r.data),
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-2xl font-display font-bold text-gray-900">Customers</h1>
      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-400">Loading…</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>{['Customer','Role','Joined','Orders','Lifetime Value'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                ))}</tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {(data?.data || []).map((u: any) => (
                  <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center">
                          <span className="text-xs font-bold text-brand-600">{u.first_name?.[0]?.toUpperCase() || 'C'}</span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{u.first_name} {u.last_name}</p>
                          <p className="text-xs text-gray-400">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`badge capitalize ${u.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'}`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{formatDate(u.created_at)}</td>
                    <td className="px-4 py-3 font-semibold text-gray-900">{u.order_count}</td>
                    <td className="px-4 py-3 font-semibold text-gray-900">{formatPrice(parseFloat(u.lifetime_value))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!data?.data?.length && <div className="text-center py-12 text-gray-400">No users found</div>}
          </div>
        )}
      </div>
    </div>
  );
}
