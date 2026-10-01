// File: src/components/RealityCheck.jsx
// "Reality Range" — an honest Monte Carlo of the validated edge. Instead of the
// cherry-picked gains every other bot advertises, this shows the FULL range of
// outcomes a real (positive-expectancy, low-win-rate, trend-following) edge
// produces: median, lucky (p95) and unlucky (p5) paths, typical drawdown, and
// the probability of ending green. The anti-hype feature.
import React, { useMemo, useState } from "react";
import { AreaChart, Area, Line, ResponsiveContainer, YAxis, XAxis, Tooltip as RTooltip, Legend } from "recharts";
import { Dices, ChevronDown } from "lucide-react";

const PATHS = 1000;
const pct = (arr, q) => { const s = [...arr].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.max(0, Math.floor(q * (s.length - 1))))]; };
const fmtPct = (v) => `${v >= 0 ? "+" : ""}${(v * 100).toFixed(0)}%`;

export default function RealityCheck() {
  const [open, setOpen] = useState(false);
  const [trades, setTrades] = useState(100);
  const [winRate, setWinRate] = useState(33); // validated profile: ~26–40%
  const [risk, setRisk] = useState(1);         // % of equity risked per trade

  const sim = useMemo(() => {
    const p = winRate / 100, rf = risk / 100;
    const WIN_R = 3.0, LOSS_R = 1.0; // trend-ride shape: winners ~3× the risk, losers ~1×
    const finals = [], maxDDs = [];
    const band = Array.from({ length: trades + 1 }, () => []);
    for (let m = 0; m < PATHS; m++) {
      let eq = 1, peak = 1, dd = 0;
      band[0].push(1);
      for (let t = 1; t <= trades; t++) {
        const r = Math.random() < p ? WIN_R : -LOSS_R;
        eq *= 1 + r * rf;
        if (eq > peak) peak = eq;
        dd = Math.max(dd, (peak - eq) / peak);
        band[t].push(eq);
      }
      finals.push(eq); maxDDs.push(dd);
    }
    const data = band.map((col, t) => ({
      t, lo: pct(col, 0.05) - 1, mid: pct(col, 0.5) - 1, hi: pct(col, 0.95) - 1,
      range: [pct(col, 0.05) - 1, pct(col, 0.95) - 1],
    }));
    return {
      data,
      medFinal: pct(finals, 0.5) - 1,
      p5: pct(finals, 0.05) - 1,
      p95: pct(finals, 0.95) - 1,
      probProfit: finals.filter((x) => x > 1).length / finals.length,
      medDD: pct(maxDDs, 0.5),
      worstDD: pct(maxDDs, 0.95),
      expR: (p * 3 - (1 - p) * 1),
    };
  }, [trades, winRate, risk]);

  return (
    <div className="mb-4 rounded-2xl border border-amber-500/20 bg-amber-500/5">
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-2 p-4 text-left">
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-1.5"><Dices size={16} className="text-amber-300" /></div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h2 className="text-[13px] font-black uppercase tracking-widest text-amber-200">Reality range</h2>
            <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-amber-300">No hype</span>
          </div>
          <p className="text-[11px] text-zinc-500">The honest range of outcomes from the validated edge — not a cherry-picked number.</p>
        </div>
        <ChevronDown size={18} className={`text-zinc-500 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="p-4 pt-0">
          <p className="mb-3 text-[12px] leading-relaxed text-zinc-400">
            A real edge still loses most individual trades and rides through drawdowns — it wins because the winners are bigger. This simulates <b className="text-zinc-200">{PATHS.toLocaleString()}</b> possible futures from the validated profile (≈3:1 winners, {winRate}% win rate). The spread is the point: <b className="text-amber-300">most other apps show you only the lucky line.</b>
          </p>

          {/* Controls */}
          <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {[["Trades", trades, setTrades, 20, 300, 10, (v) => v],
              ["Win rate", winRate, setWinRate, 25, 45, 1, (v) => `${v}%`],
              ["Risk / trade", risk, setRisk, 0.5, 3, 0.5, (v) => `${v}%`]].map(([label, val, setter, min, max, step, disp]) => (
              <label key={label} className="flex flex-col gap-1">
                <span className="flex justify-between text-[10px] uppercase tracking-widest text-zinc-500">{label}<span className="text-zinc-300">{disp(val)}</span></span>
                <input type="range" min={min} max={max} step={step} value={val} onChange={(e) => setter(Number(e.target.value))} className="accent-amber-500" />
              </label>
            ))}
          </div>

          {/* Outcome stats */}
          <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[["Typical (median)", fmtPct(sim.medFinal), sim.medFinal >= 0 ? "text-emerald-400" : "text-rose-400"],
              ["Unlucky (p5)", fmtPct(sim.p5), "text-rose-400"],
              ["Lucky (p95)", fmtPct(sim.p95), "text-emerald-400"],
              ["Chance of profit", `${(sim.probProfit * 100).toFixed(0)}%`, "text-zinc-100"]].map(([l, v, c]) => (
              <div key={l} className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-2.5">
                <div className="text-[9px] uppercase tracking-widest text-zinc-500">{l}</div>
                <div className={`mt-0.5 text-lg font-black ${c}`}>{v}</div>
              </div>
            ))}
          </div>

          {/* Fan chart */}
          <div className="h-40 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sim.data} margin={{ top: 6, right: 6, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="rc" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#fbbf24" stopOpacity={0.18} />
                    <stop offset="100%" stopColor="#fbbf24" stopOpacity={0.04} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="t" tick={{ fontSize: 9, fill: "#71717a" }} tickLine={false} axisLine={false} />
                <YAxis tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} tick={{ fontSize: 9, fill: "#71717a" }} tickLine={false} axisLine={false} width={34} />
                <RTooltip contentStyle={{ background: "#09090b", border: "1px solid #27272a", borderRadius: 10, fontSize: 11 }}
                  labelFormatter={(l) => `after ${l} trades`} formatter={(v, n) => [fmtPct(Array.isArray(v) ? v[1] : v), n === "range" ? "range (p5–p95)" : "median"]} />
                <Area type="monotone" dataKey="range" stroke="none" fill="url(#rc)" isAnimationActive={false} />
                <Area type="monotone" dataKey="mid" stroke="#fbbf24" strokeWidth={2} fill="none" isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <p className="mt-3 text-[10px] leading-relaxed text-zinc-600">
            Median typical drawdown along the way: <b className="text-zinc-400">−{(sim.medDD * 100).toFixed(0)}%</b> · rough-patch (p95) drawdown: <b className="text-zinc-400">−{(sim.worstDD * 100).toFixed(0)}%</b>. Per-trade expectancy ≈ <b className="text-zinc-400">{sim.expR.toFixed(2)}R</b>. This is a projection from the validated profile, <b className="text-amber-300/90">not a promise</b> — real results vary, the edge can decay (watch the drift monitor), and this is paper. The point isn't the number; it's that even a genuine edge includes losing streaks, and anyone showing you only an up-and-to-the-right line is selling you something.
          </p>
        </div>
      )}
    </div>
  );
}
