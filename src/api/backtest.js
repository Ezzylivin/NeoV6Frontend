// File: src/api/backtest.js
import api from "./apiClient.js";

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
  if (!payload.code) throw new Error("strategy 'code' is required for backtest");

  // Optional fields defaults
  const fullPayload = {
    ...payload,
    symbol: payload.symbol || "",
    params: payload.params || {},
    timeframe: payload.timeframe || "1h",
    tp: payload.tp || null,
    sl: payload.sl || null,
    simulateOnly: false, // full backtest
  };

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
  if (!payload.code) throw new Error("strategy 'code' is required for preview");

  const previewPayload = {
    ...payload,
    symbol: payload.symbol || "",
    timeframe: payload.timeframe || "1h",
    params: payload.params || {},
    tp: payload.tp || null,
    sl: payload.sl || null,
    simulateOnly: true, // preview mode
  };

  try {
    const { data } = await api.post("/backtest/preview", previewPayload);
    return data;
  } catch (error) {
    console.error("previewStrategy(): failed", error);
    throw error;
  }
}
