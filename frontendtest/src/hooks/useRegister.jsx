// File: src/hooks/useRegister.js
import { useState } from 'react';
import { useAuth } from '../context/AuthProvider';

export const useRegister = () => {
  const { register } = useAuth();
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const registerUser = async (email, password) => {
    setError(null);
    setLoading(true);
    try {
      await register(email, password);
    } catch (err) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return { registerUser, error, loading };
};
