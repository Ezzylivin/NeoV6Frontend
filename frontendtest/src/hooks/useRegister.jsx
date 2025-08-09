import { useState } from 'react';
import { registerUser as registerUserApi } from '../api/auth.jsx';
import { useAuth } from '../context/AuthProvider.jsx';
import { setAuthToken } from '../api/apiClient.jsx';

export const useRegister = () => {
  const { setUser, setToken } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const register = async ({ username, email, password }) => {
    setLoading(true);
    setError(null);

    try {
      // Call backend register API, expect { user, access_token }
      const { user, token: token } = await registerUserApi(username, email, password);

      // Update global auth context
      setUser(user);
      setToken(token);

      // Persist data locally
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));

      // Apply token globally to axios
      setAuthToken(token);

      return { success: true };
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Registration failed';
      setError(msg);
      return { success: false, message: msg };
    } finally {
      setLoading(false);
    }
  };

  return { register, loading, error };
};
