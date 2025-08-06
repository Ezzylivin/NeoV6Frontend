// File: src/contexts/AuthContext.jsx

import React, { createContext, useContext, useEffect, useState } from 'react';
import { loginUser, registerUser } from '../api/auth';
import { setAuthToken } from '../api/apiClient'; // <-- 1. IMPORT the crucial setAuthToken helper

// Create the context
const AuthContext = createContext(); // <-- 2. Renamed from 'Auth' for consistency

export const AuthProvider = ({ children }) => {
  // Get initial token and user from localStorage for session persistence
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('user');
    return stored ? JSON.parse(stored) : null;
  });

  // 3. This effect synchronizes the API client with the token state.
  // It runs whenever the component loads or the token changes.
  useEffect(() => {
    if (token) {
      setAuthToken(token); // Set the default auth header for all future API calls
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
    } else {
      setAuthToken(null); // Clear the auth header
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
  }, [token, user]); // Dependency array ensures this runs when token or user changes

  // Login function now only needs to update state. The useEffect handles the side effects.
  const login = async (email, password) => {
    const data = await loginUser(email, password);
    setToken(data.token);
    setUser(data.user);
    // Redirection will be handled automatically by the router in App.jsx
  };

  // Register function (assuming it takes username as well)
  const register = async (username, email, password) => {
    // 4. NOTE: This function now logs the user in immediately after registration.
    const data = await registerUser(username, email, password);
    setToken(data.token);
    setUser(data.user);
  };

  const logout = () => {
    setToken(null);
    setUser(null);
  };

  return (
    // <-- 2. Using the consistent name here
    <AuthContext.Provider value={{ token, user, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook for easy access to the context
export const useAuth = () => useContext(AuthContext);
