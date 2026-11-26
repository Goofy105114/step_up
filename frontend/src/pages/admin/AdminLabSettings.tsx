import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FlaskConical, Pencil, Plus, Save, Trash2, X } from 'lucide-react';
import api from '../../lib/api';
import toast from 'react-hot-toast';

type LabSetting = {
  id: string;
  setting_key: string;
  setting_value: Record<string, unknown>;
  description?: string | null;
  updated_at?: string;
};

export default function AdminLabSettings() {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [settingKey, setSettingKey] = useState('');
  const [description, setDescription] = useState('');
  const [valueJson, setValueJson] = useState('{}');
  const queryClient = useQueryClient();
  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['admin', 'lab-settings'],
    queryFn: () => api.get('/admin/lab-settings').then(response => response.data),
  });
  const settings: LabSetting[] = data?.data || [];

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['admin', 'lab-settings'] });
  const saveMutation = useMutation({
    mutationFn: ({ id, payload }: { id?: string; payload: { setting_key?: string; setting_value: Record<string, unknown>; description: string } }) =>
      id ? api.patch(`/admin/lab-settings/${id}`, payload) : api.post('/admin/lab-settings', payload),
    onSuccess: () => {
      toast.success(editingId ? 'Lab setting updated' : 'Lab setting created');
      resetForm();
      refresh();
    },
    onError: (error: any) => toast.error(error.response?.data?.message || 'Unable to save lab setting'),
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/lab-settings/${id}`),
    onSuccess: () => { toast.success('Lab setting deleted'); refresh(); },
    onError: (error: any) => toast.error(error.response?.data?.message || 'Unable to delete lab setting'),
  });

  const resetForm = () => {
    setEditingId(null);
    setSettingKey('');
    setDescription('');
    setValueJson('{}');
  };

  const startEdit = (setting: LabSetting) => {
    setEditingId(setting.id);
    setSettingKey(setting.setting_key);
    setDescription(setting.description || '');
    setValueJson(JSON.stringify(setting.setting_value, null, 2));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    let parsed: unknown;
    try {
      parsed = JSON.parse(valueJson);
    } catch {
      toast.error('Value must be valid JSON');
      return;
    }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      toast.error('Value must be a JSON object');
      return;
    }
    if (!editingId && !settingKey.trim()) {
      toast.error('A setting key is required');
      return;
    }
    saveMutation.mutate({
      id: editingId || undefined,
      payload: {
        ...(editingId ? {} : { setting_key: settingKey.trim() }),
        setting_value: parsed as Record<string, unknown>,
        description,
      },
    });
  };

  return (
    <div className="max-w-6xl space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-display font-bold text-gray-900">Laboratory Settings</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-500">
          Store lab configuration as structured JSON. Only administrators can view and edit these settings. Do not store passwords, API keys or other secrets here.
        </p>
      </div>

      <form onSubmit={submit} className="card space-y-4 p-6">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div className="flex items-center gap-2">
            <FlaskConical size={16} className="text-brand-600" />
            <h2 className="text-xs font-bold uppercase tracking-widest text-gray-700">{editingId ? 'Edit setting' : 'Add setting'}</h2>
          </div>
          {editingId ? <button type="button" onClick={resetForm} className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-900"><X size={14} /> Cancel edit</button> : null}
        </div>
        {!editingId ? (
          <div>
            <label className="label">Setting key *</label>
            <input value={settingKey} onChange={event => setSettingKey(event.target.value)} className="input-field font-mono" placeholder="e.g. durometer.instrument" required />
          </div>
        ) : (
          <div>
            <label className="label">Setting key</label>
            <p className="rounded-lg bg-gray-50 px-3 py-2 font-mono text-sm text-gray-700">{settingKey}</p>
          </div>
        )}
        <div>
          <label className="label">Description</label>
          <input value={description} onChange={event => setDescription(event.target.value)} className="input-field" placeholder="What this setting controls" />
        </div>
        <div>
          <label className="label">Setting value (JSON object) *</label>
          <textarea value={valueJson} onChange={event => setValueJson(event.target.value)} rows={7} className="input-field resize-y font-mono text-xs" spellCheck={false} />
        </div>
        <button type="submit" disabled={saveMutation.isPending || deleteMutation.isPending} className="btn-primary inline-flex items-center gap-2 px-6">
          {editingId ? <Save size={15} /> : <Plus size={15} />}
          {saveMutation.isPending ? 'Saving…' : editingId ? 'Save changes' : 'Add setting'}
        </button>
      </form>

      <section className="card overflow-hidden">
        <div className="border-b border-gray-100 px-6 py-4">
          <h2 className="text-xs font-bold uppercase tracking-widest text-gray-700">Configured settings</h2>
        </div>
        {isLoading ? <p className="p-8 text-center text-sm text-gray-400">Loading lab settings…</p> : null}
        {isError ? <div role="alert" className="p-8 text-center"><p className="text-sm text-red-600">Unable to load lab settings.</p><button type="button" onClick={() => refetch()} disabled={isFetching} className="btn-outline mt-3 px-4 py-2 text-xs">{isFetching ? 'Retrying…' : 'Try again'}</button></div> : null}
        {!isLoading && !isError && settings.length === 0 ? (
          <p className="p-8 text-center text-sm text-gray-400">No laboratory settings have been configured.</p>
        ) : null}
        {settings.length > 0 ? (
          <div className="divide-y divide-gray-100">
            {settings.map(setting => (
              <article key={setting.id} className="flex flex-col gap-4 p-5 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0 flex-1">
                  <h3 className="font-mono text-sm font-semibold text-gray-900">{setting.setting_key}</h3>
                  {setting.description ? <p className="mt-1 text-sm text-gray-500">{setting.description}</p> : null}
                  <pre className="mt-3 overflow-x-auto rounded-lg bg-gray-950 p-3 text-xs leading-5 text-green-100">{JSON.stringify(setting.setting_value, null, 2)}</pre>
                  {setting.updated_at ? <p className="mt-2 text-[11px] text-gray-400">Updated {new Date(setting.updated_at).toLocaleString()}</p> : null}
                </div>
                <div className="flex shrink-0 gap-2">
                  <button type="button" disabled={saveMutation.isPending || deleteMutation.isPending} onClick={() => startEdit(setting)} className="btn-outline inline-flex items-center gap-1 px-3 py-2 text-xs"><Pencil size={13} /> Edit</button>
                  <button type="button" disabled={deleteMutation.isPending || saveMutation.isPending} onClick={() => {
                    if (window.confirm(`Delete setting “${setting.setting_key}”?`)) deleteMutation.mutate(setting.id);
                  }} className="rounded-lg p-2 text-red-600 hover:bg-red-50" aria-label="Delete setting"><Trash2 size={15} /></button>
                </div>
              </article>
            ))}
          </div>
        ) : null}
      </section>
    </div>
  );
}
