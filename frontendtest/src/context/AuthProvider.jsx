import React, { createContext, useState, useEffect } from 'react';
import axios from 'axios';
import { setAuthToken } from '../api/apiClient.jsx';

// Create the AuthContext
export const AuthCon = createContext();

// AuthProvider Component
export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => localStorage.getItem('token') || null);
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('user'));
    } catch {
      return null;
    }
  });

  // Apply token to axios and sync localStorage whenever token changes
  useEffect(() => {
    if (token) {
      setAuthToken(token);  // Use your imported helper to set axios header
      localStorage.setItem('token', token);
    } else {
      setAuthToken(null);
      localStorage.removeItem('token');
    }
  }, [token]);

  // Sync user data to localStorage when it changes
  useEffect(() => {
    if (user) {
      localStorage.setItem('user', JSON.stringify(user));
    } else {
      localStorage.removeItem('user');
    }
  }, [user]);

  // Login function to set user and token
  const login = (userData, jwtToken) => {
    setUser(userData);
    setToken(jwtToken);
  };

  // Logout function to clear user and token
  const logout = () => {
    setUser(null);
    setToken(null);
  };

  return (
    <AuthCon.Provider value={{ token, setToken, user, setUser, login, logout }}>
      {children}
    </AuthCon.Provider>
  );
};
