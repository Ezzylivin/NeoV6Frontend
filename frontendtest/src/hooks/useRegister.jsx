// File: src/hooks/useRegister.js
import { useState } from 'react';
import { registerUser } from '../api/auth.jsx';
import { useAuth } from '../context/AuthProvider.jsx';
import { setAuthToken } from '../api/apiClient.jsx';

export const useRegister = () => {
  const { setUser, setToken } = useAuth();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const registerUser = async (username, email, password) => {
    setLoading(true);
    setError(null);

    try {
      // Call backend register API, expect { user, access_token }
      const { user, access_token: token } = await registerUser(username, email, password);

      // Update global auth context
      setUser(user);
      setToken(token);

      // Persist data locally for page reloads
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));

      // Apply token globally to axios
      setAuthToken(token);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Registration failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { register, loading, error };
};
