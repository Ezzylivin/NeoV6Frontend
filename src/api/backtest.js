// File: src/api/backtest.js
import api from "./apiClient.js";

/** Fetch available backtest options */
export const fetchOptions = async () => {
  const { data } = await api.get("/backtest/options");
  return data.data || {}; // Backend wraps response in { success, message, data }
};

/** Run a single backtest */
export const run = async (payload) => {
  const { data } = await api.post("/backtest/run", payload);
  // CORRECT: The backend now returns the full, saved backtest document directly in the data property.
  return data.data; 
};

/** Fetch all backtests for the authenticated user */
export const fetchAll = async (page = 1, limit = 10) => {
  // CORRECT: The endpoint is just /backtests, user ID is from the token.
  const { data } = await api.get(`/backtest?page=${page}&limit=${limit}`);
  return data.data; // Returns { backtests, page, limit, total }
};

/** Fetch a single backtest by its ID */
export const fetchById = async (backtestId) => {
  const { data } = await api.get(`/backtest/${backtestId}`);
  return data.data.backtest;
};

/** Delete a backtest by its ID */
export const remove = async (backtestId) => {
  const { data } = await api.delete(`/backtest/${backtestId}`);
  return data;
};
