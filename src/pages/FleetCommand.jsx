// File: src/pages/FleetCommand.jsx
// Unified Fleet command center — replaces the single Live Bot. The fleet IS the
// bot: a validated long + daily-short roster across coins, wired into the live
// chart (coin tabs), with macro-regime tilt, a portfolio risk cap, and the
// paper-vs-validation drift monitor. Paper mode, JWT identity (no wallet).
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LiveTradingChart } from "../components/LiveTradingChart.jsx";
import { startFleet, stopFleet, getFleetStatus, getFleetRegime, getFleetDrift, getFleetBot } from "../api/fleet.js";
import api from "../api/apiClient.js";

// Candles come from the Node backend's Binance.US proxy (/api/market/candles),
// which returns a plain [{time, open, high, low, close}] array — exactly what
// LiveTradingChart wants. (There is no /api/data mount.)
const fetchCandles = ({ symbol, timeframe }) =>
  api.get("/market/candles", { params: { symbol, timeframe, limit: 300 } }).then((r) => r.data);
import {
  Ship, Play, Square, RefreshCw, Activity, TrendingUp, TrendingDown, ShieldCheck,
  Gauge, Layers, Info, Zap,
} from "lucide-react";
import toast from "react-hot-toast";

const DEFAULT_SYMBOLS = "BTC-USD,ETH-USD,SOL-USD";
const fmt = (n, d = 2) =>
  n === null || n === undefined || isNaN(n) ? "–" : Number(n).toLocaleString(undefined, { maximumFractionDigits: d });

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

function Stat({ icon: Icon, label, value, sub, tone = "text-zinc-100" }) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-zinc-500">
        {Icon && <Icon size={12} />} {label}
      </div>
      <div className={`mt-1 text-2xl font-black ${tone}`}>{value}</div>
      {sub && <div className="mt-0.5 text-[11px] text-zinc-500">{sub}</div>}
    </div>
  );
}

