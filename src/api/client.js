import axios from 'axios';

// Detect environment
const isVercel = window.location.hostname.includes('vercel.app');
const isRender = window.location.hostname.includes('onrender.com');
const isProduction = import.meta.env.PROD || isVercel || isRender;

// If on Vercel, use the /_/backend proxy. If on Render or local, use standard paths.
const baseURL = import.meta.env.VITE_API_URL || 
                (isVercel ? '/_/backend' : (isProduction ? '' : 'http://127.0.0.1:5000'));

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
    
    // If we get a 401 (Unauthorized), the token is likely invalid/expired
    if (status === 401) {
      localStorage.removeItem('token');
      // Only redirect if we're not already on the login page to avoid loops
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

export default client;
