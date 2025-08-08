// File: src/hooks/useLogin.js
import { useState } from 'react';
import { loginUser } from '../api/auth';
import { AuthProvider } from '../context/AuthProvider';
import { setAuthToken } from '../api/api'; // ✅ so token gets applied globally

export const useLogin = () => {
  const { setUser, setToken } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const login = async (email, password) => {
    setLoading(true);
    setError(null);

    try {
      const { user, token } = await loginUser(email, password);

      // ✅ Update Auth Context
      setUser(user);
      setToken(token);

      // ✅ Persist in localStorage
      localStorage.setItem('token', token);

      // ✅ Apply token globally to axios instance
      setAuthToken(token);

    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return { login, loading, error };
};
