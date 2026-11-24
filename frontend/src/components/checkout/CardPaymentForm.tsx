import { useState } from 'react';
import { CreditCard, AlertCircle } from 'lucide-react';

interface Props {
  disabled: boolean;
  onChange: (data: any) => void;
}

export default function CardPaymentForm({ disabled, onChange }: Props) {
  const [card, setCard] = useState({
    number: '', expiry: '', cvv: '', name: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleCardNumber = (val: string) => {
    // Format: 1234 5678 9012 3456
    const cleaned = val.replace(/\D/g, '').slice(0, 16);
    const formatted = cleaned.replace(/(\d{4})(?=\d)/g, '$1 ');
    setCard({ ...card, number: formatted });
    onChange({ ...card, number: cleaned });
  };

  const handleExpiry = (val: string) => {
    const cleaned = val.replace(/\D/g, '').slice(0, 4);
    const formatted = cleaned.length >= 2 ? `${cleaned.slice(0, 2)}/${cleaned.slice(2)}` : cleaned;
    setCard({ ...card, expiry: formatted });
    onChange({ ...card, expiry: cleaned });
  };

  const handleCVV = (val: string) => {
    const cleaned = val.replace(/\D/g, '').slice(0, 4);
    setCard({ ...card, cvv: cleaned });
    onChange({ ...card, cvv: cleaned });
  };

  const handleBlur = () => {
    const newErrors: Record<string, string> = {};
    if (!card.number || card.number.replace(/\s/g, '').length !== 16) newErrors.number = 'Invalid card number';
    if (!card.expiry || card.expiry.replace(/\D/g, '').length !== 4) newErrors.expiry = 'Invalid expiry';
    if (!card.cvv || card.cvv.length < 3) newErrors.cvv = 'Invalid CVV';
    if (!card.name) newErrors.name = 'Cardholder name required';
    setErrors(newErrors);
  };

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 p-3 flex items-start gap-2 text-xs text-blue-700">
        <AlertCircle size={14} className="mt-0.5 shrink-0" />
        <p>
          <strong>Demo mode:</strong> Use test card <code className="font-mono">4242 4242 4242 4242</code> with any future date and CVC.
        </p>
      </div>

      <div>
        <label className="text-sm font-semibold text-gray-700 mb-1.5 block">Cardholder Name *</label>
        <input
          type="text"
          value={card.name}
          onChange={(e) => setCard({ ...card, name: e.target.value })}
          onBlur={handleBlur}
          disabled={disabled}
          className="input-field"
          placeholder="John Doe"
        />
        {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
      </div>

      <div>
        <label className="text-sm font-semibold text-gray-700 mb-1.5 block flex items-center gap-2">
          <CreditCard size={14} /> Card Number *
        </label>
        <input
          type="text"
          value={card.number}
          onChange={(e) => handleCardNumber(e.target.value)}
          onBlur={handleBlur}
          disabled={disabled}
          className="input-field font-mono tracking-widest text-lg"
          placeholder="1234 5678 9012 3456"
          maxLength={19}
        />
        {errors.number && <p className="text-xs text-red-500 mt-1">{errors.number}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-semibold text-gray-700 mb-1.5 block">Expiry (MM/YY) *</label>
          <input
            type="text"
            value={card.expiry}
            onChange={(e) => handleExpiry(e.target.value)}
            onBlur={handleBlur}
            disabled={disabled}
            className="input-field font-mono text-lg"
            placeholder="12/25"
            maxLength={5}
          />
          {errors.expiry && <p className="text-xs text-red-500 mt-1">{errors.expiry}</p>}
        </div>
        <div>
          <label className="text-sm font-semibold text-gray-700 mb-1.5 block">CVV *</label>
          <input
            type="password"
            value={card.cvv}
            onChange={(e) => handleCVV(e.target.value)}
            onBlur={handleBlur}
            disabled={disabled}
            className="input-field font-mono text-lg tracking-widest"
            placeholder="●●●"
            maxLength={4}
          />
          {errors.cvv && <p className="text-xs text-red-500 mt-1">{errors.cvv}</p>}
        </div>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 p-3 text-xs text-yellow-700">
        <p>
          <strong>Security:</strong> Card data is processed securely via Stripe. We never store full card numbers.
        </p>
      </div>
    </div>
  );
}
