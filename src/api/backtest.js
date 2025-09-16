// CORRECTED VERSION
// ../api/backtest.js

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
    // This path is working, so we keep it (singular)
    const response = await api.get('/api/backtest/options');
    // --- FIX #1: Correctly return the data from the axios response ---
    return response.data;
  } catch (err) {
    handleError(err);
  }
};

/**
 * Fetches a paginated list of past backtests
 */
export const fetchAll = async (page = 1, limit = 10) => {
  try {
    // This path is also working, so we keep it (singular)
    const response = await api.get(`/api/backtest?page=${page}&limit=${limit}`);
    // --- FIX #2: Correctly return the data from the axios response ---
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
    // --- FIX: Change plural '/api/backtests' to the singular path ---
    // This path now matches your other working routes.
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
    // --- FIX: Change plural '/api/backtests/batch' to the singular path ---
    const response = await api.post('/api/backtest/batch', { configs });
    return response.data.data; 
  } catch (err) {
    handleError(err);
  }
};
