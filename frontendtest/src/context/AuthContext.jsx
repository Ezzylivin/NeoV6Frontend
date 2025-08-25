// File: src/context/AuthContext.jsx
import React, { createContext, useState, useEffect, useContext } from "react";
import apiClient, { setAuthToken } from "../api/apiClient.js";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  // Load user/token from localStorage if available
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem("authUser");
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const [token, setToken] = useState(() => {
    return localStorage.getItem("authToken") || null;
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const isAuthenticated = !!token;

  // Save auth globally
  const saveAuthData = (userData, tokenData) => {
    setUser(userData);
    setToken(tokenData);

    localStorage.setItem("authUser", JSON.stringify(userData));
    localStorage.setItem("authToken", tokenData);

    setAuthToken(tokenData); // sync axios header
  };

  // Clear auth globally
  const clearAuthData = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("authUser");
    localStorage.removeItem("authToken");
    setAuthToken(null);
  };

  // Keep axios Authorization header in sync with token
  useEffect(() => {
    if (token) {
      setAuthToken(token);
    } else {
      setAuthToken(null);
    }
  }, [token]);

  // 🔑 Register function
  const registerUser = async (formData) => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await apiClient.post("/users/register", formData);
      saveAuthData(data.user, data.token);
      return { success: true };
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed");
      return { success: false };
    } finally {
      setLoading(false);
    }
  };

  // 🔑 Login function
  const loginUser = async (formData) => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await apiClient.post("/users/login", formData);
      saveAuthData(data.user, data.token);
      return { success: true };
    } catch (err) {
      setError(err.response?.data?.message || "Login failed");
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
