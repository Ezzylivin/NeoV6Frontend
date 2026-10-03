// File: src/api/admin.js
// Admin control-plane client. Every call hits /api/admin/* which is gated by
// role === "admin" on the backend; a non-admin gets 403 and the UI hides these.
import api from "./apiClient";

// NOTE: apiClient's baseURL already includes "/api", so paths here must NOT
// repeat it (e.g. "/admin/users", not "/api/admin/users").

// Dashboard header stats: totals, per-tier counts, est. MRR.
export async function getOverview() {
  const { data } = await api.get("/admin/overview");
  return data;
}

// Paginated user directory. opts: { q, tier, role, page, limit }.
export async function listUsers(opts = {}) {
  const { data } = await api.get("/admin/users", { params: opts });
  return data; // { users, count, page, limit, pages }
}

// Comp/change a user's plan or role. patch: { tier?, role?, subscriptionStatus? }.
export async function updateUser(id, patch) {
  const { data } = await api.patch(`/admin/users/${id}`, patch);
  return data; // { user }
}

// Global emergency halt of ALL new entries across every fleet.
export async function setKillswitch(on) {
  const { data } = await api.post("/admin/killswitch", { on });
  return data;
}

// "Harden the system": re-run the hard validation that gates live pyramiding,
// at a chosen strictness ("normal" | "strict" | "paranoid"). Runs in the
// background on the engine; poll getRecalibration() for the verdict.
export async function recalibrate(level = "strict", maxLegs, coinbaseOne = false) {
  const { data } = await api.post("/admin/recalibrate", { level, maxLegs, coinbaseOne });
  return data; // { status: "started" | "already_running", level }
}

// Last recalibration result + whether one is running now + the auto cadence.
export async function getRecalibration() {
  const { data } = await api.get("/admin/recalibration");
  return data; // { running, last, levels, enabled, auto_hours, auto_level }
}

// Research: run the cross-coin sweep that hunts for the best-performing configs.
export async function runResearch() {
  const { data } = await api.post("/admin/research", {});
  return data; // { status: "started" | "already_running" }
}

// Latest research ranking + whether a sweep is running + the auto cadence.
export async function getResearch() {
  const { data } = await api.get("/admin/research");
  return data; // { running, enabled, auto_hours, results }
}

// Broadcast an email to many users. payload: { subject, body, userIds? , tier?,
// role?, onlyVerified? }. With userIds -> those users; otherwise the filter
// (no filter = everyone). Returns { matched, sent, failed }.
export async function broadcastEmail(payload) {
  const { data } = await api.post("/admin/broadcast", payload);
  return data;
}
