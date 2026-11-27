import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import api from '../lib/api';

type Policy = { slug: string; title: string; content: string; updated_at?: string | null };

export default function LegalPolicyPage() {
  const { slug = '' } = useParams();
  const { data, isLoading, isError } = useQuery({
    queryKey: ['legal-policy', slug],
    queryFn: () => api.get(`/legal/${slug}`).then(response => response.data.data as Policy),
    retry: false,
  });

  return (
    <section className="container-site py-12 md:py-20">
      <div className="mx-auto max-w-4xl">
        <Link to="/" className="text-sm font-semibold text-primary hover:underline">← Back to STEPUP</Link>
        {isLoading ? <div className="mt-8 animate-pulse space-y-4"><div className="h-8 w-1/2 rounded bg-surface-container" /><div className="h-40 rounded bg-surface-container" /></div>
          : isError || !data ? <div className="mt-8 rounded-2xl border border-outline-variant/40 p-8">
              <h1 className="text-2xl font-bold text-on-surface">Policy not available</h1>
              <p className="mt-3 text-sm leading-6 text-on-surface-variant">This document has not been published yet. Please contact STEPUP through the customer-care details shown on your order confirmation, if available.</p>
            </div>
          : <>
              <p className="mt-8 text-xs font-bold uppercase tracking-[0.18em] text-secondary">STEPUP · Customer information</p>
              <h1 className="mt-3 text-3xl font-bold tracking-tight text-on-surface md:text-4xl">{data.title}</h1>
              {data.updated_at && <p className="mt-2 text-xs text-on-surface-variant">Last reviewed: {new Date(data.updated_at).toLocaleDateString('en-IN')}</p>}
              <article className="mt-8 whitespace-pre-wrap break-words text-sm leading-8 text-on-surface-variant">{data.content}</article>
            </>}
      </div>
    </section>
  );
}
