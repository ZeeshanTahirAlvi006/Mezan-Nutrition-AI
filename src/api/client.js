import axios from 'axios';

// Use VITE_API_URL if provided, otherwise detect environment based on hostname
const isProduction = import.meta.env.PROD || window.location.hostname.includes('vercel.app');
const baseURL = import.meta.env.VITE_API_URL || (isProduction ? '/_/backend' : 'http://127.0.0.1:5000');

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
