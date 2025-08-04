// File: src/api/backtest.js
import api from './index';

export const runBacktest = () => api.get('/backtest'); // Run a new backtest

export const getBacktestResults = () => api.get('/backtest/history'); // Optional: View past results
