// File: src/api/auth.js
import api from './apiClient.jsx'; // Uses centralized axios instance

// Register a new user
export const registerUser = async (email, password) => {
  try {
    const response = await api.post('/auth/register', {username, email, password });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Registration failed');
  }
};

// Log in an existing user
export const loginUser = async (email, password) => {
  try {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Login failed');
  }
};
