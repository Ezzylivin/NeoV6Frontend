// File: src/pages/Backtests.jsx  (route: /dashboard/backtests)
// STRATEGY LAB — a read-only backtester for the ACTUAL fleet logic. It runs the
// same validated simulator the engine uses (regime-gated entries + the
// `trend_ride` fixed-stop exit: hold to signal-flip, no trailing, no TP cap), so
// what you see here is what the live fleet would have traded. It replaces the old
// pick-a-strategy / ML-gate backtester, which simulated exits the fleet never uses.
import React, { useState, useEffect, useMemo } from "react";
import {
  FlaskConical, Play, TrendingUp, Activity, ShieldCheck, Info,
  ArrowUpRight, ArrowDownRight, Gauge, Crown,
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip as RTooltip, ResponsiveContainer,
  ReferenceLine, CartesianGrid,
} from "recharts";
import { getLabOptions, runStrategyLab } from "../api/strategyLab.js";

// ── friendly copy ──────────────────────────────────────────────────────────
const ENTRY_LABEL = {
  regime: "Regime — trend + only when BTC is risk-on",
  trend: "Trend-follow — SuperTrend + EMA cloud",
  momentum: "Momentum — MACD crossover",
};
const STYLE_LABEL = {
  trend_ride: "Trend-ride — hold to signal flip, fixed stop (fleet exit)",
  be_runner: "Breakeven runner — stop to BE at +1R, then trail",
  partial_runner: "Partial runner — scale out ½ at +2R, trail rest",
  fixed_2to1: "Fixed 2:1 — classic take-profit / stop",
  fixed_3to1: "Fixed 3:1 — wider take-profit / stop",
  trail_tight: "Trailing (tight) — 2×ATR trail, no target",
  trail_wide: "Trailing (wide) — 3×ATR trail, no target",
  time_momentum: "Time + momentum — trail with a hard time stop",
};
const styleLabel = (s) => STYLE_LABEL[s] || s;
const entryLabel = (e) => ENTRY_LABEL[e] || e;

const FLEET_STYLES = ["trend_ride", "be_runner", "fixed_2to1", "fixed_3to1", "trail_tight", "trail_wide", "partial_runner", "time_momentum"];

const fmt = (n, d = 2) => (n == null || isNaN(n) ? "–" : Number(n).toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d }));
const pct = (n, d = 2) => (n == null || isNaN(n) ? "–" : `${Number(n) >= 0 ? "+" : ""}${fmt(n, d)}%`);
const shortDate = (t) => { try { return new Date(t).toLocaleDateString(undefined, { year: "2-digit", month: "short", day: "numeric" }); } catch { return String(t); } };

const inputCls = "w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:border-emerald-500 focus:outline-none";
const labelCls = "mb-1 block text-[10px] font-bold uppercase tracking-widest text-zinc-500";

