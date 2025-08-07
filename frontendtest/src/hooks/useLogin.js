// File: src/hooks/useLogin.js
import { useState } from 'react';
import { useAuth } from '../context/AuthProvider';

export const useLogin = () => {
  const { login } = useAuth();
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const loginUser = async (email, password) => {
    setLoading(true);
    setError(null);
    try {
      await login(email, password); // calls AuthProvider
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return { loginUser, error, loading };
};
