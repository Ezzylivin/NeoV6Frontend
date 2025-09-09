// File: src/api/backtest.js
import api from "./apiClient.js";

/** Fetch available backtest options */
export const fetchBacktestOptions = async () => {
  try {
    const res = await api.get("/api/backtests/options");
    return res.data || {};
  } catch (err) {
    console.error("[API] fetchBacktestOptions error:", err);
    throw err;
  }
};

/** Run a single backtest */
export const runBacktest = async (payload) => {
  try {
    const res = await api.post("/api/backtests/run", payload);
    return {
      saved: res.data.saved || {},
      metrics: res.data.metrics || {},
      equityCurve: res.data.equityCurve || res.data.saved?.equityCurve || [],
      trades: res.data.trades || res.data.saved?.tradeBreakdown || [],
    };
  } catch (err) {
    console.error("[API] runBacktest error:", err);
    throw err;
  }
};

/** Run batch backtests */
export const runBatchBacktests = async (payload) => {
  try {
    const res = await api.post("/api/backtests/batch", payload);
    const results = (res.data.results || []).map((r) => ({
      saved: r.saved || {},
      metrics: r.metrics || {},
      equityCurve: r.equityCurve || r.saved?.equityCurve || [],
      trades: r.trades || r.saved?.tradeBreakdown || [],
    }));
    return { results, usedCombos: res.data.usedCombos || [] };
  } catch (err) {
    console.error("[API] runBatchBacktests error:", err);
    throw err;
  }
};

/** Fetch all backtests for a user */
export const fetchUserBacktests = async (userId) => {
  if (!userId) return [];
  try {
    const res = await api.get(`/api/backtests/user/${userId}`);
    return res.data.backtests || [];
  } catch (err) {
    console.error("[API] fetchUserBacktests error:", err);
    throw err;
  }
};

/** Fetch a backtest by ID */
export const fetchBacktestById = async (backtestId) => {
  if (!backtestId) return null;
  try {
    const res = await api.get(`/api/backtests/${backtestId}`);
    return res.data.backtest || null;
  } catch (err) {
    console.error("[API] fetchBacktestById error:", err);
    throw err;
  }
};

/** Delete a backtest by ID */
export const deleteBacktest = async (backtestId) => {
  if (!backtestId) return false;
  try {
    await api.delete(`/api/backtests/${backtestId}`);
    return true;
  } catch (err) {
    console.error("[API] deleteBacktest error:", err);
    throw err;
  }
};
