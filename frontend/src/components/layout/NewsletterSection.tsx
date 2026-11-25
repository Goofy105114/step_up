import { useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';

export default function NewsletterSection() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setSubmitted(true);
    toast.success('Welcome to StepUp Lab! Check your email for a 10% off code.');
  };

  return (
    <section className="py-space-xl bg-gradient-to-br from-primary to-primary-container relative overflow-hidden">
      <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-secondary/10 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-10 -left-10 w-64 h-64 rounded-full bg-primary-fixed/10 blur-2xl pointer-events-none" />
      <div className="container-site relative">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-space-xl items-center">
          <div>
            <div className="inline-flex items-center gap-space-xs bg-on-primary/10 px-space-md py-space-xs rounded-full text-label-badge font-bold uppercase tracking-[0.06em] text-primary-fixed mb-space-md">
              <span className="material-symbols-outlined text-[15px]">mail</span>
              StepUp Clinical Newsletter
            </div>
            <h2 className="text-headline-lg font-semibold text-on-primary tracking-tight mb-space-md">
              Get Podiatric Insights & Exclusive Offers
            </h2>
            <p className="text-body-lg text-on-primary/80 max-w-lg">
              Subscribe for peer-reviewed foot health tips, early access to new collections, and 10% off your first order.
            </p>
          </div>
          <div>
            {submitted ? (
              <div className="bg-on-primary/10 backdrop-blur-sm rounded-DEFAULT p-space-xl text-center border border-on-primary/20">
                <span className="material-symbols-outlined text-[48px] text-primary-fixed block mb-space-md">check_circle</span>
                <h3 className="text-title-md font-semibold text-on-primary mb-space-sm">You're in!</h3>
                <p className="text-body-md text-on-primary/80 mb-space-md">Check your email for your 10% discount code.</p>
                <Link to="/shop" className="inline-flex items-center gap-space-sm bg-on-primary text-primary px-8 py-3.5 rounded-full text-label-md font-semibold hover:bg-primary-fixed transition-all">
                  Shop Now
                  <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-space-sm">
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline text-[20px] pointer-events-none">mail</span>
                  <input
                    type="email" required value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="patient@example.com"
                    className="w-full h-[52px] bg-surface-container-lowest text-on-surface placeholder:text-outline pl-12 pr-4 rounded-full text-body-md outline-none focus:shadow-md transition-all"
                  />
                </div>
                <button type="submit" className="w-full h-[52px] bg-on-primary text-primary rounded-full text-label-md font-semibold uppercase tracking-[0.04em] hover:bg-primary-fixed transition-all shadow-lg flex items-center justify-center gap-2 group">
                  Subscribe for 10% Off
                  <span className="material-symbols-outlined text-[18px] group-hover:translate-x-1 transition-transform">arrow_forward</span>
                </button>
                <p className="text-body-sm text-on-primary/60 text-center">No spam. Unsubscribe anytime. HIPAA-compliant data handling.</p>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
