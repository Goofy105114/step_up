import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="bg-inverse-surface text-inverse-on-surface">
      {/* Top bar */}
      <div className="bg-primary text-on-primary py-space-xs px-margin-mobile md:px-margin">
        <div className="max-w-site mx-auto flex flex-wrap items-center justify-between gap-space-sm text-label-badge font-bold uppercase tracking-[0.06em]">
          <div className="flex items-center gap-space-sm">
            <span className="material-symbols-outlined text-[13px] text-primary-fixed">verified</span>
            <span>HSA/FSA Eligible • 60-Day Pain-Free Walking Guarantee • APMA Seal of Acceptance</span>
          </div>
          <span className="text-surface-container-highest">Free Express Delivery Over ₹599</span>
        </div>
      </div>

      <div className="max-w-site mx-auto px-margin-mobile md:px-margin py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 mb-14">
          {/* Brand */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-space-xs mb-space-lg">
              <span className="material-symbols-outlined text-secondary text-2xl">healing</span>
              <div>
                <span className="text-headline-sm font-semibold text-surface leading-none block">StepUp</span>
                <span className="text-label-badge font-bold uppercase tracking-[0.06em] text-outline leading-none">Orthopedic Lab</span>
              </div>
            </div>
            <p className="text-body-md text-on-surface-variant leading-relaxed mb-space-lg max-w-sm">
              Engineered by podiatric surgeons to eliminate plantar fasciitis pain and calcaneal stress. Premium footwear backed by peer-reviewed clinical research.
            </p>
            <div className="flex flex-col gap-space-sm">
              <div className="inline-flex items-center gap-space-xs bg-surface-container-low text-primary px-space-md py-space-xs rounded-full w-fit">
                <span className="material-symbols-outlined text-[16px] text-secondary">verified_user</span>
                <span className="text-label-badge font-bold uppercase tracking-[0.06em]">APMA Accepted</span>
              </div>
              <div className="inline-flex items-center gap-space-xs bg-surface-container-low text-primary px-space-md py-space-xs rounded-full w-fit">
                <span className="material-symbols-outlined text-[16px] text-tertiary">workspace_premium</span>
                <span className="text-label-badge font-bold uppercase tracking-[0.06em]">Peer-Reviewed Science</span>
              </div>
            </div>
          </div>

          {/* Collections */}
          <div>
            <h3 className="text-label-md font-semibold text-surface uppercase tracking-[0.04em] mb-space-md">Collections</h3>
            <ul className="space-y-space-sm">
              {[
                { label: "Men's Footwear", to: '/shop/mens' },
                { label: "Women's Footwear", to: '/shop/womens' },
                { label: "Sports & Athletic", to: '/shop/sports' },
                { label: "Kids' Collection", to: '/shop/kids' },
                { label: 'Formal Shoes', to: '/shop/formal' },
                { label: 'Sandals & Slides', to: '/shop/sandals' },
              ].map(({ label, to }) => (
                <li key={to}><Link to={to} className="text-body-sm text-on-surface-variant hover:text-secondary transition-colors">{label}</Link></li>
              ))}
            </ul>
          </div>

          {/* Clinical */}
          <div>
            <h3 className="text-label-md font-semibold text-surface uppercase tracking-[0.04em] mb-space-md">Clinical</h3>
            <ul className="space-y-space-sm">
              {[
                { label: 'Find Your Fit', to: '/find-your-fit' },
                { label: 'Clinical Studies', to: '/clinical-studies' },
                { label: 'Arch Support Tech', to: '/clinical-studies' },
                { label: 'Podiatrist Quiz', to: '/find-your-fit' },
                { label: 'HSA/FSA Info', to: '/clinical-studies' },
              ].map(({ label, to }) => (
                <li key={label}><Link to={to} className="text-body-sm text-on-surface-variant hover:text-secondary transition-colors">{label}</Link></li>
              ))}
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="text-label-md font-semibold text-surface uppercase tracking-[0.04em] mb-space-md">Support</h3>
            <ul className="space-y-space-sm">
              {[
                { label: 'My Orders', to: '/orders' },
                { label: 'Returns & Exchange', to: '/' },
                { label: 'Size Guide', to: '/find-your-fit' },
                { label: 'Contact Us', to: '/' },
                { label: 'FAQ', to: '/' },
              ].map(({ label, to }) => (
                <li key={label}><Link to={to} className="text-body-sm text-on-surface-variant hover:text-secondary transition-colors">{label}</Link></li>
              ))}
            </ul>
            <div className="mt-space-lg space-y-space-sm">
              <p className="text-body-sm text-on-surface-variant flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-secondary">call</span>
                +91 99999 99999
              </p>
              <p className="text-body-sm text-on-surface-variant flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-secondary">mail</span>
                support@stepup.in
              </p>
            </div>
          </div>
        </div>

        {/* Bottom */}
        <div className="border-t border-surface-container/20 pt-space-lg flex flex-col md:flex-row items-center justify-between gap-space-md">
          <p className="text-body-sm text-on-surface-variant text-center md:text-left">
            © 2026 StepUp Footwear Lab. All rights reserved. APMA Seal of Acceptance #2024-849.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-space-lg">
            {['Privacy Policy', 'Terms of Service', 'Accessibility'].map(link => (
              <Link key={link} to="/" className="text-body-sm text-on-surface-variant hover:text-secondary transition-colors">{link}</Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
