// File: src/api/backtest.js
import api from './apiClient'; // axios instance with baseURL + headers already set

// Run a new backtest
export const runBacktest = async (userId) => {
  const response = await api.post('/api/backtests', { userId });
  return response.data; // Assumes backend returns { results: [...] }
};

