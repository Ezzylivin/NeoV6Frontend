// ../api/backtest.js
// UPGRADED: Corrected the POST routes to fix the 405 Method Not Allowed error.

import axios from 'axios';

const api = axios.create({
  withCredentials: true,
});

const handleError = (error) => {
  console.error("API Error:", error.response?.data?.message || error.message);
  throw new Error(error.response?.data?.message || "An API error occurred.");
};

/**
 * Fetches the dropdown options (Correct - this is working)
 */
export const fetchOptions = async () => {
  try {
    const response = await api.get('/api/backtest/options');
    return response.data.data;
  } catch (err) {
    handleError(err);
  }
};

/**
 * Fetches a paginated list of past backtests (Correct - this is working)
 */
export const fetchAll = async (page = 1, limit = 10) => {
  try {
    const response = await api.get(`/api/backtest?page=${page}&limit=${limit}`);
    return response.data.data;
  } catch (err) {
    handleError(err);
  }
};

/**
 * Runs a new single backtest.
 */
export const runBacktest = async (payload) => {
  try {
    // --- FIX: The correct RESTful path is POST to the base resource ---
    // Changed from '/api/backtests/run' to '/api/backtest'
    const response = await api.post('/api/backtests', payload);
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
    // --- FIX: Cleaned up this route for consistency ---
    // Changed from '/api/backtests/run-batch' to '/api/backtest/batch'
    const response = await api.post('/api/backtests/batch', { configs });
    return response.data.data;
  } catch (err) {
    handleError(err);
  }
};
