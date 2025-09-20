// File: src/api/backtest.js
import apiClient from "./apiClient.js";

// ✅ Fetch available backtest options (symbols, strategies, etc.)
export async function fetchOptions() {
  const { data } = await apiClient.get("/backtests/options");
  return data;
}

// ✅ Fetch paginated list of past backtests
export async function fetchAll(page = 1) {
  const { data } = await apiClient.get(`/backtests?page=${page}`);
  return data;
}

// ✅ Fetch a single backtest by ID
export async function fetchById(id) {
  const { data } = await apiClient.get(`/backtests/${id}`);
  return data;
}

// ✅ Delete a backtest by ID
export async function deleteById(id) {
  const { data } = await apiClient.delete(`/backtests/${id}`);
  return data;
}

// ✅ Run a new single backtest
export async function runBacktest(payload) {
  const { data } = await apiClient.post("/backtests/run", payload);
  return data;
}

// ✅ Run a preview of a strategy without storing results
export async function previewStrategy(payload) {
  const { data } = await apiClient.post("/backtests/preview", payload);
  return data;
}

// ✅ Run combined backtests (multiple strategies / params)
export async function runComboBacktest(payload) {
  const { data } = await apiClient.post("/backtests/combo", payload);
  return data;
}
