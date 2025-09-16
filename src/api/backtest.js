// ../api/backtest.js
// NEW FILE: This file contains all your API calls with the correct paths.

import axios from 'axios';

// Create a single, shared axios instance
// This assumes your API is on the same domain (e.g., /api/...)
const api = axios.create({
  withCredentials: true,
});

// Helper for handling errors
const handleError = (error) => {
  console.error("API Error:", error.response?.data?.message || error.message);
  throw new Error(error.response?.data?.message || "An API error occurred.");
};

/**
 * Fetches the dropdown options (strategies, symbols, timeframes)
 */
export const fetchOptions = async () => {
  try {
    // FIX: Use plural /api/backtests/options
    const response = await api.get('/api/backtests/options');
    return response.data.data;
  } catch (err) {
    handleError(err);
  }
};

/**
 * Fetches a paginated list of past backtests
 */
export const fetchAll = async (page = 1, limit = 10) => {
  try {
    // FIX: Use plural /api/backtests
    const response = await api.get(`/api/backtests?page=${page}&limit=${limit}`);
    return response.data.data; // This returns { backtests, total, ... }
  } catch (err) {
    handleError(err);
  }
};

/**
 * Runs a new single backtest.
 * The backend controller will route this to Python or Node.js.
 */
export const runBacktest = async (payload) => {
  try {
    // NOTE: This assumes your controller route is POST /api/backtests/run
    // Please verify this against your backend router file.
    const response = await api.post('/api/backtests/run', payload);
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
    // NOTE: This assumes your controller route is POST /api/backtests/run-batch
    // It sends an object { configs: [...] } as the body.
    const response = await api.post('/api/backtests/run-batch', { configs });
    return response.data.data; // This returns { summary, results, errors }
  } catch (err) {
    handleError(err);
  }
};
