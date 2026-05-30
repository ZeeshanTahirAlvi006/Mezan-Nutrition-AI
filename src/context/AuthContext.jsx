import React, { createContext, useState, useEffect } from 'react';
import client from '../api/client';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  // On mount, check for stored token and fetch profile
  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('token');
      if (storedToken) {
        try {
          setToken(storedToken);
          const { data } = await client.get('/api/users/profile', {
            headers: { Authorization: `Bearer ${storedToken}` }
          });
          setUser(data);
        } catch (error) {
          console.error("Token invalid or expired, clearing auth", error);
          localStorage.removeItem('token');
          setToken(null);
          setUser(null);
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const refreshUser = async () => {
    if (token) {
      try {
        const { data } = await client.get('/api/users/profile');
        setUser(data);
      } catch (error) {
        console.error("Profile refresh failed", error);
      }
    }
  };

  const login = async (email, password, rememberMe = false) => {
    setLoading(true);
    try {
      const { data } = await client.post('/api/users/login', { email, password, rememberMe });
      const authToken = data.token;
      localStorage.setItem('token', authToken);
      setToken(authToken);
      setUser(data);
      return data;
    } finally {
      setLoading(false);
    }
  };

  const register = async (email, password, name) => {
    setLoading(true);
    try {
      const { data } = await client.post('/api/users/register', { email, password, name });
      const authToken = data.token;
      localStorage.setItem('token', authToken);
      setToken(authToken);
      setUser(data);
      return data;
    } finally {
      setLoading(false);
    }
  };

  const googleLogin = async (payload, rememberMe = false) => {
    setLoading(true);
    try {
      // If mock, simulate backend behavior
      if (payload.isMock) {
        // In a real app, this would be a backend call.
        // For now, we simulate a successful login for the mock email.
        const mockData = {
          _id: "mock_" + Date.now(),
          uid: "mock_" + Date.now(),
          email: payload.email,
          name: payload.email.split('@')[0],
          role: payload.email.includes('admin') ? 'admin' : 'user',
          token: "mock_jwt_token",
          healthGoals: 'Maintenance',
        };
        
        localStorage.setItem('token', mockData.token);
        setToken(mockData.token);
        setUser(mockData);
        return mockData;
      }

      // Real Google login would go here
      const { data } = await client.post('/api/users/google-login', { 
        token: payload.accessToken,
        rememberMe 
      });
      
      localStorage.setItem('token', data.token);
      setToken(data.token);
      setUser(data);
      return data;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, register, googleLogin, logout, loading, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};
