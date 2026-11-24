import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [resetToken, setResetToken] = useState(''); // dev only
  const [newPassword, setNewPassword] = useState('');
  const [resetting, setResetting] = useState(false);
  const [done, setDone] = useState(false);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post('/auth/forgot-password', { email });
      setSent(true);
      // In dev mode, backend returns the token directly
      if (res.data.dev_reset_token) {
        setResetToken(res.data.dev_reset_token);
      }
      toast.success('Reset link sent!');
    } catch { /* handled */ } finally {
      setLoading(false); }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetToken) { toast.error('Enter reset token'); return; }
    if (newPassword.length < 8) { toast.error('Password must be at least 8 characters'); return; }
    setResetting(true);
    try {
      await api.post('/auth/reset-password', { token: resetToken, new_password: newPassword });
      setDone(true);
      toast.success('Password reset successfully!');
    } catch { /* handled */ } finally { setResetting(false); }
  };

  if (done) {
    return (
      <div className="bg-gray-50 min-h-[80vh] flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-md text-center space-y-5">
          <div className="w-16 h-16 bg-green-100 flex items-center justify-center mx-auto">
            <CheckCircle size={32} className="text-green-500" />
          </div>
          <h1 className="text-lg font-bold uppercase tracking-widest text-gray-900">Password Reset!</h1>
          <p className="text-sm text-gray-500">Your password has been updated. You can now sign in with your new password.</p>
          <Link to="/login" className="btn-primary inline-block px-10">Sign In</Link>
        </div>
      </div>
    );
  }

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
          <h1 className="text-lg font-bold uppercase tracking-widest text-gray-900">Reset Password</h1>
          <p className="text-xs text-gray-400 mt-1 uppercase tracking-wider">
            {sent ? 'Check your email for the reset link' : 'Enter your email to receive a reset link'}
          </p>
        </div>

        <div className="bg-white border border-gray-200 p-8 shadow-sm">
          {!sent ? (
            <form onSubmit={handleSend} className="space-y-5">
              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-gray-700 mb-2 block">Email Address</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                    className="input-field pl-9" placeholder="you@example.com" />
                </div>
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full py-3.5">
                {loading ? 'Sending…' : 'Send Reset Link'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleReset} className="space-y-5">
              <div className="bg-green-50 border border-green-200 p-3 text-xs text-green-700 text-center">
                Reset link sent to <strong>{email}</strong>
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-gray-700 mb-2 block">Reset Token</label>
                <input type="text" value={resetToken} onChange={(e) => setResetToken(e.target.value)}
                  className="input-field font-mono text-xs" placeholder="Paste token from email" />
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-gray-700 mb-2 block">New Password</label>
                <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                  className="input-field" placeholder="Min. 8 characters" />
              </div>
              <button type="submit" disabled={resetting} className="btn-primary w-full py-3.5">
                {resetting ? 'Resetting…' : 'Reset Password'}
              </button>
              <button type="button" onClick={() => setSent(false)}
                className="w-full text-xs text-gray-400 hover:text-gray-600 uppercase tracking-wider">
                Try different email
              </button>
            </form>
          )}

          <div className="mt-5 text-center">
            <Link to="/login" className="text-xs text-brand-500 hover:text-brand-700 uppercase tracking-wider flex items-center justify-center gap-1">
              <ArrowLeft size={12} /> Back to Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
