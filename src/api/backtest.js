// File: ../api/backtest.js
// UPGRADED: Corrected API endpoints and batch payload to match the backend router.

import api from "./apiClient.js"; // your token-aware Axios instance

// --- Helpers to normalize backend responses (No changes needed here) ---
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
  // This endpoint is correct.
  const response = await api.get("/backtest/options");
  const raw = response?.data?.data ?? response?.data;

  if (!raw) {
    console.warn("fetchOptions(): unexpected response format", response);
    return { strategies: [], symbols: [], timeframes: [] };
  }

  return normalizeOptions(raw);
}

export async function fetchAll(page = 1) {
  // FIX: The backend route is '/backtest', not '/backtest/all'.
  const response = await api.get(`/backtest?page=${page}`);
  const raw = response?.data?.data ?? response?.data;

  if (!raw) {
    console.warn("fetchAll(): unexpected response format", response);
    return { backtests: [], total: 0 };
  }

  return normalizePastBacktests(raw);
}

export async function runBacktest(payload) {
  // FIX: The backend route is '/backtest', not '/backtest/run'.
  const response = await api.post("/backtest", payload);
  // Return entire response so the hook can check response.data
  return response;
}

export async function runBatch(configs) {
  // FIX: The controller expects an object with a 'configs' key: { configs: [...] }
  const response = await api.post("/backtest/batch", { configs });
  return response;
}
