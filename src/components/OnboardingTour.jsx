// File: src/components/OnboardingTour.jsx
// First-login guided tour — a FORCED, mandatory walkthrough. A full-screen overlay
// dims the app and blocks every click except the tour. There is no skip/close: the
// user must step through to Finish.
//
// Two kinds of step:
//  • content/spotlight  — dims everything, highlights a control, Next always on.
//  • interactive + gated — cuts a "hole" so the spotlighted field IS clickable,
//                          and locks Next until that field holds a VALID value
//                          (so the user must actually make each input). The Lab
//                          sequence uses these, ending by forcing a real backtest.
//
// Runs on first login (localStorage flag) and on demand via the "neov6:start-tour"
// window event (the Help page button fires it).
import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowRight, ArrowLeft, GraduationCap, Lock } from "lucide-react";
import api from "../api/apiClient";

const DONE_KEY = "neov6_onboarded_v2";
const FLEET = "/dashboard/fleet";
const LAB = "/dashboard/backtests";

const q = (sel) => document.querySelector(`[data-tour="${sel}"]`);

const LAB_COINS = ["BTC-USD", "ETH-USD", "SOL-USD", "DOGE-USD", "XRP-USD"];
const LAB_RISKS = [1, 1, 1.5, 2];

// Programmatically set a React-controlled <input>/<select> and fire its change so
// the Lab's own state updates — this lets the tour DICTATE each input (and explain
// why) instead of asking the user to choose.
const fill = (sel, value) => {
  const el = q(sel);
  if (!el) return;
  try {
    const proto = el.tagName === "SELECT" ? window.HTMLSelectElement.prototype : window.HTMLInputElement.prototype;
    const desc = Object.getOwnPropertyDescriptor(proto, "value");
    if (desc && desc.set) desc.set.call(el, String(value)); else el.value = String(value);
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  } catch { /* ignore */ }
};

