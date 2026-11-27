import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Activity, ChevronLeft, ChevronRight, RefreshCw, ShieldAlert } from 'lucide-react';
import api from '../../lib/api';
import { formatDate, formatPrice } from '../../lib/formatters';

type WebhookEvent = {
  event_id: string;
  event_type: string;
  razorpay_payment_id: string | null;
  razorpay_order_id: string | null;
  order_id: string | null;
  order_number: string | null;
  amount_paise: number | string | null;
  currency: string | null;
  processing_status: 'processed' | 'unmatched';
  received_at: string;
  processed_at: string | null;
};

type WebhookResponse = {
  success: boolean;
  data: WebhookEvent[];
  pagination: { page: number; limit: number; total: number; total_pages: number };
};

export default function AdminWebhookEvents() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('all');
  const events = useQuery<WebhookResponse>({
    queryKey: ['admin', 'razorpay-webhook-events', page, status],
    queryFn: () => api.get('/admin/razorpay/webhook-events', {
      params: { page, limit: 25, ...(status === 'all' ? {} : { processing_status: status }) },
    }).then((response) => response.data),
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
  });

  const rows = events.data?.data ?? [];
  const pagination = events.data?.pagination;
  const money = (paise: number | string | null, currency: string | null) => {
    if (paise === null || paise === undefined || !Number.isFinite(Number(paise))) return '—';
    return formatPrice(Number(paise) / 100, currency || 'INR');
  };

  return (
    <div className="min-w-0 space-y-6">
      <section className="rounded-3xl bg-[#1c2026] p-6 text-white sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[.2em] text-amber-300">Payments · Audit</p>
            <h1 className="mt-2 text-2xl font-extrabold">Razorpay webhook events</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-400">Read-only records of webhook processing. Payloads, signatures and secret material are never displayed here.</p>
          </div>
          <button type="button" onClick={() => events.refetch()} disabled={events.isFetching} className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2.5 text-xs font-bold hover:bg-white/15 disabled:opacity-50">
            <RefreshCw size={14} className={events.isFetching ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><h2 className="text-sm font-extrabold">Event log</h2><p className="mt-1 text-xs text-gray-500">Newest received events appear first. Refreshes every 30 seconds.</p></div>
          <label className="flex items-center gap-2 text-xs font-semibold text-gray-600">Processing status
            <select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }} className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-800">
              <option value="all">All events</option><option value="processed">Processed</option><option value="unmatched">Unmatched</option>
            </select>
          </label>
        </div>

        {events.isLoading ? <div className="space-y-3 py-8">{[1,2,3,4].map((item) => <div key={item} className="h-12 animate-pulse rounded-lg bg-gray-100" />)}</div>
          : events.isError ? <div role="alert" className="my-6 rounded-xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-800"><div className="flex items-center gap-2 font-bold"><ShieldAlert size={17} /> Webhook audit unavailable</div><p className="mt-2">The event log could not be loaded. Check admin access and database availability, then retry.</p><button type="button" onClick={() => events.refetch()} className="mt-3 rounded-lg bg-rose-700 px-3 py-2 text-xs font-bold text-white">Retry</button></div>
          : rows.length === 0 ? <div className="py-14 text-center"><Activity className="mx-auto text-gray-300" size={28}/><p className="mt-3 text-sm font-semibold text-gray-700">No webhook events found</p><p className="mt-1 text-xs text-gray-500">There are no records for this filter.</p></div>
          : <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[900px] text-left">
            <thead className="bg-gray-50 text-[10px] uppercase tracking-wider text-gray-400"><tr><th className="px-4 py-3">Event</th><th className="px-4 py-3">Order / payment</th><th className="px-4 py-3">Amount</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Received</th><th className="px-4 py-3">Processed</th></tr></thead>
            <tbody className="divide-y divide-gray-100">{rows.map((event) => <tr key={event.event_id} className="align-top hover:bg-gray-50">
              <td className="px-4 py-4"><p className="max-w-[220px] break-all text-xs font-bold text-gray-900">{event.event_type}</p><p className="mt-1 max-w-[220px] break-all font-mono text-[10px] text-gray-400">{event.event_id}</p></td>
              <td className="px-4 py-4"><p className="text-xs font-semibold text-gray-800">{event.order_number || (event.order_id ? 'Linked order' : 'Unmatched')}</p><p className="mt-1 font-mono text-[10px] text-gray-500">{event.razorpay_payment_id || event.razorpay_order_id || 'No provider reference'}</p></td>
              <td className="px-4 py-4 text-xs font-semibold text-gray-800">{money(event.amount_paise, event.currency)}</td>
              <td className="px-4 py-4"><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold capitalize ${event.processing_status === 'processed' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{event.processing_status}</span></td>
              <td className="whitespace-nowrap px-4 py-4 text-xs text-gray-600">{event.received_at ? formatDate(event.received_at) : '—'}</td>
              <td className="whitespace-nowrap px-4 py-4 text-xs text-gray-600">{event.processed_at ? formatDate(event.processed_at) : '—'}</td>
            </tr>)}</tbody>
          </table></div>}

        {!events.isLoading && !events.isError && pagination && <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-4">
          <p className="text-xs text-gray-500">{pagination.total.toLocaleString('en-IN')} event(s) · Page {pagination.page} of {Math.max(pagination.total_pages, 1)}</p>
          <div className="flex items-center gap-2"><button type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page <= 1 || events.isFetching} className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold disabled:opacity-40"><ChevronLeft size={14}/> Previous</button><button type="button" onClick={() => setPage((current) => current + 1)} disabled={page >= (pagination.total_pages || 1) || events.isFetching} className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold disabled:opacity-40">Next <ChevronRight size={14}/></button></div>
        </div>}
      </section>
    </div>
  );
}
