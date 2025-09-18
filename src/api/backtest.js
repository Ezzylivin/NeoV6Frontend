// File: src/api/backtest.js
// UPGRADED: Corrected API endpoints and ensured 'code' is passed correctly.

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
    // FIX: Return a default, empty object to prevent a full app crash
    return {
      strategies: [],
      symbols: [],
      timeframes: [],
      takeProfits: [],
      stopLosses: [],
    };
  }
}

export async function fetchAll(page = 1) {
  const response = await api.get(`/backtest?page=${page}`);
  const raw = response?.data?.data ?? response?.data;

  if (!raw) {
    console.warn("fetchAll(): unexpected response format", response);
    return { backtests: [], total: 0 };
  }

  return normalizePastBacktests(raw);
}

// FIX: Payload must include 'code' and use the correct endpoint
export async function runBacktest(payload) {
  if (!payload.code) {
    console.error("runBacktest(): Missing strategy 'code' in payload", payload);
    throw new Error("strategy 'code' is required for backtest");
  }
  const { data } = await api.post("/backtest/run", payload);
  return data;
}

// FIX: Ensure each config has a 'code' and use the correct endpoint
export async function runBatch(configs) {
  const sanitizedConfigs = configs.map((cfg) => {
    if (!cfg.code) {
      console.error("runBatch(): Missing 'code' in config", cfg);
      throw new Error("strategy 'code' is required for batch backtest");
    }
    return cfg;
  });

  const response = await api.post("/backtest/batch", { configs: sanitizedConfigs });
  return response;
}
