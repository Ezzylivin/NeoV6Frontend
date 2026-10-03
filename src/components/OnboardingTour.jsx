// File: src/components/OnboardingTour.jsx
// First-login guided tour — a FORCED walkthrough: a full-screen overlay dims the
// app and blocks every click except the tour's own Next button, so the user can
// only progress by following along (like a game tutorial). It spotlights real
// controls where it can (via [data-tour="..."] anchors) and shows centered cards
// otherwise. Runs automatically on first login, and on demand via the
// "neov6:start-tour" window event (the Help page button fires it).
import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { X, ArrowRight, ArrowLeft, GraduationCap } from "lucide-react";

const DONE_KEY = "neov6_onboarded_v1";
const FLEET = "/dashboard/fleet";

// The full breakdown. `target` spotlights a [data-tour] element; `route` sends
// the user to that page first so the element exists to point at.
const STEPS = [
  {
    title: "Welcome to NeoV6",
    body: "NeoV6 is an automated crypto trading dashboard. It runs a fleet of bots that watch the market and open and close trades for you, using a strategy that was validated on years of historical data. This quick tour shows you everything — you can replay it anytime from the Help page.",
  },
  {
    title: "It's paper money — you can't lose a cent",
    body: "Everything here is PAPER trading: the bots trade a simulated balance against real, live prices. Nothing touches a real exchange or real funds. It's the safe way to see whether the strategy performs before anyone ever considers real capital.",
  },
  {
    title: "Your fleet: two bots per coin",
    body: "Each coin runs a LONG bot (hunts up-trends on the 4-hour chart) and a SHORT bot (hunts down-trends on the daily). Only the side that fits current conditions is allowed to trade — the other waits on the sidelines.",
    route: FLEET,
  },
  {
    title: "The market sets the tilt",
    body: "Bitcoin's trend sets a market 'regime'. RISK-ON: BTC trending up → long bots favored, shorts parked. RISK-OFF: BTC down → shorts favored, longs parked. This keeps the fleet leaning with the market instead of fighting it. The badge up top shows the current regime.",
    route: FLEET,
  },
  {
    title: "Start the fleet here",
    body: "Press Ignite Fleet to spin up every bot. They then run on the server around the clock — you can close the tab and they keep going. Press Stop to shut them down. That's the only button you need to get going.",
    route: FLEET, target: "ignite",
  },
  {
    title: "Risk % per trade",
    body: "This sets how much of each bot's balance a single trade risks, which sizes the position. 1% is the validated default. Because the stop is fixed at entry, your risk per trade is known up front. Lower = safer, higher = bigger swings. While the fleet runs you can apply a change to new entries without restarting.",
    route: FLEET, target: "risk",
  },
  {
    title: "Pyramiding (advanced, optional)",
    body: "Pyramiding lets a bot add positions while a trend keeps confirming — bigger winners, but it's gated: it only turns on for coins that passed the Strategy Lab's hard validation (out-of-sample + cost-stress). Every other coin stays single-leg. Leave it Off unless you've validated it.",
    route: FLEET, target: "pyramiding",
  },
  {
    title: "The emergency kill switch",
    body: "One click halts ALL new entries across the whole fleet. Positions already open keep being managed to their stops — it stops new risk, it doesn't dump your trades. Use it if the market goes wild or you just want everything to pause.",
    route: FLEET, target: "killswitch",
  },
  {
    title: "Readiness meters",
    body: "Each bot shows how close it is to trading. The bar fills as its entry checks turn green; it only hits 100% when every check passes AND a signal is firing. A bot can sit at 95% — all green — and still wait, simply because no fresh signal has appeared. The panel names whatever is holding each bot back.",
    route: FLEET,
  },
  {
    title: "The live chart",
    body: "Pick any coin with the tabs to see its live candles, the bot's entry line and its protective STOP line, plus arrows marking where trades opened and closed. The stop is FIXED at entry and doesn't trail — that's the validated edge: let winners run, cut losers at a set line.",
    route: FLEET,
  },
  {
    title: "Track record & drift monitor",
    body: "The track record shows your fleet's realized return vs simply holding Bitcoin — give it dozens of trades before judging. The drift monitor compares live results to the validated profile and flags DRIFTING if they diverge. Judge the fleet over weeks, never a single hour.",
    route: FLEET,
  },
  {
    title: "Strategy Lab — prove it before you trust it",
    body: "The Strategy Lab backtests the exact fleet logic on historical data and reads the result in plain English. It's where configs (like pyramiding) earn the right to go live — nothing reaches the live fleet until it survives the tests here.",
    target: "nav-lab",
  },
  {
    title: "Help Center — always here",
    body: "The Help Center has a searchable guide to everything, and a button to replay this tour whenever you want. If something ever looks off, that's the place to start.",
    target: "nav-help",
  },
  {
    title: "You're all set",
    body: "That's the whole app. The best way to learn it is to Ignite the fleet and watch: readiness meters fill, trades pop into the feed, and the track record builds. It's paper — explore freely. Good luck!",
    route: FLEET,
  },
];

