import { Link } from 'react-router-dom';

export default function ClinicalStudiesPage() {
  return (
    <main className="min-h-screen bg-surface">
      <section className="container-site py-16 md:py-24">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-secondary">Research & transparency</p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-primary md:text-5xl">Clinical information, clearly presented.</h1>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-8 text-on-surface-variant">
            We believe health-related product information should be accurate, traceable and easy to evaluate. This page will list published studies and technical documents with their original sources and publication details.
          </p>
        </div>
        <div className="mx-auto mt-12 max-w-3xl rounded-3xl border border-outline-variant/50 bg-white p-8 text-center shadow-card md:p-12">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#edf3ee] text-2xl text-primary" aria-hidden="true">⌕</div>
          <h2 className="mt-5 text-xl font-semibold text-primary">No studies are currently published here</h2>
          <p className="mt-3 text-sm leading-7 text-on-surface-variant">
            We have not yet added verifiable clinical publications or whitepapers to the STEPUP research library. We won't display invented study titles, institutions, authors, patient results or medical efficacy statistics.
          </p>
          <p className="mt-3 text-sm leading-7 text-on-surface-variant">
            When documents are available, each entry will include a publication reference and a link to its source so you can review the evidence yourself.
          </p>
          <Link to="/shop" className="btn-primary mt-7 inline-flex px-7 py-3">Explore the collection <span aria-hidden="true">→</span></Link>
        </div>
      </section>
    </main>
  );
}
