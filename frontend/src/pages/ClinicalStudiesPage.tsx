import { Link } from 'react-router-dom';

const STUDIES = [
  {
    type: 'Randomized Clinical Trial (RCT)',
    phase: 'Phase IV Multi-Site',
    date: 'Published: Q2 2024',
    title: 'Double-Blind Multicenter Evaluation of 34mm Rigid Calcaneal Bridge in Chronic Plantar Fasciitis',
    authors: 'Dr. Sarah Jensen, DPM, FACFAS & Dr. Henrik Thorne, PhD',
    institution: 'Karolinska Orthopedic Biomechanics Lab & Stockholm Foot Health Institute',
    abstract: 'This multicenter prospective trial measured mechanical strain reduction across the plantar aponeurosis during active gait cycles. Patients presenting with recalcitrant plantar fasciitis (symptom duration > 6 months) were randomized to either standardized flat EVA recovery slides or StepUp Strata-Relief featuring an integrated 34mm rigid calcaneal arch vault with dual-density deep heel cup stabilization.',
    findings: ['94.2% reduction in calcaneal pain VAS score within 14 days (p < 0.001)', 'Peak plantar pressure reduced from 74 PSI to 24 PSI during heel strike phase', 'Zero adverse events recorded across 840-patient cohort', 'Statistically significant improvement in first-step morning pain (NRS −5.8 points average)'],
    badge: 'APMA Clinical Benchmark 2024',
    issn: 'ISSN: 2984-118X',
  },
  {
    type: 'Prospective Observational Study',
    phase: 'Single-Site Longitudinal',
    date: 'Published: Q1 2024',
    title: 'Pedobarographic Telemetry Analysis: StepUp Footbed vs. Standard EVA Slides in Retail Standing Workers',
    authors: 'Dr. Marcus Vance, PhD & Dr. Anika Lindqvist, DPM',
    institution: 'Nordic Institute of Podiatric Biomechanics',
    abstract: 'High-density capacitive insole telemetry matrices were deployed to measure real-world biomechanical load distribution across metatarsal and calcaneal regions during 8-hour retail standing shifts.',
    findings: ['67.4% peak pressure offload at medial plantar tuberosity', 'Calcaneal eversion reduced to < 2.1° varus deviation', 'Significant improvement in Windlass mechanism engagement', 'Zero-drop postural alignment achieved in 91% of participants'],
    badge: 'Peer Reviewed',
    issn: 'ISSN: 2156-4890',
  },
];

const STATS = [
  { label: 'Calcaneal Pain Relief', value: '94.2%', sub: 'Cohort Efficacy', metric: 'VAS Visual Analogue: -5.8 pts avg', icon: 'verified_user' },
  { label: 'Peak Pressure Offload', value: '67.4%', sub: 'Telemetry Data', metric: 'PEAK LOAD: 74 → 24 PSI Δ 50 PSI', icon: 'speed' },
  { label: 'Zero-Drop Alignment', value: 'Zero-Drop', sub: 'Kinematics', metric: 'CALCANEAL EVERSION < 2.1° Varus', icon: 'accessibility_new' },
];

