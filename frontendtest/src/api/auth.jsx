// File: src/api/auth.js
import api from './apiClient.js'; // Uses centralized axios instance

// Register a new user
export const registerUser = async (username,email, password) => {
  try {
    const response = await api.post('/home/auth/register', {username, email, password });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Registration failed');
  }
};

// Log in an existing user
export const loginUser = async (email, password) => {
  try {
    const response = await api.post('/home/auth/login', { email, password });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Login failed');
  }
};
