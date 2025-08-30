// src/context/AuthContext.jsx
import React, { createContext, useState, useEffect, useContext } from "react";
import apiClient, { setAuthToken } from "../api/apiClient.js";

/**
 * @typedef {Object} User
 * @property {string} _id
 * @property {string} username
 * @property {string} email
 * @property {string} id  // normalized for convenience
 */

const AuthContext = createContext();

/**
 * AuthProvider wraps the app and provides authentication state & helpers
 */
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem("user");
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const [token, setToken] = useState(() => localStorage.getItem("token") || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [initializing, setInitializing] = useState(true);

  const isAuthenticated = !!token;

  // Save auth data (user + token)
  const saveAuthData = (userData, tokenData) => {
    const normalizedUser = { ...userData, id: userData._id };
    setUser(normalizedUser);
    setToken(tokenData);

    localStorage.setItem("user", JSON.stringify(normalizedUser));
    localStorage.setItem("token", tokenData);

    setAuthToken(tokenData);
  };

  // Clear auth data
  const clearAuthData = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    setAuthToken(null);
  };

  // Sync axios auth header
  useEffect(() => {
    setAuthToken(token);
  }, [token]);

  // Validate token on startup
  useEffect(() => {
    const validateToken = async () => {
      if (!token) return setInitializing(false);

      try {
        setAuthToken(token);
        const { data } = await apiClient.get("/users/me");
        setUser(data);
      } catch (err) {
        console.warn("Token invalid/expired, logging out.");
        clearAuthData();
      } finally {
        setInitializing(false);
      }
    };

    validateToken();
  }, [token]);

  // Register user
  const registerUser = async (formData) => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await apiClient.post("/users/register", formData);
      const { token, ...userData } = data;
      saveAuthData(userData, token);
      return { success: true };
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Registration failed");
      return { success: false };
    } finally {
      setLoading(false);
    }
  };

  // Login user
  const loginUser = async (formData) => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await apiClient.post("/users/login", formData);
      const { token, ...userData } = data;
      saveAuthData(userData, token);
      return { success: true };
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Login failed");
      return { success: false };
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated,
        loading,
        error,
        initializing,
        saveAuthData,
        clearAuthData,
        registerUser,
        loginUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
