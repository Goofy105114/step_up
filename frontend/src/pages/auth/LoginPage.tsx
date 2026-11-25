import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';

const features = [
  { icon: 'local_shipping', text: 'Free shipping on orders above ₹599' },
  { icon: 'replay', text: '30-day hassle-free returns' },
  { icon: 'verified_user', text: '100% authentic products, guaranteed' },
];

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const { login, isLoading } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string })?.from || '/';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login(email, password);
      toast.success('Welcome back!');
      const { user } = useAuthStore.getState();
      if (user?.role === 'admin' || user?.role === 'staff') {
        navigate('/admin', { replace: true });
      } else {
        navigate(from === '/login' ? '/' : from, { replace: true });
      }
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
            Step into something<br />
            <span className="text-secondary-container">extraordinary.</span>
          </h2>
          <p className="text-body-lg text-white/70 mb-space-xl max-w-sm">
            Thousands of styles, unbeatable prices, and free delivery — all in one place.
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
      <div className="flex-1 flex items-center justify-center bg-surface-container-lowest px-6 py-12">
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
            <h1 className="text-headline-md text-on-surface">Welcome back</h1>
            <p className="text-body-md text-on-surface-variant mt-space-xs">Sign in to continue to your account</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-space-md">
            {/* Email */}
            <div>
              <label className="label">Email address</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-space-md top-1/2 -translate-y-1/2 text-outline text-[20px]">mail</span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-field pl-11"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="flex justify-between items-center mb-space-xs">
                <label className="label mb-0">Password</label>
                <a href="/forgot-password" className="text-body-sm text-primary hover:text-primary-container transition-colors">
                  Forgot password?
                </a>
              </div>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-space-md top-1/2 -translate-y-1/2 text-outline text-[20px]">lock</span>
                <input
                  type={showPw ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field pl-11 pr-11"
                  placeholder="••••••••"
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
            </div>

            {/* CTA */}
            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full h-[52px] text-label-md mt-space-sm"
            >
              {isLoading ? (
                <>
                  <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                  Signing in…
                </>
              ) : (
                <>
                  Sign In
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

          {/* Register link */}
          <p className="text-center text-body-sm text-on-surface-variant">
            New to StepUp?{' '}
            <Link to="/register" className="text-primary font-semibold hover:text-primary-container transition-colors">
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
