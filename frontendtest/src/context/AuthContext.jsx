// src/context/AuthContext.tsx
import React, { createContext, useState, useEffect, useContext, ReactNode } from "react";
import apiClient, { setAuthToken } from "../api/apiClient";

// --- Types ---
export interface User {
  _id: string;
  username: string;
  email: string;
  id: string; // normalized from _id
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  initializing: boolean;
  saveAuthData: (user: User, token: string) => void;
  clearAuthData: () => void;
  registerUser: (formData: Record<string, any>) => Promise<{ success: boolean }>;
  loginUser: (formData: Record<string, any>) => Promise<{ success: boolean }>;
}

interface AuthProviderProps {
  children: ReactNode;
}

// --- Context ---
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// --- Provider ---
export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(() => {
    const savedUser = localStorage.getItem("user");
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [token, setTokenState] = useState<string | null>(() => localStorage.getItem("token") || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initializing, setInitializing] = useState(true);

  const isAuthenticated = !!token;

  // Save auth data
  const saveAuthData = (userData: User, tokenData: string) => {
    const normalizedUser = { ...userData, id: userData._id };
    setUser(normalizedUser);
    setTokenState(tokenData);

    localStorage.setItem("user", JSON.stringify(normalizedUser));
    localStorage.setItem("token", tokenData);

    setAuthToken(tokenData);
  };

  // Clear auth data
  const clearAuthData = () => {
    setUser(null);
    setTokenState(null);
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    setAuthToken(null);
  };

  // Sync token with axios headers
  useEffect(() => {
    setAuthToken(token);
  }, [token]);

  // Validate token on startup
  useEffect(() => {
    const validateToken = async () => {
      if (!token) return setInitializing(false);

      try {
        setAuthToken(token);
        const { data } = await apiClient.get<User>("/users/me");
        setUser(data);
      } catch (err: any) {
        console.warn("Token invalid/expired, logging out.");
        clearAuthData();
      } finally {
        setInitializing(false);
      }
    };
    validateToken();
  }, [token]);

  // Register user
  const registerUser = async (formData: Record<string, any>) => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await apiClient.post<User & { token: string }>("/users/register", formData);
      const { token, ...userData } = data;
      saveAuthData(userData, token);
      return { success: true };
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "Registration failed");
      return { success: false };
    } finally {
      setLoading(false);
    }
  };

  // Login user
  const loginUser = async (formData: Record<string, any>) => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await apiClient.post<User & { token: string }>("/users/login", formData);
      const { token, ...userData } = data;
      saveAuthData(userData, token);
      return { success: true };
    } catch (err: any) {
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

// --- Hook ---
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};
