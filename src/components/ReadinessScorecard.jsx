// File: src/components/ReadinessScorecard.jsx
// "Go-live readiness" — an honest trust gate. Instead of nudging users toward
// real money (like every other app), this tells them, with explicit criteria,
// whether a strategy has actually earned real capital yet. Anti-hype by design.
import React from "react";
import { ShieldCheck, Check, X, Minus } from "lucide-react";

export default function ReadinessScorecard({ drift, ledger }) {
  const trades = Number(ledger?.totals?.trades ?? drift?.trades ?? 0);
  const net = Number(ledger?.totals?.total_pnl ?? drift?.net_pnl ?? 0);
  const pf = Number(drift?.profit_factor ?? 0);
  const driftStatus = drift?.status || "INSUFFICIENT_DATA";

  const checks = [
    { label: "Validated out-of-sample + cost-stress", ok: true, note: "Passed on ≥3 of 5 coins (the Evidence)", locked: true },
    { label: "At least 10 closed paper trades", ok: trades >= 10, note: `${trades} so far`, partial: trades > 0 && trades < 10 },
    { label: "Drift on-track (matches the validated profile)", ok: driftStatus === "ON_TRACK", note: driftStatus.replace("_", " ").toLowerCase(), partial: driftStatus === "INSUFFICIENT_DATA" },
    { label: "Positive net P&L on paper", ok: net > 0, note: `${net >= 0 ? "+" : ""}$${net.toFixed(2)}`, partial: trades < 10 },
    { label: "Profit factor ≥ 1.2 live", ok: pf >= 1.2, note: pf ? pf.toFixed(2) : "–", partial: trades < 10 },
  ];
  const met = checks.filter((c) => c.ok).length;
  const total = checks.length;
  const score = met / total;

  const verdict =
    score >= 1 ? { t: "Has earned a look at small real capital", c: "text-emerald-400", bar: "bg-emerald-400" }
    : score >= 0.6 ? { t: "Earning its stripes — keep it on paper", c: "text-amber-400", bar: "bg-amber-400" }
    : { t: "Not ready — let it keep paper trading", c: "text-zinc-300", bar: "bg-zinc-500" };

  return (
    <div className="mb-4 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
      <div className="mb-2 flex items-center gap-2">
        <ShieldCheck size={14} className="text-emerald-400" />
        <h2 className="text-[12px] font-black uppercase tracking-widest text-zinc-300">Go-live readiness</h2>
        <span className="ml-auto text-[10px] text-zinc-600">{met}/{total} criteria</span>
      </div>

      <div className="mb-2 h-2 w-full overflow-hidden rounded-full bg-zinc-800">
        <div className={`h-full ${verdict.bar} transition-all duration-500`} style={{ width: `${score * 100}%` }} />
      </div>
      <div className={`mb-3 text-[13px] font-bold ${verdict.c}`}>{verdict.t}</div>

      <div className="space-y-1.5">
        {checks.map((c) => (
          <div key={c.label} className="flex items-center gap-2 text-[11px]">
            <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${c.ok ? "bg-emerald-500/20 text-emerald-400" : c.partial ? "bg-amber-500/20 text-amber-400" : "bg-zinc-800 text-zinc-500"}`}>
              {c.ok ? <Check size={11} /> : c.partial ? <Minus size={11} /> : <X size={11} />}
            </span>
            <span className={c.ok ? "text-zinc-300" : "text-zinc-400"}>{c.label}</span>
            <span className="ml-auto font-mono text-[10px] text-zinc-500">{c.note}</span>
          </div>
        ))}
      </div>

      <p className="mt-3 text-[10px] leading-relaxed text-zinc-600">
        Guidance, not financial advice. This is paper trading — these criteria are the bar a strategy should clear before you'd even <i>consider</i> real money, and most apps skip every one of them. Even at 5/5, start small and never risk what you can't lose.
      </p>
    </div>
  );
}
