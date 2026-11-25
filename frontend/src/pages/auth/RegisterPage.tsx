import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';

export default function RegisterPage() {
  const [form, setForm] = useState({ first_name: '', last_name: '', email: '', password: '', phone: '' });
  const [showPw, setShowPw] = useState(false);
  const { register, isLoading } = useAuthStore();
  const navigate = useNavigate();
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password.length < 8) { toast.error('Password must be at least 8 characters'); return; }
    try {
      await register(form);
      toast.success('Welcome to StepUp! 🎉');
      navigate('/');
    } catch (e: any) { toast.error(e.response?.data?.message || 'Unable to create your account. Please try again.'); }
  };

  return (
    <div className="bg-background min-h-screen flex flex-col justify-between">
      <header className="w-full py-space-lg px-margin-mobile md:px-margin flex items-center justify-between">
        <Link to="/" className="inline-flex items-center gap-space-xs text-headline-sm font-semibold text-primary tracking-tight">
          <span className="material-symbols-outlined text-secondary text-2xl">healing</span>
          <span>StepUp</span>
          <span className="text-label-badge font-bold uppercase tracking-[0.06em] text-outline px-space-xs py-0.5 rounded-full bg-surface-container-high ml-1.5">Clinical</span>
        </Link>
        <Link to="/" className="inline-flex items-center gap-space-xs text-label-md font-semibold text-on-surface-variant hover:text-primary transition-colors">
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          Back to Store
        </Link>
      </header>

      <main className="w-full flex-1 flex items-center justify-center p-gutter-mobile md:p-gutter">
        <div className="w-full max-w-4xl mx-auto">
          <div className="relative bg-surface-container-lowest rounded-lg shadow-card-hover p-6 sm:p-10 md:p-12">
            <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-96 h-96 bg-secondary/5 rounded-full blur-3xl pointer-events-none" />

            <div className="flex items-center justify-between mb-8">
              <div className="inline-flex items-center gap-2 bg-surface-container-low px-3.5 py-1.5 rounded-full">
                <span className="material-symbols-outlined text-secondary text-[16px]">person_add</span>
                <span className="text-label-badge font-bold uppercase tracking-[0.06em] text-secondary">New Patient Registration</span>
              </div>
            </div>

            <div className="max-w-2xl mb-10">
              <h1 className="text-headline-lg font-semibold text-primary tracking-tight mb-3">
                Create Your Orthopedic Profile
              </h1>
              <p className="text-body-md text-on-surface-variant leading-relaxed">
                Join 8,400+ verified patients. Get access to HSA/FSA eligible footwear, 60-day trial guarantee, and your personal arch calibration profile.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5 max-w-2xl">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-md">
                {[
                  { key: 'first_name', label: 'First Name *', placeholder: 'Elena', icon: 'person' },
                  { key: 'last_name', label: 'Last Name', placeholder: 'Rostova', icon: 'person' },
                ].map(({ key, label, placeholder, icon }) => (
                  <div key={key} className="space-y-2">
                    <label className="label">{label}</label>
                    <div className="relative flex items-center">
                      <span className="material-symbols-outlined absolute left-4 text-outline text-[20px] pointer-events-none">{icon}</span>
                      <input type="text" placeholder={placeholder} value={(form as any)[key]} onChange={e => set(key, e.target.value)}
                        required={key === 'first_name'} className="input-field pl-12" />
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <label className="label">Email Address *</label>
                <div className="relative flex items-center">
                  <span className="material-symbols-outlined absolute left-4 text-outline text-[20px] pointer-events-none">mail</span>
                  <input type="email" required placeholder="patient@example.com" value={form.email} onChange={e => set('email', e.target.value)}
                    className="input-field pl-12 pr-10" />
                  {form.email && <span className="material-symbols-outlined absolute right-4 text-secondary text-[20px]">check_circle</span>}
                </div>
                <p className="text-body-sm text-outline">Itemized clinical receipt and order alerts will arrive here.</p>
              </div>

              <div className="space-y-2">
                <label className="label">Mobile Number (Delivery &amp; Fitting Alerts)</label>
                <div className="relative flex items-center">
                  <span className="material-symbols-outlined absolute left-4 text-outline text-[20px] pointer-events-none">sms</span>
                  <input type="tel" placeholder="+91 99999 99999" value={form.phone} onChange={e => set('phone', e.target.value)}
                    className="input-field pl-12" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="label">Password *</label>
                <div className="relative flex items-center">
                  <span className="material-symbols-outlined absolute left-4 text-outline text-[20px] pointer-events-none">lock</span>
                  <input type={showPw ? 'text' : 'password'} required placeholder="Minimum 8 characters" value={form.password} onChange={e => set('password', e.target.value)}
                    className="input-field pl-12 pr-12" />
                  <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3.5 p-1 text-outline hover:text-primary rounded-full">
                    <span className="material-symbols-outlined text-[20px]">{showPw ? 'visibility_off' : 'visibility'}</span>
                  </button>
                </div>
              </div>

              <div className="flex items-start gap-3 pt-1">
                <input type="checkbox" required className="w-4 h-4 mt-1 rounded accent-primary" />
                <span className="text-body-sm text-on-surface-variant">
                  I agree to StepUp's{' '}
                  <Link to="/" className="text-secondary underline underline-offset-2">Terms of Service</Link>
                  {' '}and{' '}
                  <Link to="/" className="text-secondary underline underline-offset-2">Privacy Policy</Link>.
                  HSA/FSA data processed under HIPAA-compliant encryption.
                </span>
              </div>

              <button type="submit" disabled={isLoading}
                className="w-full h-[52px] bg-primary-container text-on-primary rounded-full text-label-md font-semibold tracking-[0.04em] uppercase shadow-primary hover:bg-primary transition-all flex items-center justify-center gap-2 group disabled:opacity-50">
                {isLoading ? 'Creating Profile...' : (
                  <><span>Create Orthopedic Profile</span><span className="material-symbols-outlined text-[18px] group-hover:translate-x-1 transition-transform">arrow_forward</span></>
                )}
              </button>

              <p className="text-center text-body-sm text-on-surface-variant pt-2">
                Already have an account?{' '}
                <Link to="/login" className="font-semibold text-primary hover:text-secondary transition-colors">Sign In</Link>
              </p>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
