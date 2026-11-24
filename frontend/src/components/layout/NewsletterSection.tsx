import { useState } from 'react';
import { Mail } from 'lucide-react';
import api from '../../lib/api';
import toast from 'react-hot-toast';

export default function NewsletterSection() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) { toast.error('Enter email'); return; }
    setLoading(true);
    try {
      await api.post('/newsletter/subscribe', { email });
      toast.success('Subscribed! Check your email.');
      setEmail('');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Already subscribed');
    } finally { setLoading(false); }
  };

  return (
    <div className="bg-gray-900 text-white py-16">
      <div className="container-site">
        <div className="max-w-md mx-auto text-center space-y-5">
          <div className="flex justify-center">
            <div className="w-12 h-12 bg-brand-500 flex items-center justify-center">
              <Mail size={24} />
            </div>
          </div>
          <div>
            <h3 className="text-xl font-bold uppercase tracking-widest mb-2">Get 15% Off</h3>
            <p className="text-xs text-gray-300 uppercase tracking-wider">
              Subscribe for exclusive deals and new arrivals
            </p>
          </div>
          <form onSubmit={handleSubscribe} className="flex gap-2">
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com" className="input-field flex-1 py-3 text-sm"
              required disabled={loading} />
            <button type="submit" disabled={loading}
              className="btn-primary px-6 py-3 text-xs font-bold whitespace-nowrap">
              {loading ? 'Subscribing…' : 'Subscribe'}
            </button>
          </form>
          <p className="text-xs text-gray-400">
            We respect your privacy. Unsubscribe anytime.
          </p>
        </div>
      </div>
    </div>
  );
}
