import { useQuery } from '@tanstack/react-query';
import { Users } from 'lucide-react';
import api from '../../lib/api';

type FitProfile = {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  foot_length_mm?: string | null;
  usual_size?: string | null;
  arch_preference?: string | null;
  comfort_focus?: string | null;
  daily_activity?: string | null;
  consent_at: string;
  updated_at: string;
};

export default function AdminPatientProfiles() {
  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['admin', 'patient-fit-profiles'],
    queryFn: () => api.get('/admin/patient-fit-profiles').then(response => response.data),
  });
  const profiles: FitProfile[] = data?.data || [];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <div className="flex items-center gap-3">
          <Users size={21} className="text-brand-600" />
          <h1 className="text-2xl font-display font-bold text-gray-900">Customer Fit Profiles</h1>
        </div>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-500">
          This page contains only customer-consented, self-reported footwear preferences. It is not a clinical record or gait assessment. Access is restricted to administrators.
        </p>
      </div>

      <div className="card overflow-hidden">
        {isLoading ? <p className="p-8 text-center text-sm text-gray-400">Loading fit profiles…</p> : null}
        {isError ? <div role="alert" className="p-8 text-center"><p className="text-sm text-red-600">Unable to load fit profiles.</p><button type="button" onClick={() => refetch()} disabled={isFetching} className="btn-outline mt-3 px-4 py-2 text-xs">{isFetching ? 'Retrying…' : 'Try again'}</button></div> : null}
        {!isLoading && !isError && profiles.length === 0 ? (
          <div className="p-10 text-center">
            <Users size={28} className="mx-auto text-gray-300" />
            <h2 className="mt-3 font-semibold text-gray-800">No consented fit profiles yet</h2>
            <p className="mt-2 text-sm text-gray-500">Profiles will appear after customers choose to save their fit preferences.</p>
          </div>
        ) : null}
        {profiles.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-100 bg-gray-50">
                <tr>{['Customer','Foot length','Usual size','Arch preference','Comfort focus','Daily activity','Consent recorded'].map(label => (
                  <th key={label} className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-gray-500">{label}</th>
                ))}</tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {profiles.map(profile => (
                  <tr key={profile.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-gray-900">{[profile.first_name, profile.last_name].filter(Boolean).join(' ') || 'Customer'}</p>
                      <p className="text-xs text-gray-500">{profile.email}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{profile.foot_length_mm ? `${profile.foot_length_mm} mm` : '—'}</td>
                    <td className="px-4 py-3 text-gray-700">{profile.usual_size || '—'}</td>
                    <td className="px-4 py-3 capitalize text-gray-700">{profile.arch_preference || '—'}</td>
                    <td className="px-4 py-3 capitalize text-gray-700">{profile.comfort_focus || '—'}</td>
                    <td className="px-4 py-3 capitalize text-gray-700">{profile.daily_activity || '—'}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{new Date(profile.consent_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    </div>
  );
}
