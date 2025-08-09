import React, { createContext, useContext, useState, useEffect } from 'react';
import { setAuthToken } from '../api/apiClient.jsx';

// Create the AuthContext
const AuthContext = createContext(null);

// AuthProvider Component
export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  
  // This is the robust way to initialize the user state from localStorage
  const [user, setUser] = useState(() => {
    const storedUser = localStorage.getItem('user');
    // Only try to parse if the storedUser is not null or undefined
    return storedUser ? JSON.parse(storedUser) : null;
  });


  // Apply token to axios and sync localStorage whenever token changes
  useEffect(() => {
    

      setAuthToken(token);
    
  }, [token]);

 

  // Login function to set user and token
  const login = (userData, jwtToken) => {
    setUser(userData);
    setToken(jwtToken);

    localStorage.setItem("user", JSON.stringify(user));
    localStorage.setItem("token", token);

    setAuthToken(tokenValue); // Apply token immediately after login

    
  };

  // Logout function to clear user and token
  const logout = () => {
    setUser(null);
    setToken(null);

    localStorage.removeItem("user");
    localStorage.removeItem("token");

    setAuthToken(null); // Remove token from axios
  };


  return (
    <AuthContext.Provider value={{ token, setToken, user, setUser, login, logout, register }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

