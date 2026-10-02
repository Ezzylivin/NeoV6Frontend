// File: src/components/RiskPanel.jsx
// "How much is at risk" in plain numbers — the thing every other app hides.
// Real money at risk is $0 while in paper mode; the rest shows the limits a
// trade/fleet can lose before the bot cuts it. Reads the live fleet status +
// the configured risk settings (capital/bot, risk %/trade, fleet max DD).
import React from "react";
import { ShieldAlert } from "lucide-react";

const money = (n, d = 2) => `$${(Number(n) || 0).toLocaleString(undefined, { maximumFractionDigits: d })}`;

function Tile({ label, value, sub, tone = "zinc" }) {
  const c = tone === "safe" ? "text-emerald-400" : tone === "warn" ? "text-amber-400" : "text-zinc-100";
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3">
      <div className="text-[9px] uppercase tracking-widest text-zinc-500">{label}</div>
      <div className={`mt-0.5 text-lg font-black ${c}`}>{value}</div>
      {sub && <div className="mt-0.5 text-[10px] leading-snug text-zinc-500">{sub}</div>}
    </div>
  );
}

export default function RiskPanel({ status, longOnly = true, capital = 1000, maxDd = 20, riskPct = 1, live = false }) {
  const equity = Number(status?.total_balance) || 0;
  const bots = status?.count || 0;
  const open = status?.open_positions || 0;
  const perBot = Number(capital) || 1000;
  const rp = Number(riskPct) || 1;
  const dd = Number(maxDd) || 20;

  const riskPerTrade = (perBot * rp) / 100;                 // $ risked to the stop, per trade
  const atRiskNow = riskPerTrade * open;                     // worst case if every open trade hits its stop
  const haltBase = equity || bots * perBot;
  const haltLine = (haltBase * dd) / 100;                    // fleet drawdown that halts new entries

  return (
    <div className="mb-4 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
      <div className="mb-2 flex items-center gap-2">
        <ShieldAlert size={14} className="text-amber-400" />
        <h2 className="text-[12px] font-black uppercase tracking-widest text-zinc-300">Risk</h2>
        <span className="ml-auto text-[10px] text-zinc-600">how much can actually be lost</span>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        <Tile
          label="Real money at risk"
          value={live ? money(atRiskNow) : "$0"}
          tone={live ? "warn" : "safe"}
          sub={live ? "LIVE — real funds" : "paper mode"}
        />
        <Tile label="Capital deployed" value={money(equity || bots * perBot, 0)} sub={`${bots} bots · ${money(perBot, 0)} each`} />
        <Tile label="Risk / trade" value={`${rp}%`} sub={`≈ ${money(riskPerTrade)} per bot, to its stop`} />
        <Tile label="At risk now" value={`≈ ${money(atRiskNow)}`} sub={`${open} open trade${open === 1 ? "" : "s"} → their stops`} />
        <Tile label="Loss-halt line" value={`-${dd}%`} tone="warn" sub={`new entries stop near -${money(haltLine, 0)} from peak`} />
        <Tile label="Leverage" value={longOnly ? "None" : "1×"} sub={longOnly ? "spot · no liquidation" : "margin · 1×, no leverage"} />
      </div>

      <p className="mt-2 text-[10px] leading-relaxed text-zinc-600">
        Each trade is sized so hitting its stop loses about <b className="text-zinc-400">{rp}%</b> of that bot's capital — not the whole book. The fleet also halts new entries after a <b className="text-zinc-400">{dd}%</b> drawdown. {live
          ? <b className="text-amber-400">Live mode — these are real funds.</b>
          : <>You're in <b className="text-emerald-400">paper mode</b>, so <b className="text-emerald-400">no real money</b> is at risk — these are the limits that would apply if you went live.</>} Set the risk level with <b className="text-zinc-400">Risk % / trade</b> and <b className="text-zinc-400">Fleet Max DD</b> before you ignite.
      </p>
    </div>
  );
}