function LegCard({ leg, side }) {
  const running = leg?.status === "running";
  const pos = (leg?.positions || [])[0];
  const isLong = side === "long";
  const Icon = isLong ? TrendingUp : TrendingDown;
  // Explicit class strings (Tailwind purges dynamically-built names).
  const c = isLong
    ? { text: "text-emerald-400", border: "border-emerald-500/20", bg: "bg-emerald-500/5" }
    : { text: "text-rose-400", border: "border-rose-500/20", bg: "bg-rose-500/5" };
  const codes = Object.keys(leg?.signalsMap || {});
  return (
    <div className={`rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4`}>
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
      <div className="grid grid-cols-2 gap-2 text-[11px]">
        <div className="rounded-lg bg-zinc-950/60 p-2">
          <div className="text-zinc-500">Balance</div>
          <div className="font-mono text-zinc-100">${fmt(leg?.balance)}</div>
        </div>
        <div className="rounded-lg bg-zinc-950/60 p-2">
          <div className="text-zinc-500">Closed trades</div>
          <div className="font-mono text-zinc-100">{leg?.trades ?? 0}</div>
        </div>
      </div>
      {pos ? (
        <div className={`mt-2 rounded-lg border ${c.border} ${c.bg} p-2 text-[11px]`}>
          <div className="flex justify-between">
            <span className="text-zinc-400">Open {pos.type?.toUpperCase()}</span>
            <span className="font-mono text-zinc-200">@ ${fmt(pos.entry)}</span>
          </div>
          <div className="mt-0.5 flex justify-between text-[10px] text-zinc-500">
            <span>Stop ${fmt(pos.tsl ?? pos.sl)}</span>
            <span>Size {fmt(pos.size, 4)}</span>
          </div>
        </div>
      ) : (
        <div className="mt-2 rounded-lg border border-zinc-800 bg-zinc-950/40 p-2 text-[11px] text-zinc-500">
          No open position — waiting for a valid setup.
        </div>
      )}
      {codes.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {codes.map((c) => (
            <span key={c} className="rounded-full bg-zinc-800/80 px-2 py-0.5 text-[9px] font-mono text-zinc-400">{c}</span>
          ))}
        </div>
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
  const [busy, setBusy] = useState(false);

  const [coin, setCoin] = useState("BTC-USD");
  const [chartTf, setChartTf] = useState("4h");
  const [candles, setCandles] = useState([]);
  const [legs, setLegs] = useState({ long: null, short: null });

  const poll = useRef(null);

  const coins = useMemo(() => {
    const live = Array.from(new Set((status?.bots || []).map((b) => b.symbol).filter(Boolean)));
    if (live.length) return live;
    return symbols.split(",").map((s) => s.trim()).filter(Boolean);
  }, [status, symbols]);

  useEffect(() => {
    if (coins.length && !coins.includes(coin)) setCoin(coins[0]);
  }, [coins, coin]);

  const refreshFleet = useCallback(async () => {
    try {
      const [st, rg, dr] = await Promise.all([getFleetStatus(), getFleetRegime(), getFleetDrift()]);
      setStatus(st); setRegime(rg); setDrift(dr);
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
    } catch (e) {
      toast.error(e?.response?.data?.error || "Failed to start fleet");
    } finally { setBusy(false); }
  };

  const onStop = async () => {
    if (!window.confirm("Stop the entire fleet?")) return;
    setBusy(true);
    try {
      const r = await stopFleet();
      toast.success(`Fleet stopped — ${r.count} bots`);
      await refreshFleet();
    } catch (e) {
      toast.error(e?.response?.data?.error || "Failed to stop fleet");
    } finally { setBusy(false); }
  };

  const running = (status?.count || 0) > 0;
  const rg = REGIME[regime?.state || "neutral"] || REGIME.neutral;
  const rd = regime?.detail || {};
  const driftStatus = drift?.status || "INSUFFICIENT_DATA";

  // merge long + short overlays for the chart
  const activePositions = [...(legs.long?.positions || []), ...(legs.short?.positions || [])];
  const tradeMarkers = [...(legs.long?.tradeMarkers || []), ...(legs.short?.tradeMarkers || [])];

  const net = drift?.net_pnl ?? 0;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 text-zinc-100">
      {/* Header */}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-2">
            <Ship size={18} className="text-emerald-400" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight">Trading Fleet</h1>
            <p className="text-[11px] text-zinc-500">Validated long + daily-short roster · trend-ride exits · macro-regime tilt · portfolio risk cap</p>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-sky-400">Paper</span>
          <span className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-widest ${rg.cls}`} title={rg.hint}>{rg.label}</span>
          <span className={`inline-flex items-center gap-1.5 rounded-full border border-zinc-800 px-3 py-1 text-[10px] font-bold ${running ? "text-emerald-400" : "text-zinc-500"}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${running ? "bg-emerald-400 animate-pulse" : "bg-zinc-600"}`} />
            {running ? "LIVE" : "IDLE"}
          </span>
        </div>
      </div>

      {/* Controls */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
        <div className="flex flex-wrap items-end gap-4">
          <label className="flex flex-col gap-1">
            <span className="text-[10px] uppercase tracking-widest text-zinc-500">Symbols</span>
            <input className="w-60 rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm" value={symbols} onChange={(e) => setSymbols(e.target.value)} />
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
              <button onClick={onStart} disabled={busy} className="flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-2.5 text-[11px] font-black uppercase tracking-widest text-black hover:bg-emerald-400 disabled:opacity-40">
                <Play size={13} /> Ignite Fleet
              </button>
            ) : (
              <button onClick={onStop} disabled={busy} className="flex items-center gap-2 rounded-xl bg-rose-500 px-5 py-2.5 text-[11px] font-black uppercase tracking-widest text-black hover:bg-rose-400 disabled:opacity-40">
                <Square size={13} /> Stop Fleet
              </button>
            )}
            <button onClick={() => { refreshFleet(); refreshCoin(); }} className="flex items-center gap-2 rounded-xl border border-zinc-700 px-4 py-2.5 text-[11px] font-bold uppercase tracking-widest text-zinc-300 hover:border-zinc-500">
              <RefreshCw size={13} /> Sync
            </button>
          </div>
        </div>
        <div className="mt-3 flex items-start gap-1.5 text-[11px] text-zinc-500">
          <Info size={13} className="mt-0.5 shrink-0" />
          <span>Each coin runs a <b className="text-emerald-400/90">long</b> (4h momentum) and a <b className="text-rose-400/90">short</b> (1d regime) bot with trend-ride exits. The market routes each side — longs fire in up-trends, shorts in down-trends — and the macro gate leans the whole fleet with BTC. Judge it on the drift monitor over weeks, not any single hour.</span>
        </div>
      </div>

      {/* Stats */}
      <div className="my-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <Stat icon={Layers} label="Bots" value={status?.count ?? "–"} sub={running ? "running" : "idle"} />
        <Stat icon={Activity} label="Combined balance" value={`$${fmt(status?.total_balance)}`} />
        <Stat icon={Zap} label="Open positions" value={status?.open_positions ?? "–"} />
        <Stat label="Net P&L (closed)" value={`${net >= 0 ? "+" : "-"}$${fmt(Math.abs(net))}`} tone={net >= 0 ? "text-emerald-400" : "text-rose-400"} />
        <Stat icon={ShieldCheck} label="Drift" value={<span className={`rounded-full px-2.5 py-1 text-xs ${DRIFT[driftStatus] || DRIFT.INSUFFICIENT_DATA}`}>{driftStatus.replace("_", " ")}</span>} />
      </div>

      {/* Coin tabs + chart */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <div className="flex rounded-xl border border-zinc-800 bg-zinc-950 p-1">
            {coins.map((c) => (
              <button key={c} onClick={() => setCoin(c)} className={`rounded-lg px-3 py-1.5 text-[11px] font-black uppercase tracking-widest transition ${coin === c ? "bg-zinc-800 text-white" : "text-zinc-500 hover:text-zinc-300"}`}>
                {c.replace("-USD", "")}
              </button>
            ))}
          </div>
          <div className="flex rounded-xl border border-zinc-800 bg-zinc-950 p-1">
            {["4h", "1d"].map((tf) => (
              <button key={tf} onClick={() => setChartTf(tf)} className={`rounded-lg px-3 py-1.5 text-[11px] font-bold uppercase transition ${chartTf === tf ? "bg-zinc-800 text-white" : "text-zinc-500 hover:text-zinc-300"}`}>
                {tf}
              </button>
            ))}
          </div>
          <div className="ml-auto flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest">
            <span className="flex items-center gap-1 text-emerald-400"><TrendingUp size={12} /> Long</span>
            <span className="flex items-center gap-1 text-rose-400"><TrendingDown size={12} /> Short</span>
            {rd.btc_price && <span className="text-zinc-600">BTC ${fmt(rd.btc_price)}</span>}
          </div>
        </div>
        <LiveTradingChart symbol={coin} timeframe={chartTf} activePositions={activePositions} tradeMarkers={tradeMarkers} candleData={candles} />
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          <LegCard leg={legs.long} side="long" />
          <LegCard leg={legs.short} side="short" />
        </div>
      </div>

      {/* Roster */}
      <div className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
        <h2 className="mb-2 text-[12px] font-black uppercase tracking-widest text-zinc-300">Fleet roster</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[10px] uppercase tracking-widest text-zinc-500">
                <th className="py-2 pr-4 text-left">Symbol</th><th className="py-2 pr-4 text-left">Side</th>
                <th className="py-2 pr-4 text-left">TF</th><th className="py-2 pr-4 text-left">Status</th>
                <th className="py-2 pr-4 text-left">Balance</th><th className="py-2 pr-4 text-left">Open</th>
                <th className="py-2 pr-4 text-left">Closed</th>
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
                    <td className="py-2 pr-4 text-zinc-400">{b.status}</td>
                    <td className={`py-2 pr-4 ${b.balance >= 1000 ? "text-emerald-400" : "text-rose-400"}`}>${fmt(b.balance)}</td>
                    <td className="py-2 pr-4">{b.open_positions ?? 0}</td>
                    <td className="py-2 pr-4 text-zinc-500">{b.trades ?? 0}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-[11px] text-zinc-600">
          {drift?.note || "Paper mode. Drift turns ON_TRACK / DRIFTING once ≥10 closed trades land. Loss-prevention (per-bot breakers + fleet cap) halts entries automatically."}
        </p>
      </div>
    </div>
  );
}
