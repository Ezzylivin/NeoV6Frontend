// File: src/api/backtest.js
// UPGRADED: Corrected API endpoints and ensured strategyCode is passed correctly.

import api from "./apiClient.js"; // your token-aware Axios instance

// --- Helpers to normalize backend responses ---
const normalizeOptions = (raw) => ({
  strategies: raw?.strategies || [],
  symbols: raw?.symbols || [],
  timeframes: raw?.timeframes || [],
  takeProfits: raw?.takeProfits || [],
  stopLosses: raw?.stopLosses || [],
});

const normalizePastBacktests = (raw) => ({
  backtests: raw?.backtests || [],
  total: raw?.total || 0,
});

// --- API calls ---
export async function fetchOptions() {
  try {
    const response = await api.get("/backtest/options");
    const raw = response?.data?.data ?? response?.data;

    console.log("fetchOptions(): data received successfully", raw);
    return normalizeOptions(raw);
  } catch (error) {
    console.error("fetchOptions(): failed to fetch options.", error);
    throw error;
  }
}

export async function fetchAll(page = 1) {
  // FIX: The backend route is '/backtest'
  const response = await api.get(`/backtest?page=${page}`);
  const raw = response?.data?.data ?? response?.data;

  if (!raw) {
    console.warn("fetchAll(): unexpected response format", response);
    return { backtests: [], total: 0 };
  }

  return normalizePastBacktests(raw);
}

export async function runBacktest(payload) {
  // FIX: Payload must include strategyCode
  if (!payload.strategyCode) {
    console.error("runBacktest(): Missing strategyCode in payload", payload);
    throw new Error("strategyCode is required for backtest");
  }
  const response = await api.post("/backtest/run", payload);
  return response;
}

export async function runBatch(configs) {
  // FIX: Ensure each config has a strategyCode
  const sanitizedConfigs = configs.map((cfg) => {
    if (!cfg.strategyCode) {
      console.error("runBatch(): Missing strategyCode in config", cfg);
      throw new Error("strategyCode is required for batch backtest");
    }
    return cfg;
  });

  const response = await api.post("/backtest/batch", { configs: sanitizedConfigs });
  return response;
}
