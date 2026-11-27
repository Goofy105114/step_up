import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { CheckCircle2, LifeBuoy } from 'lucide-react';
import api from '../lib/api';

type GrievanceReceipt = {
  ticket_number: string;
  status: string;
  acknowledged_at: string;
  resolution_due_at: string;
  created_at: string;
};

const subjects = [
  'Order or delivery',
  'Return or refund',
  'Payment',
  'Product information',
  'Fit or comfort feature',
  'Privacy or personal data',
  'Other',
];

export default function SupportPage() {
  const [form, setForm] = useState({
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    order_number: '',
    subject: '',
    message: '',
  });
  const [receipt, setReceipt] = useState<GrievanceReceipt | null>(null);
  const submit = useMutation({
    mutationFn: () => api.post('/grievances', form).then(response => response.data.data as GrievanceReceipt),
    onSuccess: data => setReceipt(data),
  });
  const update = (key: keyof typeof form, value: string) => setForm(current => ({ ...current, [key]: value }));

  if (receipt) {
    return (
      <main className="container-site min-h-[60vh] py-16">
        <section className="mx-auto max-w-2xl rounded-2xl border border-green-200 bg-white p-8 text-center shadow-sm">
          <CheckCircle2 className="mx-auto h-12 w-12 text-green-600" />
          <h1 className="mt-4 text-2xl font-bold text-gray-900">We’ve received your complaint</h1>
          <p className="mt-2 text-sm leading-6 text-gray-600">Your submission has been recorded and its receipt acknowledged. Keep this reference for any follow-up.</p>
          <div className="mt-6 rounded-xl bg-gray-50 p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Complaint reference</p>
            <p className="mt-2 font-mono text-xl font-bold text-gray-900">{receipt.ticket_number}</p>
            <p className="mt-3 text-xs text-gray-500">Received: {new Date(receipt.acknowledged_at).toLocaleString('en-IN')}</p>
          </div>
          <p className="mt-5 text-xs leading-5 text-gray-500">The STEPUP team should review and resolve the complaint within the applicable timeframe. This page does not send an email confirmation.</p>
          <div className="mt-6 flex justify-center gap-3">
            <button type="button" onClick={() => { setReceipt(null); setForm({ customer_name: '', customer_email: '', customer_phone: '', order_number: '', subject: '', message: '' }); }} className="btn-outline px-5 py-2.5">Submit another request</button>
            <Link to="/" className="btn-primary px-5 py-2.5">Back to STEPUP</Link>
          </div>
        </section>
      </main>
    );
  }

  const inputClass = 'mt-1 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10';
  return (
    <main className="container-site py-12 md:py-16">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-container text-primary"><LifeBuoy size={24} /></span>
          <div><p className="text-xs font-bold uppercase tracking-widest text-secondary">Customer care</p><h1 className="text-3xl font-bold text-primary">Contact STEPUP support</h1></div>
        </div>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-on-surface-variant">Use this form for order, delivery, payment, returns, product, fit-feature or privacy concerns. We’ll create a complaint reference so you can keep track of your submission.</p>
        <form onSubmit={event => { event.preventDefault(); submit.mutate(); }} className="mt-8 rounded-2xl border border-outline-variant/50 bg-white p-6 shadow-sm md:p-8">
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="text-sm font-semibold text-gray-700">Your name<input required minLength={2} maxLength={200} value={form.customer_name} onChange={event => update('customer_name', event.target.value)} className={inputClass} autoComplete="name" /></label>
            <label className="text-sm font-semibold text-gray-700">Email address<input required type="email" maxLength={255} value={form.customer_email} onChange={event => update('customer_email', event.target.value)} className={inputClass} autoComplete="email" /></label>
            <label className="text-sm font-semibold text-gray-700">Phone number (optional)<input type="tel" maxLength={20} value={form.customer_phone} onChange={event => update('customer_phone', event.target.value)} className={inputClass} autoComplete="tel" /></label>
            <label className="text-sm font-semibold text-gray-700">Order number (optional)<input maxLength={50} value={form.order_number} onChange={event => update('order_number', event.target.value)} className={inputClass} /></label>
            <label className="text-sm font-semibold text-gray-700 sm:col-span-2">What is this about?<select required value={form.subject} onChange={event => update('subject', event.target.value)} className={inputClass}><option value="">Select a topic</option>{subjects.map(subject => <option key={subject}>{subject}</option>)}</select></label>
            <label className="text-sm font-semibold text-gray-700 sm:col-span-2">Describe your concern<textarea required minLength={10} maxLength={5000} rows={6} value={form.message} onChange={event => update('message', event.target.value)} className={inputClass} placeholder="Please share the details needed to understand your concern. Avoid sharing passwords, OTPs, UPI PINs or full payment-card details." /></label>
          </div>
          <p className="mt-4 text-xs leading-5 text-gray-500">We use the details you submit to receive and handle your complaint. See our <Link to="/policies/privacy" className="font-semibold underline">Privacy Policy</Link>. Do not include medical records or unnecessary sensitive health information.</p>
          {submit.isError && <p role="alert" className="mt-4 text-sm text-red-600">{(submit.error as any)?.response?.data?.message || 'We could not submit your request. Please try again.'}</p>}
          <button type="submit" disabled={submit.isPending} className="btn-primary mt-6 w-full justify-center py-3.5 disabled:opacity-50">{submit.isPending ? 'Submitting…' : 'Submit complaint'}</button>
          <p className="mt-3 text-center text-xs text-gray-500">A reference number will be shown after successful submission.</p>
        </form>
      </div>
    </main>
  );
}
