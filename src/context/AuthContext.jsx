// File: src/context/AuthContext.jsx
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

  /** 🔑 Normalize user object so it always has `id` */
  const normalizeUser = (userData) => {
    if (!userData) return null;
    return {
      ...userData,
      id: userData._id || userData.id, // unify ID
    };
  };

  /** Save user + token to state + storage */
  const saveAuthData = (userData, tokenData) => {
    const normalizedUser = normalizeUser(userData);
    setUser(normalizedUser);
    setTokenState(tokenData);

    localStorage.setItem("user", JSON.stringify(normalizedUser));
    localStorage.setItem("token", tokenData);

    setAuthToken(tokenData);
  };

  /** Clear everything */
  const clearAuthData = () => {
    setUser(null);
    setTokenState(null);
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    setAuthToken(null);
  };

  /** Keep apiClient in sync when token changes */
  useEffect(() => {
    setAuthToken(token);
  }, [token]);

  /** Validate stored token on first load */
  useEffect(() => {
    const validateToken = async () => {
      if (!token) {
        setInitializing(false);
        return;
      }
      try {
        setAuthToken(token);
        const { data } = await apiClient.get("/users/me");
        saveAuthData(data.user || data, token); // refresh user
      } catch (err) {
        console.error("[Auth] Token validation failed", err.response?.data || err.message);
        clearAuthData();
      } finally {
        setInitializing(false);
      }
    };
    validateToken();
  }, [token]);

  /** Registration */
  const registerUser = async ({ username, email, password }) => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await apiClient.post("/users/register", {
        username,
        email,
        password,
      });

      const tokenData = data.token || data.user?.token;
      const userData = data.user || data;

      if (!tokenData || !userData) throw new Error("Invalid register response");

      saveAuthData(userData, tokenData);
      return { success: true, user: normalizeUser(userData), token: tokenData };
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed");
      return { success: false, error: err.response?.data?.message };
    } finally {
      setLoading(false);
    }
  };

  /** Login */
  const loginUser = async ({ identifier, password }) => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await apiClient.post("/users/login", {
        identifier,
        password,
      });

      const tokenData = data.token || data.user?.token;
      const userData = data.user || data;

      if (!tokenData || !userData) throw new Error("Invalid login response");

      saveAuthData(userData, tokenData);
      return { success: true, user: normalizeUser(userData), token: tokenData };
    } catch (err) {
      setError(err.response?.data?.message || "Login failed");
      return { success: false, error: err.response?.data?.message };
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
