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
    try {
        const response = await api.get("/backtest/options");
        const raw = response?.data?.data ?? response?.data;

        // Doc: Log a success message to confirm the data was received.
        console.log("fetchOptions(): data received successfully", raw);

        // Doc: The normalizeOptions function handles empty or unexpected data.
        return normalizeOptions(raw);
    } catch (error) {
        console.error("fetchOptions(): failed to fetch options.", error);
        throw error; // Re-throw the error to be handled by the calling hook.
    }
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
