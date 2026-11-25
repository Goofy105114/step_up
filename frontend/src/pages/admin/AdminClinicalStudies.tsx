import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ExternalLink, FileText, Plus, Trash2 } from 'lucide-react';
import api from '../../lib/api';
import toast from 'react-hot-toast';

type Study = {
  id: string;
  title: string;
  authors?: string | null;
  publication?: string | null;
  publication_date?: string | null;
  doi?: string | null;
  source_url: string;
  document_url?: string | null;
  summary?: string | null;
  source_verified: boolean;
  is_published: boolean;
};

const emptyForm = {
  title: '',
  authors: '',
  publication: '',
  publication_date: '',
  doi: '',
  source_url: '',
  document_url: '',
  summary: '',
  source_verified: false,
  is_published: false,
};

export default function AdminClinicalStudies() {
  const [form, setForm] = useState(emptyForm);
  const queryClient = useQueryClient();
  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin', 'clinical-studies'],
    queryFn: () => api.get('/admin/clinical-studies').then(response => response.data),
  });
  const studies: Study[] = data?.data || [];

  const createMutation = useMutation({
    mutationFn: (payload: typeof emptyForm) => api.post('/admin/clinical-studies', payload),
    onSuccess: () => {
      toast.success('Source added to the research library');
      setForm(emptyForm);
      queryClient.invalidateQueries({ queryKey: ['admin', 'clinical-studies'] });
      queryClient.invalidateQueries({ queryKey: ['clinical-studies'] });
    },
    onError: (error: any) => toast.error(error.response?.data?.message || 'Unable to add this source'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<Study> }) =>
      api.patch(`/admin/clinical-studies/${id}`, payload),
    onSuccess: () => {
      toast.success('Research entry updated');
      queryClient.invalidateQueries({ queryKey: ['admin', 'clinical-studies'] });
      queryClient.invalidateQueries({ queryKey: ['clinical-studies'] });
    },
    onError: (error: any) => toast.error(error.response?.data?.message || 'Unable to update this entry'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/clinical-studies/${id}`),
    onSuccess: () => {
      toast.success('Research entry deleted');
      queryClient.invalidateQueries({ queryKey: ['admin', 'clinical-studies'] });
      queryClient.invalidateQueries({ queryKey: ['clinical-studies'] });
    },
    onError: (error: any) => toast.error(error.response?.data?.message || 'Unable to delete this entry'),
  });

  const setField = (key: keyof typeof emptyForm, value: string | boolean) =>
    setForm(current => ({ ...current, [key]: value }));

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.title.trim() || !form.source_url.trim()) {
      toast.error('A title and original source URL are required');
      return;
    }
    if (form.is_published && !form.source_verified) {
      toast.error('Verify the original source before publishing');
      return;
    }
    createMutation.mutate(form);
  };

  return (
    <div className="max-w-6xl space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-display font-bold text-gray-900">Clinical Studies & Whitepapers</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-500">
          Add real publications with their original source links. Only entries marked as source-verified and published appear in the customer research library.
        </p>
      </div>

      <form onSubmit={submit} className="card space-y-5 p-6">
        <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
          <FileText size={16} className="text-brand-600" />
          <h2 className="text-xs font-bold uppercase tracking-widest text-gray-700">Add a research source</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Title *</label>
            <input className="input-field" value={form.title} onChange={event => setField('title', event.target.value)} required />
          </div>
          <div>
            <label className="label">Authors</label>
            <input className="input-field" value={form.authors} onChange={event => setField('authors', event.target.value)} />
          </div>
          <div>
            <label className="label">Journal / Publisher</label>
            <input className="input-field" value={form.publication} onChange={event => setField('publication', event.target.value)} />
          </div>
          <div>
            <label className="label">Publication date</label>
            <input type="date" className="input-field" value={form.publication_date} onChange={event => setField('publication_date', event.target.value)} />
          </div>
          <div>
            <label className="label">DOI (if available)</label>
            <input className="input-field" value={form.doi} onChange={event => setField('doi', event.target.value)} placeholder="10.xxxx/xxxxx" />
          </div>
          <div>
            <label className="label">Original source URL *</label>
            <input type="url" className="input-field" value={form.source_url} onChange={event => setField('source_url', event.target.value)} placeholder="https://…" required />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Document URL (optional)</label>
            <input type="url" className="input-field" value={form.document_url} onChange={event => setField('document_url', event.target.value)} placeholder="https://…" />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Summary</label>
            <textarea rows={3} className="input-field resize-y" value={form.summary} onChange={event => setField('summary', event.target.value)} placeholder="A neutral summary of the source and its scope." />
          </div>
        </div>
        <div className="flex flex-wrap gap-5 border-t border-gray-100 pt-4">
          <label className="flex items-start gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={form.source_verified} onChange={event => setField('source_verified', event.target.checked)} className="mt-1" />
            <span><strong>Source checked</strong><span className="block text-xs text-gray-500">I reviewed the original publication or publisher record.</span></span>
          </label>
          <label className="flex items-start gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={form.is_published} onChange={event => setField('is_published', event.target.checked)} className="mt-1" />
            <span><strong>Publish to customer library</strong><span className="block text-xs text-gray-500">Available only when source checked is selected.</span></span>
          </label>
        </div>
        <button type="submit" disabled={createMutation.isPending} className="btn-primary inline-flex items-center gap-2 px-6">
          <Plus size={15} /> {createMutation.isPending ? 'Saving…' : 'Add source'}
        </button>
      </form>

      <section className="card overflow-hidden">
        <div className="border-b border-gray-100 px-6 py-4">
          <h2 className="text-xs font-bold uppercase tracking-widest text-gray-700">Research entries</h2>
        </div>
        {isLoading ? <p className="p-8 text-center text-sm text-gray-400">Loading sources…</p> : null}
        {isError ? <p className="p-8 text-center text-sm text-red-600">Unable to load research entries.</p> : null}
        {!isLoading && !isError && studies.length === 0 ? (
          <p className="p-8 text-center text-sm text-gray-400">No sources have been added. Customer-facing research remains empty until verified records are published.</p>
        ) : null}
        {studies.length > 0 && (
          <div className="divide-y divide-gray-100">
            {studies.map(study => (
              <article key={study.id} className="flex flex-col gap-4 p-5 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0">
                  <h3 className="font-semibold text-gray-900">{study.title}</h3>
                  <p className="mt-1 text-xs text-gray-500">{[study.authors, study.publication, study.publication_date?.slice(0, 10)].filter(Boolean).join(' · ') || 'Publication details not provided'}</p>
                  <a href={study.source_url} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 break-all text-xs text-brand-600 hover:underline">
                    Original source <ExternalLink size={12} />
                  </a>
                  {study.summary ? <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">{study.summary}</p> : null}
                  <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-semibold uppercase tracking-wide">
                    <span className={study.source_verified ? 'rounded-full bg-green-50 px-2 py-1 text-green-700' : 'rounded-full bg-amber-50 px-2 py-1 text-amber-700'}>{study.source_verified ? 'Source checked' : 'Not verified'}</span>
                    <span className={study.is_published ? 'rounded-full bg-blue-50 px-2 py-1 text-blue-700' : 'rounded-full bg-gray-100 px-2 py-1 text-gray-600'}>{study.is_published ? 'Published' : 'Draft'}</span>
                  </div>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <button type="button" onClick={() => updateMutation.mutate({ id: study.id, payload: { source_verified: !study.source_verified, is_published: study.source_verified ? false : study.is_published } })} className="btn-outline px-3 py-2 text-xs">
                    {study.source_verified ? 'Unverify' : 'Verify source'}
                  </button>
                  <button type="button" disabled={!study.source_verified} onClick={() => updateMutation.mutate({ id: study.id, payload: { is_published: !study.is_published } })} className="btn-outline px-3 py-2 text-xs disabled:opacity-40">
                    {study.is_published ? 'Unpublish' : 'Publish'}
                  </button>
                  <button type="button" onClick={() => {
                    if (window.confirm('Delete this research entry?')) deleteMutation.mutate(study.id);
                  }} className="rounded-lg p-2 text-red-600 hover:bg-red-50" aria-label="Delete research entry">
                    <Trash2 size={15} />
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
