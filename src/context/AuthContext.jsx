// File: src/context/AuthContext.jsx
import React, { createContext, useState, useEffect, useContext } from "react";
import apiClient, { setAuthToken } from "../api/apiClient.js";
import * as authApi from '../api/auth.js';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem("user")) || null);
  const [token, setTokenState] = useState(() => localStorage.getItem("token") || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [initializing, setInitializing] = useState(true);

  const isAuthenticated = !!token;

  const saveAuthData = (userData, tokenData) => {
    setUser(userData);
    setTokenState(tokenData);
    localStorage.setItem("user", JSON.stringify(userData));
    localStorage.setItem("token", tokenData);
    setAuthToken(tokenData);
  };

  const clearAuthData = () => {
    setUser(null);
    setTokenState(null);
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    setAuthToken(null);
  };

  useEffect(() => {
    const validateToken = async () => {
      if (token) {
        try {
          setAuthToken(token);
          const { user: refreshedUser } = await authApi.getMe();
          saveAuthData(refreshedUser, token);
        } catch (err) {
          clearAuthData();
        }
      }
      setInitializing(false);
    };
    validateToken();
  }, []);

  const loginUser = async (credentials) => {
    setLoading(true);
    setError(null);
    try {
      const { token, user } = await authApi.login(credentials);
      saveAuthData(user, token);
      return { success: true };
    } catch (err) {
      setError(err.response?.data?.message || "Login failed");
      return { success: false, error: err.response?.data?.message };
    } finally {
      setLoading(false);
    }
  };

  const registerUser = async (userData) => {
    // ... (register logic similar to login)
  };

  // --- ADDED THIS FUNCTION ---
  const logout = () => {
    clearAuthData();
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, loading, error, initializing, loginUser, registerUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
