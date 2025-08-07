// File: src/hooks/useLogin.js
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { loginUser } from '../api/auth';

export default function useLogin() {
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleLogin = async (email, password) => {
    setLoading(true);
    setError(null);
    try {
      const { token, user } = await loginUser(email, password);
      login(token, user); // Store in AuthContext
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return { handleLogin, loading, error };
}
