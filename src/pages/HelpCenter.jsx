// File: src/pages/HelpCenter.jsx
// NeoV6 Help Center — searchable knowledge base for the current app:
// a PAPER-trading fleet where every coin runs a long (4h regime) and a short
// (1d regime) bot, routed by a BTC-driven macro regime, with the validated
// "trend-ride" exit (hold to signal-flip behind a FIXED protective stop — no
// trailing, no take-profit cap). Everything here must match live behavior.
import React, { useState, useEffect, useMemo } from "react";
import {
    LifeBuoy, Rocket, Cpu, Gauge, ShieldAlert, BadgeCheck, UserCog, Wrench,
    ChevronDown, Search, Mail, BookOpen, GraduationCap,
} from "lucide-react";
import { getFleetRegime } from "../api/fleet.js";
import "./HelpCenter.css";

// Where "Email support" goes. Override per-deploy with VITE_SUPPORT_EMAIL.
const SUPPORT_EMAIL = import.meta.env.VITE_SUPPORT_EMAIL || "support@neov6.app";

// ── Knowledge base ────────────────────────────────────────────────────────
// One source of truth, grouped by topic. Search filters across q + a.
const TOPICS = [
    {
        id: "start",
        title: "Getting Started",
        icon: Rocket,
        tint: "text-emerald-400",
        items: [
            {
                q: "What is NeoV6?",
                a: "NeoV6 is an automated crypto trading dashboard. It runs a fleet of bots that watch the market and open/close trades for you based on a strategy that was validated on historical data. You watch it work from one page — the Fleet Command dashboard.",
            },
            {
                q: "Is this real money?",
                a: "No. NeoV6 runs in PAPER-TRADING mode: every bot trades with a simulated balance against real, live market prices. Nothing touches a real exchange or real funds. It's the safe way to see whether the strategy actually performs before anyone considers real capital.",
            },
            {
                q: "How do I start the fleet?",
                a: "On the Fleet Command page, press Start (or 'Ignite Fleet'). That spins up a long and a short bot for each supported coin. From then on the bots run on the server around the clock — you can close the tab and they keep going. Press Stop to shut your fleet down.",
            },
            {
                q: "Do I have to do anything after starting it?",
                a: "No. The fleet is hands-off by design. The bots decide when to enter and exit on their own. Your job is to watch — the readiness meters, live trade feed, and drift monitor tell you what's happening and whether it's behaving as expected.",
            },
        ],
    },
    {
        id: "fleet",
        title: "Your Fleet & How It Trades",
        icon: Cpu,
        tint: "text-violet-400",
        items: [
            {
                q: "What is a 'fleet'?",
                a: "Instead of one bot, NeoV6 runs many. Each supported coin gets TWO bots: a LONG bot (looks for up-trends on the 4-hour timeframe) and a SHORT bot (looks for down-trends on the 1-day timeframe). Together they're your fleet.",
            },
            {
                q: "Why both a long and a short bot per coin?",
                a: "Markets go both ways. The long bot profits when a coin trends up; the short bot profits when it trends down. Only the side that fits current conditions is allowed to trade — the other sits on the sidelines until conditions change.",
            },
            {
                q: "What is the macro regime (risk-on / risk-off / neutral)?",
                a: "Bitcoin sets the market's overall mood, and NeoV6 reads it as a 'regime'. Risk-ON: BTC trending up → long bots are favored, shorts are parked. Risk-OFF: BTC trending down → short bots are favored, longs are parked. Neutral: no strong lean → each coin trades purely on its own trend. This keeps the fleet leaning with the broader market instead of fighting it.",
            },
            {
                q: "How does a bot decide to ENTER a trade?",
                a: "A bot opens a position only when ALL of its checks line up at once: the coin's own trend/EMA structure agrees, Bitcoin's regime agrees, the macro gate allows that side, and a fresh entry signal fires. If any one of those isn't met, the bot waits. That's why bots are patient — they'd rather miss a trade than take a bad one.",
            },
            {
                q: "How does a bot EXIT a trade? (important)",
                a: "NeoV6 uses the validated 'trend-ride' exit: once in a trade, the bot HOLDS it until the trend signal flips, protected by a FIXED stop set at entry (roughly 2× the coin's recent volatility). The stop does NOT trail up as price rises, and there is NO take-profit cap. This is deliberate — the edge comes from letting winners run and cutting losers at a fixed line. So if you see a stop sitting still while price climbs, that's working as intended.",
            },
        ],
    },
    {
        id: "dashboard",
        title: "Reading the Dashboard",
        icon: Gauge,
        tint: "text-sky-400",
        items: [
            {
                q: "What does the readiness meter / % mean?",
                a: "It shows how close a bot is to trading. Each bot has a set of entry checks; the bar fills as each one turns green. A bot only reaches 100% when every check passes AND it's actually firing a signal (i.e. in or entering a position). A bot can sit at 95% — all checks green — and still not trade, simply because no fresh signal has appeared yet.",
            },
            {
                q: "What is the 'closest to trading' order?",
                a: "The fleet is ranked by readiness so you can see at a glance which bots are on the verge of opening a trade and which are far off. Tap any row to chart that coin and see exactly which check is holding it back.",
            },
            {
                q: "Why does it say a bot isn't trading even though the coin is moving?",
                a: "Usually one of: the macro regime is parking that side (e.g. shorts are off during a risk-on market), the coin's own trend doesn't yet agree, or there's no fresh entry signal. The readiness panel names the specific blocker in plain language.",
            },
            {
                q: "What's on the chart?",
                a: "Live price candles for the selected coin and timeframe, overlaid with the bot's entry line and its protective STOP line, plus arrows marking where trades opened and closed. Use the tabs above the chart to switch coin or timeframe.",
            },
            {
                q: "What is the track record vs. BTC line?",
                a: "It compares your fleet's simulated balance over time against simply buying and holding Bitcoin — the honest benchmark. Give it time: a handful of trades tells you little. Judge it over dozens of closed trades and weeks, not a single hour.",
            },
            {
                q: "What is the live trade feed?",
                a: "A running log of every entry and exit across the whole fleet, newest first — which coin and side opened or closed, the price, why it closed, and the profit/loss. Toasts also pop in real time as trades happen.",
            },
        ],
    },
    {
        id: "risk",
        title: "Risk & Safety Controls",
        icon: ShieldAlert,
        tint: "text-rose-400",
        items: [
            {
                q: "What is the Risk % per trade?",
                a: "It sets how much of the account a single trade risks, which in turn sizes the position. Lower % = smaller, safer positions; higher % = larger swings. Because the stop is fixed at entry, your risk per trade is known up front.",
            },
            {
                q: "What is the kill switch?",
                a: "An emergency brake. Flipping it ON instantly halts ALL new entries across the entire fleet. Positions that are already open keep being managed to their normal exits — it stops new risk, it doesn't dump your trades. Use it if markets go haywire or you simply want everything to pause.",
            },
            {
                q: "What is spot vs. margin (long-only)?",
                a: "Spot / long-only mode runs just the long bots — no shorting, like a normal buy-and-sell account. Margin mode also enables the short bots so the fleet can profit in downtrends. Pick whichever matches how you intend to trade.",
            },
            {
                q: "What is the fleet max-drawdown limit?",
                a: "A circuit breaker for the whole fleet. If total simulated equity falls by the percentage you set, the fleet stops opening new trades so a bad streak can't keep digging. It's your account-level safety net on top of each trade's fixed stop.",
            },
        ],
    },
    {
        id: "trust",
        title: "Validation & Trust",
        icon: BadgeCheck,
        tint: "text-amber-400",
        items: [
            {
                q: "How do I know the strategy actually works?",
                a: "The trend-ride exit wasn't picked by hunch — it was tested across multiple coins and only kept because it held up on all of them, not just one. The Evidence panel shows those validation results. That cross-coin consistency is what separates a real edge from a curve-fit fluke.",
            },
            {
                q: "What is the drift monitor?",
                a: "It continuously compares the fleet's LIVE paper results to the validated profile. As long as behavior matches, you're on track. If it flags DRIFTING, the live results are diverging from what was validated — a signal to re-check before trusting it further. You'll get an in-app alert when that happens.",
            },
            {
                q: "What happens if the market changes?",
                a: "The engine periodically re-audits its exits and can re-learn from recent data, and the drift monitor catches divergence between audits. No strategy works forever, which is exactly why the fleet runs in paper mode and is judged continuously rather than trusted blindly.",
            },
            {
                q: "When would it be ready for real money?",
                a: "Not until it has built a real track record — think dozens of closed trades over weeks — with the drift monitor staying green and the results beating the buy-and-hold benchmark. Real-capital trading is intentionally not enabled in the app today.",
            },
        ],
    },
    {
        id: "account",
        title: "Account & Access",
        icon: UserCog,
        tint: "text-teal-400",
        items: [
            {
                q: "How do I create an account?",
                a: "Sign up with your email, a username, and a password on the login screen. We'll email you a verification link — click it to confirm your address and unlock full access.",
            },
            {
                q: "I didn't get the verification / reset email.",
                a: "Check your spam or promotions folder first. The link is time-limited, so if it's old, request a fresh one. If nothing arrives, the mail service may still be getting configured — contact support below.",
            },
            {
                q: "I forgot my password.",
                a: "On the login screen click 'Forgot password?', enter your email, and we'll send a reset link. The link expires after about an hour for security; just request another if it lapses.",
            },
            {
                q: "How do I change my email address?",
                a: "Update it from your account settings. You may be asked to verify the new address before it takes effect.",
            },
        ],
    },
    {
        id: "trouble",
        title: "Troubleshooting",
        icon: Wrench,
        tint: "text-zinc-300",
        items: [
            {
                q: "The dashboard says the engine is offline.",
                a: "The status pill at the top of this page shows whether the trading engine is reachable. If it's offline, the bots aren't getting fresh data for a moment — it usually recovers on its own within seconds. If it persists, contact support.",
            },
            {
                q: "My bots haven't traded in a while — is something broken?",
                a: "Almost always no. Long stretches with no trades are normal: the strategy is selective and only fires when trend, regime, and signal all agree. The readiness panel will show every bot patiently waiting with its specific blocker named.",
            },
            {
                q: "The chart looks wrong or shows the wrong coin.",
                a: "Try switching coins/timeframes with the tabs, or hit Sync to refresh. The chart always redraws to the selected coin; a quick re-select clears any stale frame.",
            },
            {
                q: "Numbers look stale or out of date.",
                a: "The dashboard auto-refreshes every few seconds and also updates live as trades happen. If it ever looks frozen, the Sync button forces an immediate refresh.",
            },
        ],
    },
];

