// File: src/context/AuthContext.jsx
import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';
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

  const isAuthenticated = !!token; // ✅ Add this line

  // ✅ Helper to store both in state & localStorage
  const saveAuthData = (userData, tokenData) => {
    setUser(userData);
    setToken(tokenData);

    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('token', tokenData);

    setAuthToken(tokenData); // set axios default Authorization header
  };

  // ✅ Login
  const login = async (email, password) => {
    try {
      const res = await axios.post('/api/users/login', {
        email,
        password,
      });

      // backend must return { user: {...}, token: "..." }
      saveAuthData(res.data.user, res.data.token);

      return res.data;
    } catch (err) {
      console.error(err.response?.data || err.message);
      throw err;
    }
  };

  // ✅ Register
  const register = async (name, email, password) => {
    try {
      const res = await axios.post('/api/users/register', {
        name,
        email,
        password,
      });

      // if backend returns token immediately after register
      if (res.data.token && res.data.user) {
        saveAuthData(res.data.user, res.data.token);
      }

      return res.data;
    } catch (err) {
      console.error(err.response?.data || err.message);
      throw err;
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    setAuthToken(null);
  };

  // ✅ Always keep axios header updated when token changes
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
        isAuthenticated, // ✅ Added here
        login,
        register,
        logout,
        setUser,
        setToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
