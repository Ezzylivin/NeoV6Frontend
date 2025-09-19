// File: src/api/backtest.js

import api, { setAuthToken } from "./apiClient.js"; // ✅ 1. Import setAuthToken

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
  setAuthToken(localStorage.getItem('userToken')); // ✅ 2. Call it here
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
  setAuthToken(localStorage.getItem('userToken')); // ✅ 2. And here
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
  setAuthToken(localStorage.getItem('userToken')); // ✅ 2. And here
  if (!payload.code) throw new Error("strategy 'code' is required for backtest");

  const fullPayload = {
    ...payload,
    symbol: payload.symbol || "",
    params: payload.params || {},
    timeframe: payload.timeframe || "1h",
    tp: payload.tp || null,
    sl: payload.sl || null,
    simulateOnly: false,
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
  setAuthToken(localStorage.getItem('userToken')); // ✅ 2. And here
  if (!payload.code) throw new Error("strategy 'code' is required for preview");

  const previewPayload = {
    ...payload,
    symbol: payload.symbol || "",
    timeframe: payload.timeframe || "1h",
    params: payload.params || {},
    tp: payload.tp || null,
    sl: payload.sl || null,
    simulateOnly: true,
  };

  try {
    const { data } = await api.post("/backtest/preview", previewPayload);
    return data;
  } catch (error) {
    console.error("previewStrategy(): failed", error);
    throw error;
  }
}
