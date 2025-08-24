import { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import apiClient from '../api/apiClient.js';

export const useLogin = () => {
  const { saveAuthData } = useAuth();  // ✅ use the correct function
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loginUser = async (email, password) => {
    setLoading(true);
    setError(null);

    try {
      const { data } = await apiClient.post("/users/login", { email, password });
      // data = { user, token }
      saveAuthData(data.user, data.token);  // ✅ update global auth
      return { success: true };
    } catch (err) {
      setError(err.response?.data?.message || "Login failed");
      return { success: false };
    } finally {
      setLoading(false);
    }
  };

  return { loginUser, loading, error };
};
