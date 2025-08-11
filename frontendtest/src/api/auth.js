// File: src/api/auth.js
import apiClient from './apiClient.js'; // Uses centralized axios instance

// Register a new user
export const registerUser = async (username,email, password) => {
  try {
    const response = await apiClient.post('/register', {username, email, password });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Registration failed');
  }
};

// Log in an existing user
export const loginUser = async (username, password) => {
  try {
    const response = await apiClient.post('/login', { username, password });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Login failed');
  }
};

/**
 * Calls the backend to get the current user's profile info.
 * GET /api/users/me
 */
export const getMe = async () => {
  try {
    const response = await apiClient.get('/home/users/me');
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Could not fetch user profile.');
  }
};
