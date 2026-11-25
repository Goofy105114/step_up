import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';

const features = [
  { icon: 'replay', text: '30-day hassle-free returns, no questions asked' },
  { icon: 'groups', text: 'Join 50,000+ happy customers across India' },
  { icon: 'local_offer', text: 'Exclusive member deals and early access to sales' },
];

export default function RegisterPage() {
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    password: '',
    confirm_password: '',
  });
  const [showPw, setShowPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const { register, isLoading } = useAuthStore();
  const navigate = useNavigate();

  const set = (key: keyof typeof form, val: string) => setForm((f) => ({ ...f, [key]: val }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    if (form.password !== form.confirm_password) {
      toast.error('Passwords do not match');
      return;
    }
    try {
      await register({
        first_name: form.first_name,
        last_name: form.last_name,
        email: form.email,
        password: form.password,
        ...(form.phone && { phone: form.phone }),
      });
      toast.success('Welcome to StepUp! 🎉');
      navigate('/');
    } catch { /* handled by axios interceptor */ }
  };

  return (
    <div className="min-h-screen flex">
      {/* ── Left panel (desktop only) ── */}
      <div
        className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 relative overflow-hidden"
        style={{ background: 'linear-gradient(145deg, #004339 0%, #0a5c50 100%)' }}
      >
        {/* Background decorative circles */}
        <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-white/5" />
        <div className="absolute bottom-12 -left-16 w-56 h-56 rounded-full bg-white/5" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-white/[0.03]" />

        {/* Logo */}
        <div className="relative z-10">
          <Link to="/" className="inline-flex items-center gap-space-md group">
            <div className="w-12 h-12 rounded-DEFAULT bg-white/15 flex items-center justify-center backdrop-blur-sm border border-white/20">
              <span className="material-symbols-outlined text-white text-[24px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                footprint
              </span>
            </div>
            <span className="text-headline-sm text-white font-bold tracking-tight">StepUp</span>
          </Link>
          <p className="text-body-md text-white/60 mt-space-sm ml-16">India's favourite footwear store</p>
        </div>

        {/* Centre copy */}
        <div className="relative z-10">
          <h2 className="text-headline-lg text-white mb-space-md leading-tight">
            Your perfect pair<br />
            <span className="text-secondary-container">awaits you.</span>
          </h2>
          <p className="text-body-lg text-white/70 mb-space-xl max-w-sm">
            Create your free account and get access to exclusive deals, wishlist, and fast checkout.
          </p>

          {/* Feature bullets */}
          <div className="space-y-space-md">
            {features.map((f) => (
              <div key={f.icon} className="flex items-center gap-space-md">
                <div className="w-10 h-10 rounded-full bg-white/15 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-secondary-container text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                    {f.icon}
                  </span>
                </div>
                <span className="text-body-md text-white/80">{f.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom quote */}
        <div className="relative z-10">
          <p className="text-body-sm text-white/40 italic">
            "Comfort meets style — StepUp delivers both."
          </p>
        </div>
      </div>

      {/* ── Right panel (form) ── */}
      <div className="flex-1 flex items-center justify-center bg-surface-container-lowest px-6 py-12 overflow-y-auto">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-space-xl">
            <Link to="/" className="inline-flex items-center gap-space-sm">
              <div className="w-10 h-10 rounded-DEFAULT bg-primary flex items-center justify-center">
                <span className="material-symbols-outlined text-white text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>footprint</span>
              </div>
              <span className="text-headline-sm text-on-surface font-bold">StepUp</span>
            </Link>
          </div>

          <div className="mb-space-xl">
            <h1 className="text-headline-md text-on-surface">Create your account</h1>
            <p className="text-body-md text-on-surface-variant mt-space-xs">Join thousands of happy StepUp customers</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-space-md">
            {/* Name row */}
            <div className="grid grid-cols-2 gap-space-sm">
              <div>
                <label className="label">First name</label>
                <input
                  required
                  value={form.first_name}
                  onChange={(e) => set('first_name', e.target.value)}
                  className="input-field"
                  placeholder="Rahul"
                />
              </div>
              <div>
                <label className="label">Last name</label>
                <input
                  required
                  value={form.last_name}
                  onChange={(e) => set('last_name', e.target.value)}
                  className="input-field"
                  placeholder="Sharma"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="label">Email address</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-space-md top-1/2 -translate-y-1/2 text-outline text-[20px]">mail</span>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => set('email', e.target.value)}
                  className="input-field pl-11"
                  placeholder="rahul@example.com"
                />
              </div>
            </div>

            {/* Phone (optional) */}
            <div>
              <label className="label">
                Phone number
                <span className="text-on-surface-variant font-normal ml-1">(optional)</span>
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-space-md top-1/2 -translate-y-1/2 text-outline text-[20px]">phone</span>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => set('phone', e.target.value)}
                  className="input-field pl-11"
                  placeholder="+91 98765 43210"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="label">Password</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-space-md top-1/2 -translate-y-1/2 text-outline text-[20px]">lock</span>
                <input
                  type={showPw ? 'text' : 'password'}
                  required
                  value={form.password}
                  onChange={(e) => set('password', e.target.value)}
                  className="input-field pl-11 pr-11"
                  placeholder="Min. 8 characters"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-space-md top-1/2 -translate-y-1/2 text-outline hover:text-on-surface transition-colors"
                >
                  <span className="material-symbols-outlined text-[20px]">
                    {showPw ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
              {form.password.length > 0 && form.password.length < 8 && (
                <p className="text-body-sm text-error mt-space-xs flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">error</span>
                  At least 8 characters required
                </p>
              )}
            </div>

            {/* Confirm password */}
            <div>
              <label className="label">Confirm password</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-space-md top-1/2 -translate-y-1/2 text-outline text-[20px]">lock_reset</span>
                <input
                  type={showConfirmPw ? 'text' : 'password'}
                  required
                  value={form.confirm_password}
                  onChange={(e) => set('confirm_password', e.target.value)}
                  className="input-field pl-11 pr-11"
                  placeholder="Re-enter password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPw(!showConfirmPw)}
                  className="absolute right-space-md top-1/2 -translate-y-1/2 text-outline hover:text-on-surface transition-colors"
                >
                  <span className="material-symbols-outlined text-[20px]">
                    {showConfirmPw ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
              {form.confirm_password.length > 0 && form.password !== form.confirm_password && (
                <p className="text-body-sm text-error mt-space-xs flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">error</span>
                  Passwords do not match
                </p>
              )}
            </div>

            <p className="text-body-sm text-on-surface-variant leading-relaxed">
              By creating an account you agree to our{' '}
              <a href="#" className="text-primary hover:underline">Terms of Service</a> and{' '}
              <a href="#" className="text-primary hover:underline">Privacy Policy</a>.
            </p>

            {/* CTA */}
            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full h-[52px] text-label-md"
            >
              {isLoading ? (
                <>
                  <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                  Creating account…
                </>
              ) : (
                <>
                  Create Account
                  <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-space-lg">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-outline/15" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-surface-container-lowest px-space-md text-body-sm text-on-surface-variant">
                or continue with
              </span>
            </div>
          </div>

          {/* Login link */}
          <p className="text-center text-body-sm text-on-surface-variant">
            Already have an account?{' '}
            <Link to="/login" className="text-primary font-semibold hover:text-primary-container transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
