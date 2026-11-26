import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import { useState } from 'react';
import { formatDate, formatPrice } from '../../lib/formatters';

type ReturnRequest = {
  id: string;
  order_number: string;
  total_amount: string;
  order_status: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  reason: string;
  status: 'requested' | 'approved' | 'rejected' | 'received';
  admin_note?: string | null;
  created_at: string;
};

export default function AdminReturns() {
  const qc = useQueryClient();
  const [notes, setNotes] = useState<Record<string, string>>({});
  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['admin', 'return-requests'],
    queryFn: () => api.get('/admin/return-requests').then(response => response.data),
  });
  const mutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/admin/return-requests/${id}`, { status, admin_note: notes[id]?.trim() || null }),
    onSuccess: (_response, variables) => {
      toast.success('Return request updated');
      qc.invalidateQueries({ queryKey: ['admin', 'return-requests'] });
      setNotes((current) => { const next = { ...current }; delete next[variables.id]; return next; });
    },
    onError: (error: any) => toast.error(error.response?.data?.message || 'Unable to update return request'),
  });
  const requests: ReturnRequest[] = data?.data || [];
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-display font-bold text-gray-900">Return Requests</h1>
        <p className="mt-2 text-sm text-gray-500">Review customer requests. Approval does not automatically issue a refund.</p>
      </div>
      {isLoading && <div className="card p-8 text-center text-gray-400">Loading return requests…</div>}
      {isError && <div role="alert" className="card p-8 text-center"><p className="text-sm text-red-600">Unable to load return requests. No return decisions have been changed.</p><button type="button" onClick={() => refetch()} disabled={isFetching} className="btn-outline mt-4 px-4 py-2 text-xs">{isFetching ? 'Retrying…' : 'Try again'}</button></div>}
      {!isLoading && !isError && requests.length === 0 && <div className="card p-10 text-center text-gray-500">No return requests yet.</div>}
      <div className="space-y-4">
        {requests.map(item => (
          <section key={item.id} className="card p-5 space-y-3">
            <div className="flex flex-wrap justify-between gap-3">
              <div>
                <p className="font-semibold text-gray-900">{item.order_number}</p>
                <p className="text-sm text-gray-500">{item.first_name} {item.last_name} · {item.email}</p>
                <p className="text-xs text-gray-400">{formatDate(item.created_at)}</p>
              </div>
              <div className="text-right">
                <p className="font-semibold">{formatPrice(Number(item.total_amount))}</p>
                <p className="text-xs uppercase tracking-wide text-gray-500">{item.status}</p>
              </div>
            </div>
            <p className="rounded-lg bg-gray-50 p-3 text-sm text-gray-700">{item.reason}</p>
            {item.admin_note && <p className="text-xs text-gray-500">Previous admin note: {item.admin_note}</p>}
            {item.status !== 'received' && item.status !== 'rejected' && (
              <label className="block space-y-1">
                <span className="text-xs font-medium text-gray-600">Review note (optional)</span>
                <textarea value={notes[item.id] ?? ''} onChange={(event) => setNotes((current) => ({ ...current, [item.id]: event.target.value }))} maxLength={1000} rows={2} placeholder="Add the reason for your decision or receipt condition" className="w-full rounded-lg border border-gray-200 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300" />
              </label>
            )}
            {item.status === 'requested' && (
              <div className="flex gap-2">
                <button type="button" disabled={mutation.isPending} onClick={() => mutation.mutate({ id: item.id, status: 'approved' })} className="btn-primary px-4 py-2 text-xs">Approve</button>
                <button type="button" disabled={mutation.isPending} onClick={() => mutation.mutate({ id: item.id, status: 'rejected' })} className="btn-outline px-4 py-2 text-xs">Reject</button>
              </div>
            )}
            {item.status === 'approved' && (
              <button type="button" disabled={mutation.isPending} onClick={() => mutation.mutate({ id: item.id, status: 'received' })} className="btn-outline px-4 py-2 text-xs">Mark item received</button>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
