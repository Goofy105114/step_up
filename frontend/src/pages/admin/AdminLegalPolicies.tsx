import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Save, ShieldCheck, AlertTriangle } from 'lucide-react';
import api from '../../lib/api';
import toast from 'react-hot-toast';

type Policy = { slug: string; title: string; status: 'draft' | 'published'; content: string };
type PolicySettings = { policies: Policy[]; business_identity: Record<string, string>; operational_confirmation: Record<string, any> };

export default function AdminLegalPolicies() {
  const client = useQueryClient();
  const [settings, setSettings] = useState<PolicySettings | null>(null);
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin', 'legal-policies'],
    queryFn: () => api.get('/admin/legal-policies').then(r => r.data.data.setting_value as PolicySettings),
  });
  useEffect(() => { if (data) setSettings(data); }, [data]);
  const save = useMutation({
    mutationFn: (setting_value: PolicySettings) => api.put('/admin/legal-policies', { setting_value }),
    onSuccess: async () => { toast.success('Legal policy drafts saved'); await client.invalidateQueries({ queryKey: ['admin', 'legal-policies'] }); },
    onError: (error: any) => toast.error(error.response?.data?.message || 'Unable to save policies'),
  });
  const update = (slug: string, patch: Partial<Policy>) => setSettings(current => current ? ({
    ...current, policies: current.policies.map(policy => policy.slug === slug ? { ...policy, ...patch } : policy)
  }) : current);
  const placeholders = settings?.policies.some(policy => policy.status === 'published' && /\[[A-Z][A-Z _-]+\]/.test(policy.content));

  return <div className="max-w-5xl space-y-6">
    <header>
      <div className="flex items-center gap-2 text-amber-700"><ShieldCheck size={18}/><p className="text-xs font-bold uppercase tracking-widest">Compliance workspace</p></div>
      <h1 className="mt-2 text-2xl font-bold">Legal policies</h1>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-500">Edit the four customer-facing policy drafts. Nothing is visible publicly until explicitly published. Confirm actual company details and operations, and obtain legal review before publication.</p>
    </header>
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
      <div className="flex items-center gap-2 font-bold"><AlertTriangle size={17}/> Important</div>
      <p className="mt-1">Do not invent the legal entity, address, grievance contact, GSTIN, delivery commitments or return terms. The migration creates drafts only. Publishing is blocked while obvious company placeholders remain.</p>
    </div>
    {isLoading ? <p className="text-sm text-gray-500">Loading legal policy settings…</p> : isError || !settings ? <div className="rounded-xl border p-6"><p className="text-sm text-red-700">Policy settings are not available. Apply the reviewed legal-policy migration to the database first.</p><button onClick={() => refetch()} className="btn-outline mt-3 px-4 py-2">Retry</button></div> :
      <div className="space-y-5">{settings.policies.map(policy => <section key={policy.slug} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><h2 className="font-bold text-gray-900">{policy.title}</h2><p className="mt-1 text-xs text-gray-500">/{policy.slug}</p></div>
          <select value={policy.status} onChange={e => update(policy.slug, { status: e.target.value as Policy['status'] })} className="rounded-lg border border-gray-300 px-3 py-2 text-sm">
            <option value="draft">Draft — private</option><option value="published">Published — public</option>
          </select>
        </div>
        <textarea value={policy.content} onChange={e => update(policy.slug, { content: e.target.value })} rows={13} className="mt-4 w-full rounded-xl border border-gray-300 p-4 text-sm leading-6 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100" />
      </section>)}</div>}
    {placeholders && <p role="alert" className="text-sm font-medium text-red-700">A published policy still contains a company-specific placeholder. Resolve it before saving.</p>}
    {settings && <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white p-4">
      <p className="text-xs text-gray-500">Saving updates the database only. It does not execute a migration or deploy the website.</p>
      <button disabled={save.isPending || isLoading || !settings || placeholders} onClick={() => save.mutate(settings)} className="btn-primary inline-flex items-center gap-2 px-5 py-3"><Save size={16}/>{save.isPending ? 'Saving…' : 'Save policy settings'}</button>
    </div>}
  </div>;
}
