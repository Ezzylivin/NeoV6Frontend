// File: src/api/backtest.js
import api from './apiClient'; // axios instance with baseURL + headers already set

// Run a new backtest
export const runBacktest = async (timeframe = '') => {
  const response = await api.post('/backtest/run', timeframe ? { timeframe } : {});
  return response.data; // Assumes backend returns { results: [...] }
};

// Fetch all backtest results, optionally filtered by timeframe
export const fetchBacktestResults = async (timeframe = '') => {
  const response = await api.get('/backtest/results', {
    params: timeframe ? { timeframe } : {},
  });
  return response.data; // Should return an array of results
};