const STEPS = [
  { title: "Welcome to NeoV6", body: "NeoV6 is an automated crypto trading dashboard. A fleet of bots watches the market and opens and closes trades for you, using a strategy validated on years of history. This tour walks you through everything and ends with you running a real backtest. You can replay it anytime from Help." },
  { title: "It's paper money — you can't lose a cent", body: "Everything here is PAPER trading: simulated balance against real, live prices. Nothing touches a real exchange or real funds. It's the safe way to see whether the strategy performs before anyone considers real capital." },
  { title: "Your fleet: two bots per coin", body: "Each coin runs a LONG bot (up-trends, 4-hour chart) and a SHORT bot (down-trends, daily). Only the side that fits current conditions trades; the other waits.", route: FLEET },
  { title: "The market sets the tilt", body: "Bitcoin's trend sets a 'regime'. Risk-ON: longs favored, shorts parked. Risk-OFF: the reverse. The badge at the top shows the current regime so the fleet leans with the market, not against it.", route: FLEET },
  { title: "Start the fleet here", body: "Ignite Fleet spins up every bot; they then run on the server 24/7. Stop shuts them down. That's the only button you need to get going.", route: FLEET, target: "ignite" },
  { title: "Risk % per trade", body: "Sets how much of a bot's balance each trade risks, which sizes the position. 1% is the validated default; the fixed stop makes your risk known up front.", route: FLEET, target: "risk" },
  { title: "Pyramiding (advanced)", body: "Lets a bot add positions while a trend keeps confirming — but only for coins that passed the Strategy Lab's hard validation. Everything else stays single-leg. Leave it Off until you've validated it.", route: FLEET, target: "pyramiding" },
  { title: "Emergency kill switch", body: "One click halts ALL new entries fleet-wide. Open positions keep being managed to their stops — it stops new risk, it doesn't dump trades.", route: FLEET, target: "killswitch" },
  { title: "Readiness meters", body: "Each bot shows how close it is to trading. It only hits 100% when every entry check passes AND a signal is firing. The panel names whatever is holding each bot back.", route: FLEET },
  { title: "Track record & drift monitor", body: "The track record shows your realized return vs holding Bitcoin. The drift monitor flags if live results diverge from the validated profile. Judge the fleet over weeks, never one hour.", route: FLEET },

  // ---- Strategy Lab: the tour DICTATES each input (and explains why), then the
  //      user runs the finished backtest. Values are auto-filled; the coin and
  //      risk are rolled at random from sensible, knowledge-based choices. ----
  { title: "Now I'll build a backtest for you", body: "The smart inputs aren't obvious, so I'll set each one to a sensible, knowledge-based choice and tell you WHY — instead of leaving you to guess. Watch each field fill in, then you'll run the finished backtest yourself.", route: LAB },
  { title: "1. Coin", route: LAB, target: "lab-coin", apply: (p) => window.dispatchEvent(new CustomEvent("neov6:lab-pick-coin", { detail: p.coin })), body: (p) => `I set the coin to ${p.coin.replace("-USD", "")}. Any of the five validated coins works — I rolled one at random to prove the edge isn't cherry-picked to a single market. (You can also pick several and compare.)` },
  { title: "2. Timeframe", target: "lab-timeframe", apply: () => fill("lab-timeframe", "4h"), body: "Set to 4h — the fleet's long timeframe. Slow enough to dodge fee-churn, fast enough to catch real trends. (1d is used for the short side.)" },
  { title: "3. Direction", target: "lab-direction", apply: () => fill("lab-direction", "LONG"), body: "LONG. The core validated edge is the long side; shorts are an optional margin hedge, so we test the strength first." },
  { title: "4. Entry signal", target: "lab-entry", apply: () => fill("lab-entry", "regime"), body: "Regime — enter on trend, but only when Bitcoin is risk-on. This is EXACTLY what the live fleet uses, so the backtest mirrors reality instead of some other strategy." },
  { title: "5. Exit style", target: "lab-exit", apply: () => fill("lab-exit", "trend_ride"), body: "Trend-ride — hold to a signal flip behind a FIXED stop. This is THE validated edge: cut losers at a set line, let winners run (no take-profit cap)." },
  { title: "6. Risk per trade", target: "lab-risk", apply: (p) => fill("lab-risk", p.risk), body: (p) => `I set risk to ${p.risk}% — a sane 1–2% of the account risked to the stop on each trade. Small enough that an unlucky streak can't sink you, since the stop makes the loss known up front.` },
  { title: "7. Pyramiding", target: "lab-legs", apply: () => fill("lab-legs", "1"), body: "Left Off — a single position per trade, the validated baseline. Pyramiding is only safe on coins that have already passed these exact tests." },
  { title: "8. Now run it", target: "lab-run", interactive: true, validate: () => !!q("lab-result"), body: "Every input is now set the way the fleet actually trades. Click Run backtest — you can't continue until the result loads (a few seconds)." },
  { title: "Read the result", target: "lab-result", body: "Your plain-English verdict, the metrics, and every simulated trade. THIS is how a setup earns trust — and only a config that passes here can ever be used Live. You just ran your first one 🎉" },

  { title: "Help Center — always here", body: "The Help Center has a searchable guide and a button to replay this whole tour anytime. If something ever looks off, start there.", target: "nav-help" },
  { title: "You're all set", body: "That's the full app, end to end. Ignite the fleet, watch the readiness meters and trade feed, and prove new ideas in the Strategy Lab. It's paper — explore freely. Good luck!", route: FLEET },
];

