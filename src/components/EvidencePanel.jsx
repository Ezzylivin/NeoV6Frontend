// File: src/components/EvidencePanel.jsx
// "The evidence" — a read-only view of the exit_lab validation report so users
// see WHY these strategies were chosen: the configs that generalized across
// coins (not per-coin overfit), with expectancy, profit factor and drawdown.
// Data: GET /api/fleet/evidence (proxies the engine's /api/exitlab/results).
import React, { useEffect, useState } from "react";
import api from "../api/apiClient.js";
import { FlaskConical, ChevronDown } from "lucide-react";

const fmt = (n, d = 2) => (n == null || isNaN(n) ? "–" : Number(n).toLocaleString(undefined, { maximumFractionDigits: d }));

export default function EvidencePanel() {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState(null);
  const [err, setErr] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!open || loaded) return;
    setLoaded(true);
    api.get("/fleet/evidence")
      .then((r) => setData(r.data))
      .catch(() => setErr(true));
  }, [open, loaded]);

  const winners = (data?.winners || []).slice(0, 10);

  return (
    <div className="mb-4 rounded-2xl border border-sky-500/20 bg-sky-500/5">
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-2 p-4 text-left">
        <div className="rounded-lg border border-sky-500/20 bg-sky-500/10 p-1.5"><FlaskConical size={16} className="text-sky-300" /></div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h2 className="text-[13px] font-black uppercase tracking-widest text-sky-200">The evidence</h2>
            <span className="rounded-full bg-sky-500/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-sky-300">Proof</span>
          </div>
          <p className="text-[11px] text-zinc-500">Why these strategies — the walk-forward configs that generalized across coins.</p>
        </div>
        <ChevronDown size={18} className={`text-zinc-500 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="p-4 pt-0">
          {err ? (
            <p className="text-[11px] text-zinc-500">Couldn't load the validation report right now.</p>
          ) : !data ? (
            <p className="text-[11px] text-zinc-500">Loading the validation report…</p>
          ) : (
            <>
              <p className="mb-3 text-[12px] leading-relaxed text-zinc-400">
                Of <b className="text-zinc-200">{data.configs_tested}</b> exit configurations walk-forward tested, only{" "}
                <b className="text-emerald-400">{data.generalizing_configs}</b> cleared the bar on ≥{data.criteria?.min_coins_generalize ?? 3} of 5 coins with positive expectancy — the guardrail against per-coin overfit. The fleet runs the top of these. A config only counts if it generalizes, not if it won one lucky coin.
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-[11px]">
                  <thead>
                    <tr className="text-[9px] uppercase tracking-widest text-zinc-500">
                      <th className="py-1.5 pr-3 text-left">Entry</th>
                      <th className="py-1.5 pr-3 text-left">TF</th>
                      <th className="py-1.5 pr-3 text-left">Dir</th>
                      <th className="py-1.5 pr-3 text-left">Exit</th>
                      <th className="py-1.5 pr-3 text-right">Coins</th>
                      <th className="py-1.5 pr-3 text-right">Exp. R</th>
                      <th className="py-1.5 pr-3 text-right">PF</th>
                      <th className="py-1.5 pr-3 text-right">Max DD</th>
                    </tr>
                  </thead>
                  <tbody>
                    {winners.map((w, i) => (
                      <tr key={i} className="border-t border-zinc-800">
                        <td className="py-1.5 pr-3 font-semibold text-zinc-200">{w.entry}</td>
                        <td className="py-1.5 pr-3 text-zinc-400">{w.timeframe}</td>
                        <td className={`py-1.5 pr-3 font-bold ${w.direction === "LONG" ? "text-emerald-400" : w.direction === "SHORT" ? "text-rose-400" : "text-zinc-400"}`}>{w.direction}</td>
                        <td className="py-1.5 pr-3 font-mono text-zinc-400">{w.style}</td>
                        <td className="py-1.5 pr-3 text-right text-zinc-300">{w.coins_with_edge}/{w.coins_tested}</td>
                        <td className="py-1.5 pr-3 text-right font-mono text-emerald-400">{fmt(w.mean_expectancy_r, 2)}</td>
                        <td className="py-1.5 pr-3 text-right font-mono text-zinc-300">{fmt(w.mean_profit_factor, 2)}</td>
                        <td className="py-1.5 pr-3 text-right font-mono text-zinc-500">{fmt(w.mean_max_dd, 1)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-3 text-[10px] leading-relaxed text-zinc-600">
                <b>Exp. R</b> = average profit per unit of risk (&gt;0 is an edge). <b>PF</b> = gross wins ÷ gross losses (&gt;1 is profitable). <b>Coins</b> = how many of 5 it held up on. Low win rates with PF &gt; 1 are the correct trend-following signature: winners much bigger than losers. Past validation ≠ future profit — this is paper, judged live by the drift monitor.
                {data.generated ? ` Report generated ${new Date(data.generated).toLocaleDateString()}.` : ""}
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
