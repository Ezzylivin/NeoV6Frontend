import React, { createContext, useContext, useState, useEffect } from 'react';
import API, { setAuthToken } from './useApi';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [user, setUser] = useState(null);

  useEffect(() => {
    if (token) {
      setAuthToken(token);
      API.get('/auth/me')
        .then(res => setUser(res.data))
        .catch(() => logout());
    }
  }, [token]);

  const login = async (credentials) => {
    const res = await API.post('/auth/login', credentials);
    localStorage.setItem('token', res.data.token);
    setToken(res.data.token);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ token, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
