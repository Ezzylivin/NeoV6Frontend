import api from "./apiClient.js";

// --- Helpers ---
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
    return normalizeOptions(response.data);
  } catch (error) {
    console.error("fetchOptions(): failed to fetch options.", error);
    return normalizeOptions({});
  }
}

export async function fetchAll(page = 1) {
  try {
    const response = await api.get(`/backtest?page=${page}`);
    return normalizePastBacktests(response.data);
  } catch (error) {
    console.error("fetchAll(): failed to fetch past backtests.", error);
    return normalizePastBacktests({});
  }
}

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

export async function runBatch(configs) {
  const sanitizedConfigs = configs.map((cfg) => {
    if (!cfg.code) throw new Error("strategy 'code' is required for batch backtest");
    return cfg;
  });
  try {
    const { data } = await api.post("/backtest/batch", { configs: sanitizedConfigs });
    return data;
  } catch (error) {
    console.error("runBatch(): failed", error);
    throw error;
  }
}
