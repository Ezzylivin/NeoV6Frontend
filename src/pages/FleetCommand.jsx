// File: src/pages/FleetCommand.jsx
// Unified Fleet command center — the fleet IS the bot. Validated long + daily-short
// roster across coins, wired into the live chart (coin tabs), with macro-regime
// tilt, a portfolio risk cap, a blended equity curve, a live trade feed, live
// position detail, and the drift monitor. Paper mode, JWT identity (no wallet).
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LiveTradingChart } from "../components/LiveTradingChart.jsx";
import { startFleet, stopFleet, getFleetStatus, getFleetRegime, getFleetDrift, getFleetBot, getFleetActivity } from "../api/fleet.js";
import api from "../api/apiClient.js";
import { AreaChart, Area, ResponsiveContainer, YAxis, Tooltip as RTooltip } from "recharts";
import {
  Ship, Play, Square, RefreshCw, Activity, TrendingUp, TrendingDown, ShieldCheck,
  Gauge, Layers, Info, Zap, Radio, Clock, Cpu,
} from "lucide-react";
import toast from "react-hot-toast";

// Candles from the Node backend's Binance.US proxy (/api/market/candles),
// returning a plain [{time, open, high, low, close}] array for LiveTradingChart.
const fetchCandles = ({ symbol, timeframe }) =>
  api.get("/market/candles", { params: { symbol, timeframe, limit: 300 } }).then((r) => r.data);

const DEFAULT_SYMBOLS = "BTC-USD,ETH-USD,SOL-USD";
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
};

