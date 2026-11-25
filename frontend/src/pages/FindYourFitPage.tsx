import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';

const STEPS = [
  {
    id: 1, label: 'Primary Biomechanical Pathology',
    question: 'Where does discomfort or fatigue concentrate during daily standing?',
    sub: 'Select the primary focal stress trigger. Our clinical algorithm calculates the ideal arch support profile.',
    options: [
      { id: 'heel', icon: 'arrow_upload_progress', title: 'Heel Strike & Plantar Fascia', desc: 'Sharp morning stabbing pain, calcaneal micro-tears, severe heel cup bone spur tenderness.', zone: 'Zone H-01 • Deep Calcaneal Cradle', category: 'sports' },
      { id: 'arch', icon: 'timeline', title: 'Medial Longitudinal Arch', desc: 'Aching fallen arch, structural mid-day collapse, high rigid instep friction and tendon strain.', zone: 'Zone A-02 • 34mm Dynamic Lift', category: 'casual' },
      { id: 'metatarsal', icon: 'lens_blur', title: 'Metatarsal & Ball of Foot', desc: 'Burning sensation, numbness under forefoot pads, Morton\'s neuroma, and nerve compression.', zone: 'Zone M-03 • Transverse Met Dome', category: 'formal' },
      { id: 'pronation', icon: 'swap_driving_apps', title: 'Overpronation & Ankle Roll', desc: 'Inward ankle collapse leading to tibial torque, patellofemoral knee ache, and lower lumbar stress.', zone: 'Zone P-04 • Subtalar Stabilizer', category: 'sports' },
    ],
  },
  {
    id: 2, label: 'Biomechanics Variable 02',
    question: 'Daily standing & occupational load',
    sub: 'Affects foam rebound density and arch rigidity selection.',
    options: [
      { id: 'light', icon: 'weekend', title: 'Under 2 hours', desc: 'Sedentary desk with light walking', zone: 'Low Impact', category: 'casual' },
      { id: 'moderate', icon: 'directions_walk', title: '2 to 6 hours', desc: 'Retail, teaching, home movement', zone: 'Moderate', category: 'casual' },
      { id: 'heavy', icon: 'local_hospital', title: '8+ hours / Shift', desc: 'Clinical, nursing, hospitality staff', zone: 'High Stress', category: 'sports' },
    ],
  },
  {
    id: 3, label: 'Arch Profile Variable 03',
    question: 'What is your primary footwear activity?',
    sub: 'Determines outsole tread pattern and lateral stability requirements.',
    options: [
      { id: 'running', icon: 'directions_run', title: 'Running & Sports', desc: 'High impact, pronation control, energy return', zone: 'Kinetic Load', category: 'sports' },
      { id: 'formal', icon: 'business_center', title: 'Formal & Office', desc: 'All-day comfort, leather upper, professional look', zone: 'Low Impact', category: 'formal' },
      { id: 'casual', icon: 'wb_sunny', title: 'Casual & Daily Wear', desc: 'Versatile, stylish, comfortable for everyday use', zone: 'Mixed Use', category: 'casual' },
      { id: 'sandal', icon: 'beach_access', title: 'Sandals & Recovery', desc: 'Open-toe, breathable, post-workout or home wear', zone: 'Recovery', category: 'sandals' },
    ],
  },
];

