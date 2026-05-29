import axios from 'axios';
import { auth } from '../config/firebase';

// Detect environment
const isVercel = window.location.hostname.includes('vercel.app');
const isRender = window.location.hostname.includes('onrender.com');
const isProduction = import.meta.env.PROD || isVercel || isRender;

// If on Vercel, use the /_/backend proxy. If on Render or local, use standard paths.
const baseURL = import.meta.env.VITE_API_URL || 
                (isVercel ? '/_/backend' : (isProduction ? '' : 'http://127.0.0.1:5000'));

let cachedToken = null;
let cachedUid = null;
let tokenTimestamp = 0;
const TOKEN_TTL = 5 * 60 * 1000; // 5 minutes

const client = axios.create({
  baseURL,
});

client.interceptors.request.use(
  async (config) => {
    if (auth.currentUser) {
      try {
        const now = Date.now();
        const uid = auth.currentUser.uid;
        
        // Cache token to avoid getIdToken async overhead on every request
        if (!cachedToken || cachedUid !== uid || now - tokenTimestamp > TOKEN_TTL) {
          cachedToken = await auth.currentUser.getIdToken();
          cachedUid = uid;
          tokenTimestamp = now;
          console.log("[API Client] Refreshed and cached Firebase ID Token");
        }
        
        if (cachedToken) {
          config.headers.Authorization = `Bearer ${cachedToken}`;
        }
      } catch (err) {
        console.error("Error getting Firebase token", err);
      }
    } else {
      // Fallback to legacy token logic just in case
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
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
      cachedToken = null;
      cachedUid = null;
      tokenTimestamp = 0;
      localStorage.removeItem('token');
      sessionStorage.removeItem('token');
      // Only redirect if we're not already on the login page to avoid loops
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

export default client;