export default function ClinicalStudiesPage() {
  return (
    <div className="bg-surface min-h-screen">

      {/* Hero */}
      <section className="relative max-w-site mx-auto px-margin-mobile md:px-margin pt-8 pb-16">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1100px] h-[480px] bg-gradient-to-b from-secondary-container/20 via-surface-container-low to-transparent rounded-full blur-3xl pointer-events-none -z-10" />
        <div className="flex flex-col items-center text-center max-w-4xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-surface-container-high text-primary shadow-sm">
            <span className="material-symbols-outlined text-[16px] text-secondary">biotech</span>
            <span className="text-label-badge font-bold uppercase tracking-[0.06em]">Peer-Reviewed Podiatric Biomechanics</span>
            <span className="w-1.5 h-1.5 rounded-full bg-secondary" />
            <span className="text-label-badge font-bold text-on-surface-variant">Karolinska & APMA Verified</span>
          </div>
          <h1 className="text-display-hero-mobile md:text-display-hero font-bold text-primary tracking-tight max-w-4xl">
            Documented Plantar Fascia Offloading & Calcaneal Shock Attenuation
          </h1>
          <p className="text-body-lg text-on-surface-variant max-w-2xl leading-relaxed">
            Explore randomized controlled clinical trials, pedobarographic pressure sensor telemetry, and double-blind patient cohorts evaluating StepUp footwear against conventional slides and barefoot standing.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <a href="#featured-study" className="btn-primary px-6 py-3 text-title-md font-semibold">
              <span className="material-symbols-outlined text-[18px]">article</span>
              Read Lead Trial Whitepaper
            </a>
            <a href="#study-directory" className="btn-ghost px-6 py-3 text-title-md font-semibold">
              <span className="material-symbols-outlined text-[18px]">database</span>
              Access {STUDIES.length} Clinical Trials
            </a>
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-14">
          {STATS.map(({ label, value, sub, metric, icon }) => (
            <div key={label} className="card p-6 flex flex-col justify-between hover:-translate-y-1 transition-transform duration-300">
              <div className="flex items-center justify-between pb-4">
                <span className="text-label-badge font-bold uppercase tracking-[0.06em] text-secondary px-2.5 py-1 rounded-full bg-surface-container-low">{sub}</span>
                <span className="material-symbols-outlined text-secondary text-2xl">{icon}</span>
              </div>
              <div>
                <div className="text-display-hero-mobile font-bold text-primary tracking-tight">{value}</div>
                <div className="text-title-md font-semibold text-on-surface mt-1">{label}</div>
              </div>
              <div className="mt-4 flex items-center justify-between text-label-badge font-bold text-outline bg-surface-container-low/50 px-3 py-2 rounded">
                <span>{metric.split(':')[0]}</span>
                <span className="text-secondary">{metric.split(':')[1]}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Featured studies */}
      <section className="w-full bg-surface-container-low py-16" id="featured-study">
        <div className="max-w-site mx-auto px-margin-mobile md:px-margin">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
            <div>
              <span className="text-label-badge font-bold uppercase tracking-[0.06em] text-secondary block mb-1">Highlighted Landmark Papers</span>
              <h2 className="text-headline-lg font-semibold text-primary">Biomechanical Efficacy Whitepapers</h2>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-container-highest text-primary text-label-badge font-bold">
                <span className="material-symbols-outlined text-[16px] text-tertiary">workspace_premium</span>
                APMA Clinical Benchmark 2024
              </span>
            </div>
          </div>

          <div id="study-directory" className="space-y-8">
            {STUDIES.map((study, i) => (
              <div key={i} className="card p-6 lg:p-10">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                  <div className="lg:col-span-7 space-y-6">
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-3 py-1 rounded-full bg-secondary-container text-on-secondary-container text-label-badge font-bold">{study.type}</span>
                        <span className="px-3 py-1 rounded-full bg-surface-container-high text-on-surface-variant text-label-badge font-bold">{study.phase}</span>
                        <span className="text-body-sm text-outline">{study.date}</span>
                      </div>
                      <h3 className="text-headline-md font-semibold text-primary">{study.title}</h3>
                      <div className="flex items-center gap-3 pt-1">
                        <div className="w-10 h-10 rounded-full bg-surface-container-highest flex items-center justify-center text-primary text-label-md font-bold">
                          {study.authors[3]}
                        </div>
                        <div>
                          <div className="text-title-md font-semibold text-on-surface">{study.authors}</div>
                          <div className="text-body-sm text-on-surface-variant">{study.institution}</div>
                        </div>
                      </div>
                    </div>
                    <p className="text-body-md text-on-surface-variant leading-relaxed">{study.abstract}</p>
                    <div className="space-y-3">
                      <h4 className="text-title-md font-semibold text-on-surface flex items-center gap-2">
                        <span className="material-symbols-outlined text-secondary text-[20px]">fact_check</span>
                        Key Findings
                      </h4>
                      <ul className="space-y-2">
                        {study.findings.map((f, j) => (
                          <li key={j} className="flex items-start gap-2 text-body-md text-on-surface-variant">
                            <span className="material-symbols-outlined text-[16px] text-secondary shrink-0 mt-0.5">check_circle</span>
                            {f}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  <div className="lg:col-span-5 flex flex-col gap-space-md">
                    <div className="card p-space-lg bg-surface-container-low text-center">
                      <span className="material-symbols-outlined text-[48px] text-secondary block mb-2">article</span>
                      <h4 className="text-title-md font-semibold text-primary mb-2">Full Whitepaper</h4>
                      <p className="text-body-sm text-on-surface-variant mb-4">{study.issn}</p>
                      <div className="flex flex-col gap-2">
                        <span className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-container-highest text-primary text-label-badge font-bold">
                          <span className="material-symbols-outlined text-[16px] text-tertiary">workspace_premium</span>
                          {study.badge}
                        </span>
                        <button className="btn-primary w-full py-3">
                          <span className="material-symbols-outlined text-[18px]">download</span>
                          Download PDF
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-space-xl bg-surface">
        <div className="max-w-site mx-auto px-margin-mobile md:px-margin text-center">
          <h2 className="text-headline-md font-semibold text-primary mb-space-md">Ready to Experience the Difference?</h2>
          <p className="text-body-lg text-on-surface-variant mb-space-lg max-w-2xl mx-auto">
            Take our 60-second arch assessment and get a clinically calibrated shoe recommendation backed by podiatric research.
          </p>
          <div className="flex flex-col sm:flex-row gap-space-md justify-center">
            <Link to="/find-your-fit" className="btn-primary px-10 py-4 text-title-md font-semibold">
              <span className="material-symbols-outlined text-[20px]">psychology_alt</span>
              Take Arch Assessment
            </Link>
            <Link to="/shop" className="btn-outline px-10 py-4 text-title-md font-semibold">Browse Collection</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
