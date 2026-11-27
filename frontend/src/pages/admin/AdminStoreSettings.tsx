import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Save, SlidersHorizontal } from 'lucide-react';
import api from '../../lib/api';
import toast from 'react-hot-toast';

type CheckoutPricing = {
  free_shipping_threshold_inr: number;
  shipping_fee_inr: number;
  gst_rate_percent: number;
  tax_enabled: boolean;
  tax_configuration_confirmed: boolean;
};

type PricingForm = {
  free_shipping_threshold_inr: string;
  shipping_fee_inr: string;
  gst_rate_percent: string;
  tax_enabled: boolean;
  tax_configuration_confirmed: boolean;
};

const emptyForm: PricingForm = {
  free_shipping_threshold_inr: '',
  shipping_fee_inr: '',
  gst_rate_percent: '',
  tax_enabled: false,
  tax_configuration_confirmed: false,
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
      tax_enabled: value.tax_enabled === true,
      tax_configuration_confirmed: value.tax_configuration_confirmed === true,
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
        tax_enabled: value.tax_enabled === true,
        tax_configuration_confirmed: value.tax_configuration_confirmed === true,
      });
      await queryClient.invalidateQueries({ queryKey: ['admin', 'store-settings', 'checkout-pricing'] });
      toast.success('Store pricing settings saved');
    },
    onError: (error: any) => toast.error(error.response?.data?.message || 'Unable to save store settings'),
  });

  const update = (key: keyof PricingForm, value: string) => setForm(current => ({ ...current, [key]: value }));

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if ([form.free_shipping_threshold_inr, form.shipping_fee_inr, form.gst_rate_percent].some(value => !value.trim())) {
      toast.error('Complete all pricing fields');
      return;
    }
    const payload: CheckoutPricing = {
      free_shipping_threshold_inr: Number(form.free_shipping_threshold_inr),
      shipping_fee_inr: Number(form.shipping_fee_inr),
      gst_rate_percent: Number(form.gst_rate_percent),
      tax_enabled: form.tax_enabled,
      tax_configuration_confirmed: form.tax_configuration_confirmed,
    };
    if (
      !Number.isFinite(payload.free_shipping_threshold_inr) || payload.free_shipping_threshold_inr < 0 ||
      !Number.isFinite(payload.shipping_fee_inr) || payload.shipping_fee_inr < 0 ||
      !Number.isFinite(payload.gst_rate_percent) || payload.gst_rate_percent < 0 || payload.gst_rate_percent > 100 ||
      (payload.tax_enabled && !payload.tax_configuration_confirmed)
    ) {
      toast.error('Enter valid pricing and confirm accountant-reviewed tax treatment before enabling tax collection');
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
            <label htmlFor="gst-rate" className="label">Tax rate (%) *</label>
            <input id="gst-rate" type="number" min="0" max="100" step="0.01" inputMode="decimal" required
              value={form.gst_rate_percent} onChange={event => update('gst_rate_percent', event.target.value)}
              className="input-field" placeholder="Enter configured tax percentage" />
          </div>

          <div className="space-y-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
            <h3 className="text-sm font-bold text-amber-950">Tax collection controls</h3>
            <p className="text-xs leading-5 text-amber-900">Tax collection is disabled by default. A legacy rate stored in the database is not enough to charge tax. Enable it only after the company accountant confirms registration, applicable rate, product classification and tax treatment.</p>
            <label className="flex items-start gap-3 text-sm text-gray-800">
              <input type="checkbox" checked={form.tax_configuration_confirmed} onChange={event => update('tax_configuration_confirmed', event.target.checked as any)} className="mt-1 h-4 w-4" />
              <span>I confirm the tax treatment and rate have been reviewed and approved by the company accountant.</span>
            </label>
            <label className="flex items-start gap-3 text-sm text-gray-800">
              <input type="checkbox" checked={form.tax_enabled} onChange={event => update('tax_enabled', event.target.checked as any)} className="mt-1 h-4 w-4" />
              <span>Enable tax collection on new orders (requires confirmed seller identity and company-confirmed GST registration).</span>
            </label>
            <p className="text-xs text-amber-900">When enabled, checkout also checks the legal business identity and GSTIN format. This format check is not official GST verification and does not make the order summary a GST tax invoice.</p>
          </div>

          <div className="flex flex-wrap items-center gap-3 border-t border-gray-100 pt-4">
            <button type="submit" disabled={saveMutation.isPending} className="btn-primary inline-flex items-center gap-2 px-6 py-3">
              <Save size={15} />
              {saveMutation.isPending ? 'Saving…' : 'Save store settings'}
            </button>
            <span className="text-xs text-gray-500">The configured rate is applied to new order totals. Confirm the applicable tax treatment and rate with your accountant before enabling it. This setting does not verify GST registration or create a GST tax invoice.</span>
          </div>
        </form>
      )}
    </div>
  );
}
