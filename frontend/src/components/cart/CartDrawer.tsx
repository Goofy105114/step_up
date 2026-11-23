import { Link } from 'react-router-dom';
import { X, ShoppingBag, Plus, Minus, Trash2 } from 'lucide-react';
import { useCartStore } from '../../store/cartStore';
import { formatPrice } from '../../lib/formatters';
import { motion, AnimatePresence } from 'framer-motion';

export default function CartDrawer() {
  const { items, subtotal, isOpen, setOpen, updateItem, removeItem } = useCartStore();

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-50" onClick={() => setOpen(false)} />

          <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'tween', duration: 0.3 }}
            className="fixed right-0 top-0 h-full w-full max-w-sm bg-white z-50 shadow-2xl flex flex-col">

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <ShoppingBag size={18} className="text-gray-900" />
                <h2 className="text-xs font-bold uppercase tracking-widest text-gray-900">
                  Shopping Cart ({items.length})
                </h2>
              </div>
              <button onClick={() => setOpen(false)}
                className="p-1.5 hover:bg-gray-100 transition-colors">
                <X size={18} />
              </button>
            </div>

            {/* Items */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
              {items.length === 0 ? (
                <div className="text-center py-16 space-y-4">
                  <ShoppingBag size={48} className="mx-auto text-gray-200" strokeWidth={1} />
                  <p className="text-sm text-gray-400 uppercase tracking-widest">Your cart is empty</p>
                  <button onClick={() => setOpen(false)}>
                    <Link to="/shop" className="btn-primary text-xs">Start Shopping</Link>
                  </button>
                </div>
              ) : (
                items.map((item) => (
                  <div key={item.id} className="flex gap-4">
                    {/* Image */}
                    <div className="w-20 h-20 border border-gray-100 overflow-hidden shrink-0 bg-gray-50">
                      {item.image_url
                        ? <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                        : <div className="w-full h-full bg-gray-100" />}
                    </div>
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <Link to={`/product/${item.slug}`} onClick={() => setOpen(false)}
                        className="text-xs font-semibold text-gray-900 hover:text-brand-500 line-clamp-2 leading-snug transition-colors uppercase tracking-wide">
                        {item.name}
                      </Link>
                      <p className="text-xs text-gray-400 mt-1">{item.size} / {item.color}</p>
                      <div className="flex items-center justify-between mt-2.5">
                        <div className="flex items-center border border-gray-200">
                          <button onClick={() => updateItem(item.id, item.quantity - 1)}
                            className="w-7 h-7 flex items-center justify-center hover:bg-gray-50 transition-colors">
                            <Minus size={11} />
                          </button>
                          <span className="w-8 text-center text-xs font-semibold border-x border-gray-200 py-1.5">{item.quantity}</span>
                          <button onClick={() => updateItem(item.id, item.quantity + 1)}
                            disabled={item.quantity >= item.stock_qty}
                            className="w-7 h-7 flex items-center justify-center hover:bg-gray-50 transition-colors disabled:opacity-30">
                            <Plus size={11} />
                          </button>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-gray-900">
                            {formatPrice(item.unit_price * item.quantity)}
                          </span>
                          <button onClick={() => removeItem(item.id)}
                            className="text-gray-300 hover:text-red-500 transition-colors">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            {items.length > 0 && (
              <div className="px-6 py-5 border-t border-gray-200 space-y-4 bg-white">
                {subtotal < 599 && (
                  <div className="bg-brand-50 border border-brand-100 px-3 py-2 text-xs text-brand-600 text-center">
                    Add <strong>{formatPrice(599 - subtotal)}</strong> more for free shipping!
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase tracking-widest font-semibold text-gray-500">Subtotal</span>
                  <span className="text-lg font-bold text-gray-900">{formatPrice(subtotal)}</span>
                </div>
                <p className="text-xs text-gray-400 text-center">Taxes and shipping calculated at checkout</p>
                <Link to="/checkout" onClick={() => setOpen(false)}
                  className="btn-primary w-full text-center block py-3.5">
                  Proceed to Checkout
                </Link>
                <Link to="/cart" onClick={() => setOpen(false)}
                  className="btn-outline w-full text-center block py-3">
                  View Cart
                </Link>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
