import axios from 'axios';
import toast from 'react-hot-toast';

/**
 * In local dev:  VITE_API_URL is empty → Vite proxies /api → localhost:4000
 * In production: VITE_API_URL = https://stepup-api.onrender.com → direct calls
 */
const baseURL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api';

const api = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

// Attach JWT
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Global error handling
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const message = err.response?.data?.message || 'Something went wrong';
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    } else if (err.code === 'ECONNABORTED') {
      toast.error('Request timed out. Please try again.');
    } else if (err.response?.status !== 404) {
      toast.error(message);
    }
    return Promise.reject(err);
  }
);

export default api;
