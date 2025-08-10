// src/hooks/useRegister.js
import { useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import apiClient from "../api/apiClient";

export const useRegister = (user._id) => {
  const { login } = useAuth(); // same as in useLogin
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const registerUser = async (formData) => {
    try {
      setLoading(true);
      setError(null);

      const { data } = await apiClient.post("/home/users/register", formData);
      // data = { token, user }

      // ✅ Auto-login immediately after successful register
      login(data.user, data.token);

      return { success: true };
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed");
      return { success: false };
    } finally {
      setLoading(false);
    }
  };

  return { registerUser, loading, error };
};
