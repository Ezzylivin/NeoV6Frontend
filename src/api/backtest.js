import apiClient from "./apiClient.js";

/**
 * Fetches all available options (symbols, strategies) for the backtest form.
 */
export const fetchOptions = async () => {
  // FIX: Changed path to singular 'backtest'
  const { data } = await apiClient.get("/backtest/options");
  return data.data || {};
};

/**
 * Runs a new backtest.
 * @param {object} payload - The configuration for the backtest.
 */
export const run = async (payload) => {
  // FIX: Changed path to singular 'backtest'
  const { data } = await apiClient.post("/backtest/run", payload);
  return data.data;
};

/**
 * Fetches all of the user's past backtests with pagination.
 */
export const fetchAll = async (page = 1, limit = 10) => {
  // FIX: Changed path to singular 'backtest'
  const { data } = await apiClient.get(`/backtest?page=${page}&limit=${limit}`);
  return data.data;
};

/**
 * Fetches a single backtest result by its ID.
 */
export const fetchById = async (backtestId) => {
  // FIX: Changed path to singular 'backtest'
  const { data } = await apiClient.get(`/backtest/${backtestId}`);
  return data.data.backtest;
};

/**
 * Deletes a backtest by its ID.
 */
export const remove = async (backtestId) => {
  // FIX: Changed path to singular 'backtest'
  const { data } = await apiClient.delete(`/backtest/${backtestId}`);
  return data;
};
