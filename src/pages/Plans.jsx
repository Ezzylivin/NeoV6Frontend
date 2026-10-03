// File: src/pages/Plans.jsx
// Subscription storefront. The pitch: paper trading is free and unlimited for
// everyone; paid tiers unlock LIVE trading (which only ever activates after a
// strategy passes validation). Monthly/annual toggle, current-plan badge, and
// Stripe checkout hand-off. Gracefully shows "Coming soon" until Stripe is wired.
import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Check, Zap, ShieldCheck, Crown, Sparkles, Loader2 } from "lucide-react";
import { getPlans, startCheckout, openPortal } from "../api/billing";

const ICON = {
  free: Sparkles,
  trader: Zap,
  pro: ShieldCheck,
  whale: Crown,
};

function priceFor(plan, interval) {
  const n = interval === "year" ? plan.priceAnnual : plan.priceMonthly;
  return n;
}

// Whole numbers show plain; half-dollar annual rates show cents ($14.50).
const money = (n) => (Number.isInteger(n) ? `${n}` : n.toFixed(2));

export default function Plans() {
  const [params, setParams] = useSearchParams();
  const [interval, setInterval] = useState("year"); // default to the cheaper, stickier plan
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const checkout = params.get("checkout");
    if (checkout === "success") setNotice("🎉 Subscription active — live trading is unlocked. Welcome aboard.");
    else if (checkout === "cancelled") setNotice("Checkout cancelled — no charge was made.");
    if (checkout) { params.delete("checkout"); setParams(params, { replace: true }); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const load = async () => {
    try { setData(await getPlans()); }
    catch (e) { setErr(e?.response?.data?.message || "Couldn't load plans."); }
  };
  useEffect(() => { load(); }, []);

  const current = data?.current?.tier || "free";
  const status = data?.current?.subscriptionStatus;

  const onSelect = async (plan) => {
    setErr(""); setNotice("");
    if (plan.id === "free") return;
    setBusy(plan.id);
    try {
      const { url } = await startCheckout(plan.id, interval);
      if (url) window.location.assign(url);
    } catch (e) {
      const m = e?.response?.data?.message || "Checkout isn't available yet.";
      setErr(m);
    } finally { setBusy(""); }
  };

  const onManage = async () => {
    setBusy("portal");
    try { const { url } = await openPortal(); if (url) window.location.assign(url); }
    catch (e) { setErr(e?.response?.data?.message || "Billing portal unavailable."); }
    finally { setBusy(""); }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 text-neutral-200">
      {/* HERO */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-white sm:text-4xl">
          Paper trade free, forever. <span className="text-emerald-400">Pay only to go live.</span>
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-neutral-400">
          The full engine — every coin, every strategy, the Strategy Lab and self-learning ledger — is
          unlimited on paper at no cost. Upgrade only when you're ready to deploy a <em>validated</em> setup
          with real money. No per-trade cut. Cancel anytime.
        </p>
      </div>

      {/* INTERVAL TOGGLE */}
      <div className="mt-8 flex items-center justify-center gap-3">
        <button
          onClick={() => setInterval("month")}
          className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${interval === "month" ? "bg-white/10 text-white" : "text-neutral-400 hover:text-white"}`}
        >Monthly</button>
        <button
          onClick={() => setInterval("year")}
          className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${interval === "year" ? "bg-white/10 text-white" : "text-neutral-400 hover:text-white"}`}
        >
          Annual <span className="ml-1 rounded bg-emerald-500/20 px-1.5 py-0.5 text-xs text-emerald-300">6 months free</span>
        </button>
      </div>

      {notice && <div className="mt-6 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">{notice}</div>}
      {err && <div className="mt-6 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{err}</div>}
      {data && !data.billingConfigured && (
        <div className="mt-6 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
          Live checkout is being switched on. You can still use everything on paper for free in the meantime.
        </div>
      )}

      {/* PLAN GRID */}
      <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {(data?.plans || []).map((plan) => {
          const Icon = ICON[plan.id] || Sparkles;
          const isCurrent = current === plan.id && (plan.id === "free" || status === "active" || status === "trialing");
          const price = priceFor(plan, interval);
          const canCheckout = plan.checkout?.[interval];
          return (
            <div
              key={plan.id}
              className={`relative flex flex-col rounded-2xl border p-6 ${
                plan.highlight ? "border-emerald-500/60 bg-emerald-500/[0.04] shadow-[0_0_30px_rgba(16,185,129,0.15)]" : "border-white/10 bg-white/[0.02]"
              }`}
            >
              {plan.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-emerald-500 px-3 py-0.5 text-xs font-bold text-black">
                  MOST POPULAR
                </div>
              )}
              <div className="flex items-center gap-2">
                <Icon className="h-5 w-5 text-emerald-400" />
                <h3 className="text-lg font-bold text-white">{plan.name}</h3>
              </div>
              <p className="mt-1 text-xs text-neutral-400">{plan.tagline}</p>

              <div className="mt-4 flex items-end gap-1">
                <span className="text-3xl font-extrabold text-white">${money(price)}</span>
                <span className="mb-1 text-sm text-neutral-500">{plan.priceMonthly === 0 ? "forever" : "/mo"}</span>
              </div>
              {plan.priceMonthly > 0 && interval === "year" && (
                <p className="text-xs text-emerald-300">
                  ${money(plan.priceAnnual * 12)} billed yearly · 6 months free
                </p>
              )}
              {plan.trialDays > 0 && <p className="mt-1 text-xs text-neutral-400">{plan.trialDays}-day trial · no card to start</p>}

              <p className="mt-3 text-sm text-neutral-300">{plan.blurb}</p>

              <ul className="mt-4 space-y-2 text-sm">
                {plan.features.map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-neutral-300">
                    <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-400" /> {f}
                  </li>
                ))}
              </ul>

              <div className="mt-6 flex-1" />

              {isCurrent ? (
                <div className="space-y-2">
                  <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 py-2 text-center text-sm font-semibold text-emerald-300">
                    Your plan{status === "trialing" ? " · trial" : ""}
                  </div>
                  {plan.id !== "free" && (
                    <button onClick={onManage} disabled={busy === "portal"}
                      className="w-full rounded-lg border border-white/15 py-2 text-sm text-neutral-300 hover:bg-white/5">
                      {busy === "portal" ? "Opening…" : "Manage subscription"}
                    </button>
                  )}
                </div>
              ) : plan.id === "free" ? (
                <div className="rounded-lg border border-white/10 py-2 text-center text-sm text-neutral-400">
                  Included for everyone
                </div>
              ) : (
                <button
                  onClick={() => onSelect(plan)}
                  disabled={busy === plan.id || !canCheckout}
                  className={`flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-bold transition ${
                    plan.highlight
                      ? "bg-emerald-500 text-black hover:bg-emerald-400"
                      : "bg-white/10 text-white hover:bg-white/20"
                  } disabled:cursor-not-allowed disabled:opacity-50`}
                >
                  {busy === plan.id && <Loader2 className="h-4 w-4 animate-spin" />}
                  {canCheckout ? `Go live with ${plan.name}` : "Coming soon"}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* WHY US */}
      <div className="mt-12 grid gap-4 rounded-2xl border border-white/10 bg-white/[0.02] p-6 sm:grid-cols-3">
        <Why title="Validation-gated live" body="You can't deploy real money until a setup passes holdout + cost-stress tests. Nobody else does this." />
        <Why title="No per-trade tax" body="Flat monthly price. We don't skim a fee off every fill like exchange-run bots do." />
        <Why title="Unlimited free paper" body="The entire engine on paper — any coins, any legs — at no cost, with no expiry." />
      </div>
    </div>
  );
}

function Why({ title, body }) {
  return (
    <div>
      <h4 className="font-semibold text-emerald-400">{title}</h4>
      <p className="mt-1 text-sm text-neutral-400">{body}</p>
    </div>
  );
}
