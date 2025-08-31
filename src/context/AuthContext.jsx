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
        const { data } = await apiClient.get("/users/me");
        setUser(data.user || data);
      } catch (err) {
        console.error("Token validation failed:", err.response?.data || err.message);
        clearAuthData();
      } finally {
        setInitializing(false);
      }
    };
    validateToken();
  }, [token]);

  // --- REGISTER ---
  const registerUser = async ({ username, email, password }) => {
    setLoading(true);
    setError(null);
    try {
      console.log("Register payload:", { username, email, password });
      const { data } = await apiClient.post("/users/register", { username, email, password });
      console.log("Register response:", data);
      saveAuthData(data, data.token);
      return { success: true };
    } catch (err) {
      console.error("Register failed:", err.response?.data || err.message);
      setError(err.response?.data?.message || "Registration failed");
      return { success: false };
    } finally {
      setLoading(false);
    }
  };

  // --- LOGIN ---
  const loginUser = async ({ identifier, password }) => {
    setLoading(true);
    setError(null);
    try {
      console.log("Login payload:", { identifier, password });
      const { data } = await apiClient.post("/users/login", { identifier, password });
      console.log("Login response:", data);
      saveAuthData(data, data.token);
      return { success: true };
    } catch (err) {
      console.error("Login failed:", err.response?.data || err.message);
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
