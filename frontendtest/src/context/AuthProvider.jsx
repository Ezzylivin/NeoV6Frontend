import React, { createContext, useState, useEffect } from 'react';
import axios from 'axios';
import { setAuthToken } from '../api/apiClient.jsx.js';

// Create the AuthContext
export const AuthContext = createContext();

// AuthProvider Component
export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => localStorage.getItem('token') || null);
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem('user')) || null);

  // Apply token to axios whenever it changes
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      localStorage.setItem('token', token);
    } else {
      delete axios.defaults.headers.common['Authorization'];
      localStorage.removeItem('token');
    }
  }, [token]);

  // Login function
  const login = (userData, jwtToken) => {
    setUser(userData);
    setToken(jwtToken);
  };

  // Logout function
  const logout = () => {
    setUser(null);
    setToken(null);
  };
  };

  return (
    <AuthContext.Provider value={{ token, setToken, user, setUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
