// File: src/api/backtest.js
import api from "./api.js"; // ✅ fixed import

export async function fetchOptions() {
  return api.get("/backtest/options");
}

export async function fetchAll(page = 1) {
  return api.get(`/backtest?page=${page}`);
}

export async function runBacktest(payload) {
  return api.post("/backtest/run", payload);
}

export async function runBatch(configs) {
  return api.post("/backtest/run-batch", { configs });
}
