import { Link } from 'react-router-dom';
import { Facebook, Twitter, Instagram, Youtube, Linkedin, Truck, Headphones, Shield } from 'lucide-react';

const footerLinks = {
  Account: [
    ['My Account', '/profile'],
    ['Track Your Order', '/orders'],
    ['Shopping Cart', '/cart'],
    ['Wishlist', '/wishlist'],
  ],
  About: [
    ['About StepUp', '#'],
    ['Our Guarantee', '#'],
    ['Terms & Conditions', '#'],
    ['Return Policy', '#'],
    ['Privacy Policy', '#'],
    ['Shipping Policy', '#'],
  ],
};

export default function Footer() {
  return (
    <footer className="bg-white border-t border-gray-200">
      {/* Trust row */}
      <div className="border-b border-gray-200">
        <div className="container-site py-8 grid grid-cols-2 md:grid-cols-4 gap-6 text-sm">
          {[
            { icon: Truck, title: 'Free Shipping & Return', desc: 'Free shipping on all orders over ₹599' },
            { icon: Shield, title: 'Money Back Guarantee', desc: '100% money back guarantee' },
            { icon: Headphones, title: 'Online Support 24/7', desc: 'Lorem ipsum dolor sit amet' },
            { icon: Shield, title: 'Secure Payment', desc: 'Lorem ipsum dolor sit amet' },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="flex items-start gap-4">
              <Icon size={30} className="text-gray-400 shrink-0 mt-0.5" strokeWidth={1.5} />
              <div>
                <p className="font-semibold text-gray-900 text-sm">{title}</p>
                <p className="text-gray-500 text-xs mt-0.5 leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Newsletter */}
      <div className="border-b border-gray-200 bg-gray-50">
        <div className="container-site py-10 grid md:grid-cols-2 gap-8 items-center">
          <div>
            <h3 className="font-display text-xl font-bold text-gray-900">Sign Up to Newsletter</h3>
            <p className="text-sm text-gray-500 mt-1">…and receive ₹200 coupon for first shopping</p>
          </div>
          <form className="flex gap-0" onSubmit={(e) => e.preventDefault()}>
            <input
              type="email"
              placeholder="Enter your email address"
              className="flex-1 input-field border-gray-300 text-sm py-3 focus:border-gray-900"
            />
            <button type="submit" className="btn-primary px-8 whitespace-nowrap">
              Subscribe
            </button>
          </form>
        </div>
      </div>

      {/* Main footer */}
      <div className="container-site py-12 grid grid-cols-2 md:grid-cols-5 gap-8">
        {/* Brand */}
        <div className="col-span-2 md:col-span-1 space-y-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gray-900 flex items-center justify-center">
              <span className="text-white font-bold text-sm">S</span>
            </div>
            <span className="font-display text-xl font-bold text-gray-900">StepUp</span>
          </Link>
          <p className="text-xs text-gray-500 leading-relaxed">
            Premium D2C footwear — crafted for every step. Direct from our workshop to your door.
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            {[Facebook, Twitter, Instagram, Youtube, Linkedin].map((Icon, i) => (
              <a key={i} href="#"
                className="w-8 h-8 border border-gray-300 flex items-center justify-center text-gray-400 hover:bg-gray-900 hover:text-white hover:border-gray-900 transition-all">
                <Icon size={14} />
              </a>
            ))}
          </div>
        </div>

        {/* Links */}
        {Object.entries(footerLinks).map(([heading, links]) => (
          <div key={heading} className="space-y-4">
            <h4 className="font-bold uppercase tracking-wider text-xs text-gray-900">{heading}</h4>
            <ul className="space-y-2">
              {links.map(([label, path]) => (
                <li key={label}>
                  <Link to={path} className="text-xs text-gray-500 hover:text-brand-500 transition-colors">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}

        {/* Contact */}
        <div className="space-y-4 col-span-2">
          <h4 className="font-bold uppercase tracking-wider text-xs text-gray-900">Follow Us</h4>
          <p className="text-xs text-gray-500">12 Footwear Lane, Mumbai 400017, India</p>
          <p className="text-xs text-gray-500">+91 99999 99999</p>
          <p className="text-xs text-gray-500">support@stepup.in</p>
          <div>
            <p className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">Payment Methods</p>
            <div className="flex items-center gap-2">
              {['VISA', 'MC', 'UPI', 'PP'].map((m) => (
                <span key={m} className="border border-gray-300 px-2 py-0.5 text-[10px] font-bold text-gray-500">{m}</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-gray-200 bg-gray-50">
        <div className="container-site py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-gray-400">
          <p>© {new Date().getFullYear()} StepUp Footwear Pvt. Ltd. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <Link to="#" className="hover:text-gray-700">Affiliates</Link>
            <Link to="#" className="hover:text-gray-700">Privacy Policy</Link>
            <Link to="#" className="hover:text-gray-700">Terms & Conditions</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
