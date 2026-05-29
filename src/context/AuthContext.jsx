import React, { createContext, useState, useEffect } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, signOut, createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../config/firebase';
import client from '../api/client';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null); // Combined Firebase user & backend profile
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setFirebaseUser(currentUser);
      if (currentUser) {
        try {
          const fbToken = await currentUser.getIdToken();
          setToken(fbToken);
          // Fetch additional profile data from backend
          const { data } = await client.get('/api/users/profile');
          setUser({ ...currentUser, ...data });
        } catch (error) {
          console.error("Error fetching user profile", error);
          setUser(currentUser); // fallback to just firebase user if backend fails
        }
      } else {
        setToken(null);
        setUser(null);
        localStorage.removeItem('token');
        sessionStorage.removeItem('token');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const refreshUser = async () => {
    if (firebaseUser) {
      try {
        const { data } = await client.get('/api/users/profile');
        setUser({ ...firebaseUser, ...data });
      } catch (error) {
        console.error("Profile refresh failed", error);
      }
    }
  };

  const login = async (email, password, rememberMe = false) => {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    // Fetch profile immediately to return the expected 'role' for legacy compatibility
    const fbToken = await userCredential.user.getIdToken();
    try {
      const { data } = await client.get('/api/users/profile', { headers: { Authorization: `Bearer ${fbToken}` } });
      return { ...userCredential.user, ...data };
    } catch(err) {
      return userCredential.user;
    }
  };

  const register = async (email, password) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    // Sync with backend immediately
    const fbToken = await userCredential.user.getIdToken();
    const { data } = await client.post('/api/users/register', { email }, { headers: { Authorization: `Bearer ${fbToken}` } });
    return { ...userCredential.user, ...data };
  };

  const googleLogin = async (payload, rememberMe = true) => {
    const provider = new GoogleAuthProvider();
    const userCredential = await signInWithPopup(auth, provider);
    
    // Check if we need to hit a backend route to register this user's profile
    try {
      await client.post('/api/users/google-login', { 
        email: userCredential.user.email,
        displayName: userCredential.user.displayName,
        photoURL: userCredential.user.photoURL,
        uid: userCredential.user.uid
      });
    } catch(err) {
      console.error("Error syncing Google login with backend", err);
    }
    
    return userCredential.user;
  };

  const logout = async () => {
    await signOut(auth);
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    sessionStorage.removeItem('token');
  };

  return (
    <AuthContext.Provider value={{ user, token, login, register, googleLogin, logout, loading, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

