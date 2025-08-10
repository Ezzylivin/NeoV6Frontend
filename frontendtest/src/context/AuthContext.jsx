// File: src/contexts/AuthContext.jsx (Corrected - No Navigation)

import React, { createContext, useContext, useState, useEffect } from 'react';
import { setAuthToken } from '../api/apiClient.jsx';
// Corrected to use .js for API files
import { loginUser as apiLogin, registerUser as apiRegister } from '../api/auth.js'; 
// REMOVED: import { useNavigate } from 'react-router-dom';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  // --- STATE and EFFECT are perfect, no changes needed here ---
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [user, setUser] = useState(() => {
    const storedUser = localStorage.getItem('user');
    return storedUser ? JSON.parse(storedUser) : null;
  });
  
  // REMOVED: const navigate = useNavigate(); 

  useEffect(() => {
    if (token) {
      setAuthToken(token);
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
    } else {
      setAuthToken(null);
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
  }, [token, user]);

  // --- CONTEXT-PROVIDED FUNCTIONS ---
  // These functions now ONLY handle state and logic. They do not navigate.
  const login = async (email, password) => {
    const data = await apiLogin(email, password);
    setUser(data.user);
    setToken(data.token);
    // REMOVED: navigate('/dashboard');
  };

  const register = async (username, email, password) => {
    const data = await apiRegister(username, email, password);
    setUser(data.user);
    setToken(data.token);
    // REMOVED: navigate('/dashboard');
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    // REMOVED: navigate('/auth');
  };

  const value = { 
    token, 
    user, 
    isAuthenticated: !!token,
    login, 
    logout, 
    register 
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  return useContext(AuthContext);
};
