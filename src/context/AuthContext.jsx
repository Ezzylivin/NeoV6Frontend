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
    // FIX: Ensure user data and token are valid before saving
    if (!userData || !tokenData) {
        console.error("AuthContext: Attempted to save invalid auth data.");
        return;
    }
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
  }, []); // Note: Removed 'token' from dependency array to prevent re-validation loops

  const loginUser = async (credentials) => {
    setLoading(true);
    setError(null);
    try {
      // FIX: Directly destructure the expected response from the API call
      const { token, user } = await authApi.login(credentials);
      saveAuthData(user, token);
      return { success: true };
    } catch (err) {
      // FIX: Provide more detailed error logging
      const errorMessage = err.response?.data?.message || "Login failed. Please check your credentials.";
      console.error("Login API Error:", err.response?.data || err);
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      // This 'finally' block ensures the button is always re-enabled
      setLoading(false);
    }
  };

  const registerUser = async (userData) => {
    setLoading(true);
    setError(null);
    try {
        const { token, user } = await authApi.register(userData);
        saveAuthData(user, token);
        return { success: true };
    } catch (err) {
        const errorMessage = err.response?.data?.message || "Registration failed.";
        console.error("Register API Error:", err.response?.data || err);
        setError(errorMessage);
        return { success: false, error: errorMessage };
    } finally {
        setLoading(false);
    }
  };

  const logout = () => {
    clearAuthData();
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, loading, error, initializing, loginUser, registerUser, logout }}>
      {children}
    </Auth-Context.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
