// File: src/context/AuthContext.jsx
import React, { createContext, useState, useEffect, useContext } from "react";
import api from "../api/apiClient.js";  // ✅ only import apiClient
import * as authApi from "../api/auth.js";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem("user")) || null);
  const [token, setTokenState] = useState(() => localStorage.getItem("token") || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [initializing, setInitializing] = useState(true);

  const isAuthenticated = !!token;

  const saveAuthData = (userData, tokenData) => {
    if (!userData || !tokenData) {
      console.error("AuthContext: Attempted to save invalid auth data.");
      return;
    }
    setUser(userData);
    setTokenState(tokenData);
    localStorage.setItem("user", JSON.stringify(userData));
    localStorage.setItem("token", tokenData);
    // ✅ No need to call setAuthToken, interceptor uses localStorage automatically
  };

  const clearAuthData = () => {
    setUser(null);
    setTokenState(null);
    localStorage.removeItem("user");
    localStorage.removeItem("token");
  };

  useEffect(() => {
    const validateToken = async () => {
      if (token) {
        try {
          const { user: refreshedUser } = await authApi.getMe();
          saveAuthData(refreshedUser, token);
        } catch (err) {
          console.warn("AuthContext: Token invalid, clearing session.");
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
      const errorMessage = err.response?.data?.message || "Login failed. Please check your credentials.";
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
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
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        loading,
        error,
        initializing,
        loginUser,
        registerUser,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
