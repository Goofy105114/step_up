import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';
import api from '../../lib/api';
import api from '../../lib/api';

export default function RegisterPage() {
  const [form, setForm] = useState({ first_name: '', last_name: '', email: '', password: '', phone: '' });
  const [showPw, setShowPw] = useState(false);
  const [otpChannel,setOtpChannel]=useState('email');
  const [otpRequestId,setOtpRequestId]=useState('');
  const [otpCode,setOtpCode]=useState('');
  const [verificationTicket,setVerificationTicket]=useState('');
  const [otpBusy,setOtpBusy]=useState(false);
  const [otpChannel,setOtpChannel]=useState<'email'|'mobile'>('email');
  const [otpCode,setOtpCode]=useState('');
  const [otpRequestId,setOtpRequestId]=useState('');
  const [verificationTicket,setVerificationTicket]=useState('');
  const [otpBusy,setOtpBusy]=useState(false);
  const { register, isLoading } = useAuthStore();
  const navigate = useNavigate();
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password.length < 10 || form.password.length > 72 || !/[a-z]/.test(form.password) || !/[A-Z]/.test(form.password) || !/\d/.test(form.password) || !/[^A-Za-z0-9]/.test(form.password) || /\s/.test(form.password)) { toast.error('Use 10–72 characters with uppercase, lowercase, a number and a symbol.'); return; }
    if (form.phone && !/^[6-9]\d{9}$/.test(form.phone)) { toast.error('Enter exactly 10 digits for an Indian mobile number.'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email) || form.email.includes('..')) { toast.error('Enter a valid email address.'); return; }
    if (!verificationTicket) { toast.error('Verify your email or mobile number before creating your account.'); return; }
    try {
      await register({ ...form, verification_ticket: verificationTicket });
      toast.success('Welcome to StepUp! 🎉');
      navigate('/');
    } catch (e: any) { toast.error(e.response?.data?.message || 'Unable to create your account. Please try again.'); }
  };

  const sendRegistrationOtp=async()=>{const identifier=otpChannel==='email'?form.email:form.phone;if(!identifier){toast.error(otpChannel==='email'?'Enter your email first':'Enter your mobile number first');return;}setOtpBusy(true);try{const result=await api.post('/auth/otp/send',{identifier,purpose:'register'});setOtpRequestId(result.data.request_id);setVerificationTicket('');toast.success('Verification code sent.');}catch(error:any){toast.error(error.response?.data?.message||'Unable to send OTP');}finally{setOtpBusy(false);}};
  const verifyRegistrationOtp=async()=>{if(!otpRequestId||! /^\d{4,8}$/.test(otpCode)){toast.error('Enter the verification code');return;}setOtpBusy(true);try{const result=await api.post('/auth/otp/verify',{request_id:otpRequestId,otp:otpCode});setVerificationTicket(result.data.verification_ticket);toast.success('Contact verified successfully');}catch(error:any){toast.error(error.response?.data?.message||'OTP verification failed');}finally{setOtpBusy(false);}};

  const sendOtpCode=async()=>{const identifier=otpChannel==='email'?form.email:form.phone;if(!identifier){toast.error('Enter the selected contact first');return;}setOtpBusy(true);try{const r=await api.post('/auth/otp/send',{identifier,purpose:'register'});setOtpRequestId(r.data.request_id);setVerificationTicket('');toast.success('OTP sent');}catch(e:any){toast.error(e.response?.data?.message||'OTP could not be sent');}finally{setOtpBusy(false);}};
  const verifyOtpCode=async()=>{setOtpBusy(true);try{const r=await api.post('/auth/otp/verify',{request_id:otpRequestId,otp:otpCode});setVerificationTicket(r.data.verification_ticket);toast.success('Contact verified');}catch(e:any){toast.error(e.response?.data?.message||'OTP verification failed');}finally{setOtpBusy(false);}};
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
                  <input type="email" required maxLength={254} autoComplete="email" placeholder="patient@example.com" value={form.email} onChange={e => set('email', e.target.value)}
                    className="input-field pl-12 pr-10" />
                  {form.email && <span className="material-symbols-outlined absolute right-4 text-secondary text-[20px]">check_circle</span>}
                </div>
                <p className="text-body-sm text-outline">Itemized clinical receipt and order alerts will arrive here.</p>
              </div>

              <div className="space-y-2">
                <label className="label">Mobile Number (Delivery &amp; Fitting Alerts)</label>
                <div className="relative flex items-center">
                  <span className="material-symbols-outlined absolute left-4 text-outline text-[20px] pointer-events-none">sms</span>
                  <input type="tel" inputMode="numeric" autoComplete="tel-national" maxLength={10} pattern="[6-9][0-9]{9}" placeholder="9999999999" value={form.phone} onChange={e => set('phone', e.target.value.replace(/\D/g, '').slice(0, 10))}
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

              <section className="rounded-xl border border-outline-variant/50 bg-surface-container-low p-4 space-y-3">
                <div><p className="text-sm font-semibold text-primary">Verify your contact</p><p className="text-xs text-on-surface-variant mt-1">Choose where STEPUP should send your one-time code.</p></div>
                <div className="flex flex-wrap gap-2"><button type="button" onClick={()=>{setOtpChannel('email');setOtpRequestId('');setVerificationTicket('');}} className={otpChannel==='email'?'rounded-full px-4 py-2 text-xs font-semibold bg-primary text-white':'rounded-full px-4 py-2 text-xs font-semibold bg-white text-primary border'}>Email OTP</button><button type="button" onClick={()=>{setOtpChannel('mobile');setOtpRequestId('');setVerificationTicket('');}} className={otpChannel==='mobile'?'rounded-full px-4 py-2 text-xs font-semibold bg-primary text-white':'rounded-full px-4 py-2 text-xs font-semibold bg-white text-primary border'}>Mobile OTP</button></div>
                <div className="flex flex-wrap gap-2"><button type="button" onClick={sendRegistrationOtp} disabled={otpBusy||!!verificationTicket} className="rounded-full bg-secondary px-4 py-2 text-xs font-bold text-white disabled:opacity-50">{otpBusy?'Please wait…':otpRequestId?'Resend code':'Send code'}</button>{verificationTicket&&<span className="self-center text-xs font-semibold text-green-700">Contact verified ✓</span>}</div>
                {otpRequestId&&!verificationTicket&&<div className="flex flex-col gap-2 sm:flex-row"><input inputMode="numeric" maxLength={8} value={otpCode} onChange={e=>setOtpCode(e.target.value.replace(/\D/g,'').slice(0,8))} placeholder="Enter OTP" className="input-field flex-1"/><button type="button" onClick={verifyRegistrationOtp} disabled={otpBusy} className="rounded-full border border-primary px-5 py-2 text-xs font-bold text-primary disabled:opacity-50">Verify OTP</button></div>}
              </section>

              <section className="rounded-xl border border-outline-variant/50 bg-surface-container-low p-4 space-y-3">
                <p className="text-sm font-semibold text-primary">Verify your contact before registration</p>
                <div className="flex gap-2">
                  <button type="button" onClick={()=>{setOtpChannel('email');setOtpRequestId('');setVerificationTicket('');}} className="rounded-full border px-4 py-2 text-xs font-semibold">Email OTP</button>
                  <button type="button" onClick={()=>{setOtpChannel('mobile');setOtpRequestId('');setVerificationTicket('');}} className="rounded-full border px-4 py-2 text-xs font-semibold">Mobile OTP</button>
                </div>
                <button type="button" onClick={sendOtpCode} disabled={otpBusy||!!verificationTicket} className="btn-primary disabled:opacity-50">{otpBusy?'Please wait':otpRequestId?'Resend OTP':'Send OTP'}</button>
                {otpRequestId&&!verificationTicket&&<div className="flex gap-2"><input value={otpCode} onChange={e=>setOtpCode(e.target.value.replace(/\D/g,'').slice(0,8))} inputMode="numeric" maxLength={8} className="input-field" placeholder="Enter OTP"/><button type="button" onClick={verifyOtpCode} disabled={otpBusy} className="btn-primary">Verify</button></div>}
                {verificationTicket&&<p className="text-sm font-semibold text-green-700">Contact verified ✓</p>}
              </section>
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
