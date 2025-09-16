// File: src/api/backtest.js
import api from "./apiClient.js"; // shared axios client

// Fetch available backtest options (e.g., strategies, datasets, risks, balances)
export async function fetchOptions() {
  try {
    const res = await api.get("/backtest/options");
    return res.data;
  } catch (err) {
    console.error("Failed to fetch backtest options:", err);
    throw err;
  }
}

// Fetch all backtests with pagination
export async function fetchAll(page = 1) {
  try {
    const res = await api.get(`/backtest?page=${page}`);
    return res.data;
  } catch (err) {
    console.error("Failed to fetch backtests:", err);
    throw err;
  }
}

// Run a single backtest
export async function runBacktest(payload) {
  try {
    const res = await api.post("/backtest", payload); // <-- updated path
    return res.data;
  } catch (err) {
    console.error("Failed to run backtest:", err);
    throw err;
  }
}

// Run multiple backtests in batch
export async function runBatch(configs) {
  try {
    const res = await api.post("/backtest/batch", { configs }); // <-- updated path
    return res.data;
  } catch (err) {
    console.error("Failed to run batch backtests:", err);
    throw err;
  }
}
