import React, { createContext, useContext, useEffect, useState } from 'react';
import { login, register } from '../api/auth';
import { setAuthToken } from '../api/apiClient';

// 1. Create the context
const AuthContext = createContext();

// 2. Create the provider component
export const AuthProvider = ({ children }) => {
  // 3. State initialized from localStorage (for persistence on refresh)
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('User');
    return stored ? JSON.parse(stored) : null;
  });

  // 4. Sync token/user with localStorage and axios headers
  useEffect(() => {
    if (token) {
      setAuthToken(token); // set default Authorization header
      localStorage.setItem('token', token);
      localStorage.setItem('User', JSON.stringify(user));
    } else {
      setAuthToken(null);
      localStorage.removeItem('token');
      localStorage.removeItem('User');
    }
  }, [token, user]);

  // 5. Login function
  const login = async (email, password) => {
    const data = await loginUser(email, password); // Calls your backend
    setToken(data.token);
    setUser(data.user); // assuming backend returns { token, User }
  };

  // 6. Register function (also logs in)
  const register = async (username, email, password) => {
    const data = await registerUser(username, email, password);
    setToken(data.token);
    setUser(data.user);
  };

  // 7. Logout function
  const logout = () => {
    setToken(null);
    setUser(null);
  };

  // 8. Value exposed to the rest of your app
  const value = {
    token,
    user,
    login,
    register,
    logout,
    isAuthenticated
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// 9. Custom hook for easy context access
export const useAuth = () => useContext(AuthContext);
