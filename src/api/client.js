import axios from 'axios';

// Use VITE_API_URL if provided, otherwise default to Vercel's backend route in production or localhost in development
const baseURL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '/_/backend' : 'http://127.0.0.1:5000');

const client = axios.create({
  baseURL,
});

client.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

client.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const url = error.config?.url || '';

    if ((status === 401 || status === 403) && url.includes('/api/admin')) {
      localStorage.removeItem('token');
      if (window.location.pathname.startsWith('/admin')) {
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

export default client;
