// File: src/pages/FleetCommand.jsx
// Unified Fleet command center — the fleet IS the bot. Validated long + daily-short
// roster across coins, wired into the live chart (coin tabs), with macro-regime
// tilt, a portfolio risk cap, a blended equity curve, a live trade feed, live
// position detail, and the drift monitor. Paper mode, JWT identity (no wallet).
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LiveTradingChart } from "../components/LiveTradingChart.jsx";
import FleetGuide, { STRATEGY_INFO } from "../components/FleetGuide.jsx";
import EvidencePanel from "../components/EvidencePanel.jsx";
import RealityCheck from "../components/RealityCheck.jsx";
import ReadinessScorecard from "../components/ReadinessScorecard.jsx";
import RiskPanel from "../components/RiskPanel.jsx";
import MultiSelect from "../components/MultiSelect.jsx";
import { startFleet, stopFleet, setKillSwitch, setFleetRisk, resetFleetHistory, getFleetStatus, getFleetRegime, getFleetDrift, getFleetBot, getFleetActivity, getFleetEligibility, getFleetLearning } from "../api/fleet.js";
import api from "../api/apiClient.js";
import { io } from "socket.io-client";
import { BACKEND_URL } from "../config/api.js";
import { AreaChart, Area, LineChart, Line, Legend, ResponsiveContainer, YAxis, Tooltip as RTooltip } from "recharts";
import {
  Ship, Play, Square, RefreshCw, Activity, TrendingUp, TrendingDown, ShieldCheck,
  Gauge, Layers, Info, Zap, Radio, Clock, Cpu, Bell, BellOff, Volume2, VolumeX, Ban, Lock, RotateCcw,
} from "lucide-react";
import toast from "react-hot-toast";

// Candles from the Node backend's Binance.US proxy (/api/market/candles),
// returning a plain [{time, open, high, low, close}] array for LiveTradingChart.
const fetchCandles = ({ symbol, timeframe }) =>
  api.get("/market/candles", { params: { symbol, timeframe, limit: 300 } }).then((r) => r.data);

const DEFAULT_SYMBOLS = ["BTC-USD", "ETH-USD", "SOL-USD"];
// The validated universe the fleet can trade (what the Strategy Lab tests on).
const FLEET_UNIVERSE = ["BTC-USD", "ETH-USD", "SOL-USD", "XRP-USD", "DOGE-USD", "ADA-USD", "SUI-USD", "PEPE-USD", "SHIB-USD"];
const fmt = (n, d = 2) =>
  n === null || n === undefined || isNaN(n) ? "–" : Number(n).toLocaleString(undefined, { maximumFractionDigits: d });
const signed = (n, d = 2) => (Number(n) >= 0 ? "+" : "-") + "$" + fmt(Math.abs(Number(n) || 0), d);

const REGIME = {
  risk_on: { cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30", label: "RISK ON", hint: "Longs favored · new shorts held" },
  risk_off: { cls: "bg-rose-500/15 text-rose-400 border-rose-500/30", label: "RISK OFF", hint: "Shorts favored · new longs held" },
  neutral: { cls: "bg-zinc-500/15 text-zinc-400 border-zinc-600/30", label: "NEUTRAL", hint: "Both sides trade on their own trend" },
};
const DRIFT = {
  ON_TRACK: "bg-emerald-500/15 text-emerald-400",
  DRIFTING: "bg-rose-500/15 text-rose-400",
  INSUFFICIENT_DATA: "bg-zinc-500/15 text-zinc-400",
};

// Plain-English translation of each entry gate, so a non-technical user can read
// *why* a bot is holding without knowing what ADX or MACD mean. Keyed by the
// gate's `k` as the engine emits it.
const FRIENDLY_GATE = {
  "Volatility": "the market's too quiet right now to make a move worth the fees",
  "Votes": "the indicators don't agree strongly enough yet",
  "Trend align": "price and the trend aren't pointing the same way",
  "ADX trend": "the trend isn't strong enough to ride yet",
  "Volume": "trading volume is light — not enough conviction behind the move",
  "AI gate": "the model isn't confident enough in this setup",
  "Direction": "this bot trades one direction only, and the market's leaning the other way",
  "Macro tilt": "the market-wide mood (set by Bitcoin) is against this side for now",
  "Cooldown": "it just closed a trade and is taking a short breather",
  "Risk breaker": "loss-protection paused new entries to protect your capital",
  "Signal": "all checks are green — just waiting for a clear entry signal (the market's neutral here)",
};

// What each gate actually CHECKS (neutral), shown as a hover tooltip on the
// Neural Flow chips so users can learn what every ✓/✕ means.
const GATE_INFO = {
  "Volatility": "Is the market moving enough to be worth the fees? (ATR within the healthy band.)",
  "Votes": "Do enough of the strategy signals agree on the same direction?",
  "Trend align": "Is price on the correct side of the 200-EMA for this trade's direction?",
  "ADX trend": "Is the trend strong enough to ride? (ADX above the minimum.)",
  "Volume": "Is there enough trading volume behind the move to trust it?",
  "AI gate": "Is the model's confidence above the entry threshold?",
  "Direction": "Does the current signal match this bot's side? (it trades one direction only.)",
  "Macro tilt": "Does Bitcoin's macro regime (risk-on / risk-off) favor this side right now?",
  "Cooldown": "Has enough time passed since this bot's last trade?",
  "Risk breaker": "Loss protection: the daily-loss and drawdown limits are clear (not tripped).",
  "Signal": "Is a fresh entry signal firing right now?",
};
const gateTitle = (g) => `${GATE_INFO[g.k] || g.k} ${g.ok ? "— ✓ passing" : "— ✕ blocking this entry"}`;

// Build a friendly one-liner for a single leg from its decision snapshot.
// Returns { tone, text } where tone drives the dot color.
function legFriendly(leg, side) {
  const label = side === "long" ? "Long" : "Short";
  if (!leg || leg.status !== "running") return { tone: "idle", text: `${label} bot is idle — not currently running.` };
  const pos = (leg.positions || [])[0];
  if (pos) return { tone: "open", text: `In a ${side} trade from $${fmt(pos.entry)} — riding it until the trend flips or the stop is hit.` };
  const t = leg.thinking;
  if (!t) return { tone: "idle", text: `${label} bot is warming up — no decision yet.` };
  const aligned = (side === "long" && t.sig === 1) || (side === "short" && t.sig === -1);
  if (t.all_pass && aligned) return { tone: "clear", text: `All checks passed — opening a ${side} trade now.` };
  if (t.all_pass) return { tone: "hold", text: `All checks are green, but there's no ${side} signal yet — the market's neutral here, so it's waiting for the setup to appear.` };
  const gates = t.gates || [];
  const passed = gates.filter((g) => g.ok).length;
  const total = gates.length;
  const blockers = gates.filter((g) => !g.ok);
  const first = blockers[0];
  const why = first ? (FRIENDLY_GATE[first.k] || `waiting on ${first.k}`) : "waiting for a cleaner setup";
  const lead = aligned
    ? `A ${side} signal is in, but ${why} — so it's holding to avoid a choppy entry.`
    : `Standing aside — ${why}.`;
  const tail = total
    ? (blockers.length === 1 ? ` Everything else (${passed} of ${total} checks) is green.` : ` ${passed} of ${total} checks are green.`)
    : "";
  return { tone: "hold", text: lead + tail };
}

// Fleet-wide friendly summary from the aggregate status + macro regime.
function fleetFriendly(status, regime) {
  if (!status) return null;
  const n = status.count || 0;
  const open = status.open_positions || 0;
  const st = regime?.state || "neutral";
  const mood =
    st === "risk_on"
      ? "The market is risk-on — Bitcoin is trending up, so the long bots are favored and the short bots are parked on the sidelines."
      : st === "risk_off"
      ? "The market is risk-off — Bitcoin is trending down, so the short bots are favored and the long bots are parked."
      : "The market is neutral — no strong lean, so each bot trades purely on its own coin's trend.";
  const act =
    open > 0
      ? `${open} position${open > 1 ? "s" : ""} open right now.`
      : "No positions open yet — the fleet is waiting for a high-quality setup, which is normal in quiet stretches.";
  return { mood, act, n, open };
}

const TONE_DOT = { open: "bg-sky-400", clear: "bg-emerald-400", hold: "bg-amber-400", idle: "bg-zinc-600" };

// Readiness meter helpers — "how close to trading" = share of entry gates green.
const readinessColor = (p) => (p >= 100 ? "bg-sky-400" : p >= 80 ? "bg-emerald-400" : p >= 50 ? "bg-amber-400" : "bg-zinc-500");
const blockerText = (blocker) => {
  if (!blocker) return "all checks clear — firing";
  if (blocker === "In trade") return "in a trade";
  return FRIENDLY_GATE[blocker] || `waiting on ${blocker}`;
};
// Readiness for one leg: prefer the engine's number, fall back to the gate ratio
// (so it still works before the engine that emits `readiness` is live).
function legReadiness(leg) {
  if (!leg) return null;
  if ((leg.positions || []).length > 0) return 100; // 100% is reserved for an OPEN position
  const t = leg.thinking;
  if (!t) return null;
  // Not in a position: cap at 99 so "ready / firing" never reads 100 before the
  // trade actually opens (100 ⟺ in a trade, matching the open-positions count).
  if (typeof t.readiness === "number") return Math.min(99, t.readiness);
  if (t.all_pass) return 99;
  const g = t.gates || [];
  return g.length ? Math.round((100 * g.filter((x) => x.ok).length) / g.length) : null;
}
function ReadinessBar({ pct }) {
  const p = Math.max(0, Math.min(100, Number(pct) || 0));
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
      <div className={`h-full ${readinessColor(p)} transition-all duration-500`} style={{ width: `${p}%` }} />
    </div>
  );
}

