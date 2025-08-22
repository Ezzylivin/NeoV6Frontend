// File: src/context/AuthContext.jsx
import React, { createContext, useState, useEffect, useContext } from 'react';
import { setAuthToken } from '../api/apiClient.js';

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('user');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const [token, setToken] = useState(() => {
    return localStorage.getItem('token') || null;
  });

  const isAuthenticated = !!token;

  // Save auth data (called by login/register logic elsewhere)
  const saveAuthData = (userData, tokenData) => {
    setUser(userData);
    setToken(tokenData);

    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('token', tokenData);

    setAuthToken(tokenData); // set axios default Authorization header
  };

  // Logout clears everything
  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    setAuthToken(null);
  };

  // Keep axios headers in sync with token
  useEffect(() => {
    if (token) {
      setAuthToken(token);
    } else {
      setAuthToken(null);
    }
  }, [token]);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated,
        logout,
        saveAuthData, // allow other modules to call this
        setUser,
        setToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
