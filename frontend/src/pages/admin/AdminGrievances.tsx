import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import { formatDate } from '../../lib/formatters';
import toast from 'react-hot-toast';

type Grievance = {
  id: string; ticket_number: string; customer_name: string; customer_email: string;
  customer_phone: string | null; order_number: string | null; subject: string; message: string;
  status: 'open' | 'in_progress' | 'resolved' | 'rejected'; admin_note: string | null;
  acknowledged_at: string; resolution_due_at: string; resolved_at: string | null; created_at: string;
};

const statuses: Grievance['status'][] = ['open', 'in_progress', 'resolved', 'rejected'];

export default function AdminGrievances() {
  const client = useQueryClient();
  const [drafts, setDrafts] = useState<Record<string, { status: Grievance['status']; admin_note: string }>>({});
  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['admin', 'grievances'],
    queryFn: () => api.get('/admin/grievances').then(response => response.data.data as Grievance[]),
  });
  const save = useMutation({
    mutationFn: ({ id, status, admin_note }: { id: string; status: Grievance['status']; admin_note: string }) =>
      api.patch(`/admin/grievances/${id}`, { status, admin_note }),
    onSuccess: () => { toast.success('Complaint updated'); client.invalidateQueries({ queryKey: ['admin', 'grievances'] }); },
    onError: (error: any) => toast.error(error.response?.data?.message || 'Unable to update complaint'),
  });
  const rows = data || [];
  const overdue = rows.filter(item => !['resolved', 'rejected'].includes(item.status) && new Date(item.resolution_due_at).getTime() < Date.now()).length;

  return <div className="space-y-6">
    <header className="flex flex-wrap items-end justify-between gap-3">
      <div><p className="text-xs font-bold uppercase tracking-widest text-amber-700">Customer care</p><h1 className="mt-1 text-2xl font-bold text-gray-900">Complaints & grievances</h1><p className="mt-2 text-sm text-gray-500">Receipt is acknowledged automatically when a ticket is created. Keep the one-month resolution deadline in view.</p></div>
      <div className="rounded-xl border border-gray-200 bg-white px-4 py-3"><p className="text-xs text-gray-500">Open tickets</p><p className="text-2xl font-bold">{rows.filter(item => !['resolved', 'rejected'].includes(item.status)).length}</p></div>
    </header>
    {overdue > 0 && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-800">{overdue} unresolved complaint(s) are past the current one-month target. Prioritise these immediately.</div>}
    {isLoading ? <p className="rounded-xl border bg-white p-8 text-sm text-gray-500">Loading complaints…</p> : isError ? <div className="rounded-xl border bg-white p-8 text-center"><p className="text-sm text-red-700">Unable to load complaints.</p><button type="button" onClick={() => refetch()} disabled={isFetching} className="btn-outline mt-3 px-4 py-2">Retry</button></div> : !rows.length ? <div className="rounded-xl border bg-white p-10 text-center text-sm text-gray-500">No customer complaints have been submitted.</div> :
      <div className="space-y-4">{rows.map(item => {
        const draft = drafts[item.id] || { status: item.status, admin_note: item.admin_note || '' };
        const due = new Date(item.resolution_due_at);
        const isOverdue = !['resolved', 'rejected'].includes(item.status) && due.getTime() < Date.now();
        return <article key={item.id} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div><p className="font-mono text-sm font-bold text-gray-900">{item.ticket_number}</p><h2 className="mt-1 font-semibold text-gray-900">{item.subject}</h2><p className="mt-1 text-xs text-gray-500">Received {formatDate(item.created_at)} · Acknowledged {formatDate(item.acknowledged_at)}</p></div>
            <span className={`rounded-full px-3 py-1 text-xs font-bold ${isOverdue ? 'bg-red-100 text-red-700' : item.status === 'resolved' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-800'}`}>{item.status.replace('_', ' ')}</span>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="text-sm leading-6 text-gray-700"><p className="font-semibold">{item.customer_name}</p><p><a className="underline" href={`mailto:${item.customer_email}`}>{item.customer_email}</a></p>{item.customer_phone && <p>{item.customer_phone}</p>}{item.order_number && <p>Order: {item.order_number}</p>}</div>
            <p className="whitespace-pre-wrap break-words text-sm leading-6 text-gray-700">{item.message}</p>
          </div>
          <p className={`mt-3 text-xs font-semibold ${isOverdue ? 'text-red-700' : 'text-gray-500'}`}>{item.status === 'resolved' ? `Resolved ${item.resolved_at ? formatDate(item.resolved_at) : 'date unavailable'}` : `Resolution target: ${formatDate(item.resolution_due_at)}`}</p>
          <div className="mt-4 grid gap-3 border-t border-gray-100 pt-4 sm:grid-cols-[180px_1fr_auto]">
            <label className="text-xs font-semibold text-gray-600">Status<select value={draft.status} onChange={event => setDrafts(current => ({ ...current, [item.id]: { ...draft, status: event.target.value as Grievance['status'] } }))} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">{statuses.map(status => <option key={status} value={status}>{status.replace('_', ' ')}</option>)}</select></label>
            <label className="text-xs font-semibold text-gray-600">Internal note<textarea rows={2} maxLength={5000} value={draft.admin_note} onChange={event => setDrafts(current => ({ ...current, [item.id]: { ...draft, admin_note: event.target.value } }))} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" placeholder="Internal note for STEPUP staff" /></label>
            <button type="button" disabled={save.isPending} onClick={() => save.mutate({ id: item.id, ...draft })} className="btn-primary self-end px-4 py-2.5 disabled:opacity-50">Save update</button>
          </div>
        </article>;
      })}</div>}
  </div>;
}
