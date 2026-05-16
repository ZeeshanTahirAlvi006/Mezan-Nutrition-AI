import React, { createContext, useState, useEffect } from 'react';
import client from '../api/client';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [loading, setLoading] = useState(true);

  // You can add verify logic here later

  useEffect(() => {
    const verifyToken = async () => {
      if (token) {
        try {
          const { data } = await client.get('/api/users/profile');
          setUser(data);
        } catch (error) {
          console.error("Token verification failed", error);
          logout(); // Clear invalid token
        }
      }
      setLoading(false);
    };
    verifyToken();
  }, [token]);

  const login = async (email, password) => {
    const { data } = await client.post('/api/users/login', { email, password });
    setToken(data.token);
    setUser(data);
    localStorage.setItem('token', data.token);
    return data;
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
