// src/context/AuthContext.jsx
import React, { createContext, useState, useEffect, useContext } from "react";
import apiClient, { setAuthToken } from "../api/apiClient.js";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem("user");
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [token, setTokenState] = useState(() => localStorage.getItem("token") || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [initializing, setInitializing] = useState(true);

  const isAuthenticated = !!token;

  const saveAuthData = (userData, tokenData) => {
    const normalizedUser = { ...userData, id: userData._id };
    setUser(normalizedUser);
    setTokenState(tokenData);

    localStorage.setItem("user", JSON.stringify(normalizedUser));
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
    setAuthToken(token);
  }, [token]);

  useEffect(() => {
    const validateToken = async () => {
      if (!token) return setInitializing(false);
      try {
        setAuthToken(token);
        const { data } = await apiClient.get("/users/me");
        setUser(data);
      } catch {
        clearAuthData();
      } finally {
        setInitializing(false);
      }
    };
    validateToken();
  }, [token]);

  const registerUser = async (formData) => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await apiClient.post("/users/register", formData);
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
