import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';

export default function RegisterPage() {
  const [form, setForm] = useState({ first_name: '', last_name: '', email: '', password: '', phone: '' });
  const [showPw, setShowPw] = useState(false);
  const { register, isLoading } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password.length < 8) { toast.error('Password must be at least 8 characters'); return; }
    try {
      await register(form);
      toast.success('Welcome to StepUp! 🎉');
      navigate('/');
    } catch { /* handled */ }
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
          <h1 className="text-lg font-bold uppercase tracking-widest text-gray-900">Create Account</h1>
          <p className="text-xs text-gray-400 mt-1 uppercase tracking-wider">Join thousands of happy customers</p>
        </div>

        <div className="bg-white border border-gray-200 p-8 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-gray-700 mb-2 block">First Name</label>
                <input required value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                  className="input-field" placeholder="Rahul" />
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-gray-700 mb-2 block">Last Name</label>
                <input required value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                  className="input-field" placeholder="Sharma" />
              </div>
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-gray-700 mb-2 block">Email</label>
              <input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="input-field" placeholder="rahul@example.com" />
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-gray-700 mb-2 block">Phone</label>
              <input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="input-field" placeholder="+91 98765 43210" />
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-gray-700 mb-2 block">Password</label>
              <div className="relative">
                <input type={showPw ? 'text' : 'password'} required value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="input-field pr-11" placeholder="Min. 8 characters" />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <p className="text-xs text-gray-400 leading-relaxed">
              By creating an account you agree to our{' '}
              <a href="#" className="text-brand-500 hover:underline">Terms of Service</a> and{' '}
              <a href="#" className="text-brand-500 hover:underline">Privacy Policy</a>.
            </p>
            <button type="submit" disabled={isLoading} className="btn-primary w-full py-3.5">
              {isLoading ? 'Creating account…' : 'Create Account'}
            </button>
          </form>
          <p className="text-center text-xs text-gray-500 mt-5 uppercase tracking-wider">
            Already have an account?{' '}
            <Link to="/login" className="text-brand-500 hover:text-brand-700 font-bold">Sign In</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
