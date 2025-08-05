// File: src/context/AuthContext.js or src/hooks/useAuth.js

import React, { createContext, useState, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode'; // You need to import this!

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));

  useEffect(() => {
    if (token) {
      try {
        const decodedToken = jwtDecode(token);
        const currentTime = Date.now() / 1000;
        if (decodedToken.exp < currentTime) {
          logout();
        } else {
          setUser({
            role: decodedToken.role,
            _id: decodedToken._id,
          });
        }
      } catch (error) {
        console.error("Invalid token:", error);
        logout();
      }
    } else {
      setUser(null);
    }
  }, [token]);

  // --- THIS FUNCTION WAS MISSING ---
  const login = (newToken) => {
    localStorage.setItem('token', newToken);
    setToken(newToken);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