// Tiny inline SVG sparkline for the readiness trend (no chart lib overhead per row).
function Sparkline({ data, color = "#34d399", w = 68, h = 16 }) {
  const ys = (data || []).map(Number).filter((v) => Number.isFinite(v));
  if (ys.length < 2) return <svg width={w} height={h} aria-hidden />;
  const min = Math.min(...ys), max = Math.max(...ys), rng = max - min || 1;
  const pts = ys.map((v, i) => `${(i / (ys.length - 1)) * w},${h - ((v - min) / rng) * (h - 3) - 1.5}`).join(" ");
  return (
    <svg width={w} height={h} className="overflow-visible">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

// Transform the engine's raw trade_history (entry/exit/partial_exit, time in ms)
// into lightweight-charts markers for the on-chart trade history.
const _toSec = (t) => (typeof t === "number" ? Math.floor(t > 1e11 ? t / 1000 : t) : Math.floor(new Date(t).getTime() / 1000));
function toChartMarkers(history) {
  const out = [];
  for (const h of history || []) {
    const t = h.time ?? h.timestamp ?? h.ts;
    if (t == null) continue;
    const sec = _toSec(t);
    if (!Number.isFinite(sec)) continue;
    const isLong = String(h.side || "").toLowerCase() === "long";
    if (h.type === "entry") {
      out.push({ time: sec, position: isLong ? "belowBar" : "aboveBar", color: "#60a5fa", shape: isLong ? "arrowUp" : "arrowDown", text: isLong ? "LONG in" : "SHORT in" });
    } else if (h.type === "exit" || h.type === "partial_exit") {
      const pnl = Number(h.pnl) || 0, win = pnl >= 0, part = h.type === "partial_exit";
      out.push({ time: sec, position: isLong ? "aboveBar" : "belowBar", color: win ? "#34d399" : "#f87171", shape: "circle", text: `${part ? "½ " : ""}${win ? "+" : ""}$${Math.abs(pnl).toFixed(0)}` });
    }
  }
  return out;
}

// Friendly, teachable explanation of why a trade closed — pairs with the learn theme.
const REASON_INFO = {
  "Take Profit":    "hit its profit target",
  "Trailing Stop":  "trailed out — the stop followed price up and locked in the move",
  "Trend Stop":     "the trend-stop triggered (price fell back through the ATR stop)",
  "Signal Flip":    "the trend flipped against it, so it exited to protect the gain",
  "Circuit Breaker":"loss-protection closed it (daily drawdown limit)",
  "Trend Stop / Signal Flip": "the trend ended (stop or signal flip)",
};
const reasonText = (r) => REASON_INFO[r] || (r ? String(r).toLowerCase() : "the exit rule triggered");

// Short relative timestamp for the trade feed, e.g. "just now", "4m ago", "2h ago".
function timeAgo(ms) {
  const t = Number(ms);
  if (!Number.isFinite(t)) return "";
  const s = Math.max(0, (Date.now() - (t > 1e11 ? t : t * 1000)) / 1000);
  if (s < 45) return "just now";
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  return `${Math.round(s / 86400)}d ago`;
}

// Native browser/OS notification (fires even when the tab is backgrounded).
// No-ops unless the user has granted permission.
function notifyBrowser(title, body) {
  try {
    if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
    new Notification(title, { body, icon: "/favicon.ico" });
  } catch { /* ignore */ }
}

// Short WebAudio chime for trade events (no asset needed). win=high, loss=low, entry=mid.
let _audioCtx = null;
function playTone(kind) {
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    _audioCtx = _audioCtx || new AC();
    const ctx = _audioCtx;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = "sine";
    o.frequency.value = kind === "win" ? 660 : kind === "loss" ? 300 : 480;
    g.gain.setValueAtTime(0.0001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.08, ctx.currentTime + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.25);
    o.connect(g); g.connect(ctx.destination);
    o.start(); o.stop(ctx.currentTime + 0.26);
  } catch { /* ignore */ }
}

// Smooth count-up for headline numbers.
function useCountUp(value, ms = 550) {
  const [display, setDisplay] = useState(Number(value) || 0);
  const ref = useRef(Number(value) || 0);
  useEffect(() => {
    const start = ref.current, end = Number(value) || 0;
    if (start === end) { setDisplay(end); return; }
    const t0 = performance.now(); let raf;
    const tick = (t) => {
      const p = Math.min(1, (t - t0) / ms);
      setDisplay(start + (end - start) * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(tick);
      else { ref.current = end; setDisplay(end); }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, ms]);
  return display;
}

const Skeleton = ({ className = "" }) => (
  <div className={`animate-pulse rounded-lg bg-zinc-800/60 ${className}`} />
);

function Stat({ icon: Icon, label, children, sub }) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-zinc-500">
        {Icon && <Icon size={12} />} {label}
      </div>
      <div className="mt-1 text-2xl font-black text-zinc-100">{children}</div>
      {sub && <div className="mt-0.5 text-[11px] text-zinc-500">{sub}</div>}
    </div>
  );
}

function LegCard({ leg, side, price }) {
  const running = leg?.status === "running";
  const pos = (leg?.positions || [])[0];
  const isLong = side === "long";
  const Icon = isLong ? TrendingUp : TrendingDown;
  const c = isLong
    ? { text: "text-emerald-400", border: "border-emerald-500/20", bg: "bg-emerald-500/5", bar: "bg-emerald-400" }
    : { text: "text-rose-400", border: "border-rose-500/20", bg: "bg-rose-500/5", bar: "bg-rose-400" };
  const codes = Object.keys(leg?.signalsMap || {});
  const readiness = legReadiness(leg);

  // live position detail
  let detail = null;
  if (pos && price) {
    const entry = Number(pos.entry), stop = Number(pos.tsl ?? pos.sl);
    const pnlPct = isLong ? ((price - entry) / entry) * 100 : ((entry - price) / entry) * 100;
    const toStopPct = stop ? Math.abs((price - stop) / price) * 100 : null;
    // how close to the stop (0% = at stop, 100% = far). clamp to a 3% band for the bar.
    const stopProgress = toStopPct != null ? Math.max(0, Math.min(100, (toStopPct / 3) * 100)) : 100;
    let held = null;
    try {
      const secs = (Date.now() - new Date(pos.time).getTime()) / 1000;
      if (secs > 0) {
        const h = Math.floor(secs / 3600), m = Math.floor((secs % 3600) / 60);
        held = h > 0 ? `${h}h ${m}m` : `${m}m`;
      }
    } catch { /* ignore */ }
    detail = { pnlPct, toStopPct, stopProgress, held };
  }

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
      <div className="mb-2 flex items-center justify-between">
        <div className={`flex items-center gap-2 ${c.text}`}>
          <Icon size={16} />
          <span className="text-[12px] font-black uppercase tracking-widest">{side}</span>
          <span className="text-[10px] text-zinc-500">{leg?.timeframe || "–"}</span>
        </div>
        <span className={`inline-flex items-center gap-1 text-[10px] font-bold ${running ? "text-emerald-400" : "text-zinc-500"}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${running ? "bg-emerald-400 animate-pulse" : "bg-zinc-600"}`} />
          {running ? "RUNNING" : "IDLE"}
        </span>
      </div>
      {/* Readiness meter — how close this bot is to firing an entry */}
      {running && readiness != null && (
        <div className="mb-2">
          <div className="mb-0.5 flex items-center justify-between text-[9px] uppercase tracking-wide text-zinc-500">
            <span>{pos ? "In trade" : "Readiness to trade"}</span>
            <span className={`font-mono font-bold ${readiness >= 100 ? "text-sky-400" : readiness >= 80 ? "text-emerald-400" : "text-amber-400"}`}>{readiness}%</span>
          </div>
          <ReadinessBar pct={readiness} />
        </div>
      )}
      <div className="grid grid-cols-3 gap-2 text-[11px]">
        <div className="rounded-lg bg-zinc-950/60 p-2">
          <div className="text-zinc-500">Equity</div>
          <div className="font-mono text-zinc-100">${fmt(leg?.balance)}</div>
        </div>
        <div className="rounded-lg bg-zinc-950/60 p-2">
          <div className="text-zinc-500">Unreal.</div>
          <div className={`font-mono ${(leg?.unrealizedPnl ?? 0) >= 0 ? "text-emerald-400" : "text-rose-400"}`}>{signed(leg?.unrealizedPnl ?? 0)}</div>
        </div>
        <div className="rounded-lg bg-zinc-950/60 p-2">
          <div className="text-zinc-500">Win · {leg?.trades ?? 0}t</div>
          <div className="font-mono text-zinc-100">{fmt(leg?.winRate ?? 0, 0)}%</div>
        </div>
      </div>
      {leg?.lastTradeScore?.composite != null && (
        <div className="mt-2 flex items-center justify-between rounded-lg bg-zinc-950/60 px-2.5 py-1.5 text-[10px]"
          title="Trade Quality Score — a 0-100 read of the last entry's setup (market context + bot intelligence + strategy alignment).">
          <span className="text-zinc-500">Last setup quality</span>
          <span className={`font-mono font-black ${leg.lastTradeScore.composite >= 70 ? "text-emerald-400" : leg.lastTradeScore.composite >= 50 ? "text-amber-400" : "text-rose-400"}`}>
            {Math.round(leg.lastTradeScore.composite)}/100{leg.lastTradeScore.verdict ? ` · ${leg.lastTradeScore.verdict}` : ""}
          </span>
        </div>
      )}
      {pos ? (
        <div className={`mt-2 rounded-lg border ${c.border} ${c.bg} p-2.5 text-[11px]`}>
          <div className="flex items-center justify-between">
            <span className="text-zinc-400">Open {pos.type?.toUpperCase()} @ ${fmt(pos.entry)}</span>
            {detail && (
              <span className={`font-mono font-bold ${detail.pnlPct >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                {detail.pnlPct >= 0 ? "+" : ""}{fmt(detail.pnlPct, 2)}%
              </span>
            )}
          </div>
          {detail && (
            <>
              <div className="mt-1.5">
                <div className="mb-0.5 flex justify-between text-[9px] uppercase tracking-wide text-zinc-500">
                  <span>Stop buffer{detail.toStopPct != null ? ` · ${fmt(detail.toStopPct, 2)}%` : ""}</span>
                  {detail.held && <span className="flex items-center gap-1"><Clock size={9} /> {detail.held}</span>}
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
                  <div className={`h-full ${c.bar} transition-all`} style={{ width: `${detail.stopProgress}%` }} />
                </div>
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="mt-2 rounded-lg border border-zinc-800 bg-zinc-950/40 p-2.5 text-[11px] text-zinc-500">
          <span className="text-zinc-400">{leg?.regimeTitle || "Standing guard"}</span>
          <div className="mt-0.5 text-[10px]">{leg?.regimeDesc || "No open position — waiting for a valid setup."}</div>
        </div>
      )}
      {codes.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {codes.map((c2) => (
            <span
              key={c2}
              title={STRATEGY_INFO[c2] ? `${STRATEGY_INFO[c2].title}: ${STRATEGY_INFO[c2].text}` : c2}
              className="cursor-help rounded-full bg-zinc-800/80 px-2 py-0.5 text-[9px] font-mono text-zinc-400 underline decoration-dotted decoration-zinc-600 underline-offset-2"
            >{c2}</span>
          ))}
        </div>
      )}
    </div>
  );
}

// Live "neural flow" for one leg: the signal + the entry-gate checklist showing
// exactly which condition is holding (or that it's clear to enter).
function GateFlow({ leg, side }) {
  const t = leg?.thinking;
  const isLong = side === "long";
  const c = isLong ? "text-emerald-400" : "text-rose-400";
  if (!t) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-3 text-[11px] text-zinc-500">
        <span className={`font-black uppercase tracking-widest ${c}`}>{side}</span> — warming up… no decision snapshot yet (bot idle or just started).
      </div>
    );
  }
  const firstBlock = (t.gates || []).find((g) => !g.ok);
  const sigCls = t.sig === 1 ? "bg-emerald-500/15 text-emerald-400" : t.sig === -1 ? "bg-rose-500/15 text-rose-400" : "bg-zinc-500/15 text-zinc-400";
  const friendly = legFriendly(leg, side);
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className={`text-[11px] font-black uppercase tracking-widest ${c}`}>{side}</span>
        <div className="flex items-center gap-2">
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${sigCls}`}>{t.signal}</span>
          <span className="text-[10px] text-zinc-500">conf {t.score}%</span>
        </div>
      </div>
      {/* Friendly, plain-English explanation — leads so non-technical users get it first. */}
      <div className="mb-2 flex items-start gap-2 rounded-lg bg-zinc-900/70 px-2.5 py-2 text-[11px] leading-snug text-zinc-300">
        <span className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${TONE_DOT[friendly.tone] || "bg-zinc-600"}`} />
        <span>{friendly.text}</span>
      </div>
      {/* Technical gate chips underneath for users who want the detail. */}
      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-5">
        {(t.gates || []).map((g) => (
          <div key={g.k} title={gateTitle(g)} className={`flex cursor-help items-center gap-1 rounded-md px-2 py-1 text-[9px] font-semibold ${g.ok ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400 ring-1 ring-rose-500/30"}`}>
            <span>{g.ok ? "✓" : "✕"}</span><span className="truncate">{g.k}</span>
          </div>
        ))}
      </div>
      {!t.all_pass && firstBlock && (
        <div className="mt-1.5 text-[10px] text-zinc-600">Technical: blocked by <b className="text-rose-400/80">{firstBlock.k}</b>.</div>
      )}
    </div>
  );
}

export default function FleetCommand() {
  const [symbols, setSymbols] = useState(DEFAULT_SYMBOLS);
  const [capital, setCapital] = useState(1000);
  const [maxDd, setMaxDd] = useState(20);
  const [conviction, setConviction] = useState(false);
  const [longOnly, setLongOnly] = useState(true); // SPOT (long-only) by default — recommended/safe
  // % of each bot's capital risked per trade. Persisted so it survives reloads
  // (it used to reset to the 1% default on every refresh), and applied to the
  // bots only at ignite.
  const [riskPct, setRiskPct] = useState(() => {
    try { const v = localStorage.getItem("neov6_riskPct"); return v != null && v !== "" ? v : 1; } catch { return 1; }
  });
  const [maxLegs, setMaxLegs] = useState(1);        // pyramiding legs (only applied to validation-cleared coins)
  const [eligibility, setEligibility] = useState(null); // validation registry: which coins are cleared to pyramid
  const [learning, setLearning] = useState(null);   // self-learning ledger status (models + per-coin progress)
  const [goLiveStage, setGoLiveStage] = useState(null); // null | "warn" | "steps" — the Go-Live readiness gate modal

  const [status, setStatus] = useState(null);
  const [regime, setRegime] = useState(null);
  const [drift, setDrift] = useState(null);
  const [activity, setActivity] = useState([]);
  const [equityHist, setEquityHist] = useState([]);
  const [busy, setBusy] = useState(false);
  const [updatedAt, setUpdatedAt] = useState(null);
  const [ledger, setLedger] = useState(null);   // durable closed-trade track record
  const [online, setOnline] = useState(true);    // engine reachable on last poll
  const [btcRef, setBtcRef] = useState([]);       // BTC daily candles for the buy-&-hold benchmark
  const [socketLive, setSocketLive] = useState(false); // real-time push connected
  const nudgeTimer = useRef(null);               // debounces socket-triggered refreshes
  const [notifPerm, setNotifPerm] = useState(typeof Notification !== "undefined" ? Notification.permission : "unsupported");
  const enableNotifs = async () => {
    try { const p = await Notification.requestPermission(); setNotifPerm(p); } catch { /* ignore */ }
  };
  const [soundOn, setSoundOn] = useState(() => { try { return localStorage.getItem("fleetSound") === "1"; } catch { return false; } });
  const toggleSound = () => setSoundOn((s) => { const n = !s; try { localStorage.setItem("fleetSound", n ? "1" : "0"); } catch { /* ignore */ } return n; });
  const soundOnRef = useRef(soundOn);
  useEffect(() => { soundOnRef.current = soundOn; }, [soundOn]);
  // Remember the chosen risk % across reloads (was resetting to 1% every refresh).
  useEffect(() => { try { localStorage.setItem("neov6_riskPct", String(riskPct)); } catch { /* ignore */ } }, [riskPct]);
  const equityHistByBot = useRef({}); // { botId: [balance,…] } for per-bot equity sparklines

  const [coin, setCoin] = useState("BTC-USD");
  const [chartTf, setChartTf] = useState("4h");
  const [candles, setCandles] = useState([]);
  const [legs, setLegs] = useState({ long: null, short: null });

  const poll = useRef(null);
  const selRef = useRef(`${coin}|${chartTf}`); // latest coin+tf the user wants charted — guards against a stale in-flight candle fetch repainting the OLD coin under the NEW tab
  const seenTrades = useRef(null); // Set of trade ids already toasted
  const prevDrift = useRef(null);  // last drift status, to catch the flip into DRIFTING
  const [driftAlertOpen, setDriftAlertOpen] = useState(false);
  const readinessHist = useRef({}); // { botId: [readiness,…] } for the trend sparkline
  const lastCloseTs = useRef(null); // newest ledger close seen, to pop the post-mortem
  const [postmortem, setPostmortem] = useState(null); // latest closed-trade recap

  const coinPrice = candles.length ? candles[candles.length - 1]?.close : null;

  const coins = useMemo(() => {
    const live = Array.from(new Set((status?.bots || []).map((b) => b.symbol).filter(Boolean)));
    if (live.length) return live;
    return symbols;
  }, [status, symbols]);

  useEffect(() => { if (coins.length && !coins.includes(coin)) setCoin(coins[0]); }, [coins, coin]);

  const refreshFleet = useCallback(async () => {
    try {
      const [st, rg, dr, act, led] = await Promise.all([
        getFleetStatus(), getFleetRegime(), getFleetDrift(), getFleetActivity(20).catch(() => ({ events: [] })),
        api.get("/ledger/stats", { params: { recent: 500 } }).then((r) => r.data).catch(() => null),
      ]);
      setStatus(st); setRegime(rg); setDrift(dr); setUpdatedAt(Date.now());
      setOnline(true);
      if (led) setLedger(led);
      // Accumulate each bot's readiness for the trend sparkline (client-side ring buffer).
      for (const b of st?.bots || []) {
        if (typeof b.readiness === "number") {
          const arr = readinessHist.current[b.id] || [];
          arr.push(b.readiness);
          readinessHist.current[b.id] = arr.slice(-40);
        }
        if (b.balance != null) {
          const eq = equityHistByBot.current[b.id] || [];
          eq.push(Number(b.balance));
          equityHistByBot.current[b.id] = eq.slice(-40);
        }
      }
      // Pop a post-mortem when a NEW trade closes (seed silently on first load).
      const newest = led?.cum_pnl?.length ? led.recent?.[0] : null;
      if (newest?.ts) {
        if (lastCloseTs.current === null) lastCloseTs.current = newest.ts;
        else if (newest.ts !== lastCloseTs.current) { lastCloseTs.current = newest.ts; setPostmortem(newest); }
      }
      // Drift tripwire: alert the moment live results flip to DRIFTING (the real
      // "markets are changing" signal — it watches live behavior, not a backtest).
      const ds = dr?.status;
      if (prevDrift.current && prevDrift.current !== "DRIFTING" && ds === "DRIFTING") {
        setDriftAlertOpen(true);
        toast.error("⚠️ Drift alert — live results are diverging from the validated profile. Review before adding capital.",
          { duration: 14000, style: { background: "#1c1012", color: "#fca5a5", border: "1px solid #7f1d1d", fontSize: "12px" } });
      }
      if (ds && ds !== "DRIFTING") setDriftAlertOpen(false); // cleared → hide the banner
      prevDrift.current = ds;
      if (st?.total_balance != null) {
        setEquityHist((h) => [...h, { t: Date.now(), eq: st.total_balance }].slice(-120));
      }
      const events = act?.events || [];
      setActivity(events);
      // Alert on genuinely-new activity (seed silently on first load). Entries AND
      // exits both toast, and the chart auto-switches to the coin of the latest action.
      if (seenTrades.current === null) {
        seenTrades.current = new Set(events.map((e) => e.id));
      } else {
        let latestNew = null;
        for (const e of events) {
          if (seenTrades.current.has(e.id)) continue;
          seenTrades.current.add(e.id);
          if (!latestNew) latestNew = e; // events are newest-first
          const isEntry = (e.action || e.type) === "entry";
          if (isEntry) {
            toast(`🚀 ${e.symbol} ${String(e.side).toUpperCase()} ENTERED @ $${fmt(e.price)}`,
              { style: { background: "#18181b", color: "#60a5fa", border: "1px solid #27272a", fontSize: "12px" } });
            notifyBrowser(`🚀 ${e.symbol} ${String(e.side).toUpperCase()} opened`, `Entered at $${fmt(e.price)}`);
            if (soundOnRef.current) playTone("entry");
          } else {
            const win = Number(e.pnl) >= 0;
            if (soundOnRef.current) playTone(win ? "win" : "loss");
            toast(`${win ? "🟢" : "🔴"} ${e.symbol} ${String(e.side).toUpperCase()} closed ${signed(e.pnl)} · ${e.reason || ""}`,
              { style: { background: "#18181b", color: win ? "#34d399" : "#f87171", border: "1px solid #27272a", fontSize: "12px" } });
            notifyBrowser(`${win ? "🟢 Win" : "🔴 Loss"} · ${e.symbol} ${String(e.side).toUpperCase()} closed`, `${signed(e.pnl)}${e.reason ? ` · ${e.reason}` : ""}`);
          }
        }
        // Auto-render the chart to where the newest action just happened.
        if (latestNew?.symbol) setCoin(latestNew.symbol);
      }
    } catch (e) { setOnline(false); /* engine unreachable this poll */ }
  }, []);

  const refreshCoin = useCallback(async () => {
    if (!coin) return;
    // Stamp the selection this call is for. If the user switches coin/timeframe
    // (or the auto-switch fires) while these requests are in flight, a later
    // refreshCoin stamps a new value and this one's response is discarded below —
    // otherwise a slow BTC fetch could land after the ETH switch and paint BTC
    // candles under the ETH tab (the "chart looks off" bug).
    const want = `${coin}|${chartTf}`;
    selRef.current = want;
    try {
      const [cd, lg, sh] = await Promise.all([
        fetchCandles({ symbol: coin, timeframe: chartTf }).catch(() => []),
        getFleetBot(coin, "long").catch(() => null),
        getFleetBot(coin, "short").catch(() => null),
      ]);
      if (selRef.current !== want) return; // superseded by a newer selection — drop this stale response
      setCandles(Array.isArray(cd) ? cd : (cd?.data || []));
      setLegs({ long: lg, short: sh });
    } catch (e) { /* transient */ }
  }, [coin, chartTf]);

  // Blank the chart state the moment the coin/timeframe changes so the freshly
  // re-keyed <LiveTradingChart> never shows the previous coin's candles while the
  // new fetch is in flight. refreshCoin (below) refills it within ~1s.
  useEffect(() => { setCandles([]); setLegs({ long: null, short: null }); }, [coin, chartTf]);

  useEffect(() => {
    refreshFleet(); refreshCoin();
    poll.current = setInterval(() => { refreshFleet(); refreshCoin(); }, 12000);
    return () => clearInterval(poll.current);
  }, [refreshFleet, refreshCoin]);

  // Real-time: subscribe to the backend's live push (engine → Node → socket) and
  // NUDGE a refresh on any bot event, so meters/toasts/post-mortems react within
  // ~1s instead of waiting up to 12s. Polling stays as the fallback source of
  // truth, so a dropped socket never stalls the page. A burst of 6 bot updates is
  // debounced into a single refresh.
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    let socket;
    try {
      socket = io(BACKEND_URL, { auth: { token }, transports: ["websocket"], reconnection: true, reconnectionDelay: 2000, reconnectionDelayMax: 10000 });
    } catch { return; }
    const nudge = () => {
      if (nudgeTimer.current) return;
      nudgeTimer.current = setTimeout(() => { nudgeTimer.current = null; refreshFleet(); refreshCoin(); }, 800);
    };
    socket.on("connect", () => setSocketLive(true));
    socket.on("disconnect", () => setSocketLive(false));
    socket.on("bot_status_update", nudge);
    socket.on("trade_alert", nudge);
    return () => {
      try { socket.off(); socket.disconnect(); } catch { /* ignore */ }
      if (nudgeTimer.current) { clearTimeout(nudgeTimer.current); nudgeTimer.current = null; }
      setSocketLive(false);
    };
  }, [refreshFleet, refreshCoin]);

  // BTC daily candles once, for the buy-&-hold benchmark on the track record.
  useEffect(() => {
    fetchCandles({ symbol: "BTC-USD", timeframe: "1d" })
      .then((c) => setBtcRef(Array.isArray(c) ? c : (c?.data || [])))
      .catch(() => {});
  }, []);

  // Validation registry — which coins the Strategy Lab cleared for live pyramiding.
  useEffect(() => { getFleetEligibility().then(setEligibility).catch(() => {}); }, []);
  // Self-learning ledger status (models trained from the fleet's own trades).
  useEffect(() => {
    const load = () => getFleetLearning().then(setLearning).catch(() => {});
    load();
    const t = setInterval(load, 120000);
    return () => clearInterval(t);
  }, []);

  // Quick-start presets — one click sets risk cap, mode and sizing (doesn't auto-start).
  const applyPreset = (p) => {
    if (p === "cons") { setMaxDd(10); setRiskPct(0.5); setLongOnly(true); setConviction(false); }
    else if (p === "bal") { setMaxDd(20); setRiskPct(1); setLongOnly(true); setConviction(true); }
    else if (p === "agg") { setMaxDd(30); setRiskPct(2); setLongOnly(false); setConviction(true); }
  };

  // Export the closed-trade ledger to CSV (owns-your-data).
  const downloadTradesCsv = () => {
    const rows = trackRec?.recent || [];
    if (!rows.length) return;
    const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const head = ["time", "symbol", "direction", "entry_price", "exit_price", "pnl", "reason"];
    const body = rows.map((r) => [r.ts, r.symbol, r.direction, r.entry_price, r.exit_price, r.pnl, r.reason].map(esc).join(","));
    const csv = [head.join(","), ...body].join("\n");
    try {
      const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
      const a = document.createElement("a");
      a.href = url; a.download = `neov6-trades-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
    } catch { /* ignore */ }
  };

  const onStart = async () => {
    setBusy(true);
    try {
      const body = {
        symbols: (symbols && symbols.length) ? symbols : DEFAULT_SYMBOLS,
        capitalEach: Number(capital) || 1000,
        fleetMaxDrawdownPct: Number(maxDd) || 20,
        sizeByConviction: !!conviction,
        longOnly: !!longOnly,
        riskPct: Number(riskPct) || 1,
        maxLegs: Number(maxLegs) || 1,
      };
      const r = await startFleet(body);
      toast.success(`Fleet ignited — ${r.count} bots running (${longOnly ? "spot · long only" : "long + short"})`);
      await refreshFleet();
    } catch (e) { toast.error(e?.response?.data?.error || "Failed to start fleet"); }
    finally { setBusy(false); }
  };

  const [applyingRisk, setApplyingRisk] = useState(false);
  const onApplyRisk = async () => {
    const rp = Number(riskPct);
    if (!Number.isFinite(rp)) { toast.error("Enter a valid risk %"); return; }
    setApplyingRisk(true);
    try {
      const r = await setFleetRisk(rp);
      toast.success(`Risk set to ${fmt(r.risk_pct ?? rp, r.risk_pct % 1 ? 1 : 0)}% on ${r.updated ?? 0} bots — new entries only`);
      refreshFleet();
    } catch (e) { toast.error(e?.response?.data?.error || "Couldn't update risk on the running fleet"); }
    finally { setApplyingRisk(false); }
  };

  const [resetting, setResetting] = useState(false);
  const onResetHistory = async () => {
    if (!window.confirm("Reset the ENTIRE trading session?\n\nThis STOPS every bot, discards their paper positions, and permanently clears all trade history + the Track Record (live feed, chart markers, drift, equity curve, and the saved ledger).\n\nYou'll start from a clean slate — re-ignite when you're ready. This cannot be undone.")) return;
    setResetting(true);
    try {
      const r = await resetFleetHistory();        // clear ledger + in-memory history
      try { await stopFleet(); } catch { /* may already be stopped */ }
      toast.success(`Trading session reset — fleet stopped, ${r.ledger_removed ?? 0} trades cleared`);
      setEquityHist([]); setActivity([]); setLedger(null); setStatus(null); setDrift(null);
      seenTrades.current = null; lastCloseTs.current = null;
      refreshFleet();
      api.get("/ledger/stats", { params: { recent: 500 } }).then((res) => setLedger(res.data)).catch(() => {});
    } catch (e) { toast.error(e?.response?.data?.error || "Reset failed"); }
    finally { setResetting(false); }
  };

  const onKill = async (on) => {
    if (on && !window.confirm("Engage the kill switch? This immediately halts ALL new entries across the engine (open positions stay managed by their stops).")) return;
    try {
      await setKillSwitch(on);
      toast(on ? "🛑 Kill switch ENGAGED — new entries halted" : "✅ Kill switch released — entries resume",
        { style: { background: "#18181b", color: on ? "#f87171" : "#34d399", border: "1px solid #27272a", fontSize: "12px" } });
      refreshFleet();
    } catch (e) { toast.error(e?.response?.data?.error || "Kill switch failed"); }
  };

  const onStop = async () => {
    if (!window.confirm("Stop the entire fleet?")) return;
    setBusy(true);
    try {
      const r = await stopFleet();
      toast.success(`Fleet stopped — ${r.count} bots`);
      await refreshFleet();
    } catch (e) { toast.error(e?.response?.data?.error || "Failed to stop fleet"); }
    finally { setBusy(false); }
  };

  const running = (status?.count || 0) > 0;
  // Coins the Strategy Lab cleared to pyramid at the chosen leg count (4h regime/trend_ride LONG).
  const eligKey = `4h:regime:LONG:trend_ride:legs${Number(maxLegs)}`;
  const clearedCoins = eligibility?.registry?.[eligKey]?.cleared_coins || [];
  // "All tests passed" = the Strategy Lab's hard validation returned ROBUST for
  // at least one validated config. Gates the Go-Live readiness button.
  const testsPassed = !!(eligibility?.registry && Object.values(eligibility.registry).some((r) => r?.verdict === "ROBUST"));
  // Paper is unlimited for everyone; LIVE requires a paid, live-enabled tier.
  // We read the tier from the cached auth user (role "admin" always allowed).
  const liveTierAllowed = (() => {
    try {
      const u = JSON.parse(localStorage.getItem("user") || "{}") || {};
      if (u.role === "admin") return true;
      return ["trader", "pro", "whale"].includes(u.tier);
    } catch { return false; }
  })();
  const rg = REGIME[regime?.state || "neutral"] || REGIME.neutral;
  const rd = regime?.detail || {};
  const driftStatus = drift?.status || "INSUFFICIENT_DATA";
  // Fleet bots all use the trend_ride exit — NO take-profit cap (they ride to a
  // signal flip, protected only by the fixed ATR stop). Strip any leftover `tp`
  // so the chart never draws a take-profit line the bot will never act on.
  const stripTp = (p) => ({ ...p, tp: undefined });
  const activePositions = [...(legs.long?.positions || []).map(stripTp), ...(legs.short?.positions || []).map(stripTp)];

  // Track record scoped to the FLEET's strategy: exclude the old standard-exit
  // trades (Take Profit / Trailing Stop) that predate the trend_ride fleet, so the
  // record reflects ONLY this strategy's closed trades — no phantom pre-fleet P&L.
  const trackRec = useMemo(() => {
    if (!ledger) return null;
    const recent = (ledger.recent || []).filter((t) => !["Take Profit", "Trailing Stop"].includes(t.reason));
    const asc = [...recent].sort((a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime());
    let cum = 0;
    const cum_pnl = asc.map((t) => { cum += Number(t.pnl) || 0; return { ts: t.ts, cum_pnl: cum }; });
    const wins = recent.filter((t) => Number(t.pnl) > 0).length;
    const total_pnl = recent.reduce((s, t) => s + (Number(t.pnl) || 0), 0);
    return {
      recent, cum_pnl,
      totals: {
        trades: recent.length,
        win_rate: recent.length ? (wins / recent.length) * 100 : 0,
        total_pnl,
        avg_pnl: recent.length ? total_pnl / recent.length : 0,
      },
    };
  }, [ledger]);
  const tradeMarkers = toChartMarkers([...(legs.long?.tradeHistory || []), ...(legs.short?.tradeHistory || [])]);
  const net = drift?.net_pnl ?? 0;
  const animEquity = useCountUp(status?.total_balance ?? 0);
  const unreal = status?.total_unrealized ?? 0;

  return (
    <div className="mx-auto max-w-6xl px-3 py-6 text-zinc-100 sm:px-4">
      {/* Header */}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-2"><Ship size={18} className="text-emerald-400" /></div>
          <div>
            <h1 className="text-xl font-black tracking-tight">Trading Fleet</h1>
            <p className="text-[11px] text-zinc-500">Validated long + daily-short · trend-ride exits · macro-regime tilt · portfolio risk cap</p>
          </div>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-sky-400">Paper</span>
          <span className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-widest ${rg.cls}`} title={rg.hint}>{rg.label}</span>
          <span className={`inline-flex items-center gap-1.5 rounded-full border border-zinc-800 px-3 py-1 text-[10px] font-bold ${running ? "text-emerald-400" : "text-zinc-500"}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${running ? "bg-emerald-400 animate-pulse" : "bg-zinc-600"}`} />{running ? "LIVE" : "IDLE"}
          </span>
          <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-bold ${online ? "border-emerald-500/30 text-emerald-400" : "border-rose-500/40 text-rose-400"}`} title={online ? "Engine reachable" : "Engine not responding — retrying every 12s"}>
            <span className={`h-1.5 w-1.5 rounded-full ${online ? "bg-emerald-400" : "bg-rose-400 animate-pulse"}`} />{online ? "ENGINE OK" : "ENGINE DOWN"}
          </span>
          <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-bold ${socketLive ? "border-sky-500/30 text-sky-400" : "border-zinc-800 text-zinc-500"}`} title={socketLive ? "Real-time push connected — updates arrive instantly" : "Falling back to 12s polling"}>
            <Zap size={11} className={socketLive ? "text-sky-400" : "text-zinc-600"} />{socketLive ? "REAL-TIME" : "POLLING"}
          </span>
          {updatedAt && <span className="rounded-full border border-zinc-800 px-3 py-1 text-[10px] text-zinc-500" title="Auto-refresh 12s">synced {new Date(updatedAt).toLocaleTimeString()}</span>}
          {notifPerm === "granted" ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 px-3 py-1 text-[10px] font-bold text-emerald-400" title="Desktop alerts on — you'll be notified on entries/exits even with the tab in the background"><Bell size={11} /> ALERTS ON</span>
          ) : notifPerm !== "unsupported" && notifPerm !== "denied" ? (
            <button onClick={enableNotifs} className="inline-flex items-center gap-1.5 rounded-full border border-zinc-700 px-3 py-1 text-[10px] font-bold text-zinc-300 hover:border-emerald-500/40 hover:text-emerald-400" title="Get desktop notifications on entries/exits, even when this tab is in the background"><BellOff size={11} /> Enable alerts</button>
          ) : null}
          <button onClick={toggleSound} className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-bold ${soundOn ? "border-sky-500/30 text-sky-400" : "border-zinc-800 text-zinc-500 hover:text-zinc-300"}`} title={soundOn ? "Sound cues on — a chime on each entry/exit" : "Sound cues off"}>
            {soundOn ? <Volume2 size={11} /> : <VolumeX size={11} />}{soundOn ? "SOUND" : "MUTED"}
          </button>
        </div>
      </div>

      {/* Paper / Live mode. Live unlocks only once a paper test has PASSED (the
          Strategy Lab's hard validation returned ROBUST). It never flips real
          money itself — it opens the Go-Live readiness gate and hands off to you. */}
      <div data-tour="mode-toggle" className="mb-5 flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-2xl border border-zinc-800 bg-zinc-900 p-1">
          <button className="rounded-xl bg-sky-500/20 px-6 py-2.5 text-[11px] font-black uppercase tracking-widest text-sky-300"
            title="Paper mode — simulated balance against live prices. Active.">
            Paper
          </button>
          <button
            onClick={() => {
              if (!testsPassed) return;
              if (!liveTierAllowed) { window.location.assign("/dashboard/plans"); return; }
              setGoLiveStage("warn");
            }}
            disabled={!testsPassed}
            title={!testsPassed
              ? "Locked — pass a paper test in the Strategy Lab first (a backtest must return ROBUST)"
              : !liveTierAllowed
                ? "Live trading is a paid plan — upgrade to unlock real-money deployment"
                : "Go Live — review the real-money warning and next steps"}
            className={`ml-1 flex items-center gap-1.5 rounded-xl px-6 py-2.5 text-[11px] font-black uppercase tracking-widest transition ${
              testsPassed
                ? liveTierAllowed
                  ? "border-2 border-rose-500 text-rose-200 animate-pulse hover:bg-rose-500/20"
                  : "border-2 border-amber-500 text-amber-200 hover:bg-amber-500/20"
                : "cursor-not-allowed text-zinc-600"
            }`}
            style={testsPassed && liveTierAllowed ? { boxShadow: "0 0 22px -3px rgba(244,63,94,0.85)" } : undefined}>
            {!testsPassed && <Lock size={11} />} {testsPassed && !liveTierAllowed ? "Upgrade for Live" : "Live"}
          </button>
        </div>
        <span className="max-w-md text-[10px] leading-tight text-zinc-500">
          {!testsPassed
            ? "Live unlocks after a paper test passes — run a backtest in the Strategy Lab until the verdict reads ROBUST."
            : !liveTierAllowed
              ? "A paper test passed. Paper trading is free and unlimited — real-money deployment is a paid plan. Visit Plans to upgrade."
              : "A paper test passed — Live is unlocked. It reviews the risks and hands off to you; the app never trades real funds on its own."}
        </span>
      </div>

      {/* Learn-while-it-trades: how the fleet works + the evidence behind it (collapsible) */}
      <FleetGuide />
      <EvidencePanel />
      <RealityCheck />
      <ReadinessScorecard drift={drift} ledger={ledger} />

      {/* Drift tripwire banner — shown while the fleet is DRIFTING from its validated profile */}
      {driftAlertOpen && driftStatus === "DRIFTING" && (
        <div className="mb-4 flex items-start gap-3 rounded-2xl border border-rose-500/40 bg-rose-500/10 p-4">
          <ShieldCheck size={18} className="mt-0.5 shrink-0 text-rose-400" />
          <div className="flex-1">
            <div className="text-[13px] font-black uppercase tracking-widest text-rose-300">Drift alert</div>
            <p className="mt-0.5 text-[12px] leading-relaxed text-rose-100/90">
              Live paper results are diverging from the validated edge profile{drift?.win_rate != null ? ` (live win ${fmt(drift.win_rate, 0)}%, PF ${fmt(drift.profit_factor, 2)} vs validated ~26-40% / PF 1.2-1.7)` : ""}.
              This is the real "markets have changed" signal — it watches live behavior, not a backtest. Review the roster before adding capital; loss-prevention still halts entries automatically.
            </p>
          </div>
          <button onClick={() => setDriftAlertOpen(false)} className="shrink-0 text-[11px] text-rose-300/70 hover:text-rose-200">dismiss</button>
        </div>
      )}

      {/* Trade post-mortem — friendly recap when a position closes (learn from each trade) */}
      {postmortem && (() => {
        const p = postmortem;
        const win = Number(p.pnl) >= 0;
        const isLong = String(p.direction || "").toLowerCase() === "long";
        const entry = Number(p.entry_price), exit = Number(p.exit_price);
        const movePct = entry ? ((isLong ? (exit - entry) : (entry - exit)) / entry) * 100 : null;
        return (
          <div className={`mb-4 flex items-start gap-3 rounded-2xl border p-4 ${win ? "border-emerald-500/30 bg-emerald-500/5" : "border-rose-500/30 bg-rose-500/5"}`}>
            <div className={`rounded-lg p-1.5 ${win ? "bg-emerald-500/15" : "bg-rose-500/15"}`}>
              {win ? <TrendingUp size={16} className="text-emerald-400" /> : <TrendingDown size={16} className="text-rose-400" />}
            </div>
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[12px] font-black uppercase tracking-widest text-zinc-200">{(p.symbol || "").replace("-USD", "")} {isLong ? "long" : "short"} closed</span>
                <span className={`font-mono text-[13px] font-black ${win ? "text-emerald-400" : "text-rose-400"}`}>{win ? "+" : ""}${fmt(p.pnl)}</span>
                {movePct != null && <span className={`text-[11px] ${win ? "text-emerald-400/80" : "text-rose-400/80"}`}>({movePct >= 0 ? "+" : ""}{fmt(movePct, 2)}%)</span>}
              </div>
              <p className="mt-1 text-[12px] leading-relaxed text-zinc-300">
                It <b className="text-zinc-200">{reasonText(p.reason)}</b> — entered at <b className="text-zinc-200">${fmt(entry)}</b>, exited at <b className="text-zinc-200">${fmt(exit)}</b>.
                {win ? " A winner booked — this is the trend-ride letting a move run." : " A small loss cut by the stop — exactly how the strategy caps downside while winners run bigger."}
              </p>
              <p className="mt-0.5 text-[10px] text-zinc-600">{p.ts ? new Date(p.ts).toLocaleString() : ""}</p>
            </div>
            <button onClick={() => setPostmortem(null)} className="shrink-0 text-[11px] text-zinc-500 hover:text-zinc-300">dismiss</button>
          </div>
        );
      })()}

      {/* Controls */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="text-[10px] uppercase tracking-widest text-zinc-500">Quick preset</span>
          <button onClick={() => applyPreset("cons")} className="rounded-lg border border-zinc-800 px-2.5 py-1 text-[10px] font-bold text-zinc-300 transition hover:border-emerald-500/40 hover:text-emerald-400" title="Max drawdown 10% · Spot (long only) · no conviction sizing">Conservative</button>
          <button onClick={() => applyPreset("bal")} className="rounded-lg border border-zinc-800 px-2.5 py-1 text-[10px] font-bold text-zinc-300 transition hover:border-emerald-500/40 hover:text-emerald-400" title="Max drawdown 20% · Spot (long only) · conviction sizing on">Balanced</button>
          <button onClick={() => applyPreset("agg")} className="rounded-lg border border-zinc-800 px-2.5 py-1 text-[10px] font-bold text-zinc-300 transition hover:border-rose-500/40 hover:text-rose-400" title="Max drawdown 30% · Long + Short (margin) · conviction sizing on">Aggressive</button>
        </div>
        <div className="flex flex-wrap items-end gap-4">
          <label className="flex flex-col gap-1">
            <span className="text-[10px] uppercase tracking-widest text-zinc-500">Symbols</span>
            <div className="w-full min-w-[220px] sm:w-60">
              <MultiSelect options={FLEET_UNIVERSE} selected={symbols}
                onChange={(v) => setSymbols(v.length ? v : DEFAULT_SYMBOLS)} placeholder="Pick coins to trade…" />
            </div>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[10px] uppercase tracking-widest text-zinc-500">Capital / bot</span>
            <input type="number" className="w-28 rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm" value={capital} onChange={(e) => setCapital(e.target.value)} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[10px] uppercase tracking-widest text-zinc-500">Fleet max DD %</span>
            <input type="number" className="w-28 rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm" value={maxDd} onChange={(e) => setMaxDd(e.target.value)} />
          </label>
          <label data-tour="risk" className="flex flex-col gap-1" title="Percent of each bot's capital risked per trade, cut at the ATR stop. 1% is the validated default — lower is safer, higher is more aggressive.">
            <span className="text-[10px] uppercase tracking-widest text-zinc-500">Risk % / trade</span>
            <input type="number" step="0.5" min="0.1" max="20" className="w-28 rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm" value={riskPct} onChange={(e) => { const n = Number(e.target.value); setRiskPct(n > 20 ? 20 : e.target.value); }} />
            {Number(riskPct) > 5 && (
              <span className="max-w-[160px] text-[9px] leading-tight text-rose-400">⚠️ {fmt(Number(riskPct), 0)}% per trade is high — a single stop-out loses that much of a bot's capital. Capped at 20%.</span>
            )}
            {running && (
              <div className="flex max-w-[160px] flex-col gap-1">
                <button type="button" onClick={onApplyRisk} disabled={applyingRisk}
                  className="w-fit rounded-lg border border-emerald-500/40 px-2 py-1 text-[9px] font-black uppercase tracking-widest text-emerald-400 transition hover:bg-emerald-500/10 disabled:opacity-40">
                  {applyingRisk ? "Applying…" : "Apply to running fleet"}
                </button>
                <span className="text-[9px] leading-tight text-zinc-600">Affects new entries only — open positions keep their stop.</span>
              </div>
            )}
          </label>
          <label data-tour="pyramiding" className="flex flex-col gap-1" title="Hold multiple positions per coin, adding a leg only in a confirmed, profitable up-trend (never in chop). Applied ONLY to coins the Strategy Lab cleared via hard validation — others stay single-leg. Risk per trade is split across legs, so total risk is unchanged.">
            <span className="text-[10px] uppercase tracking-widest text-zinc-500">Pyramiding</span>
            <select value={maxLegs} onChange={(e) => setMaxLegs(Number(e.target.value))} className="w-40 rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm">
              <option value={1}>Off · single leg</option>
              <option value={2}>Up to 2 legs</option>
            </select>
            {Number(maxLegs) > 1 && (
              <span className="max-w-[200px] text-[9px] leading-tight text-zinc-500">
                {clearedCoins.length
                  ? <>Validation-cleared to pyramid: <b className="text-emerald-400">{clearedCoins.map((c) => c.replace("-USD", "")).join(", ")}</b>. All other coins stay single-leg.</>
                  : <span className="text-amber-400">No coins cleared for ×{maxLegs} yet — every coin stays single-leg until it passes the Strategy Lab's hard validation.</span>}
              </span>
            )}
          </label>
          <div className="flex flex-col gap-1">
            <span className="text-[10px] uppercase tracking-widest text-zinc-500">Mode</span>
            <div className="flex rounded-xl border border-zinc-800 bg-zinc-950 p-1">
              <button onClick={() => setLongOnly(true)} title="Spot: long positions only — no margin/shorting. The validated edge is the long side; this is the safe, universally-available default."
                className={`rounded-lg px-3 py-1.5 text-[11px] font-bold transition ${longOnly ? "bg-emerald-500/20 text-emerald-400" : "text-zinc-500 hover:text-zinc-300"}`}>Spot · long only</button>
              <button onClick={() => setLongOnly(false)} title="Long + Short: adds the 1d regime-gated SHORT bots as a downside hedge. Requires margin — advanced; carries funding + liquidation risk."
                className={`rounded-lg px-3 py-1.5 text-[11px] font-bold transition ${!longOnly ? "bg-rose-500/20 text-rose-400" : "text-zinc-500 hover:text-zinc-300"}`}>Long + Short</button>
            </div>
          </div>
          <label className="flex cursor-pointer items-center gap-2 pb-2 text-sm text-zinc-300" title="Bet more on high-quality setups, less on weak ones">
            <input type="checkbox" className="accent-emerald-500" checked={conviction} onChange={(e) => setConviction(e.target.checked)} />
            <Gauge size={14} className="text-zinc-500" /> Conviction sizing
          </label>
          <div className="ml-auto flex gap-2 pb-0.5">
            {!running ? (
              <button onClick={onStart} data-tour="ignite" disabled={busy} className="flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-2.5 text-[11px] font-black uppercase tracking-widest text-black hover:bg-emerald-400 disabled:opacity-40"><Play size={13} /> Ignite Fleet</button>
            ) : (
              <button onClick={onStop} disabled={busy} className="flex items-center gap-2 rounded-xl bg-rose-500 px-5 py-2.5 text-[11px] font-black uppercase tracking-widest text-black hover:bg-rose-400 disabled:opacity-40"><Square size={13} /> Stop Fleet</button>
            )}
            <button onClick={() => { refreshFleet(); refreshCoin(); }} className="flex items-center gap-2 rounded-xl border border-zinc-700 px-4 py-2.5 text-[11px] font-bold uppercase tracking-widest text-zinc-300 hover:border-zinc-500"><RefreshCw size={13} /> Sync</button>
            <button onClick={onResetHistory} disabled={resetting} title="Reset the entire trading session — stop all bots, discard their paper positions, and clear all trade history + the Track Record. Start fresh by re-igniting." className="flex items-center gap-2 rounded-xl border border-amber-500/40 px-4 py-2.5 text-[11px] font-bold uppercase tracking-widest text-amber-400 transition hover:bg-amber-500/10 disabled:opacity-40"><RotateCcw size={13} /> {resetting ? "Resetting…" : "Reset session"}</button>
            {status?.kill_switch ? (
              <button onClick={() => onKill(false)} title="Release the kill switch — bots may open new entries again" className="flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-[11px] font-black uppercase tracking-widest text-white hover:bg-rose-500 animate-pulse"><Ban size={13} /> Halted · Release</button>
            ) : (
              <button onClick={() => onKill(true)} data-tour="killswitch" title="Emergency kill switch — immediately halt all NEW entries across the engine" className="flex items-center gap-2 rounded-xl border border-rose-500/40 px-4 py-2.5 text-[11px] font-bold uppercase tracking-widest text-rose-400 hover:bg-rose-500/10"><Ban size={13} /> Kill switch</button>
            )}
          </div>
        </div>
        <div className="mt-3 flex items-start gap-1.5 text-[11px] text-zinc-500">
          <Info size={13} className="mt-0.5 shrink-0" />
          <span>Each coin runs a <b className="text-emerald-400/90">long</b> (4h momentum) and a <b className="text-rose-400/90">short</b> (1d regime) bot with trend-ride exits. The market routes each side — longs fire in up-trends, shorts in down-trends — and the macro gate leans the fleet with BTC. Judge it on the drift monitor over weeks, not any single hour.</span>
        </div>
      </div>

      {/* Risk — how much can actually be lost, from the live fleet + your settings */}
      {goLiveStage && (
        <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/80 p-4" onClick={() => setGoLiveStage(null)}>
          <div className="w-full max-w-lg rounded-2xl border-2 border-rose-500/60 bg-zinc-900 p-6 shadow-2xl" onClick={(e) => e.stopPropagation()} style={{ boxShadow: "0 0 40px -6px rgba(244,63,94,0.6)" }}>
            {goLiveStage === "warn" ? (
              <>
                <h2 className="mb-3 text-lg font-black uppercase tracking-wider text-rose-300">⚠️ Go Live — real money</h2>
                <ul className="space-y-2 text-[12px] leading-relaxed text-zinc-300">
                  <li>• This leaves PAPER mode for <b className="text-rose-300">REAL funds</b>. Losses are real and can be total.</li>
                  <li>• Your fleet needs a genuine track record first — judge it over <b>dozens</b> of closed trades, with the drift monitor green and beating buy-&-hold, over <b>weeks</b>. It is still very early.</li>
                  <li>• NeoV6 will <b className="text-rose-300">not place real orders on its own</b>. Going live requires <b>you</b> to connect your own exchange API keys, and it is done entirely at your own risk.</li>
                  <li>• Never risk money you can't afford to lose. This is not financial advice.</li>
                </ul>
                <div className="mt-5 flex gap-2">
                  <button onClick={() => setGoLiveStage(null)} className="flex-1 rounded-xl border border-zinc-700 py-2.5 text-[11px] font-bold uppercase tracking-widest text-zinc-300 transition hover:border-zinc-500">Cancel — stay on paper</button>
                  <button onClick={() => setGoLiveStage("steps")} className="flex-1 rounded-xl bg-rose-600 py-2.5 text-[11px] font-black uppercase tracking-widest text-white transition hover:bg-rose-500">I understand the risks</button>
                </div>
              </>
            ) : (
              <>
                <h2 className="mb-3 text-lg font-black uppercase tracking-wider text-zinc-100">How to go live (safely)</h2>
                <p className="mb-3 text-[12px] leading-relaxed text-zinc-400">Going live is a deliberate, manual step that you control — the app never connects real funds by itself. When you are truly ready:</p>
                <ol className="space-y-2 text-[12px] leading-relaxed text-zinc-300">
                  <li><b className="text-emerald-400">1.</b> Let the paper fleet build a real track record — dozens of closed trades, drift <b>ON_TRACK</b>, beating buy-&-hold over weeks.</li>
                  <li><b className="text-emerald-400">2.</b> Connect your own exchange API keys in Settings. You enter them yourself — never share keys with anyone, including support.</li>
                  <li><b className="text-emerald-400">3.</b> Start with the smallest size possible, on the validation-cleared coins only.</li>
                  <li><b className="text-emerald-400">4.</b> Keep the kill switch and the fleet drawdown cap within reach at all times.</li>
                </ol>
                <button onClick={() => setGoLiveStage(null)} className="mt-5 w-full rounded-xl bg-zinc-800 py-2.5 text-[11px] font-bold uppercase tracking-widest text-zinc-200 transition hover:bg-zinc-700">Got it — keep me on paper for now</button>
              </>
            )}
          </div>
        </div>
      )}

      <div className="mt-4"><RiskPanel status={status} longOnly={longOnly} capital={capital} maxDd={maxDd} riskPct={riskPct} live={false} /></div>

      {/* Self-learning — the bot trains on its OWN closed trades and skips setups it learns tend to lose */}
      {learning && (
        <div className="mt-4 rounded-2xl border border-violet-500/20 bg-violet-500/5 p-4">
          <div className="mb-1 flex items-center gap-2">
            <Cpu size={14} className="text-violet-400" />
            <h2 className="text-[12px] font-black uppercase tracking-widest text-zinc-300">Self-learning</h2>
            <span className="ml-auto text-[10px] text-zinc-600">
              {learning.models?.length ? `${learning.models.length} model${learning.models.length > 1 ? "s" : ""} active` : "warming up"}
            </span>
          </div>
          <p className="mb-2 text-[10px] leading-relaxed text-zinc-500">
            Each bot trains a model on its <b className="text-zinc-400">own</b> closed trades and skips setups it has learned tend to lose. It switches on per coin once that coin has <b className="text-zinc-400">{learning.min_trades ?? 60}</b> closed trades (and keeps refining every {learning.refresh_hours ?? 6}h).
          </p>
          <div className="flex flex-wrap gap-2">
            {(learning.progress || []).map((p) => {
              const done = p.trades >= p.needed;
              return (
                <div key={p.symbol} className={`rounded-lg border px-2.5 py-1.5 text-[10px] ${done ? "border-violet-500/40 bg-violet-500/10" : "border-zinc-800 bg-zinc-950/60"}`}>
                  <span className="text-zinc-400">{p.symbol.replace("-USD", "")}</span>{" "}
                  <span className={`font-mono font-bold ${done ? "text-violet-300" : "text-zinc-500"}`}>{p.trades}/{p.needed}{done ? " ✓" : ""}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="my-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {!status ? [...Array(5)].map((_, i) => <Skeleton key={i} className="h-[92px]" />) : (<>
          <Stat icon={Layers} label="Bots">{status.count ?? "–"}<span className="ml-1 text-xs font-normal text-zinc-500">{running ? "running" : "idle"}</span></Stat>
          <Stat icon={Activity} label="Combined equity" sub={unreal != null ? `unreal ${signed(unreal)}` : null}>${fmt(animEquity)}</Stat>
          <Stat icon={Zap} label="Open positions">{status.open_positions ?? "–"}</Stat>
          <Stat label="Net P&L (closed)"><span className={net >= 0 ? "text-emerald-400" : "text-rose-400"}>{signed(net)}</span></Stat>
          <Stat icon={ShieldCheck} label="Drift"><span className={`rounded-full px-2.5 py-1 text-xs ${DRIFT[driftStatus] || DRIFT.INSUFFICIENT_DATA}`}>{driftStatus.replace("_", " ")}</span></Stat>
        </>)}
      </div>

      {/* What's happening — plain-English fleet narrator, refreshes every poll */}
      {(() => {
        const ff = fleetFriendly(status, regime);
        if (!ff) return null;
        return (
          <div className="mb-4 rounded-2xl border border-sky-500/20 bg-sky-500/5 p-4">
            <div className="mb-1.5 flex items-center gap-2">
              <Info size={14} className="text-sky-400" />
              <h2 className="text-[12px] font-black uppercase tracking-widest text-sky-300">What's happening</h2>
              {updatedAt && <span className="ml-auto text-[10px] text-zinc-500">as of {new Date(updatedAt).toLocaleTimeString()}</span>}
            </div>
            <p className="text-[13px] leading-relaxed text-zinc-200">{ff.mood}</p>
            <p className="mt-1 text-[12px] leading-relaxed text-zinc-400">
              {ff.n} bot{ff.n === 1 ? "" : "s"} live · {ff.act} These bots only act on high-quality setups, so the best stretches are patient ones — open the <b className="text-zinc-300">Neural flow</b> below to see exactly what each side is waiting on.
            </p>
          </div>
        );
      })()}

      {/* Closest to trading — the fleet ranked by entry readiness */}
      {status?.bots?.length > 0 && (() => {
        const ranked = [...status.bots]
          .filter((b) => (b.status || "running") === "running")
          .map((b) => ({ ...b, _r: typeof b.readiness === "number" ? (b.open_positions > 0 ? 100 : Math.min(99, b.readiness)) : null }))
          .sort((a, b) => (b._r ?? -1) - (a._r ?? -1));
        const haveR = ranked.some((b) => b._r != null);
        return (
          <div className="mb-4 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
            <div className="mb-2 flex items-center gap-2">
              <Gauge size={14} className="text-emerald-400" />
              <h2 className="text-[12px] font-black uppercase tracking-widest text-zinc-300">Closest to trading</h2>
              <span className="ml-auto text-[10px] text-zinc-600">ranked by entry readiness</span>
            </div>
            {!haveR ? (
              <p className="text-[11px] text-zinc-500">Readiness populates once the engine refreshes its decision snapshot (just after the next engine update).</p>
            ) : (
              <div className="space-y-2">
                {ranked.map((b, i) => {
                  const isLong = (b.direction || "").toUpperCase() === "LONG";
                  const dcls = isLong ? "text-emerald-400" : "text-rose-400";
                  const pct = b._r ?? 0;
                  const pcls = pct >= 100 ? "text-sky-400" : pct >= 80 ? "text-emerald-400" : "text-amber-400";
                  return (
                    <div key={b.id} onClick={() => b.symbol && setCoin(b.symbol)}
                         className="flex cursor-pointer items-center gap-3 rounded-lg bg-zinc-950/50 px-2.5 py-2 transition hover:bg-zinc-800/40">
                      <span className="w-4 shrink-0 text-center text-[11px] font-black text-zinc-600">{i + 1}</span>
                      <div className="flex w-24 shrink-0 items-center gap-1.5">
                        <span className="text-[12px] font-bold text-zinc-200">{(b.symbol || "").replace("-USD", "")}</span>
                        <span className={`text-[9px] font-black uppercase ${dcls}`}>{isLong ? "long" : "short"}</span>
                      </div>
                      <div className="flex-1"><ReadinessBar pct={pct} /></div>
                      <span className="hidden shrink-0 sm:block" title="Readiness trend"><Sparkline data={readinessHist.current[b.id]} color={pct >= 100 ? "#38bdf8" : pct >= 80 ? "#34d399" : "#fbbf24"} /></span>
                      <span className={`w-10 shrink-0 text-right font-mono text-[11px] font-bold ${pcls}`}>{pct}%</span>
                      <span className="hidden w-48 shrink-0 truncate text-[10px] text-zinc-500 sm:block" title={blockerText(b.blocker)}>{blockerText(b.blocker)}</span>
                    </div>
                  );
                })}
              </div>
            )}
            <p className="mt-2 text-[10px] text-zinc-600">100% = all entry checks clear (firing). Bars fill as each bot's gates turn green — tap a row to chart that coin.</p>
          </div>
        );
      })()}

      {/* Equity curve */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-[12px] font-black uppercase tracking-widest text-zinc-300">Fleet equity</h2>
          <span className="text-[10px] text-zinc-500">live · this session</span>
        </div>
        <p className="mb-1 text-[10px] leading-relaxed text-zinc-500">Combined live value of all bots (cash + open positions), sampled every 12s. This one resets on reload — the durable record is the Track Record below.</p>
        <div className="h-28 w-full">
          {equityHist.length < 2 ? (
            <div className="flex h-full items-center justify-center text-[11px] text-zinc-600">Building the curve… equity points accrue every 12s.</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={equityHist} margin={{ top: 6, right: 6, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="eqg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#34d399" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#34d399" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <YAxis domain={["dataMin", "dataMax"]} hide />
                <RTooltip contentStyle={{ background: "#09090b", border: "1px solid #27272a", borderRadius: 10, fontSize: 11 }}
                  labelFormatter={() => ""} formatter={(v) => [`$${fmt(v)}`, "equity"]} />
                <Area type="monotone" dataKey="eq" stroke="#34d399" strokeWidth={2} fill="url(#eqg)" isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Durable track record — realized P&L from the persisted trade ledger (survives restarts) */}
      <div className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <ShieldCheck size={14} className="text-emerald-400" />
          <h2 className="text-[12px] font-black uppercase tracking-widest text-zinc-300">Track record</h2>
          <span className="text-[10px] text-zinc-600">this strategy's closed trades · survives restarts</span>
          {trackRec?.totals?.trades > 0 && (
            <div className="ml-auto flex items-center gap-3 text-[11px]">
              <span className="text-zinc-500">{trackRec.totals.trades} trades</span>
              <span className="text-zinc-500">win <b className="text-zinc-200">{fmt(trackRec.totals.win_rate, 0)}%</b></span>
              <span className={trackRec.totals.total_pnl >= 0 ? "text-emerald-400" : "text-rose-400"}>net <b>{signed(trackRec.totals.total_pnl)}</b></span>
              <button onClick={downloadTradesCsv} className="rounded-md border border-zinc-700 px-2 py-0.5 text-[10px] font-bold text-zinc-300 hover:border-zinc-500" title="Download the fleet's closed trades as CSV">CSV</button>
            </div>
          )}
        </div>
        <p className="mb-1 text-[10px] leading-relaxed text-zinc-500">Realized profit from <b className="text-zinc-400">closed</b> trades only (open positions aren't counted yet), compared to simply holding BTC over the same window. Persists across restarts and refreshes.</p>
        {(() => {
          const cumRaw = trackRec?.cum_pnl || [];
          if (!trackRec) return <div className="flex h-28 items-center justify-center text-[11px] text-zinc-600">Loading track record…</div>;
          if (cumRaw.length < 1) return (
            <div className="flex h-28 items-center justify-center px-4 text-center text-[11px] text-zinc-600">
              No closed trades yet — your realized return (vs buy-&amp;-hold) builds here as the fleet closes positions, and it persists across restarts and refreshes.
            </div>
          );
          const base = (status?.count ? status.count * 1000 : 6000) || 6000;
          const toSec = (t) => (typeof t === "number" ? (t > 1e11 ? t / 1000 : t) : new Date(t).getTime() / 1000);
          const btc = btcRef
            .map((c) => ({ t: toSec(c.time), close: Number(c.close) }))
            .filter((x) => Number.isFinite(x.t) && Number.isFinite(x.close))
            .sort((a, b) => a.t - b.t);
          const firstSec = toSec(cumRaw[0].ts);
          const bc0 = btc.length ? (btc.find((x) => x.t >= firstSec) || btc[0]).close : null;
          const btcAt = (sec) => { for (let i = btc.length - 1; i >= 0; i--) if (btc[i].t <= sec) return btc[i].close; return btc[0]?.close; };
          const data = cumRaw.map((p) => {
            const bc = btcAt(toSec(p.ts));
            return { t: p.ts, fleet: (Number(p.cum_pnl) / base) * 100, bh: bc && bc0 ? (bc / bc0 - 1) * 100 : null };
          });
          return (
            <div className="h-36 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data} margin={{ top: 6, right: 6, left: 0, bottom: 0 }}>
                  <YAxis domain={["auto", "auto"]} hide />
                  <RTooltip contentStyle={{ background: "#09090b", border: "1px solid #27272a", borderRadius: 10, fontSize: 11 }}
                    labelFormatter={(l) => new Date(l).toLocaleString()}
                    formatter={(v, n) => [v == null ? "–" : `${Number(v) >= 0 ? "+" : ""}${fmt(v, 2)}%`, n]} />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  <Line type="monotone" dataKey="fleet" name="Fleet" stroke="#34d399" strokeWidth={2} dot={false} isAnimationActive={false} />
                  <Line type="monotone" dataKey="bh" name="BTC hold" stroke="#fbbf24" strokeWidth={2} strokeDasharray="4 3" dot={false} connectNulls isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          );
        })()}
        {/* Honest benchmark: fleet realized return vs simply holding BTC over the same window */}
        {trackRec?.totals?.trades > 0 && btcRef.length >= 2 && (() => {
          const cum = trackRec.cum_pnl || [];
          if (!cum.length) return null;
          const base = (status?.count ? status.count * 1000 : 6000) || 6000;
          const stratPct = (Number(trackRec.totals.total_pnl) / base) * 100;
          const firstTs = new Date(cum[0].ts).getTime() / 1000;
          const pts = btcRef
            .map((c) => ({ t: typeof c.time === "number" ? (c.time > 1e11 ? c.time / 1000 : c.time) : new Date(c.time).getTime() / 1000, close: Number(c.close) }))
            .filter((x) => Number.isFinite(x.t) && Number.isFinite(x.close))
            .sort((a, b) => a.t - b.t);
          const startC = pts.find((x) => x.t >= firstTs) || pts[0];
          const endC = pts[pts.length - 1];
          if (!startC?.close || !endC?.close) return null;
          const bhPct = (endC.close / startC.close - 1) * 100;
          const beat = stratPct >= bhPct;
          return (
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-zinc-800 pt-2 text-[11px]">
              <span className="text-zinc-500">since first trade:</span>
              <span>Fleet <b className={stratPct >= 0 ? "text-emerald-400" : "text-rose-400"}>{stratPct >= 0 ? "+" : ""}{fmt(stratPct, 2)}%</b></span>
              <span>BTC hold <b className={bhPct >= 0 ? "text-emerald-400" : "text-rose-400"}>{bhPct >= 0 ? "+" : ""}{fmt(bhPct, 2)}%</b></span>
              <span className="text-zinc-600">{beat ? "ahead of holding this window" : "the edge is risk-adjusted — it protects in downturns more than it out-runs a bull"}</span>
            </div>
          );
        })()}
      </div>

      {/* Coin tabs + chart */}
      <div className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <div className="flex rounded-xl border border-zinc-800 bg-zinc-950 p-1">
            {coins.map((cc) => (
              <button key={cc} onClick={() => setCoin(cc)} className={`rounded-lg px-3 py-1.5 text-[11px] font-black uppercase tracking-widest transition ${coin === cc ? "bg-zinc-800 text-white" : "text-zinc-500 hover:text-zinc-300"}`}>{cc.replace("-USD", "")}</button>
            ))}
          </div>
          <div className="flex rounded-xl border border-zinc-800 bg-zinc-950 p-1">
            {["4h", "1d"].map((tf) => (
              <button key={tf} onClick={() => setChartTf(tf)} className={`rounded-lg px-3 py-1.5 text-[11px] font-bold uppercase transition ${chartTf === tf ? "bg-zinc-800 text-white" : "text-zinc-500 hover:text-zinc-300"}`}>{tf}</button>
            ))}
          </div>
          <div className="ml-auto flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest">
            <span className="flex items-center gap-1 text-emerald-400"><TrendingUp size={12} /> Long</span>
            <span className="flex items-center gap-1 text-rose-400"><TrendingDown size={12} /> Short</span>
            {coinPrice ? <span className="text-zinc-300">${fmt(coinPrice)}</span> : null}
          </div>
        </div>
        <LiveTradingChart key={`${coin}|${chartTf}`} symbol={coin} timeframe={chartTf} activePositions={activePositions} tradeMarkers={tradeMarkers} candleData={candles} />
        <p className="mt-2 text-[10px] leading-relaxed text-zinc-500">
          Live {chartTf} price candles for {coin.replace("-USD", "")}, overlaid with this bot's <b className="text-zinc-400">entry</b> and protective <b className="text-zinc-400">stop</b> lines plus arrows marking each opened/closed trade. Switch coin or timeframe with the tabs above.
        </p>
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          <LegCard leg={legs.long} side="long" price={coinPrice} />
          <LegCard leg={legs.short} side="short" price={coinPrice} />
        </div>
      </div>

      {/* Neural flow — live decision gate checklist per side */}
      <div className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
        <div className="mb-2 flex items-center gap-2">
          <Cpu size={14} className="text-violet-400" />
          <h2 className="text-[12px] font-black uppercase tracking-widest text-zinc-300">Neural flow · {coin.replace("-USD", "")}</h2>
          <span className="ml-auto text-[10px] text-zinc-600">why each side is / isn't trading</span>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <GateFlow leg={legs.long} side="long" />
          <GateFlow leg={legs.short} side="short" />
        </div>
      </div>

      {/* Trade feed + roster */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-5">
        {/* Live trade feed */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 lg:col-span-2">
          <div className="mb-1 flex items-center gap-2"><Radio size={14} className="text-emerald-400" /><h2 className="text-[12px] font-black uppercase tracking-widest text-zinc-300">Live trade feed</h2></div>
          <p className="mb-2 text-[10px] leading-relaxed text-zinc-500">Every entry and exit across the fleet, newest first — which coin/side opened or closed, why it closed, and the P&amp;L.</p>
          <div className="max-h-72 space-y-1.5 overflow-y-auto">
            {!activity.length ? (
              <div className="py-8 text-center text-[11px] text-zinc-600">No closed trades yet. Entries and exits stream here as they happen.</div>
            ) : activity.map((e) => {
              const isEntry = (e.action || e.type) === "entry";
              const win = Number(e.pnl) >= 0;
              const dot = isEntry ? "bg-sky-400" : win ? "bg-emerald-400" : "bg-rose-400";
              const isLong = String(e.side).toLowerCase() === "long";
              const entryPx = Number(e.entry), exitPx = Number(e.price);
              const movePct = (!isEntry && Number.isFinite(entryPx) && entryPx > 0 && Number.isFinite(exitPx))
                ? ((isLong ? exitPx - entryPx : entryPx - exitPx) / entryPx) * 100 : null;
              return (
                <div key={e.id} className="rounded-lg bg-zinc-950/50 px-2.5 py-2 text-[11px]">
                  <div className="flex items-center gap-2">
                    <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} />
                    <span className="font-semibold text-zinc-200">{(e.symbol || "").replace("-USD", "")}</span>
                    <span className={`text-[9px] font-black uppercase ${isLong ? "text-emerald-400" : "text-rose-400"}`}>{String(e.side)}</span>
                    <span className={`rounded px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide ${isEntry ? "bg-sky-500/15 text-sky-400" : win ? "bg-emerald-500/15 text-emerald-400" : "bg-rose-500/15 text-rose-400"}`}>{isEntry ? "Opened" : "Closed"}</span>
                    <span className="ml-auto shrink-0 text-[9px] text-zinc-600">{timeAgo(e.time)}</span>
                  </div>
                  <div className="mt-1 flex items-center justify-between gap-2 text-[10px]">
                    {isEntry ? (
                      <span className="text-zinc-500">Entered at <b className="font-mono text-sky-400">${fmt(e.price)}</b></span>
                    ) : (
                      <span className="min-w-0 truncate text-zinc-500">
                        {Number.isFinite(entryPx) && entryPx > 0 ? <>${fmt(entryPx)} → </> : null}
                        <b className="font-mono text-zinc-300">${fmt(exitPx)}</b> · {reasonText(e.reason)}
                      </span>
                    )}
                    {!isEntry && (
                      <span className={`shrink-0 font-mono font-bold ${win ? "text-emerald-400" : "text-rose-400"}`}>
                        {signed(e.pnl)}{movePct != null ? ` (${movePct >= 0 ? "+" : ""}${fmt(movePct, 1)}%)` : ""}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Roster */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 lg:col-span-3">
          <h2 className="mb-2 text-[12px] font-black uppercase tracking-widest text-zinc-300">Fleet roster</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[10px] uppercase tracking-widest text-zinc-500">
                  <th className="py-2 pr-4 text-left">Symbol</th><th className="py-2 pr-4 text-left">Side</th>
                  <th className="py-2 pr-4 text-left">TF</th><th className="py-2 pr-4 text-left">Equity</th>
                  <th className="py-2 pr-4 text-left">Unreal.</th><th className="py-2 pr-4 text-left">Open</th>
                  <th className="py-2 pr-4 text-left">Trend</th>
                </tr>
              </thead>
              <tbody>
                {!status?.bots?.length ? (
                  <tr><td colSpan={7} className="py-4 text-zinc-500">No fleet running. Set symbols and Ignite.</td></tr>
                ) : status.bots.map((b) => {
                  const dir = (b.direction || "").toUpperCase();
                  const dcls = dir === "LONG" ? "text-emerald-400" : dir === "SHORT" ? "text-rose-400" : "text-zinc-400";
                  return (
                    <tr key={b.id} className="cursor-pointer border-t border-zinc-800 hover:bg-zinc-800/30" onClick={() => b.symbol && setCoin(b.symbol)}>
                      <td className="py-2 pr-4">{b.symbol}</td>
                      <td className={`py-2 pr-4 font-bold ${dcls}`}>{dir}</td>
                      <td className="py-2 pr-4 text-zinc-500">{b.timeframe}</td>
                      <td className="py-2 pr-4">${fmt(b.balance)}</td>
                      <td className={`py-2 pr-4 font-mono ${(b.unrealized ?? 0) >= 0 ? "text-emerald-400" : "text-rose-400"}`}>{signed(b.unrealized ?? 0)}</td>
                      <td className="py-2 pr-4">{b.open_positions ?? 0}</td>
                      <td className="py-2 pr-4">{(() => {
                        const eq = equityHistByBot.current[b.id] || [];
                        const up = eq.length > 1 && eq[eq.length - 1] >= eq[0];
                        return <Sparkline data={eq} color={eq.length < 2 ? "#52525b" : up ? "#34d399" : "#f87171"} />;
                      })()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-[11px] text-zinc-600">{drift?.note || "Paper. Drift turns ON_TRACK / DRIFTING once ≥10 closed trades land. Loss-prevention halts entries automatically."}</p>
        </div>
      </div>
    </div>
  );
}
