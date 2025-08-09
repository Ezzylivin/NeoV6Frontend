// File: src/hooks/useLogin.js
import { useState } from 'react';
import { useAuth } from '../context/AuthProvider.jsx'; // useAuth hook that consumes AuthContext
import apiClient from '../api/apiClient.jsx';

export const useLogin = () => {
  const { login } = useAuth(); // use the login(user, token) function from context
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loginUser = async (email, password) => {
    setLoading(true);
    setError(null);

     const { data } = await apiClient.post("/auth/login", email, password);
      // data = { token, user }
      login(data.user, data.token); // ✅ saves and applies globally

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
