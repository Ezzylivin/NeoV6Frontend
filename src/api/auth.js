// File: src/api/auth.js
import apiClient from './apiClient.js';

/**
 * Register a new user.
 * @param {object} userData - { username, email, password }
 */
export const register = async (userData) => {
  const { data } = await apiClient.post('/users/register', userData);
  return data; // Returns { token, user }
};

/**
 * Log in an existing user.
 * @param {object} credentials - { identifier, password }
 */
export const login = async (credentials) => {
  const { data } = await apiClient.post('/users/login', credentials);
  return data; // Returns { token, user }
};

/**
 * Get the current authenticated user's profile.
 */
export const getMe = async () => {
  const { data } = await apiClient.get('/users/me');
  return data; // Returns { user }
};

/**
 * Update the user's API keys for an exchange.
 * @param {object} keyData - { exchange, apiKey, apiSecret }
 */
export const updateApiKeys = async (keyData) => {
    const { data } = await apiClient.post('/users/keys', keyData);
    return data; // Returns { message, keys }
};
