// File: src/api/billing.js
// Subscription billing client. Talks to the Node backend's /api/billing/* which
// proxies Stripe. Paper trading is free & unlimited, so these only ever concern
// unlocking LIVE trading via a paid tier.
import api from "./apiClient";

// NOTE: apiClient's baseURL already includes "/api", so paths here must NOT
// repeat it (e.g. "/billing/plans", not "/api/billing/plans").

// GET the plan catalog + the caller's current subscription state.
export async function getPlans() {
  const { data } = await api.get("/billing/plans");
  return data; // { plans, billingConfigured, current }
}

// Start checkout for a paid tier. interval: "month" | "year". Returns a Stripe
// hosted-checkout URL to redirect to (or a 503 if billing isn't wired yet).
export async function startCheckout(tier, interval = "month") {
  const { data } = await api.post("/billing/checkout", { tier, interval });
  return data; // { url }
}

// Open the Stripe customer portal (manage card / cancel).
export async function openPortal() {
  const { data } = await api.post("/billing/portal", {});
  return data; // { url }
}
