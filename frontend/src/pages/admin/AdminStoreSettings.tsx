import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Save, SlidersHorizontal } from 'lucide-react';
import api from '../../lib/api';
import toast from 'react-hot-toast';

type CheckoutPricing = {
  free_shipping_threshold_inr: number;
  shipping_fee_inr: number;
  gst_rate_percent: number;
};

type PricingForm = {
  free_shipping_threshold_inr: string;
  shipping_fee_inr: string;
  gst_rate_percent: string;
};

const emptyForm: PricingForm = {
  free_shipping_threshold_inr: '',
  shipping_fee_inr: '',
  gst_rate_percent: '',
};

export default function AdminStoreSettings() {
  const [form, setForm] = useState<PricingForm>(emptyForm);
  const queryClient = useQueryClient();

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['admin', 'store-settings', 'checkout-pricing'],
    queryFn: () => api.get('/admin/store-settings/checkout-pricing').then(response => response.data.data),
  });

  useEffect(() => {
    const value = data?.setting_value as CheckoutPricing | undefined;
    if (!value) return;
    setForm({
      free_shipping_threshold_inr: String(value.free_shipping_threshold_inr ?? ''),
      shipping_fee_inr: String(value.shipping_fee_inr ?? ''),
      gst_rate_percent: String(value.gst_rate_percent ?? ''),
    });
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: (payload: CheckoutPricing) => api.put('/admin/store-settings/checkout-pricing', payload),
    onSuccess: async response => {
      const value = response.data.data.setting_value as CheckoutPricing;
      setForm({
        free_shipping_threshold_inr: String(value.free_shipping_threshold_inr),
        shipping_fee_inr: String(value.shipping_fee_inr),
        gst_rate_percent: String(value.gst_rate_percent),
      });
      await queryClient.invalidateQueries({ queryKey: ['admin', 'store-settings', 'checkout-pricing'] });
      toast.success('Store pricing settings saved');
    },
    onError: (error: any) => toast.error(error.response?.data?.message || 'Unable to save store settings'),
  });

  const update = (key: keyof PricingForm, value: string) => setForm(current => ({ ...current, [key]: value }));

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (Object.values(form).some(value => !value.trim())) {
      toast.error('Complete all pricing fields');
      return;
    }
    const payload: CheckoutPricing = {
      free_shipping_threshold_inr: Number(form.free_shipping_threshold_inr),
      shipping_fee_inr: Number(form.shipping_fee_inr),
      gst_rate_percent: Number(form.gst_rate_percent),
    };
    if (
      !Number.isFinite(payload.free_shipping_threshold_inr) || payload.free_shipping_threshold_inr < 0 ||
      !Number.isFinite(payload.shipping_fee_inr) || payload.shipping_fee_inr < 0 ||
      !Number.isFinite(payload.gst_rate_percent) || payload.gst_rate_percent < 0 || payload.gst_rate_percent > 100
    ) {
      toast.error('Enter non-negative INR amounts and a GST rate between 0 and 100');
      return;
    }
    saveMutation.mutate(payload);
  };

  return (
    <div className="max-w-4xl space-y-6 animate-fade-in">
      <header>
        <div className="flex items-center gap-2 text-brand-600">
          <SlidersHorizontal size={18} />
          <p className="text-xs font-bold uppercase tracking-widest">Store configuration</p>
        </div>
        <h1 className="mt-2 text-2xl font-display font-bold text-gray-900">Store settings</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-500">
          Manage checkout pricing stored in the database. Changes apply to new orders only; existing orders keep the totals recorded when they were placed.
        </p>
      </header>

      {isLoading ? (
        <div className="card space-y-4 p-6" aria-busy="true">
          <div className="h-5 w-48 animate-pulse rounded bg-gray-100" />
          <div className="h-12 animate-pulse rounded bg-gray-100" />
          <div className="h-12 animate-pulse rounded bg-gray-100" />
          <div className="h-12 animate-pulse rounded bg-gray-100" />
        </div>
      ) : isError ? (
        <div role="alert" className="card p-8 text-center">
          <p className="text-sm text-red-600">Unable to load checkout pricing settings from the database.</p>
          <button type="button" onClick={() => refetch()} disabled={isFetching} className="btn-outline mt-4 px-5 py-2.5">
            {isFetching ? 'Retrying…' : 'Retry'}
          </button>
        </div>
      ) : (
        <form onSubmit={submit} className="card space-y-5 p-6">
          <div className="border-b border-gray-100 pb-3">
            <h2 className="text-sm font-bold text-gray-900">Checkout pricing</h2>
            <p className="mt-1 text-xs text-gray-500">Currency: Indian Rupees (INR)</p>
          </div>

          <div>
            <label htmlFor="free-shipping-threshold" className="label">Free shipping threshold (₹) *</label>
            <input id="free-shipping-threshold" type="number" min="0" step="0.01" inputMode="decimal" required
              value={form.free_shipping_threshold_inr} onChange={event => update('free_shipping_threshold_inr', event.target.value)}
              className="input-field" placeholder="Enter threshold in INR" />
            <p className="mt-1 text-xs text-gray-500">Orders at or above this merchandise total qualify for free shipping.</p>
          </div>

          <div>
            <label htmlFor="shipping-fee" className="label">Shipping fee (₹) *</label>
            <input id="shipping-fee" type="number" min="0" step="0.01" inputMode="decimal" required
              value={form.shipping_fee_inr} onChange={event => update('shipping_fee_inr', event.target.value)}
              className="input-field" placeholder="Enter shipping fee in INR" />
          </div>

          <div>
            <label htmlFor="gst-rate" className="label">GST rate (%) *</label>
            <input id="gst-rate" type="number" min="0" max="100" step="0.01" inputMode="decimal" required
              value={form.gst_rate_percent} onChange={event => update('gst_rate_percent', event.target.value)}
              className="input-field" placeholder="Enter GST percentage" />
          </div>

          <div className="flex flex-wrap items-center gap-3 border-t border-gray-100 pt-4">
            <button type="submit" disabled={saveMutation.isPending} className="btn-primary inline-flex items-center gap-2 px-6 py-3">
              <Save size={15} />
              {saveMutation.isPending ? 'Saving…' : 'Save store settings'}
            </button>
            <span className="text-xs text-gray-500">Saved settings are used by the checkout API.</span>
          </div>
        </form>
      )}
    </div>
  );
}