const HelpCenter = () => {
    const [query, setQuery] = useState("");
    const [open, setOpen] = useState(null); // `${topicId}-${idx}`
    const [engine, setEngine] = useState("checking"); // "online" | "offline" | "checking"

    // Real engine health: if the fleet regime endpoint answers, the engine is up.
    useEffect(() => {
        let alive = true;
        const ping = () =>
            getFleetRegime()
                .then(() => alive && setEngine("online"))
                .catch(() => alive && setEngine("offline"));
        ping();
        const t = setInterval(ping, 30000);
        return () => { alive = false; clearInterval(t); };
    }, []);

    // Filter topics/items by the search query (matches question or answer).
    const q = query.trim().toLowerCase();
    const filtered = useMemo(() => {
        if (!q) return TOPICS;
        return TOPICS
            .map((t) => {
                const titleHit = t.title.toLowerCase().includes(q);
                const items = t.items.filter(
                    (it) => titleHit || it.q.toLowerCase().includes(q) || it.a.toLowerCase().includes(q)
                );
                return { ...t, items };
            })
            .filter((t) => t.items.length > 0);
    }, [q]);

    const totalHits = filtered.reduce((n, t) => n + t.items.length, 0);

    const engineUI = {
        online: { dot: "bg-emerald-500", text: "text-emerald-400", label: "Engine online", pulse: true },
        offline: { dot: "bg-rose-500", text: "text-rose-400", label: "Engine offline", pulse: false },
        checking: { dot: "bg-zinc-500", text: "text-zinc-400", label: "Checking…", pulse: true },
    }[engine];

    return (
        <div className="help-container animate-in fade-in duration-500">
            {/* HERO */}
            <div className="help-header flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-3">
                    <div className="rounded-2xl bg-emerald-500/10 p-3">
                        <LifeBuoy className="h-8 w-8 text-emerald-500" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black uppercase tracking-tighter text-white">Help Center</h1>
                        <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">
                            Everything about your NeoV6 trading fleet
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 self-start">
                    {/* Replay the forced first-login walkthrough on demand */}
                    <button onClick={() => window.dispatchEvent(new Event("neov6:start-tour"))}
                        className="flex items-center gap-2 rounded-2xl bg-emerald-500 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-black shadow-lg transition hover:bg-emerald-400">
                        <GraduationCap size={14} /> Take the guided tour
                    </button>
                    {/* LIVE engine status pill */}
                    <div className="flex items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-2 shadow-xl">
                        <span className="text-[8px] font-black uppercase tracking-widest text-zinc-500">Trading engine</span>
                        <div className="flex items-center gap-2">
                            <span className={`h-2 w-2 rounded-full ${engineUI.dot} ${engineUI.pulse ? "animate-pulse" : ""}`} />
                            <span className={`font-mono text-[10px] font-black ${engineUI.text}`}>{engineUI.label}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* SEARCH */}
            <div className="search-wrapper">
                <Search className="search-icon" size={16} />
                <input
                    type="text"
                    placeholder="Search help — e.g. “why isn't my bot trading”, “kill switch”, “reset password”"
                    value={query}
                    onChange={(e) => { setQuery(e.target.value); setOpen(null); }}
                    className="help-search"
                />
            </div>

            {/* TOPIC CHIPS — jump to a section (hidden while searching) */}
            {!q && (
                <div className="mb-10 mt-5 flex flex-wrap gap-2">
                    {TOPICS.map((t) => {
                        const Icon = t.icon;
                        return (
                            <a
                                key={t.id}
                                href={`#topic-${t.id}`}
                                className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-zinc-400 transition hover:border-zinc-600 hover:text-white"
                            >
                                <Icon size={13} className={t.tint} />
                                {t.title}
                            </a>
                        );
                    })}
                </div>
            )}

            {/* QUICK START — only when not searching */}
            {!q && (
                <section className="mb-14">
                    <div className="section-title">
                        <Rocket size={18} className="text-emerald-500" />
                        <h2>Quick start · up and running in 4 steps</h2>
                    </div>
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
                        {[
                            { n: "01", h: "Create your account", p: "Sign up with your email and password, then click the verification link we email you." },
                            { n: "02", h: "Ignite the fleet", p: "Hit Start on Fleet Command. A long and short bot spin up for every coin and run on the server 24/7." },
                            { n: "03", h: "Watch readiness", p: "The meters show how close each bot is to trading and name whatever is holding it back." },
                            { n: "04", h: "Track results", p: "Follow the live trade feed, your track record vs. BTC, and the drift monitor over time." },
                        ].map((s) => (
                            <div
                                key={s.n}
                                className="group relative overflow-hidden rounded-[32px] border border-zinc-800 bg-zinc-900 p-7 transition-all hover:border-emerald-500/50"
                            >
                                <div className="absolute -right-2 -top-2 text-4xl font-black text-emerald-500 opacity-10">{s.n}</div>
                                <h3 className="mb-3 text-sm font-black uppercase text-white">{s.h}</h3>
                                <p className="text-[11px] leading-relaxed text-zinc-500">{s.p}</p>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* FAQ / KNOWLEDGE BASE */}
            {q && (
                <p className="mb-6 text-[11px] font-bold uppercase tracking-widest text-zinc-500">
                    {totalHits} result{totalHits === 1 ? "" : "s"} for “{query}”
                </p>
            )}

            {filtered.length === 0 ? (
                <div className="rounded-[32px] border border-zinc-800 bg-zinc-900 p-12 text-center">
                    <p className="text-sm font-black uppercase tracking-tighter text-zinc-300">No matches</p>
                    <p className="mt-2 text-[11px] text-zinc-500">
                        Try different words, or reach out below — we're happy to help.
                    </p>
                </div>
            ) : (
                <div className="space-y-12">
                    {filtered.map((t) => {
                        const Icon = t.icon;
                        return (
                            <section key={t.id} id={`topic-${t.id}`} className="scroll-mt-24">
                                <div className="section-title">
                                    <Icon size={18} className={t.tint} />
                                    <h2>{t.title}</h2>
                                </div>
                                <div className="space-y-3">
                                    {t.items.map((it, idx) => {
                                        const key = `${t.id}-${idx}`;
                                        const isOpen = open === key || !!q; // auto-expand while searching
                                        return (
                                            <div
                                                key={key}
                                                className={`overflow-hidden rounded-2xl border bg-zinc-900 transition-all ${isOpen ? "border-zinc-600 shadow-lg" : "border-zinc-800"}`}
                                            >
                                                <button
                                                    onClick={() => setOpen(open === key ? null : key)}
                                                    className="flex w-full items-center justify-between gap-4 p-4 text-left transition hover:bg-white/5"
                                                >
                                                    <span className="text-[12px] font-black uppercase tracking-tight text-zinc-200">{it.q}</span>
                                                    <ChevronDown
                                                        size={15}
                                                        className={`shrink-0 transition-transform ${isOpen ? "rotate-180 text-emerald-500" : "text-zinc-600"}`}
                                                    />
                                                </button>
                                                {isOpen && (
                                                    <div className="px-4 pb-4 text-[11px] leading-relaxed text-zinc-400 animate-in slide-in-from-top-1 duration-200">
                                                        {it.a}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </section>
                        );
                    })}
                </div>
            )}

            {/* CONTACT */}
            <div className="mt-16 grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="rounded-[32px] border border-emerald-500/15 bg-gradient-to-br from-emerald-500/10 to-transparent p-8">
                    <div className="mb-3 flex items-center gap-2">
                        <Mail size={16} className="text-emerald-400" />
                        <h3 className="text-xs font-black uppercase tracking-tighter text-zinc-100">Still stuck?</h3>
                    </div>
                    <p className="mb-6 text-[11px] leading-relaxed text-zinc-400">
                        If something looks off or you have a question this page didn't answer, send us a note and
                        we'll get back to you.
                    </p>
                    <a
                        href={`mailto:${SUPPORT_EMAIL}?subject=NeoV6%20support`}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-6 py-3 text-[10px] font-black uppercase tracking-widest text-black shadow-lg transition hover:bg-emerald-400"
                    >
                        <Mail size={14} /> Email support
                    </a>
                </div>
                <div className="rounded-[32px] border border-zinc-800 bg-zinc-900 p-8">
                    <div className="mb-3 flex items-center gap-2">
                        <BookOpen size={16} className="text-sky-400" />
                        <h3 className="text-xs font-black uppercase tracking-tighter text-zinc-100">Learn as you go</h3>
                    </div>
                    <p className="text-[11px] leading-relaxed text-zinc-400">
                        The Fleet Command dashboard explains itself in context — hover the readiness meters, open a
                        coin to see which check is holding a bot back, and watch the drift monitor to judge whether
                        the fleet is behaving as validated. The best way to understand NeoV6 is to start it and watch.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default HelpCenter;
