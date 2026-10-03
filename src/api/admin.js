// File: src/api/admin.js
// Admin control-plane client. Every call hits /api/admin/* which is gated by
// role === "admin" on the backend; a non-admin gets 403 and the UI hides these.
import api from "./apiClient";

// Dashboard header stats: totals, per-tier counts, est. MRR.
export async function getOverview() {
  const { data } = await api.get("/api/admin/overview");
  return data;
}

// Paginated user directory. opts: { q, tier, role, page, limit }.
export async function listUsers(opts = {}) {
  const { data } = await api.get("/api/admin/users", { params: opts });
  return data; // { users, count, page, limit, pages }
}

// Comp/change a user's plan or role. patch: { tier?, role?, subscriptionStatus? }.
export async function updateUser(id, patch) {
  const { data } = await api.patch(`/api/admin/users/${id}`, patch);
  return data; // { user }
}

// Global emergency halt of ALL new entries across every fleet.
export async function setKillswitch(on) {
  const { data } = await api.post("/api/admin/killswitch", { on });
  return data;
}
