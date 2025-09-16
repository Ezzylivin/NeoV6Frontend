// ../api/backtest.js
// CORRECTED VERSION: Returns the response data correctly to fix the destructuring error.

import axios from 'axios';

// Create a single, shared axios instance
const api = axios.create({
  withCredentials: true,
});

// Helper for handling errors
const handleError = (error) => {
  console.error("API Error:", error.response?.data?.message || error.message);
  throw new Error(error.response?.data?.message || "An API error occurred.");
};

/**
 * Fetches the dropdown options
 */
export const fetchOptions = async () => {
  try {
    const response = await api.get('/api/backtest/options');
    return response.data; // Correctly return the data object from the axios response
  } catch (err) {
    handleError(err);
  }
};

/**
 * Fetches a paginated list of past backtests
 */
export const fetchAll = async (page = 1, limit = 10) => {
  try {
    const response = await api.get(`/api/backtest?page=${page}&limit=${limit}`);
    return response.data; // Correctly return the data object from the axios response
  } catch (err) {
    handleError(err);
  }
};

/**
 * Runs a new single backtest.
 */
export const runBacktest = async (payload) => {
  try {
    const response = await api.post('/api/backtest/run', payload);
    return response.data.data;
  } catch (err) {
    handleError(err);
  }
};

/**
 * Runs a new batch backtest.
 */
export const runBatch = async (configs) => {
  try {
    const response = await api.post('/api/backtest/batch', { configs });
    return response.data.data;
  } catch (err) {
    handleError(err);
  }
};
