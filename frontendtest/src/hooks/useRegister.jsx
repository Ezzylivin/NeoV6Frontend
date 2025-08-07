// File: src/hooks/useRegister.js
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { registerUser } from '../api/auth';

export default function useRegister() {
  const { login } = useAuth(); // After registering, we log the user in
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleRegister = async (email, password) => {
    setLoading(true);
    setError(null);
    try {
      const { token, user } = await registerUser(email, password);
      login(token, user); // Store in AuthContext
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return { handleRegister, loading, error };
}
