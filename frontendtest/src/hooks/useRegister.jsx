// File: src/hooks/useRegister.js
import { useState } from 'react';
import { registerUser } from '../api/auth';

export const useRegister = () => {
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const register = async (email, password) => {
    try {
      const data = await registerUser(email, password);
      setSuccess(true);
      return data; // You can optionally return token/user
    } catch (err) {
      setError(err.message);
      setSuccess(false);
    }
  };

  return { register, error, success };
};
