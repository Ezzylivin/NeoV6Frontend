// File: src/pages/TradingReports.jsx
// Sovereign Live Terminal — Trading Report Page
//
// Data source: GET /api/bot/status?userId={address}
// Computes all metrics client-side from trade_history + equityCurve arrays.
// No new backend endpoints required.

import React, { useState, useEffect, useMemo, useCallback } from "react";
import axios from "axios";
import { useAccount } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import {
    AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip as RechartsTooltip, ResponsiveContainer, ReferenceLine, Cell
} from "recharts";
import {
    TrendingUp, TrendingDown, Activity, DollarSign, Award,
    AlertTriangle, RefreshCw, Download, ArrowUpRight, ArrowDownRight,
    BarChart2, Clock, Target, Zap, Shield, ChevronUp, ChevronDown,
    FileText, Filter, X
} from "lucide-react";

// ─── URL ─────────────────────────────────────────────────────────────────────
import { BACKEND_URL } from "../config/api.js";
const BASE_URL = BACKEND_URL;
const API_BASE = `${BASE_URL}/api`;
const api      = axios.create({ baseURL: API_BASE });

// ─── STYLE TOKENS ─────────────────────────────────────────────────────────────
const CARD    = "bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-xl";
const SECTION = "bg-zinc-900 border border-zinc-800 rounded-[32px] p-8 shadow-2xl";
const MONO    = "font-mono font-black tracking-tighter";
const LABEL   = "text-[10px] text-zinc-500 uppercase font-black tracking-[0.15em]";

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const fmt$  = (n, decimals = 2) =>
    `${n >= 0 ? "+" : ""}$${Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
const fmtPct = (n, decimals = 1) => `${n >= 0 ? "+" : ""}${n.toFixed(decimals)}%`;
const fmtTime = (ts) => {
    if (!ts) return "—";
    const d = typeof ts === "number" ? new Date(ts > 1e12 ? ts : ts * 1000) : new Date(ts);
    return d.toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
};

function computeMaxDrawdown(equityCurve) {
    if (!equityCurve?.length) return 0;
    let peak = -Infinity, maxDD = 0;
    for (const pt of equityCurve) {
        const bal = pt.balance ?? 0;
        if (bal > peak) peak = bal;
        const dd = peak > 0 ? ((peak - bal) / peak) * 100 : 0;
        if (dd > maxDD) maxDD = dd;
    }
    return maxDD;
}

function groupByMonth(trades) {
    const map = {};
    for (const t of trades) {
        if (t.type !== "exit") continue;
        const ts  = t.time > 1e12 ? t.time : t.time * 1000;
        const key = new Date(ts).toLocaleDateString("en-US", { month: "short", year: "2-digit" });
        map[key]  = (map[key] || 0) + (parseFloat(t.pnl) || 0);
    }
    return Object.entries(map).map(([month, pnl]) => ({ month, pnl: parseFloat(pnl.toFixed(2)) }));
}

function buildDurationBuckets(trades) {
    // Group closed trades by hold time into buckets
    const buckets = { "<5m": 0, "5–30m": 0, "30m–2h": 0, "2–8h": 0, ">8h": 0 };
    for (const t of trades) {
        if (t.type !== "exit" || !t.time || !t.entryTime) continue;
        const mins = (t.time - t.entryTime) / 60000;
        if      (mins < 5)   buckets["<5m"]++;
        else if (mins < 30)  buckets["5–30m"]++;
        else if (mins < 120) buckets["30m–2h"]++;
        else if (mins < 480) buckets["2–8h"]++;
        else                 buckets[">8h"]++;
    }
    return Object.entries(buckets).map(([label, count]) => ({ label, count }));
}

// ─── METRIC CARD ─────────────────────────────────────────────────────────────
const KpiCard = ({ label, value, sub, color = "text-white", icon: Icon, accent }) => (
    <div className={`${CARD} flex flex-col justify-between min-h-[110px]`}>
        <div className="flex items-center justify-between mb-3">
            <p className={LABEL}>{label}</p>
            {Icon && <Icon size={14} className={color} />}
        </div>
        <div>
            <p className={`text-2xl ${MONO} ${color}`}>{value}</p>
            {sub && <p className="text-[10px] text-zinc-500 font-black uppercase mt-1">{sub}</p>}
        </div>
        {accent !== undefined && (
            <div className="mt-3 h-0.5 bg-zinc-800 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-700"
                     style={{ width: `${Math.min(100, Math.max(0, accent))}%`, background: color.includes("emerald") ? "#10b981" : color.includes("rose") ? "#ef4444" : "#a78bfa" }} />
            </div>
        )}
    </div>
);

// ─── TRADE ROW ────────────────────────────────────────────────────────────────
const TradeRow = ({ trade, seed, idx }) => {
    const pnl      = parseFloat(trade.pnl || 0);
    const isWin    = pnl >= 0;
    const isLong   = (trade.side || trade.type || "") === "long";
    const entry    = parseFloat(trade.entry || 0);
    const exitP    = parseFloat(trade.price || trade.exit || 0);
    const pnlPct   = entry > 0 && exitP > 0 ? ((exitP - entry) / entry * 100 * (isLong ? 1 : -1)).toFixed(2) : "—";
    const reason   = trade.reason || "exit";

    return (
        <tr className={`border-b border-zinc-800/50 hover:bg-zinc-800/20 transition-all ${idx === 0 ? "animate-in fade-in duration-300" : ""}`}>
            <td className="px-4 py-3 text-[10px] text-zinc-500 font-mono whitespace-nowrap">{fmtTime(trade.time)}</td>
            <td className="px-4 py-3">
                <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded border ${
                    isLong ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
                           : "text-rose-400 bg-rose-500/10 border-rose-500/20"
                }`}>
                    {isLong ? "▲ Long" : "▼ Short"}
                </span>
            </td>
            <td className="px-4 py-3 text-[11px] font-mono text-zinc-300">
                {entry > 0 ? `$${entry.toLocaleString("en-US", { minimumFractionDigits: 2 })}` : "—"}
            </td>
            <td className="px-4 py-3 text-[11px] font-mono text-zinc-300">
                {exitP > 0 ? `$${exitP.toLocaleString("en-US", { minimumFractionDigits: 2 })}` : "—"}
            </td>
            <td className={`px-4 py-3 text-[11px] ${MONO} ${isWin ? "text-emerald-400" : "text-rose-500"}`}>
                {fmt$(pnl)}
            </td>
            <td className={`px-4 py-3 text-[10px] font-mono ${isWin ? "text-emerald-400/70" : "text-rose-500/70"}`}>
                {pnlPct !== "—" ? fmtPct(parseFloat(pnlPct)) : "—"}
            </td>
            <td className="px-4 py-3">
                <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${
                    reason.includes("Profit") ? "text-emerald-400 bg-emerald-500/10" :
                    reason.includes("Stop")   ? "text-amber-400 bg-amber-500/10"    :
                                                "text-zinc-400 bg-zinc-800"
                }`}>{reason}</span>
            </td>
        </tr>
    );
};

// ─── CUSTOM RECHARTS TOOLTIP ──────────────────────────────────────────────────
const DarkTooltip = ({ active, payload, label, prefix = "$", suffix = "" }) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 shadow-2xl font-mono text-[10px]">
            <p className="text-zinc-500 mb-1">{label}</p>
            {payload.map((p, i) => (
                <p key={i} style={{ color: p.color }} className="font-black">
                    {p.name}: {prefix}{typeof p.value === "number" ? p.value.toFixed(2) : p.value}{suffix}
                </p>
            ))}
        </div>
    );
};

// ─── MAIN PAGE ─────────────────────────────────────────────────────────────────
const TradingReports = () => {
    const { address, isConnected } = useAccount();

    const [rawData,    setRawData]    = useState(null);
    const [loading,    setLoading]    = useState(false);
    const [error,      setError]      = useState(null);
    const [sideFilter, setSideFilter] = useState("all");   // all | long | short
    const [outcomeFilter, setOutcomeFilter] = useState("all"); // all | win | loss
    const [reasonFilter,  setReasonFilter]  = useState("all"); // all | TP | SL
    const [sortKey,    setSortKey]    = useState("time");
    const [sortDir,    setSortDir]    = useState("desc");
    const [page,       setPage]       = useState(0);
    const PAGE_SIZE = 15;

    // ── FETCH ─────────────────────────────────────────────────────────────────
    const fetchData = useCallback(async () => {
        if (!address) return;
        setLoading(true);
        setError(null);
        try {
            const token = localStorage.getItem("token");
            const res   = await api.get(`/bot/status?userId=${address}`,
                { headers: { Authorization: `Bearer ${token}` } });
            setRawData(res.data);
        } catch (e) {
            setError(e.response?.status === 401 ? "Session expired. Please reconnect wallet." : "Failed to load report data.");
        } finally {
            setLoading(false);
        }
    }, [address]);

    useEffect(() => { fetchData(); }, [fetchData]);

    // ── RAW TRADES ────────────────────────────────────────────────────────────
    const allTrades = useMemo(() => {
        if (!rawData) return [];
        const source = rawData.tradeHistory || rawData.trade_history || rawData.tradeMarkers || [];
        return source.filter(t => t.type === "exit" || t.side);
    }, [rawData]);

    const equityCurve = useMemo(() => rawData?.equityCurve || [], [rawData]);
    const seed        = useMemo(() => rawData?.initialCapital || rawData?.config?.capitalAllocation || 1000, [rawData]);

    // ── KPI METRICS ───────────────────────────────────────────────────────────
    const metrics = useMemo(() => {
        if (!allTrades.length) return null;

        const exits     = allTrades;
        const wins      = exits.filter(t => parseFloat(t.pnl || 0) > 0);
        const losses    = exits.filter(t => parseFloat(t.pnl || 0) <= 0);
        const totalPnl  = exits.reduce((s, t) => s + parseFloat(t.pnl || 0), 0);
        const winRate   = (wins.length / exits.length) * 100;
        const grossProfit = wins.reduce((s, t) => s + parseFloat(t.pnl || 0), 0);
        const grossLoss   = Math.abs(losses.reduce((s, t) => s + parseFloat(t.pnl || 0), 0));
        const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 99 : 0;
        const avgWin    = wins.length  ? grossProfit / wins.length   : 0;
        const avgLoss   = losses.length ? grossLoss   / losses.length : 0;
        const bestTrade  = Math.max(...exits.map(t => parseFloat(t.pnl || 0)));
        const worstTrade = Math.min(...exits.map(t => parseFloat(t.pnl || 0)));
        const avgTrade   = totalPnl / exits.length;
        const maxDrawdown = computeMaxDrawdown(equityCurve);
        const expectancy  = (winRate / 100) * avgWin - ((100 - winRate) / 100) * avgLoss;

        // Longest win/loss streaks
        let curStreak = 0, maxWinStreak = 0, maxLossStreak = 0;
        let streakType = "";
        for (const t of exits) {
            const won = parseFloat(t.pnl || 0) > 0;
            if (streakType === "" || (won && streakType === "win") || (!won && streakType === "loss")) {
                curStreak++;
            } else {
                curStreak = 1;
                streakType = won ? "win" : "loss";
            }
            if (!streakType) streakType = won ? "win" : "loss";
            if (streakType === "win"  && curStreak > maxWinStreak)  maxWinStreak  = curStreak;
            if (streakType === "loss" && curStreak > maxLossStreak) maxLossStreak = curStreak;
        }

        const longs  = exits.filter(t => (t.side || t.type || "") === "long");
        const shorts = exits.filter(t => (t.side || t.type || "") === "short");
        const longPnl  = longs.reduce((s, t) => s + parseFloat(t.pnl || 0), 0);
        const shortPnl = shorts.reduce((s, t) => s + parseFloat(t.pnl || 0), 0);

        const tpExits = exits.filter(t => (t.reason || "").includes("Profit")).length;
        const slExits = exits.filter(t => (t.reason || "").includes("Stop")).length;

        const currentBalance = rawData?.currentBalance || rawData?.balance || seed;
        const totalReturn    = seed > 0 ? ((currentBalance - seed) / seed) * 100 : 0;

        return {
            totalPnl, winRate, profitFactor, avgWin, avgLoss,
            bestTrade, worstTrade, avgTrade, maxDrawdown, expectancy,
            totalTrades: exits.length, wins: wins.length, losses: losses.length,
            maxWinStreak, maxLossStreak,
            longs: longs.length, shorts: shorts.length, longPnl, shortPnl,
            tpExits, slExits, totalReturn, currentBalance, seed
        };
    }, [allTrades, equityCurve, rawData, seed]);

    // ── CHART DATA ────────────────────────────────────────────────────────────
    const monthlyPnl = useMemo(() => groupByMonth(allTrades), [allTrades]);

    const equityForChart = useMemo(() => {
        if (!equityCurve.length) return [];
        return equityCurve.map(pt => ({
            time:       typeof pt.time === "string"
                            ? new Date(pt.time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                            : pt.time,
            balance:    pt.balance,
            confidence: pt.confidence
        }));
    }, [equityCurve]);

    const equityDomain = useMemo(() => {
        if (!equityForChart.length) return [seed * 0.95, seed * 1.05];
        const vals = equityForChart.map(p => p.balance);
        const lo = Math.min(...vals), hi = Math.max(...vals);
        const pad = (hi - lo) * 0.12 || seed * 0.02;
        return [Math.floor(lo - pad), Math.ceil(hi + pad)];
    }, [equityForChart, seed]);

    const winLossDist = useMemo(() => {
        if (!metrics) return [];
        return [
            { name: "Wins",     value: metrics.wins,   fill: "#10b981" },
            { name: "Losses",   value: metrics.losses, fill: "#ef4444" },
        ];
    }, [metrics]);

    const exitReasonDist = useMemo(() => {
        if (!metrics) return [];
        return [
            { name: "Take Profit",   value: metrics.tpExits, fill: "#10b981" },
            { name: "Trailing Stop", value: metrics.slExits,  fill: "#f59e0b" },
            { name: "Other",         value: metrics.totalTrades - metrics.tpExits - metrics.slExits, fill: "#6b7280" },
        ].filter(d => d.value > 0);
    }, [metrics]);

    // ── FILTERED + SORTED TABLE ───────────────────────────────────────────────
    const filteredTrades = useMemo(() => {
        let t = [...allTrades];
        if (sideFilter    !== "all") t = t.filter(tr => (tr.side || tr.type || "") === sideFilter);
        if (outcomeFilter !== "all") t = t.filter(tr => outcomeFilter === "win" ? parseFloat(tr.pnl || 0) > 0 : parseFloat(tr.pnl || 0) <= 0);
        if (reasonFilter  !== "all") t = t.filter(tr => (tr.reason || "").toLowerCase().includes(reasonFilter.toLowerCase()));
        t.sort((a, b) => {
            let va, vb;
            if (sortKey === "time")  { va = a.time || 0; vb = b.time || 0; }
            else if (sortKey === "pnl") { va = parseFloat(a.pnl || 0); vb = parseFloat(b.pnl || 0); }
            else if (sortKey === "entry") { va = parseFloat(a.entry || 0); vb = parseFloat(b.entry || 0); }
            else { va = a[sortKey] || ""; vb = b[sortKey] || ""; }
            return sortDir === "asc" ? (va > vb ? 1 : -1) : (va < vb ? 1 : -1);
        });
        return t;
    }, [allTrades, sideFilter, outcomeFilter, reasonFilter, sortKey, sortDir]);

    const pageCount  = Math.max(1, Math.ceil(filteredTrades.length / PAGE_SIZE));
    const pageTrades = filteredTrades.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

    const sortToggle = (key) => {
        if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
        else { setSortKey(key); setSortDir("desc"); }
        setPage(0);
    };

    const SortIcon = ({ col }) => sortKey === col
        ? (sortDir === "asc" ? <ChevronUp size={10} className="inline ml-1" /> : <ChevronDown size={10} className="inline ml-1" />)
        : <ChevronDown size={10} className="inline ml-1 opacity-20" />;

    // ── CSV EXPORT ────────────────────────────────────────────────────────────
    const handleExport = () => {
        const rows = [["Time", "Side", "Entry", "Exit", "PnL", "PnL%", "Reason"]];
        for (const t of filteredTrades) {
            const entry = parseFloat(t.entry || 0);
            const exitP = parseFloat(t.price || t.exit || 0);
            const pnl   = parseFloat(t.pnl || 0);
            const isLong = (t.side || t.type || "") === "long";
            const pnlPct = entry > 0 && exitP > 0 ? ((exitP - entry) / entry * 100 * (isLong ? 1 : -1)).toFixed(2) : "";
            rows.push([fmtTime(t.time), t.side || t.type || "", entry.toFixed(2), exitP.toFixed(2), pnl.toFixed(2), pnlPct, t.reason || ""]);
        }
        const csv  = rows.map(r => r.join(",")).join("\n");
        const blob = new Blob([csv], { type: "text/csv" });
        const url  = URL.createObjectURL(blob);
        const a    = Object.assign(document.createElement("a"), { href: url, download: "trading_report.csv" });
        a.click();
        URL.revokeObjectURL(url);
    };

    // ── RENDER ────────────────────────────────────────────────────────────────
    const isProfit = (metrics?.totalPnl ?? 0) >= 0;

    return (
        <div className="min-h-screen bg-zinc-950 text-white font-sans p-6 overflow-x-hidden">

            {/* ── HEADER ── */}
            <header className="max-w-[1800px] mx-auto mb-10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-violet-500 rounded-2xl flex items-center justify-center shadow-lg">
                        <FileText className="text-black w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="text-lg font-black uppercase tracking-widest">
                            Sovereign <span className="text-violet-400">Reports</span>
                        </h1>
                        <p className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.2em]">
                            Performance Intelligence Terminal
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {rawData && (
                        <div className="text-[10px] text-zinc-500 font-mono font-black uppercase px-3 py-1.5 border border-zinc-800 rounded-lg">
                            {allTrades.length} trades · session
                        </div>
                    )}
                    <button
                        onClick={handleExport}
                        disabled={!allTrades.length}
                        className="flex items-center gap-2 px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-700 transition-all font-black text-[10px] uppercase tracking-wider disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                        <Download size={12} /> Export CSV
                    </button>
                    <button
                        onClick={fetchData}
                        disabled={loading}
                        className="flex items-center gap-2 px-4 py-2 bg-violet-500/10 border border-violet-500/20 rounded-xl text-violet-400 hover:bg-violet-500 hover:text-black transition-all font-black text-[10px] uppercase tracking-wider disabled:opacity-50"
                    >
                        <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> Refresh
                    </button>
                    <ConnectButton />
                </div>
            </header>

            {/* ── NOT CONNECTED ── */}
            {!isConnected && (
                <div className="max-w-[1800px] mx-auto flex flex-col items-center justify-center py-40 gap-6">
                    <div className="p-5 bg-violet-500/10 rounded-2xl border border-violet-500/20">
                        <FileText className="text-violet-400" size={32} />
                    </div>
                    <p className="text-[11px] text-zinc-500 font-black uppercase tracking-widest">Connect wallet to view reports</p>
                    <ConnectButton />
                </div>
            )}

            {/* ── ERROR ── */}
            {isConnected && error && (
                <div className="max-w-[1800px] mx-auto flex flex-col items-center justify-center py-32 gap-4">
                    <AlertTriangle size={28} className="text-rose-500" />
                    <p className="text-[11px] text-zinc-400 font-black uppercase tracking-widest">{error}</p>
                    <button onClick={fetchData} className="px-6 py-2 bg-zinc-800 rounded-xl text-zinc-300 font-black text-[10px] uppercase">
                        Retry
                    </button>
                </div>
            )}

            {/* ── LOADING ── */}
            {isConnected && loading && !rawData && (
                <div className="max-w-[1800px] mx-auto flex flex-col items-center justify-center py-40 gap-4">
                    <RefreshCw size={24} className="text-violet-400 animate-spin" />
                    <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">Compiling intelligence...</p>
                </div>
            )}

            {/* ── NO DATA ── */}
            {isConnected && !loading && rawData && !allTrades.length && (
                <div className="max-w-[1800px] mx-auto flex flex-col items-center justify-center py-32 gap-6">
                    <div className="p-5 bg-zinc-900 rounded-2xl border border-zinc-800">
                        <BarChart2 className="text-zinc-600" size={32} />
                    </div>
                    <div className="text-center">
                        <p className="text-[11px] text-zinc-400 font-black uppercase tracking-widest mb-2">No closed trades yet</p>
                        <p className="text-[10px] text-zinc-600 font-bold">Start a trading session to generate report data.</p>
                    </div>
                </div>
            )}

            {/* ── MAIN REPORT ── */}
            {isConnected && !error && metrics && (
                <div className="max-w-[1800px] mx-auto space-y-8 animate-in fade-in duration-700">

                    {/* ── KPI STRIP ── */}
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
                        <KpiCard label="Total P&L"     value={fmt$(metrics.totalPnl)} color={isProfit ? "text-emerald-400" : "text-rose-500"} icon={DollarSign} accent={Math.abs(metrics.totalReturn)} />
                        <KpiCard label="Total Return"  value={fmtPct(metrics.totalReturn)} color={metrics.totalReturn >= 0 ? "text-emerald-400" : "text-rose-500"} icon={TrendingUp} />
                        <KpiCard label="Win Rate"      value={`${metrics.winRate.toFixed(1)}%`} color="text-violet-400" icon={Target} accent={metrics.winRate} />
                        <KpiCard label="Profit Factor" value={metrics.profitFactor >= 99 ? "∞" : metrics.profitFactor.toFixed(2)} color={metrics.profitFactor >= 1.5 ? "text-emerald-400" : metrics.profitFactor >= 1 ? "text-amber-400" : "text-rose-500"} icon={Zap} />
                        <KpiCard label="Total Trades"  value={metrics.totalTrades} sub={`${metrics.wins}W · ${metrics.losses}L`} color="text-zinc-300" icon={Activity} />
                        <KpiCard label="Expectancy"    value={fmt$(metrics.expectancy)} sub="per trade" color={metrics.expectancy >= 0 ? "text-emerald-400" : "text-rose-500"} icon={Award} />
                        <KpiCard label="Max Drawdown"  value={`-${metrics.maxDrawdown.toFixed(1)}%`} color={metrics.maxDrawdown < 5 ? "text-emerald-400" : metrics.maxDrawdown < 15 ? "text-amber-400" : "text-rose-500"} icon={Shield} />
                        <KpiCard label="Best Trade"    value={fmt$(metrics.bestTrade)} color="text-emerald-400" icon={ArrowUpRight} />
                    </div>

                    {/* ── SECONDARY KPI STRIP ── */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className={CARD}>
                            <p className={`${LABEL} mb-3`}>Long vs Short</p>
                            <div className="flex gap-4">
                                <div>
                                    <p className="text-[9px] text-emerald-500/60 font-black uppercase mb-0.5">Long</p>
                                    <p className={`text-lg ${MONO} ${metrics.longPnl >= 0 ? "text-emerald-400" : "text-rose-500"}`}>{fmt$(metrics.longPnl)}</p>
                                    <p className="text-[9px] text-zinc-500 font-bold">{metrics.longs} trades</p>
                                </div>
                                <div className="w-px bg-zinc-800 self-stretch" />
                                <div>
                                    <p className="text-[9px] text-rose-500/60 font-black uppercase mb-0.5">Short</p>
                                    <p className={`text-lg ${MONO} ${metrics.shortPnl >= 0 ? "text-emerald-400" : "text-rose-500"}`}>{fmt$(metrics.shortPnl)}</p>
                                    <p className="text-[9px] text-zinc-500 font-bold">{metrics.shorts} trades</p>
                                </div>
                            </div>
                        </div>
                        <div className={CARD}>
                            <p className={`${LABEL} mb-3`}>Avg Win vs Avg Loss</p>
                            <div className="flex gap-4">
                                <div>
                                    <p className="text-[9px] text-emerald-500/60 font-black uppercase mb-0.5">Avg Win</p>
                                    <p className={`text-lg ${MONO} text-emerald-400`}>{fmt$(metrics.avgWin)}</p>
                                </div>
                                <div className="w-px bg-zinc-800 self-stretch" />
                                <div>
                                    <p className="text-[9px] text-rose-500/60 font-black uppercase mb-0.5">Avg Loss</p>
                                    <p className={`text-lg ${MONO} text-rose-500`}>-${metrics.avgLoss.toFixed(2)}</p>
                                </div>
                            </div>
                        </div>
                        <div className={CARD}>
                            <p className={`${LABEL} mb-3`}>Exit Breakdown</p>
                            <div className="flex gap-4">
                                <div>
                                    <p className="text-[9px] text-emerald-500/60 font-black uppercase mb-0.5">Take Profit</p>
                                    <p className={`text-lg ${MONO} text-emerald-400`}>{metrics.tpExits}</p>
                                    <p className="text-[9px] text-zinc-500 font-bold">
                                        {metrics.totalTrades > 0 ? ((metrics.tpExits / metrics.totalTrades) * 100).toFixed(0) : 0}%
                                    </p>
                                </div>
                                <div className="w-px bg-zinc-800 self-stretch" />
                                <div>
                                    <p className="text-[9px] text-amber-500/60 font-black uppercase mb-0.5">Trail Stop</p>
                                    <p className={`text-lg ${MONO} text-amber-400`}>{metrics.slExits}</p>
                                    <p className="text-[9px] text-zinc-500 font-bold">
                                        {metrics.totalTrades > 0 ? ((metrics.slExits / metrics.totalTrades) * 100).toFixed(0) : 0}%
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className={CARD}>
                            <p className={`${LABEL} mb-3`}>Streak Records</p>
                            <div className="flex gap-4">
                                <div>
                                    <p className="text-[9px] text-emerald-500/60 font-black uppercase mb-0.5">Best Win</p>
                                    <p className={`text-lg ${MONO} text-emerald-400`}>{metrics.maxWinStreak}<span className="text-[10px] text-zinc-500"> in a row</span></p>
                                </div>
                                <div className="w-px bg-zinc-800 self-stretch" />
                                <div>
                                    <p className="text-[9px] text-rose-500/60 font-black uppercase mb-0.5">Worst Loss</p>
                                    <p className={`text-lg ${MONO} text-rose-500`}>{metrics.maxLossStreak}<span className="text-[10px] text-zinc-500"> in a row</span></p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ── EQUITY CURVE ── */}
                    {equityForChart.length > 0 && (
                        <div className={SECTION}>
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h3 className="text-[11px] font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2">
                                        <TrendingUp size={14} className={isProfit ? "text-emerald-400" : "text-rose-400"} />
                                        Session Equity Curve
                                    </h3>
                                    <p className="text-[9px] text-zinc-600 font-bold uppercase mt-1">Balance over session time</p>
                                </div>
                                <div className="text-right">
                                    <p className={`text-2xl ${MONO} ${isProfit ? "text-emerald-400" : "text-rose-500"}`}>
                                        ${(metrics.currentBalance || seed).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                                    </p>
                                    <p className={`text-[10px] font-black mt-0.5 ${isProfit ? "text-emerald-500/60" : "text-rose-500/60"}`}>
                                        {fmtPct(metrics.totalReturn)} from ${seed.toLocaleString()}
                                    </p>
                                </div>
                            </div>
                            <div className="h-56 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={equityForChart} margin={{ top: 5, right: 5, left: -5, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="eqGradProfit" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%"  stopColor="#10b981" stopOpacity={0.25} />
                                                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                            </linearGradient>
                                            <linearGradient id="eqGradLoss" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%"  stopColor="#ef4444" stopOpacity={0.25} />
                                                <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" opacity={0.15} vertical={false} />
                                        <ReferenceLine y={seed} stroke="#52525b" strokeDasharray="4 4" opacity={0.4} />
                                        <RechartsTooltip content={<DarkTooltip prefix="$" />} />
                                        <Area type="monotone" dataKey="balance" name="Equity"
                                              stroke={isProfit ? "#10b981" : "#ef4444"}
                                              fill={isProfit ? "url(#eqGradProfit)" : "url(#eqGradLoss)"}
                                              strokeWidth={2.5} dot={false} isAnimationActive={false} />
                                        <XAxis dataKey="time" hide />
                                        <YAxis hide domain={equityDomain} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    )}

                    {/* ── MONTHLY P&L + WIN-LOSS DISTRIBUTION ── */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                        {/* Monthly P&L */}
                        <div className={`${SECTION} lg:col-span-2`}>
                            <h3 className="text-[11px] font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2 mb-6">
                                <BarChart2 size={14} className="text-violet-400" /> Monthly P&L
                            </h3>
                            {monthlyPnl.length > 0 ? (
                                <div className="h-48">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={monthlyPnl} margin={{ top: 5, right: 5, left: -5, bottom: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" opacity={0.15} vertical={false} />
                                            <XAxis dataKey="month" tick={{ fill: "#52525b", fontSize: 10, fontFamily: "monospace" }} axisLine={false} tickLine={false} />
                                            <YAxis hide />
                                            <ReferenceLine y={0} stroke="#52525b" />
                                            <RechartsTooltip content={<DarkTooltip prefix="$" />} />
                                            <Bar dataKey="pnl" name="P&L" radius={[4, 4, 0, 0]}>
                                                {monthlyPnl.map((entry, i) => (
                                                    <Cell key={i} fill={entry.pnl >= 0 ? "#10b981" : "#ef4444"} fillOpacity={0.8} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            ) : (
                                <div className="h-48 flex items-center justify-center text-zinc-600 text-[10px] font-black uppercase tracking-widest">
                                    Insufficient history for monthly breakdown
                                </div>
                            )}
                        </div>

                        {/* Win / Loss donut */}
                        <div className={SECTION}>
                            <h3 className="text-[11px] font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2 mb-6">
                                <Target size={14} className="text-amber-400" /> Outcome Split
                            </h3>
                            <div className="h-48 flex items-center justify-center relative">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={[
                                        { label: "Win Rate",  value: metrics.winRate,           fill: "#10b981" },
                                        { label: "Loss Rate", value: 100 - metrics.winRate,      fill: "#ef4444" },
                                    ]} layout="vertical" margin={{ top: 0, right: 40, left: 0, bottom: 0 }}>
                                        <XAxis type="number" hide domain={[0, 100]} />
                                        <YAxis type="category" dataKey="label" tick={{ fill: "#71717a", fontSize: 9, fontFamily: "monospace", fontWeight: 700, textTransform: "uppercase" }} axisLine={false} tickLine={false} width={56} />
                                        <RechartsTooltip content={<DarkTooltip prefix="" suffix="%" />} />
                                        <Bar dataKey="value" name="Pct" radius={[0, 4, 4, 0]}>
                                            {[{ fill: "#10b981" }, { fill: "#ef4444" }].map((c, i) => (
                                                <Cell key={i} fill={c.fill} fillOpacity={0.8} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="border-t border-zinc-800 pt-4 grid grid-cols-2 gap-2 text-center">
                                <div>
                                    <p className="text-[9px] text-zinc-500 font-black uppercase">Wins</p>
                                    <p className={`text-xl ${MONO} text-emerald-400`}>{metrics.wins}</p>
                                </div>
                                <div>
                                    <p className="text-[9px] text-zinc-500 font-black uppercase">Losses</p>
                                    <p className={`text-xl ${MONO} text-rose-500`}>{metrics.losses}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ── TRADE HISTORY TABLE ── */}
                    <div className={SECTION}>
                        {/* Table header + filters */}
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                            <h3 className="text-[11px] font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2">
                                <Clock size={14} className="text-zinc-400" />
                                Trade History
                                <span className="text-zinc-600 font-bold normal-case text-[10px] tracking-normal">
                                    ({filteredTrades.length} of {allTrades.length})
                                </span>
                            </h3>
                            <div className="flex items-center gap-2 flex-wrap">
                                {/* Side filter */}
                                {[
                                    { key: "all",   label: "All" },
                                    { key: "long",  label: "Long"  },
                                    { key: "short", label: "Short" },
                                ].map(f => (
                                    <button key={f.key} onClick={() => { setSideFilter(f.key); setPage(0); }}
                                        className={`px-3 py-1 rounded-lg font-black text-[9px] uppercase tracking-wider border transition-all ${
                                            sideFilter === f.key ? "bg-violet-500/20 border-violet-500/40 text-violet-400" : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-zinc-300"
                                        }`}>{f.label}</button>
                                ))}
                                <div className="w-px h-4 bg-zinc-800" />
                                {/* Outcome filter */}
                                {[
                                    { key: "all",  label: "All" },
                                    { key: "win",  label: "Wins"   },
                                    { key: "loss", label: "Losses" },
                                ].map(f => (
                                    <button key={f.key} onClick={() => { setOutcomeFilter(f.key); setPage(0); }}
                                        className={`px-3 py-1 rounded-lg font-black text-[9px] uppercase tracking-wider border transition-all ${
                                            outcomeFilter === f.key ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400" : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-zinc-300"
                                        }`}>{f.label}</button>
                                ))}
                                <div className="w-px h-4 bg-zinc-800" />
                                {/* Reason filter */}
                                {[
                                    { key: "all",    label: "All"  },
                                    { key: "Profit", label: "TP"   },
                                    { key: "Stop",   label: "SL"   },
                                ].map(f => (
                                    <button key={f.key} onClick={() => { setReasonFilter(f.key); setPage(0); }}
                                        className={`px-3 py-1 rounded-lg font-black text-[9px] uppercase tracking-wider border transition-all ${
                                            reasonFilter === f.key ? "bg-amber-500/20 border-amber-500/40 text-amber-400" : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-zinc-300"
                                        }`}>{f.label}</button>
                                ))}
                                {(sideFilter !== "all" || outcomeFilter !== "all" || reasonFilter !== "all") && (
                                    <button onClick={() => { setSideFilter("all"); setOutcomeFilter("all"); setReasonFilter("all"); setPage(0); }}
                                        className="flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-black text-rose-400 border border-rose-500/20 bg-rose-500/5 hover:bg-rose-500/10 transition-all uppercase">
                                        <X size={9} /> Clear
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Table */}
                        <div className="overflow-x-auto custom-scrollbar rounded-2xl border border-zinc-800/60">
                            <table className="w-full min-w-[640px]">
                                <thead>
                                    <tr className="border-b border-zinc-800 bg-zinc-950/60">
                                        {[
                                            { key: "time",   label: "Time"        },
                                            { key: "side",   label: "Side"        },
                                            { key: "entry",  label: "Entry"       },
                                            { key: "price",  label: "Exit"        },
                                            { key: "pnl",    label: "Net P&L"     },
                                            { key: "pnlpct", label: "P&L %"       },
                                            { key: "reason", label: "Exit Reason" },
                                        ].map(col => (
                                            <th key={col.key}
                                                onClick={() => col.key !== "pnlpct" && sortToggle(col.key)}
                                                className={`px-4 py-3 text-left text-[9px] font-black uppercase tracking-widest text-zinc-500 whitespace-nowrap ${col.key !== "pnlpct" ? "cursor-pointer hover:text-zinc-300" : ""} transition-colors`}>
                                                {col.label}
                                                {col.key !== "pnlpct" && <SortIcon col={col.key} />}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {pageTrades.length > 0 ? (
                                        pageTrades.map((t, i) => (
                                            <TradeRow key={`${t.time}-${i}`} trade={t} seed={seed} idx={i} />
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={7} className="px-4 py-16 text-center text-zinc-600 text-[10px] font-black uppercase tracking-widest">
                                                No trades match filters
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        {pageCount > 1 && (
                            <div className="flex items-center justify-between mt-5">
                                <p className="text-[10px] text-zinc-500 font-mono font-bold">
                                    Page {page + 1} of {pageCount} · {filteredTrades.length} trades
                                </p>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
                                        className="px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-400 text-[9px] font-black uppercase disabled:opacity-30 hover:bg-zinc-700 transition-all">
                                        ← Prev
                                    </button>
                                    {Array.from({ length: Math.min(5, pageCount) }, (_, i) => {
                                        const pg = Math.max(0, Math.min(page - 2, pageCount - 5)) + i;
                                        return (
                                            <button key={pg} onClick={() => setPage(pg)}
                                                className={`w-7 h-7 rounded-lg font-black text-[9px] transition-all ${pg === page ? "bg-violet-500 text-black" : "bg-zinc-800 border border-zinc-700 text-zinc-400 hover:bg-zinc-700"}`}>
                                                {pg + 1}
                                            </button>
                                        );
                                    })}
                                    <button onClick={() => setPage(p => Math.min(pageCount - 1, p + 1))} disabled={page >= pageCount - 1}
                                        className="px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-400 text-[9px] font-black uppercase disabled:opacity-30 hover:bg-zinc-700 transition-all">
                                        Next →
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* ── FOOTER DISCLAIMER ── */}
                    <div className="pb-10 text-center">
                        <p className="text-[9px] text-zinc-700 font-bold uppercase tracking-widest">
                            Data reflects current session only · Past performance does not guarantee future results
                        </p>
                    </div>

                </div>
            )}
        </div>
    );
};

export default TradingReports;
