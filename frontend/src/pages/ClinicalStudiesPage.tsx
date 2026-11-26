import { useQuery } from '@tanstack/react-query';
import { ExternalLink, FileText, RefreshCw } from 'lucide-react';
import api from '../lib/api';

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
};

function formatPublicationDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function ClinicalStudiesPage() {
  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['clinical-studies'],
    queryFn: () => api.get('/clinical-studies').then(response => response.data),
  });
  const studies: Study[] = data?.data || [];

  return (
    <main className="min-h-screen bg-surface">
      <section className="container-site py-12 md:py-20">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-secondary">Research & transparency</p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-primary md:text-5xl">Clinical information, clearly presented.</h1>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-8 text-on-surface-variant">
            Explore published research and technical documents added to the STEPUP library with their original source references. These publications are provided for general information and are not a substitute for professional medical advice.
          </p>
        </div>

        <div className="mx-auto mt-10 max-w-4xl">
          {isLoading ? (
            <div aria-live="polite" className="space-y-4">
              {[1, 2, 3].map(index => <div key={index} className="animate-pulse rounded-2xl border border-outline-variant/50 bg-white p-7"><div className="h-4 w-2/3 rounded bg-gray-100" /><div className="mt-4 h-3 w-1/3 rounded bg-gray-100" /><div className="mt-6 h-3 w-full rounded bg-gray-100" /></div>)}
            </div>
          ) : null}

          {isError ? (
            <div role="alert" className="rounded-3xl border border-outline-variant/50 bg-white p-8 text-center shadow-card md:p-12">
              <FileText size={30} className="mx-auto text-secondary" />
              <h2 className="mt-4 text-xl font-semibold text-primary">The research library is unavailable</h2>
              <p className="mt-2 text-sm leading-7 text-on-surface-variant">Your request didn't load. Try again; no research information has been changed.</p>
              <button type="button" onClick={() => refetch()} disabled={isFetching} className="btn-primary mt-5 inline-flex items-center gap-2 px-5 py-3 disabled:opacity-60"><RefreshCw size={15} className={isFetching ? 'animate-spin' : ''} />{isFetching ? 'Retrying…' : 'Try again'}</button>
            </div>
          ) : null}

          {!isLoading && !isError && studies.length === 0 ? (
            <div className="rounded-3xl border border-outline-variant/50 bg-white p-8 text-center shadow-card md:p-12">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#edf3ee] text-primary"><FileText size={25} /></div>
              <h2 className="mt-5 text-xl font-semibold text-primary">No verified publications have been added yet</h2>
              <p className="mt-3 text-sm leading-7 text-on-surface-variant">We list a source only after an administrator has checked the original publication and approved it. We do not invent study titles, authors, institutions, findings or medical efficacy statistics.</p>
            </div>
          ) : null}

          {!isLoading && !isError && studies.length > 0 ? (
            <div className="space-y-4">
              {studies.map(study => (
                <article key={study.id} className="rounded-2xl border border-outline-variant/50 bg-white p-6 shadow-card transition-shadow hover:shadow-lg md:p-7">
                  <h2 className="text-xl font-semibold leading-snug text-primary">{study.title}</h2>
                  <p className="mt-2 text-sm text-on-surface-variant">{[study.authors, study.publication, formatPublicationDate(study.publication_date)].filter(Boolean).join(' · ') || 'Publication details not provided'}</p>
                  {study.doi ? <p className="mt-2 break-all text-xs text-on-surface-variant">DOI: {study.doi}</p> : null}
                  {study.summary ? <p className="mt-4 text-sm leading-7 text-on-surface-variant">{study.summary}</p> : null}
                  <div className="mt-5 flex flex-wrap gap-x-5 gap-y-3">
                    {study.source_url ? <a href={study.source_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline">Original publication <ExternalLink size={14} /></a> : null}
                    {study.document_url ? <a href={study.document_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline">View document <ExternalLink size={14} /></a> : null}
                  </div>
                </article>
              ))}
            </div>
          ) : null}
        </div>
      </section>
    </main>
  );
}
