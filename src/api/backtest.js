import api, { setAuthToken } from "./apiClient.js";

// --- Helpers to normalize API responses ---
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

// --- Fetch backtest options ---
export async function fetchOptions() {
  setAuthToken(localStorage.getItem('userToken'));
  try {
    const response = await api.get("/backtest/options");
    return normalizeOptions(response.data);
  } catch (error) {
    console.error("fetchOptions(): failed to fetch options.", error);
    return normalizeOptions({});
  }
}

// --- Fetch paginated past backtests ---
export async function fetchAll(page = 1) {
  setAuthToken(localStorage.getItem('userToken'));
  try {
    const response = await api.get(`/backtest?page=${page}`);
    return normalizePastBacktests(response.data);
  } catch (error) {
    console.error("fetchAll(): failed to fetch past backtests.", error);
    return normalizePastBacktests({});
  }
}

// --- Run single backtest ---
export async function runBacktest(payload) {
  setAuthToken(localStorage.getItem('userToken'));
  if (!payload.code) throw new Error("strategy 'code' is required for backtest");

  const fullPayload = { ...payload };
  try {
    const { data } = await api.post("/backtest/run", fullPayload);
    return data;
  } catch (error) {
    console.error("runBacktest(): failed", error);
    throw error;
  }
}

// --- Preview a strategy without saving ---
export async function previewStrategy(payload) {
  setAuthToken(localStorage.getItem('userToken'));
  if (!payload.code) throw new Error("strategy 'code' is required for preview");

  const previewPayload = { ...payload };
  try {
    const { data } = await api.post("/backtest/preview", previewPayload);
    return data;
  } catch (error) {
    console.error("previewStrategy(): failed", error);
    throw error;
  }
}

// ✅ --- NEW: Run a batch backtest ---
export async function runBatchBacktest(payload) {
  setAuthToken(localStorage.getItem('userToken'));
  try {
    const { data } = await api.post("/backtest/batch", payload);
    return data;
  } catch (error) {
    console.error("runBatchBacktest(): failed", error);
    throw error;
  }
}

// ✅ --- NEW: Run a combined strategy backtest ---
export async function runComboBacktest(payload) {
  setAuthToken(localStorage.getItem('userToken'));
  try {
    const { data } = await api.post("/backtest/combo", payload);
    return data;
  } catch (error) {
    console.error("runComboBacktest(): failed", error);
    throw error;
  }
}
