// File: src/pages/TradingBot.jsx
// Production rewrite — fixes applied:
//   [P1] botData ReferenceError → calculatedStats
//   [P2] STRAT_COLORS hoisted to module scope
//   [P3] axios instance moved outside component
//   [P4] enable_shorting boolean/string select mismatch
//   [P5] prompt() / window.confirm() replaced with modals
//   [P6] ErrorBoundary wrapping chart and ops panels
//   [P7] Strategy keys use stable id, not array index
//   [P8] minVotesRequired >= 1 after strategy removal
//   [P9] Initial status fetch with retry + visible error state
//   [P10] Halt button shows pending state during async stop
//   [TOGGLE] Integrated enablePartialExit toggle interface inside the Risk Protocol component layout
//   [CHART-FIX-1] bot_status_update socket handler: comprehensive snake_case/camelCase dual-handling
//                 for currentBalance, signals_map, current_confidence, current_price, exposure,
//                 active_positions, initial_capital, ai_regime_title/desc — mirrors the existing
//                 tradeHistory/trade_history pattern that was already correct.
//   [CHART-FIX-2] NeuralConvergenceChart: replaced flex-1/min-h-[300px] wrapper with an
//                 absolute-inset pattern so Recharts ResizeObserver always measures a real
//                 pixel height rather than an indeterminate flex residual.

import React, { useState, useEffect, useRef, useMemo, Component } from "react";
import axios from "axios";
import { useAccount } from "wagmi";
import { ConnectButton } from '@rainbow-me/rainbowkit';
import toast, { Toaster } from "react-hot-toast";
import { io } from "socket.io-client";
import { useBot } from "../hooks/useBot";
import { UIModeProvider } from "../context/UIModeContext";
import { LiveTradingChart } from "../components/LiveTradingChart.jsx";
import {
    Plus, Trash2, Shield, Globe, Cpu, Filter, TrendingUp,
    Activity, Scale, Power, RefreshCw, Wallet, Wifi, WifiOff,
    ArrowUpRight, Clock, Box, Timer, DollarSign, Info, BarChart, Settings2, Zap, ArrowDownRight,
    CandlestickChart, AlertTriangle, RotateCcw, Eraser, Book,
    HelpCircle, ShieldAlert, CheckCircle2, AlertCircle, Eye, EyeOff, Key, X
} from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import "./TradingBot.css";
import "../styles/Themes.css";

// ─── URL CONSTANTS ─────────────────────────────────────────────────────────────
const RAW_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
const BASE_URL = RAW_URL.replace(/\/$/, "").replace(/\/api$/, "");
const API_BASE = `${BASE_URL}/api`;
const SOCKET_URL = BASE_URL;

// ─── AXIOS INSTANCE ──────────────────────────────────────────────────────────
const api = axios.create({ baseURL: API_BASE });

// ─── STYLE CONSTANTS ───────────────────────────────────────────────────────────
const inputClass = "w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:border-emerald-500 transition-all text-[11px] outline-none font-mono";
const labelClass = "text-[10px] text-zinc-500 uppercase font-black mb-1 block ml-1 tracking-tighter";

// ─── STRAT_COLORS ────────────────────────────────────────────────────────────
const STRAT_COLORS = {
    rsi_threshold: "#3b82f6",
    sma_crossover: "#ef4444",
    supertrend:    "#10b981",
    macd_crossover: "#f59e0b",
    atr_breakout:  "#8b5cf6",
    bb_fade:       "#ec4899",
    stoch:         "#06b6d4",
    ema_cloud:     "#f97316",
    pa_breakout:   "#14b8a6",
    vol_profile:   "#a855f7"
};

// ─── DATA CONSTANTS ────────────────────────────────────────────────────────────
const COIN_PAIRS = ["BTC-USD","ETH-USD","SOL-USD","DOGE-USD","ADA-USD","XRP-USD","SUI-USD","PEPE-USD"];
const TIMEFRAMES = ["1m","5m","15m","1h","4h","1d"];

const STRAT_POOL = [
    { name: "RSI Threshold",       code: "rsi_threshold"  },
    { name: "SMA Crossover",       code: "sma_crossover"  },
    { name: "SuperTrend Follow",   code: "supertrend"     },
    { name: "MACD Crossover",      code: "macd_crossover" },
    { name: "ATR Breakout",        code: "atr_breakout"   },
    { name: "Bollinger Band Fade", code: "bb_fade"         },
    { name: "Stochastic Osc",      code: "stoch"          },
    { name: "EMA Cloud",           code: "ema_cloud"      },
    { name: "Price Action Break",  code: "pa_breakout"    },
    { name: "Volume Profile",      code: "vol_profile"    }
];

const MODEL_POOL = [
    { id: "xgboost",      name: "XGBoost (Gradient Boost)"  },
    { id: "randomforest", name: "Random Forest (Ensemble)"  },
    { id: "transformer",  name: "LSTM (Deep Temporal)"      },
    { id: "stacking",     name: "Stacking Hybrid (Meta)"    }
];

const DEFAULT_STRATEGY_PARAMS = {
    rsi_threshold: { rsi_length: 14, oversold: 30, overbought: 70 },
    sma_crossover: { fast_sma: 50, slow_sma: 200 },
    supertrend:    { st_atr: 10, st_factor: 3.0 },
    macd_crossover:{ fast: 12, slow: 26, signal: 9 },
    atr_breakout:  { atr_length: 14, multiplier: 1.5 },
    bb_fade:       { bb_period: 20, bb_std: 2.0 },
    stoch:         { k_period: 14, d_period: 3 },
    ema_cloud:     { fast_ema: 9, slow_ema: 21 },
    pa_breakout:   { lookback: 20, buffer: 0.01 },
    vol_profile:   { vol_ma: 20, threshold: 1.5 }
};

// ─── HELPERS ───────────────────────────────────────────────────────────────────
const parseLog = (log) => {
    if (!log) return "";
    const msg = typeof log === 'string' ? log : (log.message || log.msg || JSON.stringify(log));
    return msg.replace(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d+Z\s*/, '');
};

const formatTime = (isoString) => {
    if (!isoString) return "";
    return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
};

const getLogStyle = (msg) => {
    const text = msg.toUpperCase();
    if (text.includes("VETOED") || text.includes("STALKING SHORT") || text.includes("SHORT GATE") || text.includes("BLOCKED"))
        return 'text-rose-400 bg-rose-500/10 border-rose-500/20';
    if (text.includes("PASSED") || text.includes("STALKING LONG") || text.includes("LONG GATE"))
        return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
    if (text.includes("UPTREND") || text.includes("BULLISH") || text.includes("MOMENTUM IGNITION") || text.includes("ENTERED LONG"))
        return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
    if (text.includes("DOWNTREND") || text.includes("BEARISH") || text.includes("ENTERED SHORT"))
        return 'text-rose-400 bg-rose-500/10 border-rose-500/20';
    if (text.includes("TRADE") || text.includes("PARTIAL") || text.includes("CLOSED") || text.includes("EXIT"))
        return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
    if (text.includes("REGIME") || text.includes("NEUTRAL") || text.includes("CHOP") || text.includes("ADX") || text.includes("VOLATIL"))
        return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
    return 'text-zinc-400 bg-zinc-900 border-zinc-800/80';
};

