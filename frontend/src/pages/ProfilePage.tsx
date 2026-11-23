import { useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { useMutation } from '@tanstack/react-query';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { User, Lock, Package } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function ProfilePage() {
  const { user, fetchMe } = useAuthStore();
  const [form, setForm] = useState({ first_name: user?.first_name || '', last_name: user?.last_name || '', phone: '' });
  const [pwForm, setPwForm] = useState({ current_password: '', new_password: '', confirm: '' });
  const [tab, setTab] = useState('profile');

  const updateMutation = useMutation({
    mutationFn: (data: typeof form) => api.patch('/users/profile', data),
    onSuccess: () => { fetchMe(); toast.success('Profile updated!'); },
  });

  const pwMutation = useMutation({
    mutationFn: (data: { current_password: string; new_password: string }) => api.post('/auth/change-password', data),
    onSuccess: () => { setPwForm({ current_password: '', new_password: '', confirm: '' }); toast.success('Password changed!'); },
  });

  const handleUpdateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(form);
  };

  const handleChangePw = (e: React.FormEvent) => {
    e.preventDefault();
    if (pwForm.new_password !== pwForm.confirm) { toast.error('Passwords do not match'); return; }
    pwMutation.mutate({ current_password: pwForm.current_password, new_password: pwForm.new_password });
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'security', label: 'Security', icon: Lock },
    { id: 'orders', label: 'Orders', icon: Package },
  ];

  return (
    <div className="container-custom py-8 pb-20 max-w-2xl">
      <h1 className="text-3xl font-display font-bold mb-6">Account Settings</h1>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-xl mb-8 w-fit">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === id ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
            <Icon size={15} />{label}
          </button>
        ))}
      </div>

      {tab === 'profile' && (
        <div className="card p-6 animate-fade-in">
          <div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-100">
            <div className="w-16 h-16 rounded-full bg-brand-100 flex items-center justify-center">
              <span className="text-2xl font-bold text-brand-600">{user?.first_name[0]}</span>
            </div>
            <div>
              <p className="font-semibold text-gray-900">{user?.first_name} {user?.last_name}</p>
              <p className="text-sm text-gray-500">{user?.email}</p>
              <span className="badge bg-brand-100 text-brand-700 capitalize mt-1">{user?.role}</span>
            </div>
          </div>
          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">First Name</label>
                <input className="input-field" value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Last Name</label>
                <input className="input-field" value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Email</label>
              <input className="input-field bg-gray-50" value={user?.email} disabled />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Phone</label>
              <input className="input-field" type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <button type="submit" disabled={updateMutation.isPending} className="btn-primary">
              {updateMutation.isPending ? 'Saving…' : 'Save Changes'}
            </button>
          </form>
        </div>
      )}

      {tab === 'security' && (
        <div className="card p-6 animate-fade-in">
          <h2 className="font-semibold text-lg mb-5">Change Password</h2>
          <form onSubmit={handleChangePw} className="space-y-4">
            {(['current_password', 'new_password', 'confirm'] as const).map((field) => (
              <div key={field}>
                <label className="text-sm font-medium text-gray-700 mb-1 block capitalize">
                  {field.replace(/_/g, ' ')}
                </label>
                <input className="input-field" type="password" value={pwForm[field]}
                  onChange={(e) => setPwForm({ ...pwForm, [field]: e.target.value })} />
              </div>
            ))}
            <button type="submit" disabled={pwMutation.isPending} className="btn-primary">
              {pwMutation.isPending ? 'Updating…' : 'Update Password'}
            </button>
          </form>
        </div>
      )}

      {tab === 'orders' && (
        <div className="card p-6 animate-fade-in text-center space-y-4">
          <Package size={40} className="mx-auto text-brand-500" />
          <p className="text-gray-600">View all your past and current orders</p>
          <Link to="/orders" className="btn-primary inline-flex">View Orders</Link>
        </div>
      )}
    </div>
  );
}
