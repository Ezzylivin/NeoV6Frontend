// File: src/api/auth.js
import apiClient from './apiClient.js'; // Uses centralized axios instance

// Register a new user
export const registerUser = async (username,email, password) => {
  try {
    const response = await apiClient.post('/user/register', {username, email, password });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Registration failed');
  }
};

// Log in an existing user
export const loginUser = async (email, password) => {
  try {
    const response = await apiClient.post('/user/login', { email, password });
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
    const response = await apiClient.get('/user/me');
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Could not fetch user profile.');
  }
};
