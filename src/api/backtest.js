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
    throw error;
  }
}

// --- Fetch paginated past backtests ---
export async function fetchAll(page = 1) {
  try {
    const response = await api.get(`/backtest?page=${page}`);
    return normalizePastBacktests(response.data);
  } catch (error) {
    console.error("fetchAll(): failed to fetch past backtests.", error);
    throw error;
  }
}

// --- Fetch a single backtest by its ID ---
export async function fetchById(id) {
  try {
    const { data } = await api.get(`/backtest/${id}`);
    return data;
  } catch (error) {
    console.error(`fetchById(${id}): failed to fetch backtest.`, error);
    throw error;
  }
}

// --- Delete a single backtest by its ID ---
export async function deleteById(id) {
  try {
    const { data } = await api.delete(`/backtest/${id}`);
    return data;
  } catch (error) {
    console.error(`deleteById(${id}): failed to delete backtest.`, error);
    throw error;
  }
}

// --- Run single backtest ---
export async function runBacktest(payload) {
  if (!payload.code) throw new Error("strategy 'code' is required for backtest");
  try {
    const { data } = await api.post("/backtest/run", payload);
    return data;
  } catch (error) {
    console.error("runBacktest(): failed", error);
    throw error;
  }
}

// --- Preview a strategy without saving ---
export async function previewStrategy(payload) {
  if (!payload.code) throw new Error("strategy 'code' is required for preview");
  try {
    const { data } = await api.post("/backtest/preview", payload);
    return data;
  } catch (error) {
    console.error("previewStrategy(): failed", error);
    throw error;
  }
}

// --- Run a combined strategy backtest ---
export async function runComboBacktest(payload) {
  try {
    // Normalize payload to match comboStrategy schema
    const normalized = {
      symbol: payload.symbol,
      timeframe: payload.timeframe,
      startDate: payload.startDate,
      endDate: payload.endDate,
      combinationRule: payload.combinationRule,
      strategyParams: (payload.strategyParams || []).map((s) => ({
        strategyId: s.strategyId,
        params: s.params || {},
      })),
    };

    const { data } = await api.post("/backtest/combo", normalized);
    return data;
  } catch (error) {
    console.error("runComboBacktest(): failed", error);
    throw error;
  }
}
