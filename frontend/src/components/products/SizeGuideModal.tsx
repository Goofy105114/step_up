import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Props { isOpen: boolean; onClose: () => void; }

const sizes = [
  { uk: '6', eu: '39', us: '7', cm: '24.6' },
  { uk: '7', eu: '40', us: '8', cm: '25.4' },
  { uk: '8', eu: '41', us: '9', cm: '26.0' },
  { uk: '9', eu: '42', us: '10', cm: '26.7' },
  { uk: '10', eu: '43', us: '11', cm: '27.3' },
  { uk: '11', eu: '44', us: '12', cm: '28.0' },
];

export default function SizeGuideModal({ isOpen, onClose }: Props) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50" onClick={onClose} />
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-white w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-xs font-bold uppercase tracking-widest text-gray-900">Size Guide</h2>
              <button onClick={onClose} className="p-1 hover:bg-gray-100 transition-colors"><X size={18} /></button>
            </div>
            <div className="p-6">
              <p className="text-xs text-gray-500 mb-4 uppercase tracking-wider">
                Find your perfect fit using the chart below. Measure your foot length in cm for best results.
              </p>
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-900 text-white">
                    {['UK', 'EU', 'US', 'CM'].map((h) => (
                      <th key={h} className="px-4 py-2.5 text-xs font-bold uppercase tracking-widest text-center">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sizes.map((s, i) => (
                    <tr key={s.uk} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-4 py-2.5 text-center font-semibold text-gray-900">{s.uk}</td>
                      <td className="px-4 py-2.5 text-center text-gray-600">{s.eu}</td>
                      <td className="px-4 py-2.5 text-center text-gray-600">{s.us}</td>
                      <td className="px-4 py-2.5 text-center text-gray-600">{s.cm}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="mt-5 bg-brand-50 border border-brand-100 p-3">
                <p className="text-xs text-brand-700">
                  <strong>How to measure:</strong> Stand on a piece of paper, trace your foot, and measure the longest distance from heel to toe in centimetres.
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