const makeStrategyId = () => `strat_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

const getLogMeta = (msg) => {
    const t = msg.toUpperCase();
    if (t.includes('TRADE') || t.includes('PARTIAL') || t.includes('SCALE-OUT') ||
        t.includes('OPENED') || t.includes('ENTERING') || t.includes('TRIMMED'))
        return { Icon: TrendingUp,  textColor: 'text-amber-400',  wrapClass: 'bg-amber-500/10 border-amber-500/20'  };
    if (t.includes('PASSED') || t.includes('LONG GATE') || t.includes('STALKING LONG') ||
        t.includes('BULLISH') || t.includes('UPTREND') || t.includes('EXPANSION'))
        return { Icon: ArrowUpRight, textColor: 'text-emerald-400', wrapClass: 'bg-emerald-500/10 border-emerald-500/20' };
    if (t.includes('VETOED') || t.includes('SHORT GATE') || t.includes('STALKING SHORT') ||
        t.includes('BEARISH') || t.includes('DOWNTREND') || t.includes('CONTRACTION'))
        return { Icon: ShieldAlert,  textColor: 'text-rose-400',  wrapClass: 'bg-rose-500/10 border-rose-500/20'   };
    if (t.includes('SIGNAL') || t.includes('RSI') || t.includes('MACD') ||
        t.includes('EMA') || t.includes('ATR') || t.includes('GATE'))
        return { Icon: Zap,          textColor: 'text-violet-400', wrapClass: 'bg-violet-500/10 border-violet-500/20' };
    if (t.includes('REGIME') || t.includes('MINDSET') || t.includes('ADX') || t.includes('VOLATIL'))
        return { Icon: Globe,        textColor: 'text-blue-400',   wrapClass: 'bg-blue-500/10 border-blue-500/20'   };
    return { Icon: Activity, textColor: 'text-zinc-500', wrapClass: 'bg-zinc-900 border-zinc-800' };
};

// ─── ERROR BOUNDARY ───────────────────────────────────────────────────────
class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }
    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }
    componentDidCatch(error, info) {
        console.error("[ErrorBoundary]", error, info);
    }
    render() {
        if (this.state.hasError) {
            return (
                <div className="flex flex-col items-center justify-center h-full p-8 text-center gap-4">
                    <div className="p-4 bg-rose-500/10 rounded-2xl border border-rose-500/20">
                        <AlertTriangle className="text-rose-500" size={24} />
                    </div>
                    <div>
                        <p className="text-zinc-300 text-[11px] font-black uppercase tracking-widest mb-1">Component Error</p>
                        <p className="text-zinc-600 text-[10px] font-mono">{this.state.error?.message || "Unknown render failure"}</p>
                    </div>
                    <button
                        onClick={() => this.setState({ hasError: false, error: null })}
                        className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg text-zinc-300 text-[9px] font-black uppercase tracking-widest transition-all"
                    >
                        Retry
                    </button>
                </div>
            );
        }
        return this.props.children;
    }
}

// ─── SMALL UI COMPONENTS ───────────────────────────────────────────────────────
const CheckItem = ({ label, status }) => (
    <div className="flex items-center justify-between p-4 bg-black/40 rounded-xl border border-zinc-800">
        <span className="text-[10px] text-zinc-400 font-bold uppercase">{label}</span>
        {status
            ? <span className="text-emerald-500 text-[9px] font-black tracking-widest">✔ READY</span>
            : <span className="text-rose-500 text-[9px] font-black tracking-widest">MISSING</span>}
    </div>
);

const MetricCard = ({ label, value, subValue, color = "text-white", icon = null }) => (
    <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl relative overflow-hidden shadow-xl">
        <p className="text-[10px] text-zinc-500 uppercase font-black tracking-[0.15em] mb-2">{label}</p>
        <div className="flex flex-col gap-1">
            <div className="flex items-center gap-1.5">
                {icon && <span className={color}>{icon}</span>}
                <p className={`text-xl font-mono font-black tracking-tighter ${color}`}>{value}</p>
            </div>
            {subValue && <p className="text-[10px] font-black text-zinc-600 uppercase tracking-wide">{subValue}</p>}
        </div>
    </div>
);

// ─── CONFIDENCE RING CARD ─────────────────────────────────────────────────────
const ConfidenceRingCard = ({ confidence }) => {
    const score = confidence ?? 50;
    const color = score > 70 ? '#10b981' : score > 40 ? '#a78bfa' : '#ef4444';
    const label = score > 85 ? 'STRONG BUY' : score > 70 ? 'BUY' : score < 20 ? 'STRONG VETO' : score < 35 ? 'VETO' : 'NEUTRAL';
    const circumference = 2 * Math.PI * 20;
    const offset = circumference - (score / 100) * circumference;
    return (
        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl shadow-xl flex flex-col items-center justify-center">
            <p className="text-[10px] text-zinc-500 uppercase font-black tracking-[0.15em] mb-2">AI Confidence</p>
            <div className="relative w-14 h-14">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 48 48">
                    <circle cx="24" cy="24" r="20" fill="none" stroke="#27272a" strokeWidth="4" />
                    <circle cx="24" cy="24" r="20" fill="none" stroke={color} strokeWidth="4"
                        strokeDasharray={circumference} strokeDashoffset={offset}
                        strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.7s ease' }} />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                    <span className="font-mono font-black text-sm" style={{ color }}>{score}%</span>
                </div>
            </div>
            <p className="text-[8px] font-black uppercase tracking-widest mt-2" style={{ color }}>{label}</p>
        </div>
    );
};

// ─── POSITION CARD ────────────────────────────────────────────────────────────
const PositionCard = ({ pos, currentPrice, defaultSymbol, onExit, isExiting }) => {
    const symbol = pos.symbol || defaultSymbol;
    const price = currentPrice || 0;
    const pnl = pos.type === 'long'
        ? (price - pos.entry) * pos.size
        : (pos.entry - price) * pos.size;
    const costBasis = (pos.entry || 0) * (pos.size || 0);
    const pnlPct = costBasis > 0 ? ((pnl / costBasis) * 100).toFixed(2) : '0.00';
    const isProfit = pnl >= 0;
    const tslDist = pos.tsl && price ? ((Math.abs(price - pos.tsl) / price) * 100).toFixed(2) : '—';
    return (
        <div className={`p-4 bg-zinc-950/80 rounded-2xl border ${isProfit ? 'border-emerald-500/20' : 'border-rose-500/20'} shadow-inner`}>
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full animate-pulse ${pos.type === 'long' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                    <span className="text-[10px] font-black uppercase tracking-widest text-zinc-300">{symbol}</span>
                    <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded border ${pos.type === 'long' ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : 'text-rose-400 bg-rose-500/10 border-rose-500/20'}`}>
                        {pos.type}
                    </span>
                </div>
                <button
                    onClick={() => onExit(symbol)}
                    disabled={isExiting}
                    className="px-3 py-1 bg-zinc-800 hover:bg-rose-500/20 border border-zinc-700 hover:border-rose-500/40 text-zinc-400 hover:text-rose-400 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all disabled:opacity-40"
                >
                    {isExiting ? 'Exiting...' : 'Close'}
                </button>
            </div>
            <div className="grid grid-cols-3 gap-2 text-[10px] font-mono">
                <div>
                    <p className="text-zinc-600 uppercase font-black text-[8px] mb-0.5">Entry</p>
                    <p className="text-zinc-300 font-black">${Number(pos.entry || 0).toFixed(2)}</p>
                </div>
                <div>
                    <p className="text-zinc-600 uppercase font-black text-[8px] mb-0.5">Unrealized PnL</p>
                    <p className={`font-black ${isProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {isProfit ? '+' : ''}${pnl.toFixed(2)} ({pnlPct}%)
                    </p>
                </div>
                <div>
                    <p className="text-zinc-600 uppercase font-black text-[8px] mb-0.5">TSL Distance</p>
                    <p className="text-amber-400 font-black">{tslDist}%</p>
                </div>
            </div>
        </div>
    );
};

// ─── TRADE TIMELINE CARD ──────────────────────────────────────────────────────
const TradeTimelineCard = ({ trade }) => {
    const isProfit = (trade.pnl ?? 0) >= 0;
    const time = trade.time
        ? (typeof trade.time === 'number' ? new Date(trade.time).toLocaleTimeString() : formatTime(trade.time))
        : '—';
    return (
        <div className={`p-3 rounded-xl border ${isProfit ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-rose-500/20 bg-rose-500/5'}`}>
            <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                    <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${isProfit ? 'text-emerald-400 bg-emerald-500/10' : 'text-rose-400 bg-rose-500/10'}`}>
                        {trade.side || trade.type || 'TRADE'}
                    </span>
                    <span className="text-zinc-500 text-[9px] font-bold uppercase">{trade.reason || 'exit'}</span>
                </div>
                <span className={`font-mono text-[11px] font-black ${isProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {isProfit ? '+' : ''}${Number(trade.pnl ?? 0).toFixed(2)}
                </span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-[9px] font-mono text-zinc-500">
                <span>Entry: ${Number(trade.entry || 0).toFixed(2)}</span>
                <span>Exit: ${Number(trade.price || 0).toFixed(2)}</span>
                <span className="text-right">{time}</span>
            </div>
        </div>
    );
};

// ─── STRATEGY PARAM INPUTS ────────────────────────────────────────────────────
const StrategyParamInputs = ({ strategy, onChange }) => {
    const params = strategy.params || {};
    const floatKeys = new Set(['st_factor', 'bb_std', 'buffer', 'threshold', 'multiplier', 'atr_tp_mult', 'atr_sl_mult']);
    return (
        <div className="grid grid-cols-2 gap-2">
            {Object.entries(params).map(([key, val]) => (
                <div key={key}>
                    <label className="text-[8px] font-black uppercase text-zinc-600 tracking-widest block mb-0.5">
                        {key.replace(/_/g, ' ')}
                    </label>
                    <input
                        type="number"
                        value={val}
                        step={floatKeys.has(key) ? 0.1 : 1}
                        onChange={(e) => {
                            const parsed = floatKeys.has(key) ? parseFloat(e.target.value) : parseInt(e.target.value);
                            onChange({ ...params, [key]: isNaN(parsed) ? val : parsed });
                        }}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-zinc-300 outline-none font-mono text-[10px] focus:border-amber-500/50 transition-colors"
                    />
                </div>
            ))}
        </div>
    );
};

// ─── PRE-FLIGHT MODAL ─────────────────────────────────────────────────────────
const PreFlightModal = ({ config, onConfirm, onCancel, isStarting, hasApiKeys, address }) => {
    const isLive = config.tradingMode === 'live';
    const checks = [
        { label: 'Wallet Connected',    status: !!address },
        { label: 'Capital Allocated',   status: !!config.capitalAllocation && config.capitalAllocation > 0 },
        { label: 'Strategy Selected',   status: (config.strategies?.length ?? 0) > 0 },
        { label: 'Symbol Configured',   status: !!config.symbol },
        { label: 'API Keys Present',    status: !isLive || hasApiKeys },
    ];
    const allPass = checks.every(c => c.status);
    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-md">
            <div className="max-w-md w-full mx-4 bg-zinc-900 border border-zinc-800 rounded-[32px] p-8 shadow-2xl">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                        <Shield size={18} className="text-emerald-400" />
                    </div>
                    <div>
                        <h3 className="text-[13px] font-black uppercase tracking-widest text-white">Pre-Flight Check</h3>
                        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mt-0.5">
                            {isLive ? '⚠️ LIVE CAPITAL MODE' : 'Paper Simulation Mode'}
                        </p>
                    </div>
                </div>
                <div className="space-y-2 mb-6">
                    {checks.map(c => <CheckItem key={c.label} label={c.label} status={c.status} />)}
                </div>
                <div className="p-3 bg-zinc-950/80 border border-zinc-800 rounded-xl mb-6 space-y-1.5 text-[10px] font-mono text-zinc-400">
                    <div className="flex justify-between"><span className="text-zinc-600 uppercase font-black">Symbol</span><span>{config.symbol}</span></div>
                    <div className="flex justify-between"><span className="text-zinc-600 uppercase font-black">Capital</span><span className="text-emerald-400">${config.capitalAllocation}</span></div>
                    <div className="flex justify-between"><span className="text-zinc-600 uppercase font-black">Strategies</span><span>{config.strategies?.length || 0}</span></div>
                    <div className="flex justify-between"><span className="text-zinc-600 uppercase font-black">ML Mode</span><span className="text-violet-400">{(config.mlMode || 'off').toUpperCase()}</span></div>
                    <div className="flex justify-between"><span className="text-zinc-600 uppercase font-black">Routing</span><span>{config.enable_shorting ? 'Margin (Kraken)' : 'Spot (Coinbase)'}</span></div>
                </div>
                <div className="flex gap-3">
                    <button onClick={onCancel} className="flex-1 py-3 border border-zinc-700 rounded-xl text-zinc-400 font-black uppercase text-[10px] hover:bg-zinc-800 transition-all">
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={isStarting || !allPass}
                        className="flex-1 py-3 bg-emerald-500 text-black rounded-xl font-black uppercase text-[10px] hover:bg-emerald-400 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {isStarting ? <><RefreshCw size={12} className="animate-spin" /> Igniting...</> : 'Ignite Engine'}
                    </button>
                </div>
            </div>
        </div>
    );
};