export default function OnboardingTour() {
  const [run, setRun] = useState(false);
  const [i, setI] = useState(0);
  const [rect, setRect] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();
  const timers = useRef([]);

  useEffect(() => {
    let first = false;
    try { first = !localStorage.getItem(DONE_KEY); } catch { first = false; }
    if (first) setRun(true);
    const onStart = () => { setRect(null); setI(0); setRun(true); };
    window.addEventListener("neov6:start-tour", onStart);
    return () => window.removeEventListener("neov6:start-tour", onStart);
  }, []);

  const finish = useCallback(() => {
    setRun(false);
    try { localStorage.setItem(DONE_KEY, "1"); } catch { /* ignore */ }
  }, []);

  const step = STEPS[i];

  // Navigate to the step's page, then measure its spotlight target (retrying
  // while a lazy-loaded page mounts). Falls back to a centered card if absent.
  useEffect(() => {
    if (!run || !step) return;
    timers.current.forEach(clearTimeout); timers.current = [];
    const needNav = step.route && location.pathname !== step.route;
    if (needNav) navigate(step.route);
    setRect(null);
    const measure = (attempt = 0) => {
      if (!step.target) return;
      const el = document.querySelector(`[data-tour="${step.target}"]`);
      if (el) {
        try { el.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" }); } catch { /* ignore */ }
        const t = setTimeout(() => { try { setRect(el.getBoundingClientRect()); } catch { setRect(null); } }, 300);
        timers.current.push(t);
      } else if (attempt < 15) {
        const t = setTimeout(() => measure(attempt + 1), 180);
        timers.current.push(t);
      }
    };
    const t0 = setTimeout(() => measure(0), needNav ? 400 : 0);
    timers.current.push(t0);
    return () => { timers.current.forEach(clearTimeout); timers.current = []; };
  }, [run, i, step, location.pathname, navigate]);

  // Keep the spotlight glued to the element on scroll/resize.
  useEffect(() => {
    if (!run || !step?.target) return;
    const rem = () => { const el = document.querySelector(`[data-tour="${step.target}"]`); if (el) { try { setRect(el.getBoundingClientRect()); } catch { /* ignore */ } } };
    window.addEventListener("resize", rem);
    window.addEventListener("scroll", rem, true);
    return () => { window.removeEventListener("resize", rem); window.removeEventListener("scroll", rem, true); };
  }, [run, step]);

  if (!run || !step) return null;

  const total = STEPS.length;
  const next = () => (i < total - 1 ? setI(i + 1) : finish());
  const back = () => setI(Math.max(0, i - 1));

  const pad = 10;
  const tipStyle = rect
    ? {
        position: "fixed", zIndex: 100000, width: "min(360px, calc(100vw - 24px))",
        top: Math.min(rect.bottom + pad, window.innerHeight - 250),
        left: Math.min(Math.max(12, rect.left), Math.max(12, window.innerWidth - 372)),
      }
    : { position: "fixed", zIndex: 100000, width: "min(440px, calc(100vw - 24px))", top: "50%", left: "50%", transform: "translate(-50%,-50%)" };

  return (
    // Click-blocker: covers everything so the app behind can't be clicked.
    <div className="fixed inset-0 z-[99990]" style={{ pointerEvents: "auto" }}
         onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
      {rect ? (
        <div style={{
          position: "fixed", top: rect.top - 6, left: rect.left - 6,
          width: rect.width + 12, height: rect.height + 12,
          boxShadow: "0 0 0 9999px rgba(0,0,0,0.82)", borderRadius: 14,
          border: "2px solid #10b981", pointerEvents: "none", zIndex: 99991,
          transition: "all 0.25s ease",
        }} />
      ) : (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.82)", pointerEvents: "none", zIndex: 99991 }} />
      )}

      <div style={tipStyle} className="rounded-2xl border border-emerald-500/30 bg-zinc-900 p-5 shadow-2xl">
        <div className="mb-2 flex items-center gap-2">
          <GraduationCap size={16} className="text-emerald-400" />
          <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Guided tour · {i + 1}/{total}</span>
          <button onClick={finish} className="ml-auto text-zinc-500 transition hover:text-zinc-300" title="End tour"><X size={15} /></button>
        </div>
        <h3 className="mb-1.5 text-sm font-black text-white">{step.title}</h3>
        <p className="text-[12px] leading-relaxed text-zinc-300">{step.body}</p>
        {/* progress dots */}
        <div className="mt-3 flex flex-wrap gap-1">
          {STEPS.map((_, k) => <span key={k} className={`h-1 w-4 rounded-full ${k <= i ? "bg-emerald-500" : "bg-zinc-700"}`} />)}
        </div>
        <div className="mt-4 flex items-center gap-2">
          {i > 0 && (
            <button onClick={back} className="flex items-center gap-1 rounded-lg border border-zinc-700 px-3 py-1.5 text-[11px] font-bold text-zinc-300 transition hover:border-zinc-500">
              <ArrowLeft size={12} /> Back
            </button>
          )}
          <button onClick={finish} className="text-[11px] font-bold text-zinc-500 transition hover:text-zinc-300">Skip tour</button>
          <button onClick={next} className="ml-auto flex items-center gap-1 rounded-lg bg-emerald-500 px-4 py-1.5 text-[11px] font-black uppercase tracking-widest text-black transition hover:bg-emerald-400">
            {i < total - 1 ? <>Next <ArrowRight size={12} /></> : "Finish"}
          </button>
        </div>
      </div>
    </div>
  );
}
