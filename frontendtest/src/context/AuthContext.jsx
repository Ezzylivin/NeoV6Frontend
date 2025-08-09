// File: src/contexts/AuthContext.jsx (Corrected and Robust Version)

import React, { createContext, useContext, useState, useEffect } from 'react';
import { setAuthToken } from '../api/apiClient.jsx';
// You will need to import your raw API functions here
import { loginUser as apiLogin, registerUser as apiRegister } from '../api/auth.jsx';
import { useNavigate } from 'react-router-dom';

// Create the AuthContext
const AuthContext = createContext(null);

// AuthProvider Component
export const AuthProvider = ({ children }) => {
  // --- STATE INITIALIZATION ---
  // Initialize state from localStorage. This runs ONLY ONCE on initial load.
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [user, setUser] = useState(() => {
    const storedUser = localStorage.getItem('user');
    return storedUser ? JSON.parse(storedUser) : null;
  });
  
  const navigate = useNavigate(); // Hook for programmatic navigation

  // --- SYNCHRONIZATION EFFECT ---
  // This is the single source of truth for all side effects.
  // It runs whenever the `token` state changes.
  useEffect(() => {
    if (token) {
      // 1. Set the token for all future API requests.
      setAuthToken(token);
      // 2. Save the token and user to localStorage for session persistence.
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
    } else {
      // 3. If there's no token, clear everything.
      setAuthToken(null);
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
  }, [token, user]); // This effect depends on both token and user state.


  // --- CONTEXT-PROVIDED FUNCTIONS ---

  // The login function now handles the full process: API call + state update.
  const login = async (email, password) => {
    const data = await apiLogin(email, password); // Call the API
    setUser(data.user);   // Update the user state
    setToken(data.token); // Update the token state (this will trigger the useEffect)
    navigate('/dashboard'); // Redirect to the dashboard after successful login
  };

  // The register function handles the full process.
  const register = async (username, email, password) => {
    const data = await apiRegister(username, email, password); // Call the API
    setUser(data.user);
    setToken(data.token); // Log the user in immediately
    navigate('/dashboard'); // Redirect after successful registration
  };

  // The logout function's only job is to clear the state.
  const logout = () => {
    setUser(null);
    setToken(null); // Clearing the token will trigger the useEffect to clean up
    navigate('/auth'); // Redirect to the auth page
  };

  // The value object to be provided to all child components.
  const value = { 
    token, 
    user, 
    isAuthenticated: !!token, // A convenient boolean flag for components
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

// The custom hook to easily consume the context.
export const useAuth = () => {
  return useContext(AuthContext);
};
