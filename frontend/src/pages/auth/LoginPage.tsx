import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';
import api from '../../lib/api';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [otpPurpose,setOtpPurpose]=useState('login');
  const [otpIdentifier,setOtpIdentifier]=useState('');
  const [otpRequestId,setOtpRequestId]=useState('');
  const [otpCode,setOtpCode]=useState('');
  const [otpBusy,setOtpBusy]=useState(false);
  const [tab, setTab] = useState<'patient' | 'order'>('patient');
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
      if (user?.role === 'admin' || user?.role === 'staff') navigate('/admin', { replace: true });
      else navigate(from === '/login' ? '/' : from, { replace: true });
    } catch (e: any) { toast.error(e.response?.data?.message || 'Unable to sign in. Please try again.'); }
  };

  const sendLoginOtp=async()=>{if(!otpIdentifier.trim()){toast.error('Enter your email or mobile number');return;}setOtpBusy(true);try{if(otpRequestId){await api.post('/auth/otp/resend',{request_id:otpRequestId});}else{const r=await api.post('/auth/otp/send',{identifier:otpIdentifier,purpose:otpPurpose});setOtpRequestId(r.data.request_id);}toast.success('OTP sent');}catch(e:any){toast.error(e.response?.data?.message||'Could not send OTP');}finally{setOtpBusy(false);}};
  const verifyLoginOtp=async()=>{setOtpBusy(true);try{const v=await api.post('/auth/otp/verify',{request_id:otpRequestId,otp:otpCode});const r=await api.post('/auth/otp/login',{verification_ticket:v.data.verification_ticket});localStorage.setItem('token',r.data.token);useAuthStore.setState({token:r.data.token,user:r.data.user});toast.success('Signed in');navigate(r.data.user.role==='admin'||r.data.user.role==='staff'?'/admin':(from==='/login'?'/':from),{replace:true});}catch(e:any){toast.error(e.response?.data?.message||'OTP verification failed');}finally{setOtpBusy(false);}};
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
        <div className="w-full max-w-4xl mx-auto py-space-sm md:py-space-md">
          <div className="relative w-full">
            <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
            <div className="relative bg-surface-container-lowest rounded-lg shadow-card-hover p-6 sm:p-10 md:p-12">

              {/* Top credential badge */}
              <div className="flex items-center justify-between mb-8">
                <div className="inline-flex items-center gap-2 bg-surface-container-low px-3.5 py-1.5 rounded-full">
                  <span className="material-symbols-outlined text-secondary text-[16px]">verified_user</span>
                  <span className="text-label-badge font-bold uppercase tracking-[0.06em] text-secondary">STEPUP ACCOUNT</span>
                </div>
                <div className="flex items-center gap-1.5 text-on-surface-variant text-label-md font-semibold">
                  <span className="inline-block w-2 h-2 rounded-full bg-secondary animate-pulse" />
                  <span>Account sign-in</span>
                </div>
              </div>

              <div className="max-w-2xl mb-10">
                <h1 className="text-headline-lg font-semibold text-primary tracking-tight mb-3">
                  Access Your Orthopedic Profile &amp; Order Data
                </h1>
                <p className="text-body-md text-on-surface-variant leading-relaxed">
                  Manage active footwear orders, view your size calibrations, and download itemized receipts.
                </p>
              </div>

              {/* Tab switcher */}
              <div className="flex items-center p-1.5 bg-surface-container rounded-full max-w-md mb-8">
                <button
                  onClick={() => setTab('patient')}
                  className={`flex-1 py-2.5 px-4 rounded-full text-label-md font-semibold text-center transition-all flex items-center justify-center gap-2 ${tab === 'patient' ? 'bg-surface-container-lowest text-primary shadow-sm' : 'text-on-surface-variant hover:text-primary'}`}
                >
                  <span className="material-symbols-outlined text-[18px]">account_circle</span>
                  Sign In
                </button>
                <button
                  onClick={() => setTab('order')}
                  className={`flex-1 py-2.5 px-4 rounded-full text-label-md font-semibold text-center transition-all flex items-center justify-center gap-2 ${tab === 'order' ? 'bg-surface-container-lowest text-primary shadow-sm' : 'text-on-surface-variant hover:text-primary'}`}
                >
                  <span className="material-symbols-outlined text-[18px]">receipt_long</span>
                  Track Order
                </button>
              </div>

              {tab === 'patient' && (
                <div className="space-y-6">
                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="space-y-2">
                      <label className="label" htmlFor="email">Email Address</label>
                      <div className="relative flex items-center">
                        <span className="material-symbols-outlined absolute left-4 text-outline text-[20px] pointer-events-none">mail</span>
                        <input id="email" type="email" required value={email} onChange={e => setEmail(e.target.value)}
                          placeholder="patient@example.com"
                          className="input-field pl-12 pr-10" />
                        {email && <span className="material-symbols-outlined absolute right-4 text-secondary text-[20px]">check_circle</span>}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="label mb-0" htmlFor="password">Security Passcode</label>
                        <Link to="/forgot-password" className="text-label-md font-semibold text-secondary hover:text-primary transition-colors">Forgot Password?</Link>
                      </div>
                      <div className="relative flex items-center">
                        <span className="material-symbols-outlined absolute left-4 text-outline text-[20px] pointer-events-none">lock</span>
                        <input id="password" type={showPw ? 'text' : 'password'} required value={password} onChange={e => setPassword(e.target.value)}
                          placeholder="••••••••••••"
                          className="input-field pl-12 pr-12" />
                        <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3.5 p-1 text-outline hover:text-primary transition-colors rounded-full">
                          <span className="material-symbols-outlined text-[20px]">{showPw ? 'visibility_off' : 'visibility'}</span>
                        </button>
                      </div>
                    </div>

                    <button type="submit" disabled={isLoading}
                      className="w-full h-[52px] bg-primary text-on-primary rounded-full text-label-md font-semibold tracking-[0.04em] uppercase shadow-md hover:bg-primary-container transition-all flex items-center justify-center gap-2 group mt-2 disabled:opacity-50">
                      {isLoading ? 'Signing in...' : (
                        <><span>Sign In to Portal</span><span className="material-symbols-outlined text-[18px] group-hover:translate-x-1 transition-transform">arrow_forward</span></>
                      )}
                    </button>
                  </form>


                  <section className="mt-5 rounded-xl border border-outline-variant/50 bg-surface-container-low p-4 space-y-3">
                    <p className="text-sm font-semibold text-primary">Sign in with a one-time code</p>
                    <div className="flex gap-2">
                      <button type="button" onClick={()=>{setOtpPurpose('login');setOtpRequestId('');setOtpCode('');}} className="rounded-full border px-3 py-2 text-xs font-semibold">Customer</button>
                      <button type="button" onClick={()=>{setOtpPurpose('admin');setOtpRequestId('');setOtpCode('');}} className="rounded-full border px-3 py-2 text-xs font-semibold">Admin / staff</button>
                    </div>
                    <input value={otpIdentifier} onChange={e=>{setOtpIdentifier(e.target.value);setOtpRequestId('');setOtpCode('');}} className="input-field" placeholder="Email or 10-digit mobile"/>
                    <button type="button" onClick={sendLoginOtp} disabled={otpBusy} className="btn-primary w-full disabled:opacity-50">{otpBusy?'Please wait':otpRequestId?'Resend OTP':'Send OTP'}</button>
                    {otpRequestId&&<div className="flex gap-2"><input value={otpCode} onChange={e=>setOtpCode(e.target.value.replace(/\D/g,'').slice(0,8))} inputMode="numeric" maxLength={8} className="input-field" placeholder="Enter OTP"/><button type="button" onClick={verifyLoginOtp} disabled={otpBusy} className="btn-primary">Verify</button></div>}
                  </section>
                  <div className="pt-4 space-y-3">
                    <div className="flex items-center gap-4">
                      <div className="flex-1 h-px bg-surface-container-high" />
                      <span className="text-label-badge font-bold uppercase tracking-[0.06em] text-outline">or</span>
                      <div className="flex-1 h-px bg-surface-container-high" />
                    </div>
                    <p className="text-center text-body-sm text-on-surface-variant">
                      New to StepUp?{' '}
                      <Link to="/register" className="font-semibold text-primary hover:text-secondary transition-colors">Create Account</Link>
                    </p>
                    <div className="mt-4 p-4 bg-secondary-container/30 rounded-DEFAULT">
                      <p className="text-body-sm text-on-secondary-container text-center">
                        Your orders, saved items, and account details — all in one place.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {tab === 'order' && (
                <div className="space-y-5">
                  <div className="space-y-2">
                    <label className="label">Order Number / ID</label>
                    <div className="relative flex items-center">
                      <span className="material-symbols-outlined absolute left-4 text-outline text-[20px] pointer-events-none">tag</span>
                      <input type="text" placeholder="e.g. ORD-1748382748-291" className="input-field pl-12 uppercase" />
                    </div>
                    <p className="text-body-sm text-outline">Located on your order confirmation email.</p>
                  </div>
                  <Link to="/orders" className="w-full h-[52px] bg-primary text-on-primary rounded-full text-label-md font-semibold flex items-center justify-center gap-2 hover:bg-primary-container transition-all shadow-md">
                    <span className="material-symbols-outlined text-[18px]">search</span>
                    Track My Order
                  </Link>
                </div>
              )}

            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
