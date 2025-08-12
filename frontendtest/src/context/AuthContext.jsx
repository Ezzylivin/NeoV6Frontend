// File: src/contexts/AuthContext.jsx

import React, { createContext, useContext, useState, useEffect } from 'react';
import { setAuthToken } from '../api/apiClient.js';
import { loginUser as apiLogin, registerUser as apiRegister, getMe as apiGetMe } from '../api/user.js';
// ^ Make sure verifyToken exists in your backend and frontend api/auth.js

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [user, setUser] = useState(() => {
    const storedUser = localStorage.getItem('user');
    return storedUser ? JSON.parse(storedUser) : null;
  });
  const [loading, setLoading] = useState(true);

  // The Final, Corrected Hooks in AuthContext.jsx

  // Hook #1: Initial Authentication and User Fetch
  // Runs ONLY ONCE on application startup.
  useEffect(() => {
    const getMe = async () => {
      const storedToken = localStorage.getItem('token');
      if (storedToken) {
        setAuthToken(storedToken); // Immediately set the header
        try {
          const user = await apiGetMe(); // Use the getMe function
          // If successful, update the state
          setUser(user);
          setToken(storedToken);
        } catch (error) {
          // If the token is invalid, clear everything
          localStorage.removeItem('token');
          localStorage.removeItem('user');
        }
      }
      setLoading(false); // Initial auth check is complete
    };

    getMe();
  }, []); // Empty array = run once

  // Hook #2: State Synchronization
  // Runs ANY TIME the token state changes (login, logout).
  useEffect(() => {
    if (token && user) {
      // When a user logs in, save their details
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      setAuthToken(token);
    } else {
      // When a user logs out, clear everything
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setAuthToken(null);
    }
  }, [token, user]); // Dependency on token and user
  const login = async (username, password) => {
    const data = await apiLogin(username, password);
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
