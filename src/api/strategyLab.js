// File: src/api/strategyLab.js
// Strategy Lab API — talks to the Node backend's /api/strategylab/* proxy, which
// forwards to the Python engine's read-only exit_lab backtester. This runs the
// SAME validated simulator the live fleet uses (regime entry + trend_ride exit),
// so results reflect what the fleet actually trades. Nothing here is live.
import api from "./apiClient";

// GET /api/strategylab/options — coins, timeframes, entries, exit styles, fleet default
export const getLabOptions = async () => {
  const res = await api.get("/strategylab/options");
  return res.data;
};

// POST /api/strategylab/run — body: { symbol, timeframe, entry, direction, style,
//   riskPct, start?, end?, initialBalance?, maxLegs? } → { metrics, equity, trades, buy_hold_pct }
export const runStrategyLab = async (body = {}) => {
  const res = await api.post("/strategylab/run", body);
  return res.data;
};

// POST /api/strategylab/portfolio — run ONE config across many coins as a combined
// portfolio (blended equity, the diversification view). body: { timeframe, entry,
//   direction, style, symbols? } → { blended_roi, per_coin, coins_positive, ... }
export const runPortfolio = async (body = {}) => {
  const res = await api.post("/strategylab/portfolio", body);
  return res.data;
};
