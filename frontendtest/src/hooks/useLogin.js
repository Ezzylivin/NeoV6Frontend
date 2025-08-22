// File: src/hooks/useLogin.js (Corrected and Functional)

import { useState } from 'react';
// 1. Corrected the import path to point to AuthContext.jsx
import { useAuth } from '../context/AuthContext.jsx'; 
import apiClient from '../api/apiClient.js';

export const useLogin = () => {
  const { login } = useAuth(); // This login function from the context just updates state.
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loginUser = async (email, password) => {
    setLoading(true);
    setError(null);

    // 2. Added the required 'try' block to wrap the async operation.
    try { 
      // 3. Bundled 'email' and 'password' into a single data object for the POST request.
      const { data } = await apiClient.post("/users/login", { username, password });
      
      // data from the API should be an object like { user, token }
      // Now, call the login function from the context to update the global state.
      login(data.user, data.token);

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
