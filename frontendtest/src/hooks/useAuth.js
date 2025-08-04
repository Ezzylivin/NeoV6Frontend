// src/hooks/useAuth.js
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

export const useAuth = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const login = async (email, password) => {
    try {
      setLoading(true);
      const { data } = await api.post('/auth/login', { email, password });
      localStorage.setItem('token', data.access_token);
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const register = async (email, password) => {
    try {
      setLoading(true);
      const { data } = await api.post('/auth/register', { email, password });
      localStorage.setItem('token', data.access_token);
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    navigate('/');
  };

  return { login, register, logout, loading };
};