// Build a friendly one-liner for a single leg from its decision snapshot.
// Returns { tone, text } where tone drives the dot color.
function legFriendly(leg, side) {
  const label = side === "long" ? "Long" : "Short";
  if (!leg || leg.status !== "running") return { tone: "idle", text: `${label} bot is idle — not currently running.` };
  const pos = (leg.positions || [])[0];
  if (pos) return { tone: "open", text: `In a ${side} trade from $${fmt(pos.entry)} — riding it until the trend flips or the stop is hit.` };
  const t = leg.thinking;
  if (!t) return { tone: "idle", text: `${label} bot is warming up — no decision yet.` };
  if (t.all_pass) return { tone: "clear", text: `All checks passed — opening a ${side} trade now.` };
  const gates = t.gates || [];
  const passed = gates.filter((g) => g.ok).length;
  const total = gates.length;
  const blockers = gates.filter((g) => !g.ok);
  const first = blockers[0];
  const why = first ? (FRIENDLY_GATE[first.k] || `waiting on ${first.k}`) : "waiting for a cleaner setup";
  const aligned = (side === "long" && t.sig === 1) || (side === "short" && t.sig === -1);
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
  if ((leg.positions || []).length > 0) return 100;
  const t = leg.thinking;
  if (!t) return null;
  if (typeof t.readiness === "number") return t.readiness;
  if (t.all_pass) return 100;
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
            <span key={c2} className="rounded-full bg-zinc-800/80 px-2 py-0.5 text-[9px] font-mono text-zinc-400">{c2}</span>
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
          <div key={g.k} className={`flex items-center gap-1 rounded-md px-2 py-1 text-[9px] font-semibold ${g.ok ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400 ring-1 ring-rose-500/30"}`}>
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

  const [status, setStatus] = useState(null);
  const [regime, setRegime] = useState(null);
  const [drift, setDrift] = useState(null);
  const [activity, setActivity] = useState([]);
  const [equityHist, setEquityHist] = useState([]);
  const [busy, setBusy] = useState(false);
  const [updatedAt, setUpdatedAt] = useState(null);

  const [coin, setCoin] = useState("BTC-USD");
  const [chartTf, setChartTf] = useState("4h");
  const [candles, setCandles] = useState([]);
  const [legs, setLegs] = useState({ long: null, short: null });

  const poll = useRef(null);
  const seenTrades = useRef(null); // Set of trade ids already toasted
  const prevDrift = useRef(null);  // last drift status, to catch the flip into DRIFTING
  const [driftAlertOpen, setDriftAlertOpen] = useState(false);

  const coinPrice = candles.length ? candles[candles.length - 1]?.close : null;

  const coins = useMemo(() => {
    const live = Array.from(new Set((status?.bots || []).map((b) => b.symbol).filter(Boolean)));
    if (live.length) return live;
    return symbols.split(",").map((s) => s.trim()).filter(Boolean);
  }, [status, symbols]);

  useEffect(() => { if (coins.length && !coins.includes(coin)) setCoin(coins[0]); }, [coins, coin]);

  const refreshFleet = useCallback(async () => {
    try {
      const [st, rg, dr, act] = await Promise.all([
        getFleetStatus(), getFleetRegime(), getFleetDrift(), getFleetActivity(20).catch(() => ({ events: [] })),
      ]);
      setStatus(st); setRegime(rg); setDrift(dr); setUpdatedAt(Date.now());
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
          } else {
            const win = Number(e.pnl) >= 0;
            toast(`${win ? "🟢" : "🔴"} ${e.symbol} ${String(e.side).toUpperCase()} closed ${signed(e.pnl)} · ${e.reason || ""}`,
              { style: { background: "#18181b", color: win ? "#34d399" : "#f87171", border: "1px solid #27272a", fontSize: "12px" } });
          }
        }
        // Auto-render the chart to where the newest action just happened.
        if (latestNew?.symbol) setCoin(latestNew.symbol);
      }
    } catch (e) { /* transient */ }
  }, []);

  const refreshCoin = useCallback(async () => {
    if (!coin) return;
    try {
      const [cd, lg, sh] = await Promise.all([
        fetchCandles({ symbol: coin, timeframe: chartTf }).catch(() => []),
        getFleetBot(coin, "long").catch(() => null),
        getFleetBot(coin, "short").catch(() => null),
      ]);
      setCandles(Array.isArray(cd) ? cd : (cd?.data || []));
      setLegs({ long: lg, short: sh });
    } catch (e) { /* transient */ }
  }, [coin, chartTf]);

  useEffect(() => {
    refreshFleet(); refreshCoin();
    poll.current = setInterval(() => { refreshFleet(); refreshCoin(); }, 12000);
    return () => clearInterval(poll.current);
  }, [refreshFleet, refreshCoin]);

  const onStart = async () => {
    setBusy(true);
    try {
      const body = {
        symbols: symbols.split(",").map((s) => s.trim()).filter(Boolean),
        capitalEach: Number(capital) || 1000,
        fleetMaxDrawdownPct: Number(maxDd) || 20,
        sizeByConviction: !!conviction,
      };
      const r = await startFleet(body);
      toast.success(`Fleet ignited — ${r.count} bots running`);
      await refreshFleet();
    } catch (e) { toast.error(e?.response?.data?.error || "Failed to start fleet"); }
    finally { setBusy(false); }
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
  const rg = REGIME[regime?.state || "neutral"] || REGIME.neutral;
  const rd = regime?.detail || {};
  const driftStatus = drift?.status || "INSUFFICIENT_DATA";
  const activePositions = [...(legs.long?.positions || []), ...(legs.short?.positions || [])];
  const tradeMarkers = [...(legs.long?.tradeMarkers || []), ...(legs.short?.tradeMarkers || [])];
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
          {updatedAt && <span className="rounded-full border border-zinc-800 px-3 py-1 text-[10px] text-zinc-500" title="Auto-refresh 12s">synced {new Date(updatedAt).toLocaleTimeString()}</span>}
        </div>
      </div>

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

      {/* Controls */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
        <div className="flex flex-wrap items-end gap-4">
          <label className="flex flex-col gap-1">
            <span className="text-[10px] uppercase tracking-widest text-zinc-500">Symbols</span>
            <input className="w-full min-w-[220px] rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm sm:w-60" value={symbols} onChange={(e) => setSymbols(e.target.value)} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[10px] uppercase tracking-widest text-zinc-500">Capital / bot</span>
            <input type="number" className="w-28 rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm" value={capital} onChange={(e) => setCapital(e.target.value)} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[10px] uppercase tracking-widest text-zinc-500">Fleet max DD %</span>
            <input type="number" className="w-28 rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm" value={maxDd} onChange={(e) => setMaxDd(e.target.value)} />
          </label>
          <label className="flex cursor-pointer items-center gap-2 pb-2 text-sm text-zinc-300" title="Bet more on high-quality setups, less on weak ones">
            <input type="checkbox" className="accent-emerald-500" checked={conviction} onChange={(e) => setConviction(e.target.checked)} />
            <Gauge size={14} className="text-zinc-500" /> Conviction sizing
          </label>
          <div className="ml-auto flex gap-2 pb-0.5">
            {!running ? (
              <button onClick={onStart} disabled={busy} className="flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-2.5 text-[11px] font-black uppercase tracking-widest text-black hover:bg-emerald-400 disabled:opacity-40"><Play size={13} /> Ignite Fleet</button>
            ) : (
              <button onClick={onStop} disabled={busy} className="flex items-center gap-2 rounded-xl bg-rose-500 px-5 py-2.5 text-[11px] font-black uppercase tracking-widest text-black hover:bg-rose-400 disabled:opacity-40"><Square size={13} /> Stop Fleet</button>
            )}
            <button onClick={() => { refreshFleet(); refreshCoin(); }} className="flex items-center gap-2 rounded-xl border border-zinc-700 px-4 py-2.5 text-[11px] font-bold uppercase tracking-widest text-zinc-300 hover:border-zinc-500"><RefreshCw size={13} /> Sync</button>
          </div>
        </div>
        <div className="mt-3 flex items-start gap-1.5 text-[11px] text-zinc-500">
          <Info size={13} className="mt-0.5 shrink-0" />
          <span>Each coin runs a <b className="text-emerald-400/90">long</b> (4h momentum) and a <b className="text-rose-400/90">short</b> (1d regime) bot with trend-ride exits. The market routes each side — longs fire in up-trends, shorts in down-trends — and the macro gate leans the fleet with BTC. Judge it on the drift monitor over weeks, not any single hour.</span>
        </div>
      </div>

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
          .map((b) => ({ ...b, _r: typeof b.readiness === "number" ? b.readiness : null }))
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
        <LiveTradingChart symbol={coin} timeframe={chartTf} activePositions={activePositions} tradeMarkers={tradeMarkers} candleData={candles} />
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
          <div className="mb-2 flex items-center gap-2"><Radio size={14} className="text-emerald-400" /><h2 className="text-[12px] font-black uppercase tracking-widest text-zinc-300">Live trade feed</h2></div>
          <div className="max-h-72 space-y-1.5 overflow-y-auto">
            {!activity.length ? (
              <div className="py-8 text-center text-[11px] text-zinc-600">No closed trades yet. Entries and exits stream here as they happen.</div>
            ) : activity.map((e) => {
              const isEntry = (e.action || e.type) === "entry";
              const win = Number(e.pnl) >= 0;
              const dot = isEntry ? "bg-sky-400" : win ? "bg-emerald-400" : "bg-rose-400";
              return (
                <div key={e.id} className="flex items-center justify-between rounded-lg bg-zinc-950/50 px-2.5 py-2 text-[11px]">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} />
                    <span className="font-semibold text-zinc-200">{e.symbol}</span>
                    <span className="text-zinc-500">{String(e.side).toUpperCase()}</span>
                    <span className="truncate text-zinc-600">{isEntry ? "ENTER" : e.reason}</span>
                  </div>
                  {isEntry
                    ? <span className="font-mono text-sky-400">@ ${fmt(e.price)}</span>
                    : <span className={`font-mono ${win ? "text-emerald-400" : "text-rose-400"}`}>{signed(e.pnl)}</span>}
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
                </tr>
              </thead>
              <tbody>
                {!status?.bots?.length ? (
                  <tr><td colSpan={6} className="py-4 text-zinc-500">No fleet running. Set symbols and Ignite.</td></tr>
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
