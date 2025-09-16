// File: ../api/backtest.js
import api from "./apiClient.js"; // your token-aware Axios instance

// --- Helpers to normalize backend responses ---
const normalizeOptions = (raw) => ({
  strategies: raw?.strategies || [],
  symbols: raw?.symbols || [],
  timeframes: raw?.timeframes || [],
});

const normalizePastBacktests = (raw) => ({
  backtests: raw?.backtests || [],
  total: raw?.total || 0,
});

// --- API calls ---
export async function fetchOptions() {
  const response = await api.get("/backtest/options");
  const raw = response?.data?.data ?? response?.data;

  if (!raw) {
    console.warn("fetchOptions(): unexpected response format", response);
    return { strategies: [], symbols: [], timeframes: [] };
  }

  return normalizeOptions(raw);
}

export async function fetchAll(page = 1) {
  const response = await api.get(`/backtest/all?page=${page}`);
  const raw = response?.data?.data ?? response?.data;

  if (!raw) {
    console.warn("fetchAll(): unexpected response format", response);
    return { backtests: [], total: 0 };
  }

  return normalizePastBacktests(raw);
}

export async function runBacktest(payload) {
  const response = await api.post("/backtest/run", payload);
  // return entire response (so hook can still check .data.data.isPythonResult)
  return response;
}

export async function runBatch(configs) {
  const response = await api.post("/backtest/batch", configs);
  return response;
}
