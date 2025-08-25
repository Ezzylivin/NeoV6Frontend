// File: src/context/AuthContext.jsx
import React, { createContext, useState, useEffect, useContext } from "react";
import apiClient, { setAuthToken } from "../api/apiClient.js";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  // --- State ---
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem("authUser");
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const [token, setToken] = useState(() => {
    return localStorage.getItem("authToken") || null;
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [initializing, setInitializing] = useState(true);

  const isAuthenticated = !!token;

  // --- Save auth data globally ---
  const saveAuthData = (userData, tokenData) => {
    setUser(userData);
    setToken(tokenData);

    localStorage.setItem("authUser", JSON.stringify(userData));
    localStorage.setItem("authToken", tokenData);

    setAuthToken(tokenData);
  };

  // --- Clear auth data globally ---
  const clearAuthData = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("authUser");
    localStorage.removeItem("authToken");
    setAuthToken(null);
  };

  // --- Keep axios Authorization header in sync ---
  useEffect(() => {
    if (token) {
      setAuthToken(token);
    } else {
      setAuthToken(null);
    }
  }, [token]);

  // --- Validate token on app startup ---
  useEffect(() => {
    const validateToken = async () => {
      if (!token) {
        setInitializing(false);
        return;
      }

      try {
        setAuthToken(token);
        const { data } = await apiClient.get("/users/me");
        setUser(data); // backend returns the user object directly
      } catch (err) {
        console.warn("Invalid/expired token, logging out.");
        clearAuthData();
      } finally {
        setInitializing(false);
      }
    };

    validateToken();
  }, []);

  // --- Register ---
  const registerUser = async (formData) => {
    setLoading(true);
    setError(null);

    try {
      const { data } = await apiClient.post("/users/register", formData);
      // backend returns { _id, username, email, token }
      const { token, ...userData } = data;
      saveAuthData(userData, token);
      return { success: true };
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed");
      return { success: false };
    } finally {
      setLoading(false);
    }
  };

  // --- Login ---
  const loginUser = async (formData) => {
    setLoading(true);
    setError(null);

    try {
      const { data } = await apiClient.post("/users/login", formData);
      const { token, ...userData } = data;
      saveAuthData(userData, token);
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
