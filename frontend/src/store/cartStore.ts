import { create } from 'zustand';
import api from '../lib/api';
import toast from 'react-hot-toast';

export interface CartItem {
  id: string;
  product_id: string;
  variant_id: string;
  quantity: number;
  name: string;
  slug: string;
  unit_price: number;
  size: string;
  color: string;
  color_hex?: string;
  stock_qty: number;
  image_url?: string;
}

interface CartState {
  items: CartItem[];
  subtotal: number;
  isLoading: boolean;
  isOpen: boolean;
  fetchCart: () => Promise<void>;
  addItem: (productId: string, variantId: string, qty?: number) => Promise<void>;
  updateItem: (id: string, qty: number) => Promise<void>;
  removeItem: (id: string) => Promise<void>;
  clearCart: () => Promise<void>;
  setOpen: (v: boolean) => void;
}

export const useCartStore = create<CartState>((set) => ({
  items: [],
  subtotal: 0,
  isLoading: false,
  isOpen: false,

  fetchCart: async () => {
    set({ isLoading: true });
    try {
      const res = await api.get('/cart');
      set({ items: res.data.data.items, subtotal: res.data.data.subtotal });
    } finally {
      set({ isLoading: false });
    }
  },

  addItem: async (productId, variantId, qty = 1) => {
    const res = await api.post('/cart/items', { product_id: productId, variant_id: variantId, quantity: qty });
    const items = res.data.data;
    const subtotal = items.reduce((s: number, i: CartItem) => s + i.unit_price * i.quantity, 0);
    set({ items, subtotal, isOpen: true });
    toast.success('Added to cart!');
  },

  updateItem: async (id, qty) => {
    const res = await api.patch(`/cart/items/${id}`, { quantity: qty });
    const items = res.data.data;
    const subtotal = items.reduce((s: number, i: CartItem) => s + i.unit_price * i.quantity, 0);
    set({ items, subtotal });
  },

  removeItem: async (id) => {
    const res = await api.delete(`/cart/items/${id}`);
    const items = res.data.data;
    const subtotal = items.reduce((s: number, i: CartItem) => s + i.unit_price * i.quantity, 0);
    set({ items, subtotal });
  },

  clearCart: async () => {
    await api.delete('/cart');
    set({ items: [], subtotal: 0 });
  },

  setOpen: (v) => set({ isOpen: v }),
}));
