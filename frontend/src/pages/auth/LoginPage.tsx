import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';

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
      navigate(from, { replace: true });
    } catch { /* handled by axios interceptor */ }
  };

  return (
    <div className="bg-gray-50 min-h-[80vh] flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex flex-col items-center gap-1 mb-6 group">
            <div className="w-10 h-10 bg-gray-900 flex items-center justify-center group-hover:bg-brand-500 transition-colors">
              <span className="text-white font-bold tracking-widest">S</span>
            </div>
            <span className="font-display text-2xl font-bold text-gray-900">StepUp</span>
          </Link>
          <h1 className="text-lg font-bold uppercase tracking-widest text-gray-900">Sign In</h1>
          <p className="text-xs text-gray-400 mt-1 uppercase tracking-wider">Welcome back to StepUp</p>
        </div>

        <div className="bg-white border border-gray-200 p-8 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-gray-700 mb-2 block">
                Email Address
              </label>
              <input
                type="email" required value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field" placeholder="you@example.com"
              />
            </div>
            <div>
              <div className="flex justify-between mb-2">
                <label className="text-xs font-bold uppercase tracking-widest text-gray-700">Password</label>
                <a href="#" className="text-xs text-brand-500 hover:text-brand-700 uppercase tracking-wider">Forgot?</a>
              </div>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'} required value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field pr-11" placeholder="••••••••"
                />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={isLoading} className="btn-primary w-full py-3.5 mt-2">
              {isLoading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative text-center">
              <span className="bg-white px-4 text-xs text-gray-400 uppercase tracking-wider">or</span>
            </div>
          </div>

          <p className="text-center text-xs text-gray-500 uppercase tracking-wider">
            New to StepUp?{' '}
            <Link to="/register" className="text-brand-500 hover:text-brand-700 font-bold">Create Account</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
