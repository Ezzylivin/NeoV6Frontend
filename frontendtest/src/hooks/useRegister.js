import { useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import apiClient from "../api/apiClient";

export const useRegister = () => {
  const { saveAuthData } = useAuth();  // ✅ same fix
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const registerUser = async (formData) => {
    setLoading(true);
    setError(null);

    try {
      const { data } = await apiClient.post("/users/register", formData);
      // data = { user, token }
      saveAuthData(data.user, data.token); // ✅ update global auth
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