export default function StrategyLab() {
  const [opts, setOpts] = useState(null);
  const [cfg, setCfg] = useState({
    symbol: "BTC-USD", timeframe: "4h", direction: "LONG",
    entry: "regime", style: "trend_ride", riskPct: 1, initialBalance: 1000,
    start: "", end: "",
  });
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    getLabOptions().then(setOpts).catch(() => setOpts(null));
  }, []);

  const symbols = opts?.symbols || ["BTC-USD", "ETH-USD", "SOL-USD", "DOGE-USD", "XRP-USD"];
  const timeframes = opts?.timeframes || ["4h", "1d"];
  const entries = opts?.entries || ["regime", "trend", "momentum"];
  const styles = (opts?.styles || FLEET_STYLES).filter((s) => FLEET_STYLES.includes(s));

  const set = (k, v) => setCfg((c) => ({ ...c, [k]: v }));

  // One click = exactly what the live fleet trades on each side.
  const matchFleet = (side) => setCfg((c) => ({
    ...c, entry: "regime", style: "trend_ride",
    direction: side, timeframe: side === "SHORT" ? "1d" : "4h",
  }));

  const run = async () => {
    setRunning(true); setError(null);
    try {
      const r = await runStrategyLab(cfg);
      if (r?.error) { setError(r.error); setResult(null); }
      else { setResult(r); }
    } catch (e) {
      setError(e?.response?.data?.error || "Backtest failed — the engine may be busy or unreachable.");
      setResult(null);
    } finally { setRunning(false); }
  };

  const m = result?.metrics || {};
  const isFleetCfg = cfg.entry === "regime" && cfg.style === "trend_ride";

  const equityData = useMemo(() => (result?.equity || []).map((p) => ({ t: p.ts, equity: p.equity })), [result]);
  const beatBH = result ? (Number(m.roi) >= Number(result.buy_hold_pct)) : false;

  return (
    <div className="mx-auto max-w-6xl px-3 py-6 text-zinc-100 sm:px-4">
      {/* Header */}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-2"><FlaskConical size={18} className="text-emerald-400" /></div>
        <div>
          <h1 className="text-xl font-black tracking-tight">Strategy Lab</h1>
          <p className="text-[11px] text-zinc-500">Backtest the real fleet logic on historical data — regime entries + the validated trend-ride exit</p>
        </div>
        <span className="ml-auto rounded-full border border-sky-500/30 bg-sky-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-sky-400">Historical · read-only</span>
      </div>

      {/* What this is */}
      <div className="mb-4 flex items-start gap-1.5 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 text-[11px] text-zinc-500">
        <Info size={13} className="mt-0.5 shrink-0 text-zinc-400" />
        <span>This runs the <b className="text-zinc-300">same simulator the live fleet uses</b> over past data — so you can see how a config would have performed before trusting it. The fleet's own setup is <b className="text-emerald-400/90">Regime</b> entry + <b className="text-emerald-400/90">Trend-ride</b> exit (hold until the trend flips, protected by a fixed ATR stop — no trailing, no take-profit cap). It never touches your live bots.</span>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[320px_1fr]">
        {/* ── Config ── */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
          <div className="mb-3 flex gap-2">
            <button onClick={() => matchFleet("LONG")} className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-2 py-2 text-[10px] font-black uppercase tracking-widest text-emerald-400 hover:bg-emerald-500/20"><Crown size={12} /> Fleet long · 4h</button>
            <button onClick={() => matchFleet("SHORT")} className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-2 py-2 text-[10px] font-black uppercase tracking-widest text-rose-400 hover:bg-rose-500/20"><Crown size={12} /> Fleet short · 1d</button>
          </div>

          <div className="space-y-3">
            <div>
              <label className={labelCls}>Coin</label>
              <select value={cfg.symbol} onChange={(e) => set("symbol", e.target.value)} className={inputCls}>
                {symbols.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Timeframe</label>
                <select value={cfg.timeframe} onChange={(e) => set("timeframe", e.target.value)} className={inputCls}>
                  {timeframes.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Direction</label>
                <select value={cfg.direction} onChange={(e) => set("direction", e.target.value)} className={inputCls}>
                  {["LONG", "SHORT", "BOTH"].map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className={labelCls}>Entry signal</label>
              <select value={cfg.entry} onChange={(e) => set("entry", e.target.value)} className={inputCls}>
                {entries.map((e) => <option key={e} value={e}>{entryLabel(e)}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Exit style</label>
              <select value={cfg.style} onChange={(e) => set("style", e.target.value)} className={inputCls}>
                {styles.map((s) => <option key={s} value={s}>{styleLabel(s)}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Risk % / trade</label>
                <input type="number" step="0.5" min="0.1" max="50" value={cfg.riskPct} onChange={(e) => set("riskPct", e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Start capital</label>
                <input type="number" min="100" value={cfg.initialBalance} onChange={(e) => set("initialBalance", e.target.value)} className={inputCls} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>From (optional)</label>
                <input type="date" value={cfg.start} onChange={(e) => set("start", e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>To (optional)</label>
                <input type="date" value={cfg.end} onChange={(e) => set("end", e.target.value)} className={inputCls} />
              </div>
            </div>
            <p className="text-[10px] leading-relaxed text-zinc-600">Leave dates blank to use all available history. {isFleetCfg ? "✓ This is the live fleet's exact config." : "Tip: use a Fleet button above to match the live setup."}</p>

            <button onClick={run} disabled={running} className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 py-3 text-[11px] font-black uppercase tracking-widest text-black transition hover:bg-emerald-400 disabled:opacity-40">
              <Play size={13} /> {running ? "Running backtest…" : "Run backtest"}
            </button>
          </div>
        </div>

        {/* ── Results ── */}
        <div className="space-y-5">
          {error && (
            <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-5 text-[12px] text-rose-300">{error}</div>
          )}

          {!result && !error && (
            <div className="flex h-[360px] flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/20 text-center">
              <FlaskConical size={56} className="mb-4 text-zinc-700" />
              <p className="text-sm font-black uppercase tracking-widest text-zinc-500">Set a config and run</p>
              <p className="mt-2 max-w-sm px-6 text-[11px] text-zinc-600">You'll get the equity curve, every simulated trade, and how it compares to simply holding the coin over the same window.</p>
            </div>
          )}

          {result && (
            <>
              {/* verdict strip */}
              <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
                <span className="text-[11px] font-bold uppercase tracking-widest text-zinc-400">{result.symbol} · {result.timeframe} · {result.direction}</span>
                <span className="text-[10px] text-zinc-600">{entryLabel(result.entry)} · {styleLabel(result.style)}</span>
                {result.window && <span className="ml-auto text-[10px] text-zinc-600">{shortDate(result.window.start)} → {shortDate(result.window.end)} · {result.window.bars} bars</span>}
              </div>

              {/* metrics */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Metric label="Return" value={pct(m.roi)} good={Number(m.roi) >= 0} icon={TrendingUp} />
                <Metric label="Final balance" value={`$${fmt(m.final_balance)}`} sub={`from $${fmt(result.initial_balance, 0)}`} />
                <Metric label="Win rate" value={`${fmt(m.win_rate, 1)}%`} sub={`${m.total_trades} trades`} />
                <Metric label="Profit factor" value={fmt(m.profit_factor)} good={Number(m.profit_factor) >= 1} />
                <Metric label="Expectancy / trade" value={`${Number(m.expectancy_r) >= 0 ? "+" : ""}${fmt(m.expectancy_r, 3)}R`} good={Number(m.expectancy_r) >= 0} />
                <Metric label="Max drawdown" value={`-${fmt(m.max_drawdown, 1)}%`} bad />
                <Metric label="Trades" value={fmt(m.total_trades, 0)} />
                <Metric label="vs Buy & hold" value={pct(result.buy_hold_pct)} good={beatBH} sub={beatBH ? "strategy ahead" : "behind hold"} />
              </div>

              {/* equity curve */}
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
                <div className="mb-2 flex items-center gap-2">
                  <Activity size={14} className="text-emerald-400" />
                  <h2 className="text-[12px] font-black uppercase tracking-widest text-zinc-300">Equity curve</h2>
                  <span className="text-[10px] text-zinc-600">balance after each closed trade · dashed = start capital</span>
                </div>
                {equityData.length < 2 ? (
                  <div className="flex h-48 items-center justify-center text-[11px] text-zinc-600">No trades in this window — the entry never fired. Try a different coin, timeframe, or a wider date range.</div>
                ) : (
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={equityData} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
                        <CartesianGrid stroke="#1e1e22" vertical={false} />
                        <XAxis dataKey="t" tickFormatter={shortDate} stroke="#52525b" fontSize={10} tickLine={false} axisLine={false} minTickGap={40} />
                        <YAxis stroke="#52525b" fontSize={10} tickLine={false} axisLine={false} width={54} domain={["auto", "auto"]} tickFormatter={(v) => `$${fmt(v, 0)}`} />
                        <RTooltip contentStyle={{ background: "#09090b", border: "1px solid #27272a", borderRadius: 10, fontSize: 11 }}
                          labelFormatter={(l) => new Date(l).toLocaleString()} formatter={(v) => [`$${fmt(v)}`, "Equity"]} />
                        <ReferenceLine y={result.initial_balance} stroke="#52525b" strokeDasharray="4 3" />
                        <Line type="monotone" dataKey="equity" stroke={Number(m.roi) >= 0 ? "#34d399" : "#f87171"} strokeWidth={2} dot={false} isAnimationActive={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              {/* trades */}
              {(result.trades || []).length > 0 && (
                <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/60">
                  <div className="flex items-center gap-2 border-b border-zinc-800 bg-zinc-800/20 p-4">
                    <ShieldCheck size={13} className="text-emerald-400" />
                    <h3 className="text-[11px] font-black uppercase tracking-widest text-zinc-400">Simulated trades</h3>
                    <span className="ml-auto text-[10px] text-zinc-600">{result.trades.length} closed</span>
                  </div>
                  <div className="max-h-[360px] overflow-y-auto">
                    <table className="w-full text-left text-[10px]">
                      <thead className="sticky top-0 bg-zinc-900/90 backdrop-blur">
                        <tr className="text-zinc-500">
                          <th className="px-4 py-3 font-black uppercase tracking-tighter">Entered</th>
                          <th className="px-4 py-3 font-black uppercase tracking-tighter">Exited</th>
                          <th className="px-4 py-3 font-black uppercase tracking-tighter">Side</th>
                          <th className="px-4 py-3 text-right font-black uppercase tracking-tighter">Entry</th>
                          <th className="px-4 py-3 text-right font-black uppercase tracking-tighter">Exit</th>
                          <th className="px-4 py-3 text-right font-black uppercase tracking-tighter">P&amp;L</th>
                          <th className="px-4 py-3 text-right font-black uppercase tracking-tighter">R</th>
                          <th className="px-4 py-3 font-black uppercase tracking-tighter">Reason</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-800">
                        {result.trades.map((t, i) => (
                          <tr key={i} className="hover:bg-zinc-800/30">
                            <td className="px-4 py-2.5 font-mono text-zinc-500">{shortDate(t.entry_ts)}</td>
                            <td className="px-4 py-2.5 font-mono text-zinc-500">{shortDate(t.exit_ts)}</td>
                            <td className="px-4 py-2.5">
                              <span className={`inline-flex items-center gap-1 font-black uppercase ${t.direction === "long" ? "text-emerald-400" : "text-amber-400"}`}>
                                {t.direction === "long" ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}{t.direction}
                              </span>
                            </td>
                            <td className="px-4 py-2.5 text-right font-mono text-zinc-300">${fmt(t.entry_price)}</td>
                            <td className="px-4 py-2.5 text-right font-mono text-zinc-300">${fmt(t.exit_price)}</td>
                            <td className={`px-4 py-2.5 text-right font-mono font-black ${t.pnl > 0 ? "text-emerald-400" : t.pnl < 0 ? "text-rose-400" : "text-zinc-500"}`}>{t.pnl >= 0 ? "+" : ""}{fmt(t.pnl)}</td>
                            <td className={`px-4 py-2.5 text-right font-mono ${t.r > 0 ? "text-emerald-400" : t.r < 0 ? "text-rose-400" : "text-zinc-500"}`}>{t.r >= 0 ? "+" : ""}{fmt(t.r, 2)}</td>
                            <td className="px-4 py-2.5">
                              <span className="rounded border border-zinc-700 px-1.5 py-0.5 text-[8px] font-black uppercase text-zinc-400">{t.reason}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <p className="flex items-start gap-1.5 text-[10px] leading-relaxed text-zinc-600">
                <Gauge size={12} className="mt-0.5 shrink-0" />
                A good backtest is a reason to <b className="text-zinc-500">paper-trade it in the fleet next</b> — never a reason to skip to real capital. One coin's result can be luck; the fleet's drift monitor and a multi-coin track record are what confirm an edge.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value, sub, good, bad, icon: Icon }) {
  const color = bad ? "text-rose-400" : good === true ? "text-emerald-400" : good === false ? "text-rose-400" : "text-zinc-100";
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
      <p className="mb-1 flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-zinc-500">
        {Icon && <Icon size={11} className="opacity-50" />}{label}
      </p>
      <p className={`font-mono text-xl tracking-tight ${color}`}>{value}</p>
      {sub && <p className="mt-0.5 text-[9px] font-bold text-zinc-600">{sub}</p>}
    </div>
  );
}