export default function FindYourFitPage() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [selected, setSelected] = useState('');
  const [showResult, setShowResult] = useState(false);
  const navigate = useNavigate();

  const currentStep = STEPS[step];
  const progress = ((step) / STEPS.length) * 100;

  // Determine recommended category from answers
  const getRecommendedCategory = () => {
    const categoryVotes: Record<string, number> = {};
    answers.forEach((answerId, stepIdx) => {
      const opt = STEPS[stepIdx].options.find(o => o.id === answerId);
      if (opt?.category) {
        categoryVotes[opt.category] = (categoryVotes[opt.category] || 0) + 1;
      }
    });
    return Object.entries(categoryVotes).sort((a, b) => b[1] - a[1])[0]?.[0] || 'casual';
  };

  const { data: recommendedProducts } = useQuery({
    queryKey: ['quiz-results', answers],
    queryFn: () => api.get(`/products?category=${getRecommendedCategory()}&limit=4`).then(r => r.data),
    enabled: showResult,
  });

  const handleSelect = (optId: string) => setSelected(optId);

  const handleNext = () => {
    if (!selected) return;
    const newAnswers = [...answers, selected];
    setAnswers(newAnswers);
    setSelected('');
    if (step < STEPS.length - 1) {
      setStep(s => s + 1);
    } else {
      setShowResult(true);
    }
  };

  if (showResult) {
    const category = getRecommendedCategory();
    const products = recommendedProducts?.data || [];
    return (
      <div className="bg-surface min-h-screen py-space-xl">
        <div className="max-w-site mx-auto px-margin-mobile md:px-margin">
          <div className="text-center mb-space-xl">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-secondary-container mb-space-lg">
              <span className="material-symbols-outlined text-[40px] text-on-secondary-container">check_circle</span>
            </div>
            <div className="inline-flex items-center gap-2 bg-surface-container px-space-md py-space-xs rounded-full text-label-badge font-bold uppercase tracking-[0.06em] text-primary mb-space-md">
              <span className="material-symbols-outlined text-[15px] text-secondary">biotech</span>
              Arch Calibration Complete
            </div>
            <h1 className="text-display-hero-mobile md:text-headline-lg font-semibold text-primary tracking-tight mb-space-md">
              Your Orthopedic Profile is Ready
            </h1>
            <p className="text-body-lg text-on-surface-variant max-w-2xl mx-auto">
              Based on your biomechanical assessment, we've curated StepUp footwear calibrated to your specific arch load distribution and activity profile.
            </p>
          </div>

          {/* Profile summary */}
          <div className="card p-space-xl mb-space-xl max-w-3xl mx-auto">
            <h2 className="text-headline-sm font-semibold text-primary mb-space-lg">Your Clinical Arch Profile</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-space-md">
              {answers.map((answerId, idx) => {
                const opt = STEPS[idx].options.find(o => o.id === answerId);
                return (
                  <div key={idx} className="bg-surface-container-low rounded-DEFAULT p-space-md">
                    <span className="text-label-badge font-bold uppercase tracking-[0.06em] text-outline block mb-1">{STEPS[idx].label.split(' ').slice(-2).join(' ')}</span>
                    <span className="text-title-md font-semibold text-primary block">{opt?.title}</span>
                    <span className="text-body-sm text-secondary">{opt?.zone}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recommended products */}
          {products.length > 0 && (
            <div>
              <h2 className="text-headline-md font-semibold text-primary text-center mb-space-lg">
                Recommended for Your Profile
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-space-md md:gap-space-lg mb-space-xl">
                {products.map((p: any) => (
                  <Link key={p.id} to={`/product/${p.slug}`} className="card overflow-hidden group">
                    <div className="aspect-square bg-surface-container-low overflow-hidden">
                      {p.primary_image
                        ? <img src={p.primary_image} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                        : <div className="w-full h-full flex items-center justify-center"><span className="material-symbols-outlined text-[40px] text-outline">photo</span></div>
                      }
                    </div>
                    <div className="p-space-md">
                      <p className="text-label-badge font-bold uppercase tracking-[0.06em] text-on-surface-variant mb-1">{p.brand || 'StepUp'}</p>
                      <h3 className="text-title-md font-semibold text-primary line-clamp-2 mb-space-sm">{p.name}</h3>
                      <div className="flex items-center gap-space-sm">
                        <span className="text-title-md font-semibold text-primary">
                          ₹{parseFloat(p.sale_price || p.base_price).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        </span>
                        {p.sale_price && (
                          <span className="text-body-sm text-on-surface-variant line-through">
                            ₹{parseFloat(p.base_price).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-space-md justify-center">
            <Link to={`/shop/${category}`} className="btn-primary px-10 py-4 text-title-md font-semibold">
              View All Recommended
              <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
            </Link>
            <button onClick={() => { setStep(0); setAnswers([]); setSelected(''); setShowResult(false); }} className="btn-outline px-10 py-4 text-title-md font-semibold">
              Retake Assessment
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface min-h-screen py-space-xl">
      <div className="max-w-site w-full mx-auto px-6 lg:px-12 py-8">

        {/* Progress indicator */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10 pb-6 border-b border-surface-container-high/60">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-primary-container text-on-primary text-label-badge font-bold shadow-sm">
              {String(step + 1).padStart(2, '0')}
            </span>
            <div className="flex items-center gap-2">
              <span className="text-label-badge font-bold uppercase tracking-[0.06em] text-secondary">Step {step + 1} of {STEPS.length}</span>
              <span className="text-outline-variant font-light">•</span>
              <span className="text-body-sm text-on-surface-variant font-medium">{currentStep.label}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {STEPS.map((_, i) => (
              <div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${i < step ? 'w-16 bg-primary' : i === step ? 'w-16 bg-secondary' : 'w-16 bg-surface-container-high'}`} />
            ))}
            <span className="text-label-badge font-bold text-outline ml-2">{Math.round((step / STEPS.length) * 100)}% Completed</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          <section className="lg:col-span-7 xl:col-span-8 flex flex-col space-y-10">
            <div className="space-y-2">
              <span className="text-label-badge font-bold uppercase tracking-[0.06em] text-secondary">{currentStep.label}</span>
              <h1 className="text-headline-lg font-semibold text-primary tracking-tight leading-snug">{currentStep.question}</h1>
              <p className="text-body-md text-on-surface-variant max-w-xl">{currentStep.sub}</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {currentStep.options.map(opt => (
                <button
                  key={opt.id}
                  onClick={() => handleSelect(opt.id)}
                  type="button"
                  className={`group relative flex flex-col p-6 rounded-DEFAULT text-left transition-all duration-200 ${
                    selected === opt.id
                      ? 'bg-surface-container-lowest shadow-card-hover ring-2 ring-primary'
                      : 'bg-surface-container-lowest shadow-card hover:shadow-card-hover'
                  }`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${selected === opt.id ? 'bg-primary text-on-primary' : 'bg-surface-container-low text-primary group-hover:bg-primary group-hover:text-on-primary'}`}>
                      <span className="material-symbols-outlined text-[20px]">{opt.icon}</span>
                    </div>
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center ${selected === opt.id ? 'bg-primary text-on-primary' : 'bg-surface-container-high'}`}>
                      {selected === opt.id && <span className="material-symbols-outlined text-[13px]">check</span>}
                    </span>
                  </div>
                  <h2 className="text-title-md font-semibold text-primary mb-1">{opt.title}</h2>
                  <p className="text-body-sm text-on-surface-variant leading-relaxed mb-4">{opt.desc}</p>
                  <div className="mt-auto flex items-center gap-2 pt-2 border-t border-surface-container-low">
                    <span className="material-symbols-outlined text-[14px] text-secondary">flare</span>
                    <span className="text-label-badge font-bold uppercase tracking-[0.06em] text-secondary">{opt.zone}</span>
                  </div>
                </button>
              ))}
            </div>

            <div className="flex items-center gap-space-md pt-4">
              {step > 0 && (
                <button onClick={() => { setStep(s => s - 1); setAnswers(a => a.slice(0, -1)); setSelected(''); }} className="btn-ghost px-8 py-4 text-title-md font-semibold">
                  <span className="material-symbols-outlined text-[20px]">arrow_back</span>
                  Back
                </button>
              )}
              <button
                onClick={handleNext}
                disabled={!selected}
                className="btn-primary flex-1 sm:flex-none px-10 py-4 text-title-md font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {step < STEPS.length - 1 ? 'Continue' : 'Get My Recommendation'}
                <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
              </button>
            </div>
          </section>

          {/* Right: Clinical prescription preview */}
          <aside className="lg:col-span-5 xl:col-span-4 sticky top-32">
            <div className="card p-space-lg">
              <div className="flex items-center gap-space-sm mb-space-md">
                <span className="material-symbols-outlined text-[22px] text-secondary">clinical_notes</span>
                <h3 className="text-title-md font-semibold text-primary">Clinical Prescription Preview</h3>
              </div>
              <div className="space-y-space-sm">
                {STEPS.map((s, idx) => {
                  const ans = answers[idx];
                  const opt = ans ? s.options.find(o => o.id === ans) : null;
                  const isActive = idx === step;
                  const isDone = idx < step;
                  return (
                    <div key={idx} className={`p-space-md rounded-DEFAULT flex items-start gap-space-sm ${isDone ? 'bg-surface-container' : isActive ? 'bg-primary/5 border border-primary/20' : 'bg-surface-container-low opacity-50'}`}>
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${isDone ? 'bg-secondary text-on-secondary' : isActive ? 'bg-primary text-on-primary' : 'bg-outline-variant text-surface'}`}>
                        {isDone ? <span className="material-symbols-outlined text-[14px]">check</span> : <span className="text-label-badge font-bold">{idx + 1}</span>}
                      </div>
                      <div>
                        <span className="text-label-badge font-bold uppercase tracking-[0.06em] text-on-surface-variant block">{s.label.split(' ').slice(-2).join(' ')}</span>
                        <span className="text-body-sm font-semibold text-on-surface">{opt ? opt.title : isActive ? 'Selecting...' : 'Pending'}</span>
                        {opt && <span className="text-label-badge font-bold text-secondary block mt-0.5">{opt.zone}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-space-md pt-space-md border-t border-outline-variant/20 flex items-center gap-space-xs text-body-sm text-on-surface-variant">
                <span className="material-symbols-outlined text-[16px] text-secondary">verified_user</span>
                Algorithm calibrates Shore-A EVA durometer & arch bridge height
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
