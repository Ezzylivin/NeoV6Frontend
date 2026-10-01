// File: src/components/FleetGuide.jsx
// "Learn while it trades" — a plain-language explainer so users understand exactly
// what the fleet is doing in the background: the core idea, the two plays, what
// every entry check means, the macro regime, and how to read the live meters.
// Exports STRATEGY_INFO + GATE_INFO so other components (signal chips, gate rows)
// can surface the same explanations in context.
import React, { useState } from "react";
import { BookOpen, ChevronDown, TrendingUp, TrendingDown, Gauge, ShieldCheck, Compass, GraduationCap } from "lucide-react";

// What each strategy/signal the bots use actually means, in human terms.
export const STRATEGY_INFO = {
  ema_cloud:      { title: "EMA Cloud", text: "Reads the trend from stacked moving averages. Votes 'up' when price rides above the cloud (uptrend), 'down' when below. It's the bot's core trend compass." },
  btc_regime:     { title: "BTC Regime", text: "Checks Bitcoin's own trend. Longs are only allowed when BTC is risk-on (above its trend line); it keeps the bots from buying alts while the whole market is falling." },
  macd_crossover: { title: "MACD Crossover", text: "A momentum trigger — fires when short-term momentum crosses above/below the longer trend. (Older long entry; the fleet now leads with EMA Cloud + BTC Regime.)" },
  supertrend:     { title: "SuperTrend", text: "An ATR-based trend flip line. Flags when a trend has turned. Used in some validated recipes." },
  trend_ride:     { title: "Trend-Ride exit", text: "THE edge. Instead of taking a fixed profit, the bot HOLDS a winner until the trend signal flips, with a 2×ATR stop under it. Caps losers, lets winners run — this is what made the strategy validate across 5 coins." },
};

// What each of the 10 entry gates checks, and why it matters — a touch deeper
// than the one-line hold reason shown on the cards.
export const GATE_INFO = {
  "Volatility":   "Is the market moving enough to be worth trading? Too quiet = skip (fees would eat the move).",
  "Votes":        "Do the strategy signals agree strongly enough to commit?",
  "Trend align":  "Are price and the broader trend pointing the same way? The bot won't fight the tide.",
  "ADX trend":    "Is the trend actually STRONG (not just drifting)? ADX measures trend strength — this is usually the last gate a long waits on.",
  "Volume":       "Is there real participation behind the move, or is it thin and fragile?",
  "AI gate":      "An adaptive confidence check on the setup quality.",
  "Direction":    "This bot trades ONE direction. The gate blocks it when the market's signal points the other way.",
  "Macro tilt":   "The market-wide regime (set by Bitcoin): holds shorts in risk-on, holds longs in risk-off.",
  "Cooldown":     "A short pause after a trade so the bot doesn't immediately re-enter on the same bar.",
  "Risk breaker": "Loss-protection. Trips (and halts new entries) if drawdown limits are hit — capital safety first.",
};

function Section({ icon: Icon, title, children }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-3">
      <div className="mb-1.5 flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-zinc-300">
        {Icon && <Icon size={13} className="text-emerald-400" />} {title}
      </div>
      <div className="space-y-1.5 text-[12px] leading-relaxed text-zinc-400">{children}</div>
    </div>
  );
}

export default function FleetGuide() {
  const [open, setOpen] = useState(false);

  return (
    <div className="mb-4 rounded-2xl border border-violet-500/20 bg-violet-500/5">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 p-4 text-left"
      >
        <div className="rounded-lg border border-violet-500/20 bg-violet-500/10 p-1.5"><GraduationCap size={16} className="text-violet-300" /></div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h2 className="text-[13px] font-black uppercase tracking-widest text-violet-200">How the fleet works</h2>
            <span className="rounded-full bg-violet-500/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-violet-300">Learn</span>
          </div>
          <p className="text-[11px] text-zinc-500">What the bots are doing in the background — read it while they trade.</p>
        </div>
        <ChevronDown size={18} className={`text-zinc-500 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="grid grid-cols-1 gap-3 p-4 pt-0 md:grid-cols-2">
          <Section icon={BookOpen} title="The core idea">
            <p>Most bots try to guess perfect <b className="text-zinc-300">entries</b>. Testing showed that doesn't work on crypto — the real edge is in the <b className="text-emerald-400">exit</b>.</p>
            <p>So these bots enter on a simple trend signal, then <b className="text-zinc-300">let winners run</b> until the trend flips, while cutting losers fast with a stop. That "trend-ride" exit is what held up across 5 different coins in walk-forward testing.</p>
          </Section>

          <Section icon={Compass} title="The two plays (per coin)">
            <p><TrendingUp size={12} className="mb-0.5 mr-1 inline text-emerald-400" /><b className="text-emerald-400">LONG (4h):</b> buys when the trend is up <i>and</i> Bitcoin is risk-on. Rides uptrends.</p>
            <p><TrendingDown size={12} className="mb-0.5 mr-1 inline text-rose-400" /><b className="text-rose-400">SHORT (1d):</b> sells short only when Bitcoin is in a confirmed downtrend. It's a <b className="text-zinc-300">hedge</b> for crash legs, not a primary earner.</p>
            <p className="text-[11px] text-zinc-500">Each coin runs both, but only the side that matches the trend is ever eligible — so the fleet is always positioned on the right side of the market.</p>
          </Section>

          <Section icon={ShieldCheck} title="The 10-point entry checklist">
            <p>Before any trade, a setup must pass every check. These are the same gates you see on each bot:</p>
            <ul className="mt-1 space-y-1">
              {Object.entries(GATE_INFO).map(([k, v]) => (
                <li key={k} className="text-[11px]"><b className="text-zinc-300">{k}</b> — {v}</li>
              ))}
            </ul>
          </Section>

          <div className="space-y-3">
            <Section icon={Compass} title="The macro regime">
              <p><b className="text-emerald-400">Risk-on</b> (BTC trending up): longs favored, shorts parked.<br /><b className="text-rose-400">Risk-off</b> (BTC trending down): shorts favored, longs parked.<br /><b className="text-zinc-300">Neutral</b>: each coin trades on its own trend.</p>
              <p className="text-[11px] text-zinc-500">Bitcoin leads crypto, so the whole fleet leans with BTC's trend.</p>
            </Section>

            <Section icon={Gauge} title="Reading the meters">
              <p><b className="text-zinc-300">Readiness</b> — how many of the 10 checks are green. 100% = firing or in a trade. Watch a bot climb toward it.</p>
              <p><b className="text-zinc-300">Drift</b> — compares live results to the validated profile. If it ever says DRIFTING, the edge may be fading — review before adding capital.</p>
              <p><b className="text-zinc-300">Expect patience:</b> this is a slow, selective trend system — a low win rate but winners much bigger than losers. Judge it over weeks, not any single hour.</p>
            </Section>
          </div>
        </div>
      )}
    </div>
  );
}
