// File: src/hooks/useLogin.js
import { useState } from 'react';
import { loginUser } from '../api/auth';
import { useAuth } from '../context/AuthProvider';

export const useLogin = () => {
  const { setUser, setToken } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const login = async (email, password) => {
    setLoading(true);
    setError(null);
    try {
      const data = await loginUser(email, password);
      setUser(data.user);
      setToken(data.token);
      localStorage.setItem('token', data.token);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return { login, loading, error };
};