export default function OnboardingTour() {
  const [run, setRun] = useState(false);
  const [i, setI] = useState(0);
  const [rect, setRect] = useState(null);
  const [valid, setValid] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  const timers = useRef([]);
  const picks = useRef({ coin: "BTC-USD", risk: 1 });
  const roll = () => {
    picks.current = {
      coin: LAB_COINS[Math.floor(Math.random() * LAB_COINS.length)],
      risk: LAB_RISKS[Math.floor(Math.random() * LAB_RISKS.length)],
    };
  };

  useEffect(() => {
    let alive = true;
    const onStart = () => { roll(); setRect(null); setI(0); setRun(true); };
    window.addEventListener("neov6:start-tour", onStart);

    // AUTO-show only on the user's FIRST login ever. The server-side onboardedAt
    // flag is the source of truth (per account, across devices, and it survives
    // even if the user never finishes the tour). localStorage is a fast path so
    // already-onboarded users don't re-query /me on every page load.
    let seen = false;
    try { seen = !!localStorage.getItem(DONE_KEY); } catch { seen = false; }
    if (!seen) {
      api.get("/users/me")
        .then((r) => {
          if (!alive) return;
          if (r?.data?.user?.onboardedAt) {
            try { localStorage.setItem(DONE_KEY, "1"); } catch { /* ignore */ }
            return; // already onboarded on another device/session — never again
          }
          // First time ever: show once, and mark it immediately (server +
          // local) so it won't re-appear even if they refresh or never finish.
          roll(); setRun(true);
          api.post("/users/onboarded").catch(() => { /* non-fatal */ });
          try { localStorage.setItem(DONE_KEY, "1"); } catch { /* ignore */ }
        })
        .catch(() => { /* can't confirm → don't auto-show, avoid spamming */ });
    }
    return () => { alive = false; window.removeEventListener("neov6:start-tour", onStart); };
  }, []);

  const finish = useCallback(() => {
    setRun(false);
    try { localStorage.setItem(DONE_KEY, "1"); } catch { /* ignore */ }
  }, []);

  const step = STEPS[i];

  // Navigate to the step's page, then measure its target (retrying while a lazy
  // page mounts). Falls back to a centered card if the target never appears.
  useEffect(() => {
    if (!run || !step) return;
    timers.current.forEach(clearTimeout); timers.current = [];
    const needNav = step.route && location.pathname !== step.route;
    if (needNav) navigate(step.route);
    setRect(null);
    const measure = (attempt = 0) => {
      if (!step.target) return;
      const el = q(step.target);
      if (el) {
        try { el.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" }); } catch { /* ignore */ }
        if (step.apply) { try { step.apply(picks.current); } catch { /* ignore */ } }
        const t = setTimeout(() => { try { setRect(el.getBoundingClientRect()); } catch { setRect(null); } }, 300);
        timers.current.push(t);
      } else if (attempt < 20) {
        const t = setTimeout(() => measure(attempt + 1), 180);
        timers.current.push(t);
      }
    };
    const t0 = setTimeout(() => measure(0), needNav ? 450 : 0);
    timers.current.push(t0);
    return () => { timers.current.forEach(clearTimeout); timers.current = []; };
  }, [run, i, step, location.pathname, navigate]);

  // Keep the spotlight glued to the element, and poll the gate validator. Because
  // the tour is mandatory (no skip), a gated step also unlocks after 90s as a
  // safety valve so a failing backtest or missing element can never trap the user.
  useEffect(() => {
    if (!run || !step) return;
    const startedAt = Date.now();
    const tick = () => {
      if (step.target) { const el = q(step.target); if (el) { try { setRect(el.getBoundingClientRect()); } catch { /* ignore */ } } }
      let ok = step.validate ? !!step.validate() : true;
      if (!ok && Date.now() - startedAt > 90000) ok = true;
      setValid(ok);
    };
    tick();
    const id = setInterval(tick, 300);
    window.addEventListener("resize", tick);
    window.addEventListener("scroll", tick, true);
    return () => { clearInterval(id); window.removeEventListener("resize", tick); window.removeEventListener("scroll", tick, true); };
  }, [run, i, step]);

  if (!run || !step) return null;

  const total = STEPS.length;
  const locked = !!step.validate && !valid;
  const next = () => { if (locked) return; i < total - 1 ? setI(i + 1) : finish(); };
  const back = () => setI(Math.max(0, i - 1));

  const pad = 10;
  const tipStyle = rect
    ? {
        position: "fixed", zIndex: 100000, width: "min(360px, calc(100vw - 24px))",
        top: Math.min(rect.bottom + pad, window.innerHeight - 260),
        left: Math.min(Math.max(12, rect.left), Math.max(12, window.innerWidth - 372)),
      }
    : { position: "fixed", zIndex: 100000, width: "min(440px, calc(100vw - 24px))", top: "50%", left: "50%", transform: "translate(-50%,-50%)" };

  const block = { background: "rgba(0,0,0,0.82)", pointerEvents: "auto", zIndex: 99991 };
  const stop = (e) => e.stopPropagation();
  const interactive = step.interactive && rect;

  return (
    <div className="fixed inset-0 z-[99990]" role="dialog" aria-modal="true" style={{ pointerEvents: interactive ? "none" : "auto" }} onClick={stop}>
      {interactive ? (
        // Four blockers leave a clickable "hole" over the target so the user can
        // actually operate that one control; everything else stays blocked.
        <>
          <div onClick={stop} style={{ ...block, position: "fixed", top: 0, left: 0, right: 0, height: Math.max(0, rect.top - 6) }} />
          <div onClick={stop} style={{ ...block, position: "fixed", top: rect.bottom + 6, left: 0, right: 0, bottom: 0 }} />
          <div onClick={stop} style={{ ...block, position: "fixed", top: rect.top - 6, left: 0, width: Math.max(0, rect.left - 6), height: rect.height + 12 }} />
          <div onClick={stop} style={{ ...block, position: "fixed", top: rect.top - 6, left: rect.right + 6, right: 0, height: rect.height + 12 }} />
          <div style={{ position: "fixed", top: rect.top - 6, left: rect.left - 6, width: rect.width + 12, height: rect.height + 12, border: "2px solid #10b981", borderRadius: 12, pointerEvents: "none", zIndex: 99992, boxShadow: "0 0 0 2px rgba(16,185,129,0.25)", transition: "all 0.2s ease" }} />
        </>
      ) : rect ? (
        <div style={{ position: "fixed", top: rect.top - 6, left: rect.left - 6, width: rect.width + 12, height: rect.height + 12, boxShadow: "0 0 0 9999px rgba(0,0,0,0.82)", borderRadius: 14, border: "2px solid #10b981", pointerEvents: "none", zIndex: 99991, transition: "all 0.25s ease" }} />
      ) : (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.82)", pointerEvents: "none", zIndex: 99991 }} />
      )}

      <div style={{ ...tipStyle, pointerEvents: "auto" }} onClick={stop} className="rounded-2xl border border-emerald-500/30 bg-zinc-900 p-5 shadow-2xl">
        <div className="mb-2 flex items-center gap-2">
          <GraduationCap size={16} className="text-emerald-400" />
          <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Guided tour · {i + 1}/{total}</span>
          <span className="ml-auto text-[9px] font-bold uppercase tracking-widest text-zinc-600">Complete all steps</span>
        </div>
        <h3 className="mb-1.5 text-sm font-black text-white">{step.title}</h3>
        <p className="text-[12px] leading-relaxed text-zinc-300">{typeof step.body === "function" ? step.body(picks.current) : step.body}</p>
        <div className="mt-3 flex flex-wrap gap-1">
          {STEPS.map((_, k) => <span key={k} className={`h-1 w-3.5 rounded-full ${k <= i ? "bg-emerald-500" : "bg-zinc-700"}`} />)}
        </div>
        <div className="mt-4 flex items-center gap-2">
          {i > 0 && (
            <button onClick={back} className="flex items-center gap-1 rounded-lg border border-zinc-700 px-3 py-1.5 text-[11px] font-bold text-zinc-300 transition hover:border-zinc-500">
              <ArrowLeft size={12} /> Back
            </button>
          )}
          {locked && <span className="flex items-center gap-1 text-[10px] font-bold text-amber-400"><Lock size={11} /> {step.target === "lab-run" ? "Run the backtest to continue" : "Make a valid choice to continue"}</span>}
          <button onClick={next} disabled={locked}
            className={`ml-auto flex items-center gap-1 rounded-lg px-4 py-1.5 text-[11px] font-black uppercase tracking-widest transition ${locked ? "cursor-not-allowed bg-zinc-700 text-zinc-500" : "bg-emerald-500 text-black hover:bg-emerald-400"}`}>
            {i < total - 1 ? <>Next <ArrowRight size={12} /></> : "Finish"}
          </button>
        </div>
      </div>
    </div>
  );
}
