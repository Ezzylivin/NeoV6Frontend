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

// GET /api/fleet/status — combined balance + per-bot roster
export const getFleetStatus = async () => {
  const res = await api.get("/fleet/status");
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