// ─── API KEY MODAL ────────────────────────────────────────────────────────────
const ApiKeyModal = ({ exchange, onSave, onCancel }) => {
    const isKraken = exchange === 'kraken';
    const [key, setKey] = useState('');
    const [secret, setSecret] = useState('');
    const [showKey, setShowKey] = useState(false);
    const [showSecret, setShowSecret] = useState(false);

    const handleSave = () => {
        if (!key || !secret) { toast.error("Both fields are required."); return; }
        if (isKraken) {
            localStorage.setItem("kraken_key", key);
            localStorage.setItem("kraken_secret", secret);
        } else {
            localStorage.setItem("coinbase_key", key);
            localStorage.setItem("coinbase_secret", secret);
        }
        onSave();
    };

    return (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/90 backdrop-blur-md">
            <div className="max-w-sm w-full mx-4 bg-zinc-900 border border-zinc-800 rounded-[32px] p-8 shadow-2xl">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-500/10 rounded-xl border border-amber-500/20">
                            <Key size={16} className="text-amber-400" />
                        </div>
                        <div>
                            <h3 className="text-[12px] font-black uppercase tracking-widest text-white">
                                {isKraken ? 'Kraken' : 'Coinbase'} API Keys
                            </h3>
                            <p className="text-[9px] text-zinc-500 font-bold uppercase mt-0.5">Stored locally only</p>
                        </div>
                    </div>
                    <button onClick={onCancel} className="text-zinc-600 hover:text-white transition-all"><X size={16} /></button>
                </div>
                <div className="space-y-4 mb-6">
                    <div>
                        <label className={labelClass}>API Key</label>
                        <div className="relative">
                            <input
                                type={showKey ? 'text' : 'password'}
                                value={key}
                                onChange={e => setKey(e.target.value)}
                                placeholder="Enter API key..."
                                className={`${inputClass} pr-10`}
                            />
                            <button onClick={() => setShowKey(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors">
                                {showKey ? <EyeOff size={13} /> : <Eye size={13} />}
                            </button>
                        </div>
                    </div>
                    <div>
                        <label className={labelClass}>API Secret</label>
                        <div className="relative">
                            <input
                                type={showSecret ? 'text' : 'password'}
                                value={secret}
                                onChange={e => setSecret(e.target.value)}
                                placeholder="Enter API secret..."
                                className={`${inputClass} pr-10`}
                            />
                            <button onClick={() => setShowSecret(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors">
                                {showSecret ? <EyeOff size={13} /> : <Eye size={13} />}
                            </button>
                        </div>
                    </div>
                </div>
                <div className="flex gap-3">
                    <button onClick={onCancel} className="flex-1 py-3 border border-zinc-700 rounded-xl text-zinc-400 font-black uppercase text-[10px] hover:bg-zinc-800 transition-all">Cancel</button>
                    <button onClick={handleSave} className="flex-1 py-3 bg-amber-500 text-black rounded-xl font-black uppercase text-[10px] hover:bg-amber-400 transition-all">Save Keys</button>
                </div>
            </div>
        </div>
    );
};

// ─── CONFIRM MODAL ────────────────────────────────────────────────────────────
const ConfirmModal = ({ title, message, danger, onConfirm, onCancel }) => (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/90 backdrop-blur-md">
        <div className="max-w-sm w-full mx-4 bg-zinc-900 border border-zinc-800 rounded-[32px] p-8 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
                <div className={`p-2 rounded-xl border ${danger ? 'bg-rose-500/10 border-rose-500/20' : 'bg-amber-500/10 border-amber-500/20'}`}>
                    <AlertTriangle size={16} className={danger ? 'text-rose-400' : 'text-amber-400'} />
                </div>
                <h3 className="text-[12px] font-black uppercase tracking-widest text-white">{title}</h3>
            </div>
            <p className="text-[11px] text-zinc-400 font-medium mb-6 leading-relaxed">{message}</p>
            <div className="flex gap-3">
                <button onClick={onCancel} className="flex-1 py-3 border border-zinc-700 rounded-xl text-zinc-400 font-black uppercase text-[10px] hover:bg-zinc-800 transition-all">Cancel</button>
                <button
                    onClick={onConfirm}
                    className={`flex-1 py-3 rounded-xl font-black uppercase text-[10px] transition-all ${danger ? 'bg-rose-500 hover:bg-rose-400 text-white' : 'bg-amber-500 hover:bg-amber-400 text-black'}`}
                >
                    Confirm
                </button>
            </div>
        </div>
    </div>
);

const ProximityTickerPanel = ({ latestSignals, aiScore, formConfig }) => {
    const metrics = useMemo(() => {
        const longLimit  = parseFloat(formConfig.mlThresholdLong  || 0.55) * 100;
        const shortLimit = parseFloat(formConfig.mlThresholdShort || 0.55) * 100;

        const mlTarget   = aiScore >= 50 ? longLimit : shortLimit;
        const mlDelta    = Math.abs(aiScore - mlTarget).toFixed(0);
        const mlStatus   = aiScore >= longLimit || aiScore <= shortLimit ? "🟢 READY" : "🟡 PENDING";

        const bbVal    = Math.round(latestSignals['bb_fade'] || latestSignals['bb_wall'] || 0);
        const bbDelta  = Math.abs(100 - bbVal);
        const bbStatus = bbVal >= 95 ? "🔴 CRITICAL" : bbVal >= 75 ? "🟡 WARNING" : "⚪ IDLE";

        const rsiVal    = Math.round(latestSignals['rsi_threshold'] || latestSignals['rsi'] || 0);
        const rsiDelta  = Math.abs(70 - rsiVal);
        const rsiStatus = rsiVal >= 70 || rsiVal <= 30 ? "🟢 READY" : "⚪ STALKING";

        const stochVal    = Math.round(latestSignals['stoch'] || 0);
        const stochStatus = stochVal >= 80 || stochVal <= 20 ? "🟢 READY" : "⚪ IDLE";

        return [
            { id: "ml",    name: "Neural Prediction Gate", cur: `${aiScore}%`,   tgt: `${mlTarget}%`,    delta: `${mlDelta}%`, status: mlStatus    },
            { id: "bb",    name: "Bollinger Boundary Vol",  cur: `${bbVal}%`,    tgt: "100%",            delta: `${bbDelta}%`, status: bbStatus    },
            { id: "rsi",   name: "Momentum RSI Gateway",    cur: `${rsiVal}%`,   tgt: "70% / 30%",       delta: `${rsiDelta}%`,status: rsiStatus   },
            { id: "stoch", name: "Stochastic Overbought",   cur: `${stochVal}%`, tgt: "80% / 20%",       delta: "—",           status: stochStatus }
        ];
    }, [latestSignals, aiScore, formConfig]);

    return (
        <div className="bg-zinc-950/60 border border-zinc-800 rounded-2xl p-4 flex flex-col gap-2 shadow-inner w-full min-w-0 overflow-hidden">
            <div className="flex items-center gap-1.5 border-b border-zinc-800/60 pb-1.5 mb-1 shrink-0">
                <Filter size={13} className="text-amber-400" />
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Proximity Ticker Monitor</span>
            </div>
            <div className="space-y-2 flex-1 overflow-x-hidden min-w-0">
                {metrics.map(m => {
                    const statusColor = m.status.includes("READY") || m.status.includes("CRITICAL")
                        ? "text-emerald-400 font-black animate-pulse"
                        : m.status.includes("WARNING") || m.status.includes("PENDING")
                            ? "text-amber-400 font-bold"
                            : "text-zinc-500";
                    return (
                        <div key={m.id} className="grid grid-cols-12 gap-2 text-[10px] font-mono border-b border-zinc-900/40 pb-1.5 last:border-0 last:pb-0 items-center min-w-0">
                            <span className="col-span-5 text-zinc-400 uppercase tracking-tight truncate pr-1">{m.name}</span>
                            <span className="col-span-2 text-zinc-200 text-right truncate font-bold">{m.cur}</span>
                            <span className="col-span-2 text-zinc-500 text-right truncate">Δ {m.delta}</span>
                            <span className={`col-span-3 text-right uppercase text-[9px] truncate ${statusColor}`}>{m.status}</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

// ─── NEURAL CONVERGENCE CHART ──────────────────────────────────────────────────
// ✅ CHART-FIX-2: The original used `flex-1 w-full min-h-[300px]` as the direct parent
//   of <ResponsiveContainer height="100%">. Recharts uses ResizeObserver to derive its
//   canvas dimensions from the DOM node; a flex-grow child with only a min-height
//   constraint has no resolvable computed height — ResizeObserver measures 0px and the
//   chart never paints.
//   Fix: wrap in `flex-1 relative` (minHeight:0 collapses the implicit minimum so the
//   flex parent can distribute height correctly) then render an `absolute inset-0` div
//   that gives the ResizeObserver a real, stable pixel boundary to measure.
const NeuralConvergenceChart = ({ signalsMapHistory, formConfig }) => {
    const activeStratCodes = useMemo(() => {
        if (!signalsMapHistory || signalsMapHistory.length === 0) return [];
        const keys = new Set();
        signalsMapHistory.forEach(item => {
            Object.keys(item).forEach(key => { if (key !== 'time' && key !== 'timestamp') keys.add(key); });
        });
        return Array.from(keys);
    }, [signalsMapHistory]);

    const userStratCodes = formConfig?.strategies?.map(s => s.code) || [];
    const isAiOverriding = userStratCodes.length !== activeStratCodes.length || !userStratCodes.every(c => activeStratCodes.includes(c));

    return (
        <div className="bg-zinc-900 border border-zinc-800 rounded-[32px] p-6 shadow-2xl h-full flex flex-col">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-6 flex items-center gap-2">
                <Cpu size={12} className="text-violet-400" /> Neural Strategy Logic
            </h4>

            {/* ✅ CHART-FIX-2: absolute-inset wrapper gives ResizeObserver a real pixel height */}
            <div className="flex-1 w-full relative" style={{ minHeight: 0 }}>
                <div className="absolute inset-0">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={signalsMapHistory} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                            <defs>
                                {activeStratCodes.map(key => (
                                    <linearGradient key={`grad-${key}`} id={`color-${key}`} x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%"  stopColor={STRAT_COLORS[key] || '#52525b'} stopOpacity={0.3} />
                                        <stop offset="95%" stopColor={STRAT_COLORS[key] || '#52525b'} stopOpacity={0} />
                                    </linearGradient>
                                ))}
                            </defs>
                            <RechartsTooltip
                                shared={false}
                                trigger="hover"
                                contentStyle={{ backgroundColor: '#09090b', border: '1px solid #27272a', borderRadius: '12px', fontSize: '10px', pointerEvents: 'none' }}
                                formatter={(value, name) => [`${Number(value).toFixed(0)}%`, name.toUpperCase()]}
                            />
                            {activeStratCodes.map(key => (
                                <Area
                                    key={key}
                                    type="monotone"
                                    dataKey={key}
                                    name={key.replace('_', ' ')}
                                    stroke={STRAT_COLORS[key] || '#52525b'}
                                    fill={`url(#color-${key})`}
                                    strokeWidth={2}
                                    dot={false}
                                    activeDot={{ r: 4, strokeWidth: 0 }}
                                    isAnimationActive={false}
                                    connectNulls={true}
                                />
                            ))}
                            <XAxis dataKey="time" hide />
                            <YAxis domain={[0, 100]} hide />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-4 border-t border-zinc-800 pt-4">
                <div className="flex flex-col gap-1.5 border-r border-zinc-800 pr-2">
                    <span className="text-[7px] font-black tracking-widest text-zinc-600 uppercase">👤 User Setup</span>
                    <div className="flex flex-wrap gap-2">
                        {userStratCodes.map(code => (
                            <div key={`user-${code}`} className="flex items-center gap-1 opacity-40">
                                <div className="w-1 h-1 rounded-full bg-zinc-500"></div>
                                <span style={{ color: STRAT_COLORS[code] || '#a1a1aa' }} className="text-[8px] font-bold uppercase font-mono tracking-tight">{code.replace('_', ' ')}</span>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="flex flex-col gap-1.5 pl-2">
                    <span className="text-[7px] font-black tracking-widest uppercase">
                        {isAiOverriding ? <span className="text-violet-400 animate-pulse">🤖 AI Active Regime</span> : <span className="text-emerald-400">⚙️ Manual Engine</span>}
                    </span>
                    <div className="flex flex-wrap gap-2">
                        {activeStratCodes.map(code => (
                            <div key={`active-${code}`} className="flex items-center gap-1">
                                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: STRAT_COLORS[code] || '#52525b' }}></div>
                                <span style={{ color: STRAT_COLORS[code] || '#52525b' }} className="text-[8px] font-black uppercase font-mono tracking-tight">{code.replace('_', ' ')}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

const SignalBarsPanel = ({ signalsMapHistory, formConfig }) => {
    const latestSignals = useMemo(() => {
        if (!signalsMapHistory?.length) return {};
        return signalsMapHistory[signalsMapHistory.length - 1] || {};
    }, [signalsMapHistory]);

    const activeCodes = useMemo(() => {
        if (!signalsMapHistory?.length) return (formConfig?.strategies?.map(s => s.code) || []).slice(0, 5);
        const keys = new Set();
        signalsMapHistory.slice(-50).forEach(item => {
            Object.keys(item).forEach(k => { if (k !== 'time' && k !== 'timestamp') keys.add(k); });
        });
        return Array.from(keys).slice(0, 5);
    }, [signalsMapHistory, formConfig]);

    const consensus = activeCodes.length > 0 ? activeCodes.reduce((sum, code) => sum + (latestSignals[code] || 0), 0) / activeCodes.length : 0;
    const consColor = consensus > 60 ? '#10b981' : consensus > 40 ? '#f59e0b' : '#ef4444';
    const consClass = consensus > 60 ? 'text-emerald-400' : consensus > 40 ? 'text-amber-400' : 'text-rose-500';

    return (
        <div className="bg-zinc-900 border border-zinc-800 rounded-[32px] p-5 shadow-2xl">
            <div className="flex items-center justify-between mb-3">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                    <Activity size={10} className="text-amber-400" /> Signal Bars
                </h4>
                <span className={`font-mono text-sm font-black ${consClass}`}>{Math.round(consensus)}% consensus</span>
            </div>
            <div className="mb-3 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-700" style={{ width: `${consensus}%`, background: consColor }} />
            </div>
            <div className="space-y-2">
                {activeCodes.map(code => {
                    const val   = latestSignals[code] || 0;
                    const color = STRAT_COLORS[code] || '#52525b';
                    const name  = STRAT_POOL.find(s => s.code === code)?.name?.split(' ')[0] || code;
                    return (
                        <div key={code} className="flex items-center justify-between gap-4 py-0.5">
                            <span className="text-[10px] font-black uppercase text-zinc-400 w-[80px] truncate shrink-0">{name}</span>
                            <div className="flex-1 h-2 bg-zinc-950 border border-zinc-800/80 rounded-full overflow-hidden">
                                <div className="h-full rounded-full transition-all duration-700" style={{ width: `${val}%`, background: color, opacity: 0.85 }} />
                            </div>
                            <div className="flex items-center gap-1.5 w-[45px] justify-end shrink-0">
                                <div className="w-2 h-2 rounded-full shrink-0" style={{ background: val > 50 ? '#10b981' : '#ef4444' }} />
                                <span className="font-mono text-[11px] font-black" style={{ color }}>{Math.round(val)}%</span>
                            </div>
                        </div>
                    );
                })}
                {activeCodes.length === 0 && <p className="text-[11px] text-zinc-600 italic text-center py-1">Awaiting signal data...</p>}
            </div>
        </div>
    );
};

// ─── MAIN CONTAINER COMPONENT ──────────────────────────────────────────────────
const TradingBotContainer = () => {
    const {
        startBot, stopBot, resetBot, closePosition,
        refreshState, restoredConfig,
        botStatus: hookBotStatus, logs: hookLogs
    } = useBot();
    const { isConnected, address } = useAccount();

    const [isModeSelected, setIsModeSelected]   = useState(false);
    const [hasApiKeys, setHasApiKeys]           = useState(false);
    const [showPreFlight, setShowPreFlight]     = useState(false);
    const [isStarting, setIsStarting]           = useState(false);
    const [isHalting, setIsHalting]              = useState(false);
    const [paperBalance, setPaperBalance]       = useState(1000);
    const [modeStep, setModeStep]               = useState('selection');
    const [activeOpsTab, setActiveOpsTab]       = useState("live");
    const [statusFetchError, setStatusFetchError] = useState(null);

    const [apiKeyModal, setApiKeyModal]         = useState(null);
    const [confirmModal, setConfirmModal]       = useState(null);

    const socketRef        = useRef(null);
    const logContainerRef  = useRef(null);
    const [isHaltLocked, setIsHaltLocked]   = useState(false);
    const [socketLogs, setSocketLogs]       = useState([]);
    const [socketConnected, setSocketConnected] = useState(false);
    const [uptime, setUptime]               = useState("00:00:00");
    const [exitingSymbols, setExitingSymbols] = useState([]);
    const [socketStatus, setSocketStatus]   = useState({
        status: 'stopped', currentBalance: 0, unrealizedPnl: 0, exposure: 0,
        positions: [], equityCurve: [], startedAt: null, dailyProfit: 0,
        initialCapital: 0, tradeMarkers: [], signalsMapHistory: []
    });

    const [formConfig, setFormConfig] = useState({
        symbol: "BTC-USD",
        timeframe: "1h",
        capitalAllocation: 1000,
        tradingMode: "paper",
        strategies: [{ id: makeStrategyId(), code: "rsi_threshold", params: DEFAULT_STRATEGY_PARAMS.rsi_threshold }],
        mlMode: "off",
        mlModel: "stacking",
        mlThresholdLong: 0.55,
        mlThresholdShort: 0.55,
        riskManagementMode: "static",
        riskPercentage: 1,
        maxDailyLoss: 5,
        maxDrawdown: 10,
        maxTradesPerDay: 20,
        hybridMode: "AND",
        minVotesRequired: 1,
        enable_shorting: false,
        leverage: 1,
        slippageTolerance: 0.5,
        maxPyramiding: 1,
        params: { atr_tp_mult: 3.0, atr_sl_mult: 1.5 },
        minAdx: 20,
        minVolRatio: 0.8,
        minWeightedSignal: 0.3,
        enablePartialExit: false,
        filters: { trend_filter: "none", vol_min: 0, atr_filter: 0 }
    });

    const isBotRunning = socketStatus.status === 'running' && !isHaltLocked;

    // ── COMPUTED MATRIX VALUES UNIFICATION ──────────────────────────────────
    const latestSignals = useMemo(() => {
        if (!socketStatus.signalsMapHistory?.length) return {};
        return socketStatus.signalsMapHistory[socketStatus.signalsMapHistory.length - 1] || {};
    }, [socketStatus.signalsMapHistory]);

    const currentActiveStrategyCodes = useMemo(() => {
        if (socketStatus.signalsMapHistory?.length > 0) {
            const keys = new Set();
            socketStatus.signalsMapHistory.forEach(item => {
                Object.keys(item).forEach(key => { if (key !== 'time' && key !== 'timestamp') keys.add(key); });
            });
            return Array.from(keys);
        }
        return formConfig.strategies.map(s => s.code) || [];
    }, [socketStatus.signalsMapHistory, formConfig.strategies]);

    const sessionDelta = useMemo(() => {
        const current = socketStatus.currentBalance || formConfig.capitalAllocation;
        const starting = socketStatus.initialCapital || formConfig.capitalAllocation;
        const change = current - starting;
        const percentage = (change / (starting || 1)) * 100;
        return { change, percentage, isProfit: change >= 0 };
    }, [socketStatus.currentBalance, socketStatus.initialCapital, formConfig.capitalAllocation]);

    const profitMetrics = useMemo(() => {
        const seed = socketStatus.initialCapital || formConfig.capitalAllocation || 1;
        const dPct = ((socketStatus.dailyProfit || 0) / seed) * 100;
        const uPct = ((socketStatus.unrealizedPnl || 0) / seed) * 100;
        return { startCap: seed, profitPct: dPct, pnlPct: uPct };
    }, [socketStatus.initialCapital, socketStatus.dailyProfit, socketStatus.unrealizedPnl, formConfig.capitalAllocation]);

    const { startCap, profitPct, pnlPct } = profitMetrics;

    const activeBalance = socketStatus.currentBalance ?? formConfig.capitalAllocation;

    const calculatedStats = useMemo(() => {
        const allTrades = socketStatus.tradeHistory || socketStatus.trade_history || socketStatus.tradeMarkers || [];
        const exits = allTrades.filter(t => t.pnl !== undefined);
        if (!exits.length) return { winRate: "0.0", profitFactor: 0 };
        const wins = exits.filter(t => t.pnl > 0);
        const winRate = ((wins.length / exits.length) * 100).toFixed(1);
        const grossProfit = wins.reduce((sum, t) => sum + t.pnl, 0);
        const grossLoss = Math.abs(exits.filter(t => t.pnl <= 0).reduce((sum, t) => sum + t.pnl, 0));
        const profitFactor = grossLoss === 0 ? (grossProfit > 0 ? 99 : 0) : grossProfit / grossLoss;
        return { winRate, profitFactor };
    }, [socketStatus]);

    const equityEnvelopeDomain = useMemo(() => {
        if (!socketStatus.equityCurve || socketStatus.equityCurve.length < 2) {
            const base = formConfig.capitalAllocation;
            return [Math.floor(base * 0.95), Math.ceil(base * 1.05)];
        }
        const levels = socketStatus.equityCurve.map(pt => pt.balance);
        const minLevel = Math.min(...levels), maxLevel = Math.max(...levels);
        const paddingDelta = (maxLevel - minLevel) * 0.15 || (formConfig.capitalAllocation * 0.02);
        return [Math.floor(minLevel - paddingDelta), Math.ceil(maxLevel + paddingDelta)];
    }, [socketStatus.equityCurve, formConfig.capitalAllocation]);

    const confidenceStance = useMemo(() => {
        const score = socketStatus.currentConfidence ?? 50;
        if (score > 85) return { label: "STRONG BUY", color: "text-emerald-400", hex: "#10b981" };
        if (score > 70) return { label: "BUY INTENT", color: "text-emerald-400", hex: "#10b981" };
        if (score < 20) return { label: "STRONG VETO", color: "text-rose-500", hex: "#ef4444" };
        if (score < 35) return { label: "VETO GUARD",  color: "text-rose-400", hex: "#f43f5e" };
        return { label: "NEUTRAL CHOP", color: "text-violet-400", hex: "#a78bfa" };
    }, [socketStatus.currentConfidence]);

    const marketDirectionVector = useMemo(() => {
        const rsiVal  = latestSignals['rsi_threshold'] || latestSignals['rsi']     || 50;
        const bbVal   = latestSignals['bb_fade']       || latestSignals['bb_wall'] || 50;
        const stochVal = latestSignals['stoch'] || 50;

        if (rsiVal >= 68 || bbVal >= 80 || stochVal >= 75) {
            return { side: "SHORT (FADE CEILING)", label: "OVERBOUGHT EXHAUSTION", color: "text-rose-400 bg-rose-500/10 border-rose-500/20", type: "short" };
        }
        if (rsiVal <= 32 || bbVal <= 20 || stochVal <= 25) {
            return { side: "LONG (BUY FLOOR)", label: "OVERSOLD SUPPORT", color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20", type: "long" };
        }
        return { side: "NONE (CHOP)", label: "SIDEWAYS FLUID CONSOLIDATION", color: "text-violet-400 bg-violet-500/10 border-violet-500/20", type: "none" };
    }, [latestSignals]);

    const botExecutionBias = useMemo(() => {
        if (!formConfig.enable_shorting) {
            return { capability: "LONG-ONLY SPOT (COINBASE)", color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20", type: "spot" };
        }
        return { capability: "BI-DIRECTIONAL MARGIN (KRAKEN)", color: "text-purple-400 bg-purple-500/10 border-purple-500/20", type: "margin" };
    }, [formConfig.enable_shorting]);

    const convergenceState = useMemo(() => {
        if (marketDirectionVector.type === "none") {
            return { label: "STALKING ZONE", sub: "Awaiting outer tier boundary entry", color: "text-zinc-500 border-zinc-800" };
        }
        if (marketDirectionVector.type === "short" && botExecutionBias.type === "spot") {
            return { label: "POSTURE LOCKED", sub: "Spot filters rejecting overbought ceiling shorts", color: "text-amber-500 border-amber-500/30 animate-pulse" };
        }
        return { label: "CONVERGENCE PERFECT", sub: "Market structure coordinates match execution permissions", color: "text-emerald-400 border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.1)]" };
    }, [marketDirectionVector, botExecutionBias]);

    const gatewayCheckpoints = useMemo(() => {
        const aiScore   = socketStatus.currentConfidence ?? 50;
        const longLimit = parseFloat(formConfig.mlThresholdLong || 0.55) * 100;
        const bbVal     = Math.round(latestSignals['bb_fade'] || latestSignals['bb_wall'] || 0);

        return [
            { id: "v_safe",  label: "Volatility Shield Ceiling",      desc: "ATR safe compression zone verified",                                                          passed: true },
            { id: "t_align", label: "Institutional 200 EMA Baseline", desc: bbVal >= 90 ? "Price extreme wall contact checked" : "Breakout structural alignment scanning", passed: bbVal >= 90 },
            { id: "ai_gate", label: "Unified Ensemble Predictor",      desc: `Current AI Bias score is ${aiScore}% (Target: ${longLimit.toFixed(1)}%)`,                   passed: aiScore >= longLimit }
        ];
    }, [socketStatus.currentConfidence, formConfig, latestSignals]);

    const computedRegime = useMemo(() => {
        const score = socketStatus.currentConfidence ?? 50;
        const rsi   = latestSignals['rsi_threshold'] || latestSignals['rsi']     || 50;
        const bb    = latestSignals['bb_fade']       || latestSignals['bb_wall'] || 50;
        const stoch = latestSignals['stoch'] || 50;

        if (score > 75) {
            if (rsi < 38 || bb < 25) return {
                title: "Oversold Momentum Reversal", desc: "Bullish Breakout",
                detail: "Indicators are in extreme oversold territory while AI confidence is elevated — a high-probability long entry window is open. Watch for volume confirmation before sizing in.",
                action: "ENTER LONG", actionColor: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10", dot: "emerald"
            };
            return {
                title: "Trending Breakout Momentum", desc: "Bullish Trend",
                detail: "Strong upward momentum confirmed with AI confidence above threshold. Favor long entries on shallow pullbacks. Avoid chasing extended moves.",
                action: "BUY PULLBACKS", actionColor: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10", dot: "emerald"
            };
        }
        if (score < 25) {
            if (rsi > 62 || bb > 75) return {
                title: "Overbought Exhaustion Pattern", desc: "Bearish Reversal",
                detail: "Market is pressing overbought extremes while AI confidence collapses. High-probability fade setup forming — short entries favored on rejection candles.",
                action: "FADE RALLY", actionColor: "text-rose-400 border-rose-500/30 bg-rose-500/10", dot: "rose"
            };
            return {
                title: "Bearish Continuation Setup", desc: "Downtrend",
                detail: "Sustained bearish momentum with AI well below entry threshold. Avoid long exposure. Short setups are structurally favored until confidence recovers.",
                action: "AVOID LONGS", actionColor: "text-rose-400 border-rose-500/30 bg-rose-500/10", dot: "rose"
            };
        }
        if (score > 60) {
            if (stoch < 30) return {
                title: "Stochastic Recovery Zone", desc: "Mild Bullish",
                detail: "Stochastic is deeply oversold while AI confidence is building. A bounce setup may be forming — watch for stochastic cross above 20 to confirm entry.",
                action: "WATCH BOUNCE", actionColor: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10", dot: "emerald"
            };
            return {
                title: "Moderate Upside Pressure", desc: "Bullish Lean",
                detail: "AI is leaning bullish but hasn't crossed the hard entry threshold yet. Hold existing longs and wait for score to breach the configured ML gate before adding.",
                action: "HOLD / WAIT", actionColor: "text-amber-400 border-amber-500/30 bg-amber-500/10", dot: "emerald"
            };
        }
        if (score < 40) {
            if (stoch > 70) return {
                title: "Stochastic Exhaustion Zone", desc: "Mild Bearish",
                detail: "Stochastic is overbought while AI confidence is fading. A pullback is likely building — short setups are forming but wait for stochastic to roll below 80.",
                action: "WATCH FADE", actionColor: "text-rose-400 border-rose-500/30 bg-rose-500/10", dot: "rose"
            };
            return {
                title: "Moderate Downside Pressure", desc: "Bearish Lean",
                detail: "AI is leaning bearish but confidence hasn't reached short-entry confirmation. Reduce open exposure and let the market provide further directional clarity.",
                action: "REDUCE RISK", actionColor: "text-amber-400 border-amber-500/30 bg-amber-500/10", dot: "rose"
            };
        }
        if (rsi > 60 || bb > 70) return {
            title: "Upper Band Resistance Zone", desc: "Overbought Range",
            detail: "Price is pressing the upper Bollinger band with RSI elevated. Momentum may stall — watch for a rejection candle or a decisive close above for breakout continuation.",
            action: "WATCH CEILING", actionColor: "text-amber-400 border-amber-500/30 bg-amber-500/10", dot: "violet"
        };
        if (rsi < 40 || bb < 30) return {
            title: "Lower Band Support Zone", desc: "Oversold Range",
            detail: "Price is testing the lower Bollinger band with RSI depressed. A support bounce is possible — wait for a bullish reversal candle before entering long.",
            action: "WATCH FLOOR", actionColor: "text-amber-400 border-amber-500/30 bg-amber-500/10", dot: "violet"
        };
        return {
            title: "Mean-Reverting Consolidation", desc: "Sideways Range",
            detail: "Price is oscillating in a tight range with no directional edge. AI is withholding entries until a boundary breakout with volume confirmation materialises.",
            action: "STANDBY", actionColor: "text-zinc-400 border-zinc-700 bg-zinc-800/40", dot: "violet"
        };
    }, [socketStatus.currentConfidence, latestSignals]);

    const regimeTitle = socketStatus.aiRegimeTitle || computedRegime.title;
    const regimeDesc  = socketStatus.aiRegimeDesc  || computedRegime.desc;
    const regimeDot   = computedRegime.dot;

    useEffect(() => {
        if (!isConnected) return;
        axios.get(`${API_BASE}/users/keys`, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } })
            .then(res => setHasApiKeys((Array.isArray(res.data) ? res.data : res.data.keys || []).length > 0))
            .catch(() => setHasApiKeys(false));
    }, [isConnected]);

    useEffect(() => {
        let interval;
        if (isBotRunning && socketStatus.startedAt) {
            interval = setInterval(() => {
                const diff = Math.max(0, Date.now() - new Date(socketStatus.startedAt).getTime());
                const h = Math.floor(diff / 3600000).toString().padStart(2, '0');
                const m = Math.floor((diff % 3600000) / 60000).toString().padStart(2, '0');
                const s = Math.floor((diff % 60000) / 1000).toString().padStart(2, '0');
                setUptime(`${h}:${m}:${s}`);
            }, 1000);
        } else {
            setUptime("00:00:00");
        }
        return () => clearInterval(interval);
    }, [isBotRunning, socketStatus.startedAt]);

    useEffect(() => {
        if (!address) return;
        let attempts = 0;
        const MAX = 4;

        const attempt = () => {
            const token = localStorage.getItem("token");
            api.get(`/bot/status?userId=${address}`, { headers: { Authorization: `Bearer ${token}` } })
                .then(res => {
                    setSocketStatus(res.data);
                    setStatusFetchError(null);
                })
                .catch(err => {
                    if (err.response?.status === 401) {
                        toast.error("Session expired. Please reconnect.");
                        return;
                    }
                    attempts++;
                    if (attempts < MAX) setTimeout(attempt, 2 ** attempts * 1000);
                    else setStatusFetchError("Failed to sync engine state. The backend may be offline.");
                });
        };
        attempt();
    }, [address]);

    const isHaltLockedRef   = useRef(isHaltLocked);
    const formConfigRef      = useRef(formConfig);
    const exitingSymbolsRef = useRef(exitingSymbols);
    useEffect(() => { isHaltLockedRef.current   = isHaltLocked;   }, [isHaltLocked]);
    useEffect(() => { formConfigRef.current     = formConfig;     }, [formConfig]);
    useEffect(() => { exitingSymbolsRef.current = exitingSymbols; }, [exitingSymbols]);

    useEffect(() => {
        if (!address) return;
        const socket = io(SOCKET_URL, {
            query: { userId: address },
            transports: ['websocket'],
            reconnection: true,
            reconnectionAttempts: Infinity,
            reconnectionDelay: 2000,
            reconnectionDelayMax: 10000,
        });
        socketRef.current = socket;

        socket.on("connect",    () => { setSocketConnected(true);  });
        socket.on("disconnect", () => { setSocketConnected(false); });

        socket.on("bot_status_update", (data) => {
            if (isHaltLockedRef.current) return;
            setSocketStatus(prev => {
                // ✅ CHART-FIX-1: Dual-handle camelCase + snake_case for every field that
                //   feeds a chart or metric card.  The backend (FastAPI) serialises with
                //   snake_case by default; the frontend was only reading camelCase, so all
                //   derived values were silently 0 / {} and no chart ever received data.
                const currentBalance = data.currentBalance  ?? data.current_balance  ?? prev.currentBalance  ?? 0;
                const rawPositions   = data.activePositions || data.active_positions || data.positions || [];
                const filteredPositions = rawPositions.filter(pos => !exitingSymbolsRef.current.includes(pos.symbol));
                const seed = prev.initialCapital
                    || data.initialCapital  || data.initial_capital
                    || currentBalance
                    || formConfigRef.current.capitalAllocation;

                const rawProfit = data.dailyProfit  ?? data.daily_profit;
                const delta     = currentBalance - seed;
                const calculatedProfit = rawProfit !== undefined
                    ? Number(rawProfit.toFixed(2))
                    : Number(delta.toFixed(2));

                // ✅ CHART-FIX-1: signals_map / signalsMap — was always {}, causing
                //   signalsMapHistory entries to be { time } with no strategy keys,
                //   so NeuralConvergenceChart / SignalBarsPanel had nothing to render.
                const rawSignals = data.signalsMap || data.signals_map || {};
                const normalizedSignals = {};
                Object.keys(rawSignals).forEach(key => {
                    const nk  = key.toLowerCase().trim().replace(/\s+/g, '_');
                    const val = parseFloat(rawSignals[key]);
                    if (!isNaN(val)) normalizedSignals[nk] = val * 100;
                });

                // ✅ CHART-FIX-1: current_confidence / currentConfidence — was always 0,
                //   so the confidence equity-curve chart and ConfidenceRingCard showed flat lines.
                const confidence = data.currentConfidence ?? data.current_confidence ?? prev.currentConfidence ?? 0;

                const updatedSignalsHistory = [
                    ...(prev.signalsMapHistory || []),
                    { time: new Date().toLocaleTimeString(), ...normalizedSignals }
                ].slice(-300);

                const updatedEquityCurve = [
                    ...(prev.equityCurve || []),
                    { time: new Date().toLocaleTimeString(), balance: currentBalance, confidence }
                ].slice(-300);

                return {
                    ...prev,
                    ...data,
                    // ✅ CHART-FIX-1: Explicitly override every field that charts depend on so
                    //   the ...data spread of snake_case keys doesn't leave camelCase reads stale.
                    currentBalance,
                    currentConfidence: confidence,
                    currentPrice:  data.currentPrice  ?? data.current_price  ?? prev.currentPrice  ?? 0,
                    exposure:      data.exposure      ?? data.current_exposure ?? prev.exposure    ?? 0,
                    unrealizedPnl: data.unrealizedPnl ?? data.unrealized_pnl  ?? prev.unrealizedPnl ?? 0,
                    startedAt:     data.startedAt     || data.started_at      || prev.startedAt,
                    aiRegimeTitle: data.aiRegimeTitle  || data.ai_regime_title || prev.aiRegimeTitle,
                    aiRegimeDesc:  data.aiRegimeDesc   || data.ai_regime_desc  || prev.aiRegimeDesc,
                    dailyProfit:   calculatedProfit,
                    initialCapital: seed,
                    positions:     filteredPositions,
                    candles:       (data.candles?.length      > 0) ? data.candles      : (prev.candles      || []),
                    tradeHistory:  (data.tradeHistory?.length > 0) ? data.tradeHistory : (data.trade_history?.length  > 0 ? data.trade_history  : (prev.tradeHistory  || [])),
                    tradeMarkers:  (data.tradeMarkers?.length > 0) ? data.tradeMarkers : (data.trade_markers?.length > 0 ? data.trade_markers  : (prev.tradeMarkers  || [])),
                    signalsMapHistory: updatedSignalsHistory,
                    equityCurve:       updatedEquityCurve,
                };
            });
        });

        socket.on("bot_log", (newLog) => { setSocketLogs(prev => [newLog, ...prev].slice(0, 100)); });

        return () => {
            socket.disconnect();
            socketRef.current = null;
        };
    }, [address]);

    const handleConfirmStart = async () => {
        setIsStarting(true);
        setIsHaltLocked(false);
        const targetCapital = Number(formConfig.capitalAllocation) || 1000;
        setSocketStatus({
            status: 'running', currentBalance: targetCapital, initialCapital: targetCapital,
            equityCurve: [], tradeMarkers: [], positions: [], candles: [], unrealizedPnl: 0, dailyProfit: 0, tradeHistory: [], signalsMapHistory: []
        });
        setSocketLogs([]);

        const finalConfig = {
            ...formConfig,
            capitalAllocation: targetCapital,
            trading_mode: formConfig.tradingMode,
            mlThresholdLong:  parseFloat(formConfig.mlThresholdLong),
            mlThresholdShort: parseFloat(formConfig.mlThresholdShort),
            mlMode:  formConfig.mlMode,
            mlModel: formConfig.mlModel,
            maxPyramiding:    formConfig.maxPyramiding,
            maxTradesPerDay:  parseInt(formConfig.maxTradesPerDay),
            leverage:         parseFloat(formConfig.leverage),
            enable_shorting:  !!formConfig.enable_shorting,
            enablePartialExit: !!formConfig.enablePartialExit,
            api_keys: formConfig.tradingMode === 'live' ? (
                formConfig.enable_shorting ? {
                    krakenKey:    localStorage.getItem("kraken_key")    || "",
                    krakenSecret: localStorage.getItem("kraken_secret") || "",
                    apiKey:       localStorage.getItem("kraken_key")    || "",
                    secret:       localStorage.getItem("kraken_secret") || ""
                } : {
                    apiKey: localStorage.getItem("coinbase_key")    || "",
                    secret: localStorage.getItem("coinbase_secret") || ""
                }
            ) : {},
            comboConfig: {
                strategyCodes:    formConfig.strategies.map(s => s.code),
                combinationRule:  formConfig.hybridMode,
                minVotesRequired: parseInt(formConfig.minVotesRequired)
            }
        };

        try {
            const response = await startBot({ userId: address, config: finalConfig });
            if (response && (response.status === 'running' || response.status === 'initializing')) {
                toast.success(`Protocol Ignited: ${finalConfig.symbol}`);
                setShowPreFlight(false);
                logContainerRef.current?.scrollIntoView({ behavior: 'smooth' });
            }
        } catch (e) {
            toast.error(`Engine Failure: ${e.response?.data?.detail || e.message}`);
        } finally {
            setIsStarting(false);
        }
    };

    const handleHalt = async () => {
        setIsHaltLocked(true);
        setIsHalting(true);
        try {
            await stopBot();
            setSocketStatus({ status: 'stopped', currentBalance: Number(formConfig.capitalAllocation), unrealizedPnl: 0, positions: [], equityCurve: [], tradeMarkers: [], startedAt: null, signalsMapHistory: [] });
            setSocketLogs([]);
            localStorage.removeItem("neo_active_bot_id");
            toast.success("SYSTEM PURGED: Engine Stopped & Session Reset");
            setTimeout(() => { setIsHaltLocked(false); refreshState(); }, 3000);
        } catch (e) {
            toast.error("Halt Command Failed");
            setIsHaltLocked(false);
        } finally {
            setIsHalting(false);
        }
    };

    const handleReset = async () => {
        try {
            await resetBot();
            setSocketStatus({
                status: 'stopped', currentBalance: Number(formConfig.capitalAllocation),
                unrealizedPnl: 0, positions: [], equityCurve: [], tradeMarkers: [],
                startedAt: null, signalsMapHistory: [], dailyProfit: 0, tradeHistory: []
            });
            setSocketLogs([]);
            toast.success("Factory Reset Complete");
        } catch (e) {
            toast.error("Reset Failed");
        }
    };

    const handleManualExit = async (targetSymbol) => {
        if (!socketStatus.positions?.length) return;
        const symbolToExit = typeof targetSymbol === 'string' ? targetSymbol : formConfig.symbol;
        try {
            setExitingSymbols(prev => [...prev, symbolToExit]);
            setActiveOpsTab("audit");
            await closePosition({ userId: address, symbol: symbolToExit });
            toast.success(`Manual Exit Executed: ${symbolToExit}`);
            setTimeout(async () => {
                await refreshState();
                setExitingSymbols(prev => prev.filter(s => s !== symbolToExit));
            }, 3000);
        } catch (e) {
            setExitingSymbols(prev => prev.filter(s => s !== symbolToExit));
            toast.error("Exit Command Failed");
        }
    };

    const handleResetRiskSettings = () => {
        setFormConfig(prev => ({ ...prev, riskPercentage: 1, maxDailyLoss: 5, maxDrawdown: 10, maxTradesPerDay: 20, slippageTolerance: 0.5, params: { ...prev.params, take_profit: 0.05, trailing_stop: 0.01 } }));
        toast.success("Risk Protocol: Reverted to Factory Defaults");
    };

    const handleClearLogs = () => { setSocketLogs([]); toast.success("Terminal View Cleared"); };
    const handleSyncLogs  = async () => { await refreshState(); toast.success("Neural Stream Synced"); };

    const handleRoutingChange = (value) => {
        const isMargin = value === 'true';
        if (!isMargin) {
            setFormConfig(p => ({ ...p, enable_shorting: false }));
            return;
        }
        if (localStorage.getItem("kraken_key")) {
            setFormConfig(p => ({ ...p, enable_shorting: true }));
            return;
        }
        setApiKeyModal({
            exchange: 'kraken',
            onSave: () => {
                setApiKeyModal(null);
                setFormConfig(p => ({ ...p, enable_shorting: true }));
                toast.success("Kraken Margin Authorized.");
            }
        });
    };

    const handleLiveModeSelect = () => {
        if (hasApiKeys) {
            setFormConfig(p => ({ ...p, tradingMode: 'live' }));
            setIsModeSelected(true);
            return;
        }
        setApiKeyModal({
            exchange: 'coinbase',
            onSave: () => {
                setApiKeyModal(null);
                setHasApiKeys(true);
                setFormConfig(p => ({ ...p, tradingMode: 'live' }));
                setIsModeSelected(true);
                toast.success("Keys accepted for this session.");
            }
        });
    };

    const currentPrice = socketStatus.currentPrice || (socketStatus.candles?.length > 0 ? socketStatus.candles[socketStatus.candles.length - 1]?.close : 0) || 0;

    return (
        <UIModeProvider>
            <div className="min-h-screen bg-zinc-950 text-white font-sans p-6 overflow-x-hidden transition-all duration-700">
                <Toaster position="top-right" />

                {apiKeyModal && <ApiKeyModal exchange={apiKeyModal.exchange} onSave={apiKeyModal.onSave} onCancel={() => setApiKeyModal(null)} />}
                {confirmModal && <ConfirmModal title={confirmModal.title} message={confirmModal.message} danger={confirmModal.danger} onConfirm={confirmModal.onConfirm} onCancel={() => setConfirmModal(null)} />}

                {!isModeSelected && !isBotRunning && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-md">
                        <div className="max-w-4xl w-full p-6 text-center">
                            {modeStep === 'selection' ? (
                                <>
                                    <h1 className="text-4xl font-black text-white mb-10 tracking-tighter uppercase">Protocol Selection</h1>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div onClick={() => setModeStep('paper_setup')} className="group cursor-pointer bg-zinc-900 border border-white/5 hover:border-emerald-500/50 p-16 rounded-[40px] transition-all shadow-2xl">
                                            <h3 className="text-3xl font-black text-emerald-400 mb-3 uppercase">PAPER</h3>
                                            <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">Logic Simulation</p>
                                        </div>
                                        <div onClick={handleLiveModeSelect} className="p-16 rounded-[40px] border transition-all cursor-pointer bg-zinc-900 border-white/5 hover:border-red-500 shadow-2xl">
                                            <h3 className="text-3xl font-black text-red-500 mb-3 uppercase">LIVE</h3>
                                            <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">Real Capital Execution</p>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="max-w-md mx-auto bg-zinc-900 border border-zinc-800 p-12 rounded-[40px] shadow-2xl">
                                    <h3 className="text-2xl font-black text-white mb-8 uppercase tracking-tighter">Treasury Seed</h3>
                                    <input type="number" value={paperBalance} onChange={(e) => setPaperBalance(Number(e.target.value))} className="w-full bg-black border border-zinc-800 rounded-2xl p-5 text-2xl font-mono text-center text-emerald-500 mb-8 outline-none shadow-inner" />
                                    <div className="flex gap-4">
                                        <button onClick={() => setModeStep('selection')} className="flex-1 py-4 border border-zinc-800 rounded-2xl text-zinc-500 font-black uppercase text-[10px]">Back</button>
                                        <button onClick={() => { setFormConfig(p => ({ ...p, tradingMode: 'paper', capitalAllocation: paperBalance })); setIsModeSelected(true); }} className="flex-2 py-4 bg-emerald-500 text-black rounded-2xl font-black uppercase text-[10px]">Ignite</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {showPreFlight && <PreFlightModal config={formConfig} onConfirm={handleConfirmStart} onCancel={() => setShowPreFlight(false)} isStarting={isStarting} hasApiKeys={hasApiKeys} address={address} />}

                <header className="max-w-[1800px] mx-auto mb-10 flex items-center justify-between transition-all">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-lg">
                            <Activity className="text-black w-7 h-7" />
                        </div>
                        <div>
                            <h1 className="text-lg font-black uppercase tracking-widest">Sovereign <span className="text-emerald-500">Live</span></h1>
                            <div className="flex items-center gap-2">
                                <p className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.2em]">Terminal v14</p>
                                {socketConnected ? <Wifi size={12} className="text-emerald-500" /> : <WifiOff size={12} className="text-rose-500" />}
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        {statusFetchError && (
                            <div className="flex items-center gap-2 px-4 py-2 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                                <AlertTriangle size={14} className="text-amber-500" />
                                <span className="text-[10px] text-amber-400 font-black uppercase tracking-widest">{statusFetchError}</span>
                            </div>
                        )}
                        {isBotRunning ? (
                            <button onClick={handleHalt} disabled={isHalting} className="px-6 py-3 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-xl font-black text-[10px] uppercase hover:bg-rose-500 hover:text-white transition-all flex items-center gap-2 shadow-lg shadow-rose-500/10 disabled:opacity-60 disabled:cursor-not-allowed">
                                {isHalting ? <><RefreshCw size={12} className="animate-spin" /> Halting...</> : <><Power size={12} /> Emergency Halt</>}
                            </button>
                        ) : (
                            <button onClick={handleReset} className="px-6 py-3 bg-zinc-800/50 border border-zinc-700 text-zinc-400 rounded-xl font-black text-[10px] uppercase hover:bg-white hover:text-black transition-all flex items-center gap-2"><RotateCcw size={12} /> Factory Reset</button>
                        )}
                        <ConnectButton />
                    </div>
                </header>

                {isBotRunning ? (
                    <div className="max-w-[1800px] mx-auto space-y-8 animate-in fade-in duration-1000">
                        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                            <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl shadow-xl">
                                <div className="flex justify-between items-start mb-1">
                                    <p className="text-[10px] text-zinc-500 uppercase font-black tracking-widest">Engine Status</p>
                                    <Timer size={12} className="text-emerald-500 animate-pulse" />
                                </div>
                                <p className="text-xl font-mono font-black text-emerald-400">OPERATIONAL</p>
                                <p className="text-[10px] font-mono text-zinc-500 mt-1 uppercase tracking-tighter font-black">SESSION: {uptime}</p>
                            </div>
                            <MetricCard label="Daily Profit"    value={`${socketStatus.dailyProfit >= 0 ? '+' : ''}${(socketStatus.dailyProfit || 0).toFixed(2)}`}  subValue={`${profitPct.toFixed(2)}%`}  color={socketStatus.dailyProfit >= 0 ? "text-emerald-400" : "text-rose-500"}   icon={<DollarSign size={10} />} />
                            <MetricCard label="Floating PnL"    value={`${socketStatus.unrealizedPnl >= 0 ? '+' : ''}${(socketStatus.unrealizedPnl || 0).toFixed(2)}`} subValue={`${pnlPct.toFixed(2)}%`}    color={socketStatus.unrealizedPnl >= 0 ? 'text-emerald-400' : 'text-rose-500'} icon={<Activity size={10} />} />
                            <MetricCard label="Exposure"        value={`${socketStatus.exposure || 0}%`} subValue="Active Positions" color="text-amber-400" />
                            <MetricCard label="Total Equity"    value={`$${Number(activeBalance).toLocaleString()}`} subValue="Liquid + Locked" />
                            <ConfidenceRingCard confidence={socketStatus.currentConfidence || 0} />
                        </div>

                        <div className="grid grid-cols-12 gap-8 items-start">
                            <div className="col-span-12 lg:col-span-3 h-[840px] flex flex-col gap-4">
                                <div className="flex-1 min-h-0">
                                    <ErrorBoundary>
                                        <NeuralConvergenceChart formConfig={formConfig} signalsMapHistory={socketStatus.signalsMapHistory || []} />
                                    </ErrorBoundary>
                                </div>
                                <SignalBarsPanel signalsMapHistory={socketStatus.signalsMapHistory || []} formConfig={formConfig} />
                                <div className="bg-zinc-900 border border-zinc-800 rounded-[32px] p-6 shadow-2xl">
                                    <h4 className="text-[11px] font-black uppercase tracking-widest text-zinc-500 mb-4">Neural Performance</h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-[9px] uppercase font-bold text-zinc-600 mb-1">Win Rate</p>
                                            <p className="text-xl font-mono font-black tracking-tighter text-emerald-400">{calculatedStats.winRate}%</p>
                                        </div>
                                        <div>
                                            <p className="text-[9px] uppercase font-bold text-zinc-600 mb-1">Profit Factor</p>
                                            <p className="text-xl font-mono font-black tracking-tighter text-violet-400">{Number(calculatedStats.profitFactor).toFixed(2)}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="col-span-12 lg:col-span-9 flex flex-col gap-4">
                                {/* ── REGIME BANNER ── */}
                                <div className="w-full bg-zinc-900/40 border border-zinc-800 rounded-3xl p-5 backdrop-blur-md shadow-xl space-y-4">

                                    {/* Row 1 — live dot + regime title + direction badge */}
                                    <div className="flex items-center gap-3">
                                        <div className="relative flex h-3.5 w-3.5 shrink-0">
                                            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${regimeDot === 'emerald' ? 'bg-emerald-400' : regimeDot === 'rose' ? 'bg-rose-400' : 'bg-violet-400'}`}></span>
                                            <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${regimeDot === 'emerald' ? 'bg-emerald-500' : regimeDot === 'rose' ? 'bg-rose-500' : 'bg-violet-500'}`}></span>
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <span className="text-[9px] font-black uppercase text-zinc-500 tracking-widest">Forecasted Market Regime</span>
                                            <div className="flex items-baseline gap-2 mt-0.5 flex-wrap">
                                                <span className={`text-sm font-mono font-black tracking-wide ${regimeDot === 'emerald' ? 'text-emerald-300' : regimeDot === 'rose' ? 'text-rose-300' : 'text-zinc-100'}`}>
                                                    {regimeTitle}
                                                </span>
                                                <span className="text-[11px] font-normal text-zinc-500 shrink-0">({regimeDesc})</span>
                                            </div>
                                        </div>
                                        <div className={`shrink-0 px-3 py-1 rounded-xl border text-[9px] font-black uppercase tracking-widest ${
                                            regimeDot === 'emerald' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                                            regimeDot === 'rose'    ? 'bg-rose-500/10    border-rose-500/20    text-rose-400'    :
                                                                       'bg-violet-500/10  border-violet-500/20  text-violet-400'
                                        }`}>
                                            {regimeDot === 'emerald' ? '▲ BULL' : regimeDot === 'rose' ? '▼ BEAR' : '◆ CHOP'}
                                        </div>
                                    </div>

                                    {/* Row 2 — Plain-English description + tactical action label */}
                                    <div className="flex items-start gap-4 px-0.5">
                                        <p className="text-[11px] text-zinc-400 leading-relaxed flex-1 font-medium">
                                            {computedRegime.detail}
                                        </p>
                                        <div className={`shrink-0 self-center px-3 py-1.5 rounded-xl border text-[9px] font-black uppercase tracking-widest whitespace-nowrap ${computedRegime.actionColor}`}>
                                            {computedRegime.action}
                                        </div>
                                    </div>

                                    {/* Row 3 — Live market numbers: RSI / BB% / Stoch / AI Confidence */}
                                    <div className="grid grid-cols-4 gap-3 bg-black/50 border border-zinc-800 p-3 rounded-2xl">
                                        {[
                                            {
                                                label: 'RSI',
                                                value: Math.round(latestSignals['rsi_threshold'] || latestSignals['rsi'] || 50),
                                                note: v => v > 70 ? 'OVERBOUGHT' : v < 30 ? 'OVERSOLD' : 'NEUTRAL',
                                                barColor: v => v > 70 ? '#ef4444' : v < 30 ? '#10b981' : '#a78bfa',
                                            },
                                            {
                                                label: 'BB %',
                                                value: Math.round(latestSignals['bb_fade'] || latestSignals['bb_wall'] || 50),
                                                note: v => v > 80 ? 'AT UPPER' : v < 20 ? 'AT LOWER' : 'MID BAND',
                                                barColor: v => v > 80 ? '#ef4444' : v < 20 ? '#10b981' : '#f59e0b',
                                            },
                                            {
                                                label: 'STOCH',
                                                value: Math.round(latestSignals['stoch'] || 50),
                                                note: v => v > 80 ? 'OVERBOUGHT' : v < 20 ? 'OVERSOLD' : 'NEUTRAL',
                                                barColor: v => v > 80 ? '#ef4444' : v < 20 ? '#10b981' : '#a78bfa',
                                            },
                                            {
                                                label: 'AI CONF',
                                                value: socketStatus.currentConfidence ?? 50,
                                                note: v => v > 65 ? 'ABOVE GATE' : v < 35 ? 'BELOW GATE' : 'AT THRESHOLD',
                                                barColor: v => v > 65 ? '#10b981' : v < 35 ? '#ef4444' : '#f59e0b',
                                            },
                                        ].map(({ label, value, note, barColor }) => {
                                            const col = barColor(value);
                                            return (
                                                <div key={label} className="flex flex-col gap-1.5">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-[8px] font-black uppercase text-zinc-600 tracking-widest">{label}</span>
                                                        <span className="font-mono text-[11px] font-black" style={{ color: col }}>{value}%</span>
                                                    </div>
                                                    <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                                                        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${value}%`, backgroundColor: col }} />
                                                    </div>
                                                    <span className="text-[7px] font-black uppercase tracking-widest" style={{ color: col }}>{note(value)}</span>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {/* Row 4 — Market Vector / Account Bounds / Alignment Status */}
                                    <div className="grid grid-cols-3 gap-3 bg-black/40 border border-zinc-800 p-3 rounded-2xl">
                                        <div className="min-w-0">
                                            <span className="text-[9px] font-black uppercase text-zinc-500 block tracking-wider mb-1">Market Vector</span>
                                            <div className={`px-2 py-1.5 rounded-lg text-[10px] font-mono font-black border leading-snug truncate text-center ${marketDirectionVector.color}`}>
                                                {marketDirectionVector.side}
                                            </div>
                                        </div>
                                        <div className="min-w-0">
                                            <span className="text-[9px] font-black uppercase text-zinc-500 block tracking-wider mb-1">Account Bounds</span>
                                            <div className={`px-2 py-1.5 rounded-lg text-[10px] font-mono font-black border leading-snug truncate text-center ${botExecutionBias.color}`}>
                                                {botExecutionBias.capability}
                                            </div>
                                        </div>
                                        <div className="min-w-0">
                                            <span className="text-[9px] font-black uppercase text-zinc-500 block tracking-wider mb-1">Alignment Status</span>
                                            <div className={`px-2 py-1.5 rounded-lg text-[10px] font-mono font-black border leading-snug truncate text-center ${convergenceState.color}`}>
                                                {convergenceState.label}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Row 5 — Gateway checkpoints */}
                                    <div className="grid grid-cols-3 gap-3">
                                        {gatewayCheckpoints.map(check => (
                                            <div key={check.id} className="flex items-start gap-2 p-3 bg-black/40 border border-zinc-800 rounded-xl overflow-hidden">
                                                {check.passed
                                                    ? <CheckCircle2 size={14} className="text-emerald-400 mt-0.5 shrink-0" />
                                                    : <AlertCircle  size={14} className="text-zinc-600  mt-0.5 shrink-0" />}
                                                <div className="min-w-0">
                                                    <p className={`text-[10px] font-black uppercase tracking-tight truncate ${check.passed ? 'text-zinc-200' : 'text-zinc-500'}`}>{check.label}</p>
                                                    <p className="text-[9px] text-zinc-500 font-mono mt-0.5 leading-relaxed break-words">{check.desc}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[660px]">
                                    <div className="lg:col-span-3 bg-zinc-900 border border-zinc-800 rounded-[40px] overflow-hidden flex flex-col relative shadow-2xl">
                                        <div className="bg-zinc-800/20 p-6 border-b border-zinc-800/50 flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <TrendingUp size={18} className="text-emerald-500" />
                                                <span className="text-[11px] font-black uppercase tracking-widest">{formConfig.symbol} Live Feed</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></div>
                                                <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">Neural Sync Active</span>
                                            </div>
                                        </div>
                                        <div className="flex-1 bg-[#090b0f] pb-8">
                                            <ErrorBoundary>
                                                <LiveTradingChart symbol={formConfig.symbol} timeframe={formConfig.timeframe} isRunning={true} activePositions={socketStatus.positions} candleData={socketStatus.candles || []} />
                                            </ErrorBoundary>
                                        </div>
                                    </div>

                                    <div className="lg:col-span-1 bg-zinc-900 border border-zinc-800 rounded-[40px] flex flex-col overflow-hidden shadow-2xl min-w-0">
                                        <div className="p-5 border-b border-zinc-800 bg-zinc-800/20 flex flex-col gap-3 shrink-0">
                                            <div className="flex justify-between items-center text-violet-400">
                                                <div className="flex items-center gap-2">
                                                    <Cpu size={16} className="animate-pulse" />
                                                    <h3 className="text-sm font-black uppercase tracking-widest">Neural Flow</h3>
                                                </div>
                                                <div className="flex items-center gap-2.5">
                                                    <button onClick={handleSyncLogs}  className="text-zinc-500 hover:text-emerald-400 transition-all"><RefreshCw size={14} /></button>
                                                    <button onClick={handleClearLogs} className="text-zinc-500 hover:text-white transition-all"><Eraser size={14} /></button>
                                                </div>
                                            </div>

                                            <div className="flex flex-col gap-2 border-t border-zinc-800/80 pt-2.5">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    {[
                                                        { label: 'Pass',   bg: '#10b981', text: 'text-emerald-400' },
                                                        { label: 'Veto',   bg: '#ef4444', text: 'text-rose-400'    },
                                                        { label: 'Trade',  bg: '#f59e0b', text: 'text-amber-400'   },
                                                        { label: 'Signal', bg: '#a78bfa', text: 'text-violet-400'  },
                                                        { label: 'Regime', bg: '#3b82f6', text: 'text-blue-400'    },
                                                    ].map(({ label, bg, text }) => (
                                                        <div key={label} className="flex items-center gap-1.5">
                                                            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: bg }} />
                                                            <span className={`text-[10px] font-black uppercase tracking-tight ${text}`}>{label}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                                <div className="flex items-center gap-2 flex-wrap border-t border-zinc-800/40 pt-1.5">
                                                    {currentActiveStrategyCodes.map(code => {
                                                        const color = STRAT_COLORS[code] || '#52525b';
                                                        const shortName = STRAT_POOL.find(s => s.code === code)?.name || code;
                                                        return (
                                                            <div key={`flow-legend-${code}`} className="flex items-center gap-1.5">
                                                                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
                                                                <span style={{ color }} className="text-[10px] font-black uppercase font-mono tracking-tighter">{shortName}</span>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>

                                            <ProximityTickerPanel
                                                latestSignals={latestSignals}
                                                aiScore={socketStatus.currentConfidence ?? 50}
                                                formConfig={formConfig}
                                            />
                                        </div>
                                        <div ref={logContainerRef} className="flex-1 overflow-y-auto p-5 font-mono text-[11px] space-y-3 bg-black/20 custom-scrollbar min-w-0">
                                            {socketLogs.map((log, i) => {
                                                if (log.type === "RICH_LOG" || log.targets) {
                                                    return (
                                                        <div key={i} className="mb-2 p-3 bg-zinc-950/50 rounded-xl border border-zinc-800 flex flex-col gap-2 min-w-0 overflow-hidden">
                                                            <div className="flex justify-between items-center border-b border-zinc-800/50 pb-2">
                                                                <span className="text-zinc-500 font-black uppercase text-[9px] tracking-widest">Targets ({log.rule})</span>
                                                                <span className="text-[9px] opacity-40 font-bold">{formatTime(log.time)}</span>
                                                            </div>
                                                            <div className="flex flex-col gap-1.5 leading-relaxed min-w-0">
                                                                <div className="flex justify-between items-center text-white min-w-0">
                                                                    <span className="text-zinc-500 uppercase font-black text-[10px]">Market Cur</span>
                                                                    <span className="font-bold truncate">${log.cur}</span>
                                                                </div>
                                                                {log.targets.map(t => (
                                                                    <div key={t.code} className="flex items-center justify-between gap-2 min-w-0">
                                                                        <span style={{ color: STRAT_COLORS[t.code] || '#71717a' }} className="font-black uppercase text-[10px] truncate">{t.name}</span>
                                                                        <div className="flex gap-2 font-bold shrink-0">
                                                                            <span className="text-zinc-400 font-mono">${t.target}</span>
                                                                            <span className={t.trend === 'UP' ? 'text-emerald-500' : 'text-rose-500'}>({t.diff > 0 ? '+' : ''}${t.diff})</span>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    );
                                                }
                                                const parsedMessage = parseLog(log.message || log);
                                                const dynamicWrapperClass = getLogStyle(parsedMessage);
                                                const { Icon: LogIcon } = getLogMeta(parsedMessage);
                                                return (
                                                    <div
                                                        key={i}
                                                        className={`p-3 rounded-xl border leading-relaxed flex items-start gap-2.5 min-w-0 ${dynamicWrapperClass} ${i === 0 ? 'animate-in slide-in-from-top-1 duration-300' : ''}`}
                                                    >
                                                        <LogIcon size={12} className="mt-0.5 flex-shrink-0" />
                                                        <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                                                            <span className="text-[10px] opacity-40 font-bold font-mono">{formatTime(log.time)}</span>
                                                            <span className="font-bold tracking-tight text-[11px] break-words whitespace-normal font-mono">{parsedMessage}</span>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-20 animate-in slide-in-from-bottom-10 duration-1000">
                            <div className="bg-zinc-900 border border-zinc-800 rounded-[40px] p-8 shadow-2xl flex flex-col justify-between">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center gap-2">
                                        <BarChart size={18} className={sessionDelta.isProfit ? "text-emerald-400" : "text-rose-400"} />
                                        <div>
                                            <h3 className="text-[11px] font-black uppercase tracking-widest text-zinc-400">Session Equity</h3>
                                            <p className="text-[9px] text-zinc-600 font-bold uppercase tracking-wider mt-0.5">Real-time performance path</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className={`font-mono text-xs font-black px-2 py-0.5 rounded border ${
                                            sessionDelta.isProfit ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-rose-500/10 border-rose-500/20 text-rose-400"
                                        }`}>
                                            {sessionDelta.isProfit ? "▲" : "▼"} {sessionDelta.percentage >= 0 ? '+' : ''}{sessionDelta.percentage.toFixed(2)}%
                                        </span>
                                        <span className={`block font-mono text-[10px] font-bold mt-1 ${sessionDelta.isProfit ? "text-emerald-500/60" : "text-rose-500/60"}`}>
                                            {sessionDelta.isProfit ? '+' : ''}${sessionDelta.change.toFixed(2)}
                                        </span>
                                    </div>
                                </div>
                                <div className="h-44 w-full mt-2">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={socketStatus.equityCurve} margin={{ top: 5, right: 5, left: -5, bottom: 0 }}>
                                            <defs>
                                                <linearGradient id="colorEquityProfit" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%"  stopColor="#10b981" stopOpacity={0.25} />
                                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                                </linearGradient>
                                                <linearGradient id="colorEquityDrawdown" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%"  stopColor="#ef4444" stopOpacity={0.25} />
                                                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" opacity={0.15} vertical={false} />
                                            <RechartsTooltip
                                                cursor={{ stroke: '#27272a', strokeWidth: 1, strokeDasharray: '4 4' }}
                                                contentStyle={{ backgroundColor: '#09090b', border: '1px solid #27272a', borderRadius: '12px', fontSize: '10px', fontFamily: 'monospace' }}
                                                itemStyle={{ color: sessionDelta.isProfit ? '#10b981' : '#ef4444' }}
                                                formatter={(value) => [`$${Number(value).toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 'EQUITY']}
                                            />
                                            <Area type="monotone" dataKey="balance" stroke={sessionDelta.isProfit ? "#10b981" : "#ef4444"} fill={sessionDelta.isProfit ? "url(#colorEquityProfit)" : "url(#colorEquityDrawdown)"} strokeWidth={2.5} isAnimationActive={false} />
                                            <XAxis dataKey="time" hide />
                                            <YAxis hide domain={equityEnvelopeDomain} />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            <div className="bg-zinc-900 border border-zinc-800 p-8 shadow-2xl flex flex-col justify-between">
                                <div className="flex start justify-between mb-4">
                                    <div className="flex items-center gap-2">
                                        <Zap size={18} className={confidenceStance.color} />
                                        <div>
                                            <h3 className="text-[11px] font-black uppercase tracking-widest text-zinc-400">Logic Confidence</h3>
                                            <p className="text-[9px] text-zinc-600 font-bold uppercase tracking-wider mt-0.5">Ensemble Neural Bias Index</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className="font-mono text-xs font-black px-2 py-0.5 rounded border bg-zinc-950/40" style={{ borderColor: `${confidenceStance.hex}22`, color: confidenceStance.hex }}>
                                            {confidenceStance.label}
                                        </span>
                                        <span className={`block font-mono text-sm font-black mt-1 ${confidenceStance.color}`}>
                                            {socketStatus.currentConfidence ?? 50}%
                                        </span>
                                    </div>
                                </div>
                                <div className="h-44 w-full mt-2">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={socketStatus.equityCurve} margin={{ top: 5, right: 5, left: -5, bottom: 0 }}>
                                            <defs>
                                                <linearGradient id="colorConfGradient" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor={confidenceStance.hex} stopOpacity={0.25} />
                                                    <stop offset="95%" stopColor={confidenceStance.hex} stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" opacity={0.15} vertical={false} />
                                            <ReferenceLine y={parseFloat(formConfig.mlThresholdLong) * 100}  stroke="#10b981" strokeDasharray="3 3" opacity={0.25} />
                                            <ReferenceLine y={parseFloat(formConfig.mlThresholdShort) * 100} stroke="#ef4444" strokeDasharray="3 3" opacity={0.25} />
                                            <RechartsTooltip
                                                cursor={{ stroke: '#27272a', strokeWidth: 1, strokeDasharray: '4 4' }}
                                                contentStyle={{ backgroundColor: '#09090b', border: '1px solid #27272a', borderRadius: '12px', fontSize: '10px', fontFamily: 'monospace' }}
                                                itemStyle={{ color: confidenceStance.hex }}
                                                formatter={(value) => [`${Number(value).toFixed(0)}%`, 'NEURAL BIAS']}
                                            />
                                            <Area type="monotone" dataKey="confidence" stroke={confidenceStance.hex} fill="url(#colorConfGradient)" strokeWidth={2.5} isAnimationActive={false} />
                                            <XAxis dataKey="time" hide />
                                            <YAxis hide domain={[0, 100]} />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            <ErrorBoundary>
                                <div className="bg-zinc-900 border border-zinc-800 rounded-[40px] p-8 shadow-2xl overflow-hidden flex flex-col min-h-[450px]">
                                    <div className="flex items-center justify-between mb-8">
                                        <div className="flex items-center gap-4">
                                            <button onClick={() => setActiveOpsTab("live")} className={`flex items-center gap-2 transition-all cursor-pointer ${activeOpsTab === 'live' ? 'text-amber-400' : 'text-zinc-600 hover:text-zinc-400'}`}>
                                                <Box size={18} /><h3 className="text-[11px] font-black uppercase tracking-widest">Live Operations</h3>
                                            </button>
                                            <span className="text-zinc-800 font-bold">/</span>
                                            <button onClick={() => setActiveOpsTab("audit")} className={`text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer ${activeOpsTab === 'audit' ? 'text-emerald-500' : 'text-zinc-500 hover:text-zinc-300'}`}>
                                                Audit History
                                            </button>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className={`w-1.5 h-1.5 rounded-full ${activeOpsTab === 'live' ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-700'}`}></div>
                                            <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest">Neural Link</span>
                                        </div>
                                    </div>
                                    <div className="flex-1 overflow-x-auto custom-scrollbar">
                                        {activeOpsTab === "live" ? (
                                            <div className="space-y-3">
                                                {socketStatus.positions?.length > 0 ? (
                                                    socketStatus.positions.map((pos) => (
                                                        <PositionCard
                                                            key={pos.symbol || pos.id || JSON.stringify(pos.entry)}
                                                            pos={pos}
                                                            currentPrice={currentPrice}
                                                            defaultSymbol={formConfig.symbol}
                                                            onExit={handleManualExit}
                                                            isExiting={exitingSymbols.includes(pos.symbol)}
                                                        />
                                                    ))
                                                ) : (
                                                    <div className="py-24 text-center text-zinc-600 italic font-bold uppercase tracking-widest opacity-30">
                                                        Waiting for Signal...
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
                                                {(() => {
                                                    const activeTrades = socketStatus.tradeHistory?.length > 0 ? socketStatus.tradeHistory : (socketStatus.trade_history?.length > 0 ? socketStatus.trade_history : (socketStatus.tradeMarkers?.length > 0 ? socketStatus.tradeMarkers : []));
                                                    return activeTrades.length > 0 ? (
                                                        <div className="space-y-3">
                                                            {activeTrades.map((trade, idx) => (
                                                                <TradeTimelineCard key={idx} trade={trade} />
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <div className="flex flex-col items-center justify-center py-20 text-center">
                                                            <div className="p-4 bg-emerald-500/5 rounded-full mb-4 border border-emerald-500/10">
                                                                <Book className="text-emerald-500/40" size={32} />
                                                            </div>
                                                            <h4 className="text-zinc-400 text-[10px] font-black uppercase tracking-widest">Trade Ledger Empty</h4>
                                                            <p className="text-zinc-600 text-[9px] mt-2 max-w-[220px] leading-relaxed font-bold uppercase">No closed trades detected in this session.</p>
                                                        </div>
                                                    );
                                                })()}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </ErrorBoundary>
                        </div>
                    </div>

                ) : (
                    <div className="max-w-[1800px] mx-auto grid grid-cols-12 gap-8 items-start animate-in fade-in duration-700">
                        <div className="col-span-12 lg:col-span-3 h-[850px] relative">
                            <div className="bg-zinc-900 border border-zinc-800 rounded-[32px] p-8 space-y-8 shadow-2xl h-full overflow-y-auto custom-scrollbar">

                                <div className="space-y-5">
                                    <div className="flex items-center gap-2 text-emerald-400 mb-2">
                                        <Wallet size={16} />
                                        <h4 className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Treasury & Routing</h4>
                                    </div>

                                    <div className="grid grid-cols-3 gap-2">
                                        <div className="col-span-2">
                                            <label className={labelClass}>Asset</label>
                                            <select value={formConfig.symbol} onChange={(e) => setFormConfig({ ...formConfig, symbol: e.target.value })} className={inputClass}>
                                                {COIN_PAIRS.map(c => <option key={c} value={c}>{c}</option>)}
                                            </select>
                                        </div>
                                        <div className="col-span-1">
                                            <label className={labelClass}>Period</label>
                                            <select value={formConfig.timeframe} onChange={(e) => setFormConfig({ ...formConfig, timeframe: e.target.value })} className={inputClass}>
                                                {TIMEFRAMES.map(t => <option key={t} value={t}>{t}</option>)}
                                            </select>
                                        </div>
                                    </div>

                                    <div className="p-4 bg-zinc-950/50 border border-zinc-700 rounded-2xl">
                                        <label className={labelClass}>Deployed Capital (USD)</label>
                                        <input
                                            type="number"
                                            value={formConfig.capitalAllocation}
                                            onChange={(e) => setFormConfig({ ...formConfig, capitalAllocation: parseFloat(e.target.value) })}
                                            className="w-full bg-black border border-zinc-700 p-2 rounded-lg font-mono text-emerald-500 focus:outline-none focus:border-emerald-500 text-lg"
                                        />
                                    </div>

                                    <div className="flex justify-between items-center">
                                        <div className="flex items-center gap-2 text-zinc-400">
                                            <ArrowDownRight size={14} />
                                            <span className="text-[10px] font-black uppercase tracking-widest">Routing</span>
                                        </div>
                                        <select
                                            value={formConfig.enable_shorting ? "true" : "false"}
                                            onChange={(e) => handleRoutingChange(e.target.value)}
                                            className="bg-zinc-800 text-[9px] rounded-lg px-2 py-1 border border-zinc-700 font-black uppercase tracking-widest outline-none text-zinc-300"
                                        >
                                            <option value="false">Spot (Coinbase)</option>
                                            <option value="true">Margin (Kraken)</option>
                                        </select>
                                    </div>

                                    {formConfig.enable_shorting && (
                                        <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-2xl animate-in fade-in duration-300">
                                            <div className="flex justify-between items-center mb-3">
                                                <label className="text-[9px] font-black uppercase text-amber-500/80 tracking-widest">Leverage Multiplier</label>
                                                <span className="text-[11px] font-mono font-black text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">{formConfig.leverage}x</span>
                                            </div>
                                            <input
                                                type="range" min="1" max="20" step="1"
                                                value={formConfig.leverage}
                                                onChange={(e) => setFormConfig({ ...formConfig, leverage: parseInt(e.target.value) })}
                                                className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                                            />
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-5 border-t border-zinc-800/50 pt-8">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2 text-violet-400">
                                            <Cpu size={16} />
                                            <h4 className="text-[10px] font-black uppercase tracking-widest text-violet-400">Neural Compute</h4>
                                        </div>
                                        <select
                                            value={formConfig.mlMode}
                                            onChange={(e) => setFormConfig({ ...formConfig, mlMode: e.target.value })}
                                            className="bg-zinc-950 text-[9px] text-violet-400 rounded px-2 py-1 border border-violet-500/30 font-black uppercase outline-none cursor-pointer"
                                        >
                                            <option value="off">Bypass</option>
                                            <option value="on">Active</option>
                                        </select>
                                    </div>
                                    {formConfig.mlMode === 'on' && (
                                        <div className="space-y-5 animate-in slide-in-from-top-2">
                                            <div className="flex flex-col gap-1">
                                                <label className={labelClass}>Primary Brain</label>
                                                <select className={inputClass} value={formConfig.mlModel} onChange={(e) => setFormConfig({ ...formConfig, mlModel: e.target.value })}>
                                                    {MODEL_POOL.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                                                </select>
                                            </div>
                                            <div className="grid grid-cols-2 gap-3 p-4 bg-violet-500/5 border border-violet-500/20 rounded-2xl">
                                                <div>
                                                    <label className="text-[9px] font-black uppercase text-violet-400/80 tracking-widest">Long Veto Limit</label>
                                                    <input type="number" step="0.01" value={formConfig.mlThresholdLong} onChange={(e) => setFormConfig({ ...formConfig, mlThresholdLong: parseFloat(e.target.value) })} className="mt-1 w-full bg-black border border-violet-500/30 rounded-lg px-2 py-1 text-violet-400 focus:border-violet-400 outline-none font-mono text-[10px]" />
                                                </div>
                                                <div>
                                                    <label className="text-[9px] font-black uppercase text-violet-400/80 tracking-widest">Short Veto Limit</label>
                                                    <input type="number" step="0.01" value={formConfig.mlThresholdShort} onChange={(e) => setFormConfig({ ...formConfig, mlThresholdShort: parseFloat(e.target.value) })} className="mt-1 w-full bg-black border border-violet-500/30 rounded-lg px-2 py-1 text-violet-400 focus:border-violet-400 outline-none font-mono text-[10px]" />
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-5 border-t border-zinc-800/50 pt-8">
                                    <div className="flex flex-col gap-1">
                                        <div className="flex justify-between items-center">
                                            <label className="text-[9px] font-black uppercase text-zinc-400 tracking-widest">Minimum ADX Trend</label>
                                            <span className="font-mono text-[10px] font-bold text-emerald-400">{formConfig.minAdx}</span>
                                        </div>
                                        <input type="range" min="10" max="50" step="1" value={formConfig.minAdx} onChange={(e) => setFormConfig({ ...formConfig, minAdx: parseInt(e.target.value) })} className="w-full accent-emerald-500 bg-zinc-800 h-1 rounded-lg cursor-pointer" />
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <div className="flex justify-between items-center">
                                            <label className="text-[9px] font-black uppercase text-zinc-400 tracking-widest">Min Vol Confirmation</label>
                                            <span className="font-mono text-[10px] font-bold text-emerald-400">{formConfig.minVolRatio}x</span>
                                        </div>
                                        <input type="range" min="0.5" max="2.5" step="0.1" value={formConfig.minVolRatio} onChange={(e) => setFormConfig({ ...formConfig, minVolRatio: parseFloat(e.target.value) })} className="w-full accent-emerald-500 bg-zinc-800 h-1 rounded-lg cursor-pointer" />
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <div className="flex justify-between items-center">
                                            <label className="text-[9px] font-black uppercase text-zinc-400 tracking-widest">Min Ensemble Weight</label>
                                            <span className="font-mono text-[10px] font-bold text-emerald-400">{formConfig.minWeightedSignal}</span>
                                        </div>
                                        <input type="range" min="0.1" max="1.5" step="0.05" value={formConfig.minWeightedSignal} onChange={(e) => setFormConfig({ ...formConfig, minWeightedSignal: parseFloat(e.target.value) })} className="w-full accent-emerald-500 bg-zinc-800 h-1 rounded-lg cursor-pointer" />
                                    </div>
                                </div>

                                <div className="space-y-5 border-t border-zinc-800/50 pt-8">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 text-rose-500">
                                            <AlertTriangle size={16} />
                                            <h4 className="text-[10px] font-black uppercase tracking-widest text-rose-500">Risk Protocol</h4>
                                        </div>
                                        <button onClick={handleResetRiskSettings} className="group flex items-center gap-1 px-2 py-1 bg-zinc-800/50 hover:bg-zinc-800 rounded border border-zinc-700/50 transition-all">
                                            <RotateCcw size={8} className="text-zinc-500 group-hover:text-rose-400" />
                                            <span className="text-[8px] font-black text-zinc-500 group-hover:text-zinc-300 uppercase tracking-tighter">Reset</span>
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="p-3 bg-zinc-950/50 rounded-xl border border-zinc-800">
                                            <label className="text-[9px] font-black uppercase text-zinc-500 tracking-widest">Max Risk / Trade %</label>
                                            <input type="number" step="0.1" value={formConfig.riskPercentage} onChange={(e) => setFormConfig({ ...formConfig, riskPercentage: parseFloat(e.target.value) })} className="mt-1 w-full bg-transparent border-b border-zinc-700 text-rose-400 font-mono text-[11px] outline-none pb-1 focus:border-rose-400" />
                                        </div>
                                        <div className="p-3 bg-zinc-950/50 rounded-xl border border-zinc-800">
                                            <label className="text-[9px] font-black uppercase text-zinc-500 tracking-widest">Max Pyramiding</label>
                                            <input type="number" min="1" max="5" value={formConfig.maxPyramiding} onChange={(e) => { const val = parseInt(e.target.value); setFormConfig(p => ({ ...p, maxPyramiding: isNaN(val) ? 1 : Math.min(5, Math.max(1, val)) })); }} className="mt-1 w-full bg-transparent border-b border-zinc-700 text-rose-400 font-mono text-[11px] outline-none pb-1 focus:border-rose-400" />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="p-3 bg-zinc-950/50 rounded-xl border border-zinc-800">
                                            <label className="text-[9px] font-black uppercase text-zinc-500 tracking-widest">Daily Circuit Breaker %</label>
                                            <input type="number" step="1" value={formConfig.maxDailyLoss} onChange={(e) => setFormConfig({ ...formConfig, maxDailyLoss: parseFloat(e.target.value) })} className="mt-1 w-full bg-transparent border-b border-zinc-700 text-rose-400 font-mono text-[11px] outline-none pb-1 focus:border-rose-400" />
                                        </div>
                                        <div className="p-3 bg-zinc-950/50 rounded-xl border border-zinc-800">
                                            <label className="text-[9px] font-black uppercase text-zinc-500 tracking-widest">Max Trades / Day</label>
                                            <input type="number" step="1" value={formConfig.maxTradesPerDay} onChange={(e) => setFormConfig({ ...formConfig, maxTradesPerDay: parseInt(e.target.value) })} className="mt-1 w-full bg-transparent border-b border-zinc-700 text-rose-400 font-mono text-[11px] outline-none pb-1 focus:border-rose-400" />
                                        </div>
                                    </div>
                                    <div className="p-4 bg-zinc-950/50 border border-zinc-800 rounded-2xl">
                                        <div className="flex items-center gap-2 mb-3">
                                            <Shield size={12} className="text-zinc-400" />
                                            <h4 className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Dynamic ATR Shield</h4>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-[8px] font-black uppercase text-zinc-600 tracking-widest">Take Profit Multiplier</label>
                                                <input type="number" step="0.5" value={formConfig.params.atr_tp_mult || 3.0} onChange={(e) => setFormConfig({ ...formConfig, params: { ...formConfig.params, atr_tp_mult: parseFloat(e.target.value) } })} className="mt-1 w-full bg-black border border-zinc-800 rounded px-2 py-1 text-zinc-300 outline-none font-mono text-[10px]" />
                                            </div>
                                            <div>
                                                <label className="text-[8px] font-black uppercase text-zinc-600 tracking-widest">Stop Loss Multiplier</label>
                                                <input type="number" step="0.5" value={formConfig.params.atr_sl_mult || 1.5} onChange={(e) => setFormConfig({ ...formConfig, params: { ...formConfig.params, atr_sl_mult: parseFloat(e.target.value) } })} className="mt-1 w-full bg-black border border-zinc-800 rounded px-2 py-1 text-zinc-300 outline-none font-mono text-[10px]" />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-4 bg-zinc-950/50 border border-zinc-800 rounded-2xl">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <Zap size={12} className="text-amber-400" />
                                                <div>
                                                    <h4 className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Partial Exit Protocol</h4>
                                                    <p className="text-[8px] text-zinc-600 font-bold mt-0.5">Lock 50% at 1.5× ATR, trail remainder</p>
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => setFormConfig(p => ({ ...p, enablePartialExit: !p.enablePartialExit }))}
                                                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${formConfig.enablePartialExit ? 'bg-amber-500' : 'bg-zinc-700'}`}
                                            >
                                                <span
                                                    className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${formConfig.enablePartialExit ? 'translate-x-4' : 'translate-x-1'}`}
                                                />
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4 border-t border-zinc-800/50 pt-8">
                                    <div className="flex justify-between items-center">
                                        <h4 className="text-[10px] text-zinc-400 font-black uppercase tracking-widest">Technical Ensemble</h4>
                                        <select
                                            value={formConfig.hybridMode}
                                            onChange={(e) => {
                                                const newMode = e.target.value;
                                                setFormConfig({ ...formConfig, hybridMode: newMode, minVotesRequired: newMode === "AND" ? formConfig.strategies.length : formConfig.minVotesRequired });
                                            }}
                                            className="bg-black border border-zinc-800 text-[9px] rounded px-2 py-1 text-zinc-300 font-bold uppercase tracking-widest"
                                        >
                                            <option value="AND">Strict (AND)</option>
                                            <option value="OR">Loose (OR)</option>
                                        </select>
                                    </div>
                                    <div className="space-y-3">
                                        {formConfig.strategies.map((s) => (
                                            <div key={s.id} className="p-4 bg-zinc-950/80 rounded-2xl border border-zinc-800 shadow-inner">
                                                <div className="flex justify-between mb-3">
                                                    <select
                                                        value={s.code}
                                                        onChange={(e) => {
                                                            setFormConfig(prev => ({
                                                                ...prev,
                                                                strategies: prev.strategies.map(st => st.id === s.id ? { ...st, code: e.target.value, params: DEFAULT_STRATEGY_PARAMS[e.target.value] } : st)
                                                            }));
                                                        }}
                                                        className="bg-transparent text-[10px] font-black text-amber-500 uppercase outline-none"
                                                    >
                                                        {STRAT_POOL.map(opt => <option key={opt.code} value={opt.code}>{opt.name}</option>)}
                                                    </select>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setFormConfig(prev => {
                                                                const filtered = prev.strategies.filter(st => st.id !== s.id);
                                                                return { ...prev, strategies: filtered, minVotesRequired: Math.max(1, Math.min(prev.minVotesRequired, filtered.length || 1)) };
                                                            });
                                                        }}
                                                        className="text-zinc-600 hover:text-rose-500 transition-colors"
                                                    >
                                                        <Trash2 size={12} />
                                                    </button>
                                                </div>
                                                <StrategyParamInputs
                                                    strategy={s}
                                                    onChange={(p) => {
                                                        setFormConfig(prev => ({
                                                            ...prev,
                                                            strategies: prev.strategies.map(st => st.id === s.id ? { ...st, params: p } : st)
                                                        }));
                                                    }}
                                                />
                                            </div>
                                        ))}
                                        <button
                                            type="button"
                                            onClick={() => setFormConfig(p => ({
                                                ...p,
                                                strategies: [...p.strategies, { id: makeStrategyId(), code: "rsi_threshold", params: DEFAULT_STRATEGY_PARAMS.rsi_threshold }]
                                            }))}
                                            className="w-full py-4 border border-dashed border-zinc-800 rounded-xl text-zinc-600 hover:text-emerald-500 hover:border-emerald-500/50 transition-all flex items-center justify-center gap-2 font-black text-[9px] uppercase tracking-widest"
                                        >
                                            <Plus size={12} /> Add Signal Module
                                        </button>
                                    </div>
                                </div>

                                <button onClick={() => setShowPreFlight(true)} className="w-full py-5 bg-emerald-500 text-black rounded-2xl font-black uppercase text-[12px] tracking-widest hover:bg-emerald-400 hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-emerald-500/20 mt-8">Initiate Engine</button>
                            </div>
                        </div>

                        <div className="col-span-12 lg:col-span-9 space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                                <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl shadow-xl">
                                    <p className="text-[9px] text-zinc-500 uppercase font-black mb-1">Engine Status</p>
                                    <p className="text-lg font-mono font-black text-zinc-600">STANDBY</p>
                                    <p className="text-[9px] font-mono text-zinc-500 mt-1 uppercase font-black">SESSION: 00:00:00</p>
                                </div>
                                <MetricCard label="Daily Profit"  value="$0.00" color="text-zinc-600" />
                                <MetricCard label="Floating PnL"  value="+0.00" color="text-zinc-600" />
                                <MetricCard label="Exposure"      value="0%"    color="text-zinc-600" />
                                <MetricCard label="Total Equity"  value={`$${formConfig.capitalAllocation}`} />
                            </div>
                            <div className="bg-zinc-900 border border-zinc-800 rounded-[40px] h-[600px] overflow-hidden flex items-center justify-center text-zinc-700 italic border-dashed">Initialize market link...</div>
                        </div>
                    </div>
                )}
            </div>
        </UIModeProvider>
    );
};

export default TradingBotContainer;
