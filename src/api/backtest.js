// File: src/api/backtest.js
import axios from "axios";

const API_BASE = "https://neov6backend.onrender.com/api/backtest";

// Fetch all past backtests (paginated)
export const fetchAll = (page = 1) => axios.get(`${API_BASE}?page=${page}`);

// Fetch options for dropdowns
export const fetchOptions = () => axios.get(`${API_BASE}/options`);

// Run a single backtest
export const runBacktest = (payload) => axios.post(API_BASE, payload);

// Run batch backtests
export const runBatch = (configs) => axios.post(`${API_BASE}/batch`, configs);
