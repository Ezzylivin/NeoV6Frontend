// File: src/hooks/useLogin.js
import { useState } from 'react';
import { loginUser } from '../api/auth.jsx';
import { useAuth } from '../context/useAuth.jsx'; // useAuth hook that consumes AuthContext
import { setAuthToken } from '../api/apiClient.jsx';

export const useLogin = () => {
  const { login } = useAuth(); // use the login(user, token) function from context
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loginUserHandler = async (email, password) => {
    setLoading(true);
    setError(null);

    try {
      const { user, token } = await loginUser(email, password);

      // Use context's login method to update state and localStorage
      login(user, token);

      // Apply token globally to axios instance
      setAuthToken(token);

    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return { loginUser: loginUserHandler, loading, error };
};
