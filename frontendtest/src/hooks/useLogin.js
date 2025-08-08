// File: src/hooks/useLogin.js
import { useState } from 'react';
import { loginUser } from '../api/auth.jsx';
import { useAuth } from '../context/AuthProvider.jsx'; // Correct hook import
import { setAuthToken } from '../api/apiClient.jsx'; // Apply token globally to axios

export const useLogin = () => {
  // Access Auth Context setters via useAuth hook
  const { setUser, setToken } = useAuth();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const login = async (email, password) => {
    setLoading(true);
    setError(null);

    try {
      // Call your backend login API
      const { user, access_token: token } = await loginUser(email, password);

      // Update Auth Context state
      setUser(user);
      setToken(token);

      // Persist token (and optionally user) in localStorage
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));

      // Set token globally on axios instance for future API calls
      setAuthToken(token);

    } catch (err) {
      // Extract and set error message
      setError(err.response?.data?.message || err.message || 'Login failed');
      throw err; // Allow caller to handle errors if needed
    } finally {
      setLoading(false);
    }
  };

  return { login, loading, error };
};
