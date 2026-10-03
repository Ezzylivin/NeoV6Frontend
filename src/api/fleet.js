// File: src/api/fleet.js
// Fleet orchestration API. Talks to the Node backend's /api/fleet/* proxy, which
// forwards to the Python engine and injects the caller's identity from the
// verified token — so the client never sends (or can spoof) a userId.
import api from "./apiClient";

// POST /api/fleet/start — body: { symbols?, capitalEach?, fleetMaxDrawdownPct?, sizeByConviction? }
export const startFleet = async (body = {}) => {
  const res = await api.post("/fleet/start", body);
  return res.data;
};

// POST /api/fleet/stop — stops the caller's entire fleet
export const stopFleet = async () => {
  const res = await api.post("/fleet/stop", {});
  return res.data;
};

// POST /api/fleet/killswitch { on } — emergency halt of ALL new entries (global).
export const setKillSwitch = async (on) => {
  const res = await api.post("/fleet/killswitch", { on: !!on });
  return res.data;
};

// POST /api/fleet/risk { riskPct } — change risk % on a RUNNING fleet. Applies to
// NEW entries only; open positions keep their original size/stop. No re-ignite.
export const setFleetRisk = async (riskPct) => {
  const res = await api.post("/fleet/risk", { riskPct: Number(riskPct) });
  return res.data;
};

// GET /api/fleet/status — combined balance + per-bot roster
export const getFleetStatus = async () => {
  const res = await api.get("/fleet/status");
  return res.data;
};

// GET /api/fleet/eligibility — which coins are validation-cleared for live
// pyramiding (survived the Strategy Lab's holdout + cost-stress tests).
export const getFleetEligibility = async () => {
  const res = await api.get("/fleet/eligibility");
  return res.data;
};

// GET /api/fleet/learning — self-learning status: ledger models trained from the
// fleet's own closed trades + per-coin progress toward the training threshold.
export const getFleetLearning = async () => {
  const res = await api.get("/fleet/learning");
  return res.data;
};

// GET /api/fleet/regime — current BTC macro regime (risk_on / risk_off / neutral)
export const getFleetRegime = async () => {
  const res = await api.get("/fleet/regime");
  return res.data;
};

// GET /api/fleet/drift — live paper stats vs the validated profile
export const getFleetDrift = async () => {
  const res = await api.get("/fleet/drift");
  return res.data;
};

// GET /api/fleet/bot?symbol=&side= — per-coin child detail (positions, markers,
// signals, balance) for the chart overlay on the unified Fleet page.
export const getFleetBot = async (symbol, side) => {
  const res = await api.get("/fleet/bot", { params: { symbol, side } });
  return res.data;
};

// GET /api/fleet/activity — recent closed trades across the whole fleet (feed).
export const getFleetActivity = async (limit = 20) => {
  const res = await api.get("/fleet/activity", { params: { limit } });
  return res.data;
};
