// File: src/api/backtest.js
import api from './apiClient.js'; // your configured axios instance

// Run a new backtest, optionally filtered by timeframe
export const runBacktests = async (timeframe = '') => {
  const payload = timeframe ? { timeframe } : {};
  const response = await apiClient.post('/backtest/run', payload);
  return response.data; // expects { message, backtests: [...] }
};

// Fetch all backtest results, optionally filtered by timeframe
export const backtestResults = async (timeframe = '') => {
  const params = timeframe ? { timeframe } : {};
  const response = await apiClient.get('/backtests/results', { params });
  return response.data; // expects array of backtest results
};
