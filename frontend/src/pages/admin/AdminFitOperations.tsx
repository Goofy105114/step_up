import { useQuery } from '@tanstack/react-query';
import { Activity, Footprints, Ruler } from 'lucide-react';
import api from '../../lib/api';

type Breakdown = { label: string; count: number };
type RecentProfile = {
  id: string;
  first_name: string;
  last_name: string;
  foot_length_mm?: string | null;
  usual_size?: string | null;
  arch_preference?: string | null;
  comfort_focus?: string | null;
  updated_at: string;
};

export default function AdminFitOperations() {
  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['admin', 'fit-operations'],
    queryFn: () => api.get('/admin/fit-operations').then(response => response.data),
  });
  const summary = data?.data;
  const total = Number(summary?.totals?.total_profiles || 0);
  const measured = Number(summary?.totals?.profiles_with_measurements || 0);
  const arch: Breakdown[] = summary?.arch_preferences || [];
  const comfort: Breakdown[] = summary?.comfort_focus || [];
  const recent: RecentProfile[] = summary?.recent_profiles || [];

  const breakdown = (title: string, rows: Breakdown[]) => (
    <section className="card p-5">
      <h2 className="text-xs font-bold uppercase tracking-widest text-gray-600">{title}</h2>
      {rows.length === 0 ? <p className="mt-5 text-sm text-gray-400">No profile data recorded.</p> : (
        <div className="mt-5 space-y-4">
          {rows.map(row => (
            <div key={row.label}>
              <div className="mb-1 flex justify-between gap-3 text-sm">
                <span className="capitalize text-gray-700">{row.label}</span>
                <span className="font-semibold tabular-nums text-gray-900">{row.count}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                <div className="h-full rounded-full bg-brand-600" style={{ width: `${total ? Math.min(100, (row.count / total) * 100) : 0}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-display font-bold text-gray-900">Fit Profile Operations</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-500">
          Live summaries of customer-consented, self-reported fit preferences. This is not gait capture, a clinical assessment or a medical dashboard.
        </p>
      </div>
      {isLoading ? <div className="card p-8 text-center text-sm text-gray-400">Loading fit operations…</div> : null}
      {isError ? <div role="alert" className="card p-8 text-center"><p className="text-sm text-red-600">Unable to load fit operations.</p><button type="button" onClick={() => refetch()} disabled={isFetching} className="btn-outline mt-3 px-4 py-2 text-xs">{isFetching ? 'Retrying…' : 'Try again'}</button></div> : null}
      {!isLoading && !isError ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="card flex items-center gap-4 p-5">
              <div className="rounded-xl bg-blue-50 p-3 text-blue-700"><Footprints size={21} /></div>
              <div><p className="text-xs text-gray-500">Consented fit profiles</p><p className="text-2xl font-bold tabular-nums text-gray-900">{total}</p></div>
            </div>
            <div className="card flex items-center gap-4 p-5">
              <div className="rounded-xl bg-emerald-50 p-3 text-emerald-700"><Ruler size={21} /></div>
              <div><p className="text-xs text-gray-500">Profiles with foot measurement</p><p className="text-2xl font-bold tabular-nums text-gray-900">{measured}</p></div>
            </div>
            <div className="card flex items-center gap-4 p-5">
              <div className="rounded-xl bg-amber-50 p-3 text-amber-700"><Activity size={21} /></div>
              <div><p className="text-xs text-gray-500">Profiles without measurement</p><p className="text-2xl font-bold tabular-nums text-gray-900">{Math.max(0, total - measured)}</p></div>
            </div>
          </div>

          {total === 0 ? (
            <div className="card p-8 text-center">
              <h2 className="font-semibold text-gray-800">No fit profile data yet</h2>
              <p className="mt-2 text-sm text-gray-500">Summaries will appear after customers choose to save their fit preferences.</p>
            </div>
          ) : (
            <div className="grid gap-5 lg:grid-cols-2">
              {breakdown('Arch preference', arch)}
              {breakdown('Comfort focus', comfort)}
            </div>
          )}

          <section className="card overflow-hidden">
            <div className="border-b border-gray-100 px-5 py-4"><h2 className="text-xs font-bold uppercase tracking-widest text-gray-600">Recently updated profiles</h2></div>
            {recent.length === 0 ? <p className="p-6 text-sm text-gray-400">No recent profile activity.</p> : (
              <div className="divide-y divide-gray-100">
                {recent.map(profile => (
                  <div key={profile.id} className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-semibold text-gray-900">{[profile.first_name, profile.last_name].filter(Boolean).join(' ') || 'Customer'}</p>
                      <p className="mt-1 text-xs capitalize text-gray-500">{[profile.arch_preference, profile.comfort_focus, profile.usual_size].filter(Boolean).join(' · ') || 'No optional preferences provided'}</p>
                    </div>
                    <span className="text-xs text-gray-400">{new Date(profile.updated_at).toLocaleDateString()}</span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}
