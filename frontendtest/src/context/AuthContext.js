// File: src/contexts/AuthContext.jsx

import React, { createContext, useContext, useState, useEffect } from 'react';
import { setAuthToken } from '../api/apiClient.js';
import { loginUser as apiLogin, registerUser as apiRegister, verifyToken as apiVerifyToken } from '../api/auth.js';
// ^ Make sure verifyToken exists in your backend and frontend api/auth.js

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [user, setUser] = useState(() => {
    const storedUser = localStorage.getItem('user');
    return storedUser ? JSON.parse(storedUser) : null;
  });
  const [loading, setLoading] = useState(true);

  // Validate token on mount
  useEffect(() => {
    const checkAuth = async () => {
      if (token) {
        try {
          setAuthToken(token);
          const data = await apiVerifyToken(); // GET /auth/verify or similar
          setUser(data.user);
          localStorage.setItem('token', token);
          localStorage.setItem('user', JSON.stringify(data.user));
        } catch (error) {
          console.warn("Token expired or invalid:", error);
          setUser(null);
          setToken(null);
          localStorage.removeItem('token');
          localStorage.removeItem('user');
        }
      } else {
        setAuthToken(null);
      }
      setLoading(false);
    };
    checkAuth();
  }, []);

  useEffect(() => {
    if (token) {
      setAuthToken(token);
      localStorage.setItem('token', token);
      if (user) {
        localStorage.setItem('user', JSON.stringify(user));
      }
    } else {
      setAuthToken(null);
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
  }, [token, user]);

  const login = async (email, password) => {
    const data = await apiLogin(email, password);
    setUser(data.user);
    setToken(data.token);
  };

  const register = async (username, email, password) => {
    const data = await apiRegister(username, email, password);
    setUser(data.user);
    setToken(data.token);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
  };

  const value = { 
    token, 
    user, 
    isAuthenticated: !!token,
    loading,
    login, 
    logout, 
    register, 
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
