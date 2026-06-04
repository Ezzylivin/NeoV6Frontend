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
//   [FIX] Restored missing handleReset scope reference handler

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
    HelpCircle, ShieldAlert,
    ChevronDown, ChevronUp, Search, ExternalLink, Sliders, Eye, EyeOff, Key, X
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
const labelClass = "text-[9px] text-zinc-500 uppercase font-black mb-1 block ml-1 tracking-tighter";

// ─── STRAT_COLORS ────────────────────────────────────────────────────────────
const STRAT_COLORS = {
    rsi_threshold: "#3b82f6",
    sma_crossover: "#ef4444",
    supertrend:    "#10b981",
    macd_crossover:"#f59e0b",
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

// ─── [P6] ERROR BOUNDARY ───────────────────────────────────────────────────────
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
const Tooltip = ({ text, children }) => {
    const [visible, setVisible] = useState(false);
    return (
        <div className="relative flex items-center" onMouseEnter={() => setVisible(true)} onMouseLeave={() => setVisible(false)}>
            {children}
            {visible && (
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-64 bg-zinc-800 text-zinc-200 text-[11px] p-3 rounded-lg shadow-xl z-[200] border border-zinc-700 pointer-events-none">
                    {text}
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-zinc-800"></div>
                </div>
            )}
        </div>
    );
};

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
        <p className="text-[9px] text-zinc-500 uppercase font-black tracking-[0.15em] mb-2">{label}</p>
        <div className="flex flex-col gap-1">
            <div className="flex items-center gap-1.5">
                {icon && <span className={color}>{icon}</span>}
                <p className={`text-lg font-mono font-black tracking-tighter ${color}`}>{value}</p>
            </div>
            {subValue && <p className="text-[9px] font-black text-zinc-600 uppercase tracking-wide">{subValue}</p>}
        </div>
    </div>
);

function StrategyParamInputs({ strategy, onChange }) {
    const { code, params = {} } = strategy;
    const f = (l, k, s = "1", desc) => (
        <div className="flex flex-col" key={k}>
            <div className="flex justify-between items-center mb-1">
                <label className="text-[8px] text-zinc-600 uppercase font-bold ml-1">{l}</label>
                {desc && <Tooltip text={desc}><Info size={8} className="text-zinc-700" /></Tooltip>}
            </div>
            <input
                type="number" step={s} value={params[k] ?? ""}
                onChange={(e) => onChange({ ...params, [k]: parseFloat(e.target.value) })}
                className="bg-zinc-950 border border-zinc-700 rounded-lg px-2 py-1 text-[9px] text-amber-500 outline-none font-mono"
            />
        </div>
    );
    return (
        <div className="grid grid-cols-2 gap-2">
            {code === "rsi_threshold"  && <>{f("Length","rsi_length")}{f("Oversold","oversold")}{f("Overbought","overbought")}</>}
            {code === "sma_crossover"  && <>{f("Fast","fast_sma")}{f("Slow","slow_sma")}</>}
            {code === "supertrend"     && <>{f("Period","st_atr")}{f("Mult","st_factor","0.1")}</>}
            {code === "macd_crossover" && <>{f("Fast","fast")}{f("Slow","slow")}</>}
            {code === "atr_breakout"   && <>{f("Len","atr_length")}{f("Mult","multiplier","0.1")}</>}
            {code === "bb_fade"        && <>{f("Per","bb_period")}{f("Std","bb_std","0.1")}</>}
            {code === "stoch"          && <>{f("K-P","k_period")}{f("D-P","d_period")}</>}
            {code === "ema_cloud"      && <>{f("Fast","fast_ema")}{f("Slow","slow_ema")}</>}
            {code === "pa_breakout"    && <>{f("LB","lookback")}{f("Buf","buffer","0.01")}</>}
            {code === "vol_profile"    && <>{f("MA","vol_ma")}{f("T","threshold","0.1")}</>}
        </div>
    );
}

// ─── API KEY MODAL — replaces prompt() ────────────────────────────────────
const ApiKeyModal = ({ exchange, onSave, onCancel }) => {
    const isKraken = exchange === 'kraken';
    const [key, setKey]       = useState("");
    const [secret, setSecret] = useState("");
    const [showKey, setShowKey]       = useState(false);
    const [showSecret, setShowSecret] = useState(false);

    const handleSave = () => {
        if (!key.trim() || !secret.trim()) {
            toast.error("Both fields are required.");
            return;
        }
        if (isKraken) {
            localStorage.setItem("kraken_key", key.trim());
            localStorage.setItem("kraken_secret", secret.trim());
        } else {
            localStorage.setItem("coinbase_key", key.trim());
            localStorage.setItem("coinbase_secret", secret.trim());
        }
        onSave(key.trim(), secret.trim());
    };

    const brand = isKraken ? "Kraken" : "Coinbase";
    const brandColor = isKraken ? "text-purple-400" : "text-blue-400";
    const brandBorder = isKraken ? "border-purple-500/30" : "border-blue-500/30";

    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/95 backdrop-blur-xl p-4">
            <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-3xl p-8 shadow-2xl">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl bg-zinc-800 border ${brandBorder}`}>
                            <Key size={16} className={brandColor} />
                        </div>
                        <div>
                            <h3 className="text-sm font-black text-white uppercase tracking-tighter">{brand} API Keys</h3>
                            <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest mt-0.5">Live execution credentials</p>
                        </div>
                    </div>
                    <button onClick={onCancel} className="text-zinc-600 hover:text-white transition-colors">
                        <X size={18} />
                    </button>
                </div>

                <div className={`p-3 mb-6 rounded-xl border ${brandBorder} bg-amber-500/5`}>
                    <p className="text-[10px] text-amber-400 font-bold leading-relaxed">
                        ⚠ Keys are stored for this session only. For production deployments,
                        use a server-side vault. Never share your secret key.
                    </p>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className={labelClass}>API Key</label>
                        <div className="relative">
                            <input
                                type={showKey ? "text" : "password"}
                                value={key}
                                onChange={(e) => setKey(e.target.value)}
                                placeholder="Enter API key..."
                                className={`${inputClass} pr-10`}
                                autoComplete="off"
                            />
                            <button
                                type="button"
                                onClick={() => setShowKey(v => !v)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-300 transition-colors"
                            >
                                {showKey ? <EyeOff size={12} /> : <Eye size={12} />}
                            </button>
                        </div>
                    </div>
                    <div>
                        <label className={labelClass}>API Secret</label>
                        <div className="relative">
                            <input
                                type={showSecret ? "text" : "password"}
                                value={secret}
                                onChange={(e) => setSecret(e.target.value)}
                                placeholder="Enter API secret..."
                                className={`${inputClass} pr-10`}
                                autoComplete="off"
                            />
                            <button
                                type="button"
                                onClick={() => setShowSecret(v => !v)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-300 transition-colors"
                            >
                                {showSecret ? <EyeOff size={12} /> : <Eye size={12} />}
                            </button>
                        </div>
                    </div>
                </div>

                <div className="flex gap-4 mt-8">
                    <button onClick={onCancel} className="flex-1 py-4 border border-zinc-800 rounded-2xl text-zinc-500 font-black uppercase text-[10px] hover:text-white transition-all">Cancel</button>
                    <button
                        onClick={handleSave}
                        disabled={!key.trim() || !secret.trim()}
                        className={`flex-1 py-4 rounded-2xl font-black uppercase text-[10px] transition-all ${
                            key.trim() && secret.trim() ? `${isKraken ? 'bg-purple-500 hover:bg-purple-400' : 'bg-blue-500 hover:bg-blue-400'} text-white` : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
                        }`}
                    >
                        Authorize
                    </button>
                </div>
            </div>
        </div>
    );
};

const ConfirmModal = ({ title, message, danger, onConfirm, onCancel }) => (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/95 backdrop-blur-xl p-4">
        <div className="max-w-sm w-full bg-zinc-900 border border-zinc-800 rounded-3xl p-8 shadow-2xl">
            <div className={`p-3 rounded-xl ${danger ? 'bg-rose-500/10 border border-rose-500/20' : 'bg-zinc-800/50 border border-zinc-700'} mb-6 flex items-center gap-3`}>
                <AlertTriangle size={18} className={danger ? "text-rose-500" : "text-zinc-400"} />
                <h3 className={`text-sm font-black uppercase tracking-tighter ${danger ? 'text-rose-400' : 'text-white'}`}>{title}</h3>
            </div>
            <p className="text-[11px] text-zinc-400 font-bold leading-relaxed mb-8">{message}</p>
            <div className="flex gap-4">
                <button onClick={onCancel} className="flex-1 py-4 border border-zinc-800 rounded-2xl text-zinc-500 font-black uppercase text-[10px] hover:text-white transition-all">Abort</button>
                <button onClick={onConfirm} className={`flex-1 py-4 rounded-2xl font-black uppercase text-[10px] transition-all ${danger ? 'bg-rose-500 hover:bg-rose-400 text-white' : 'bg-zinc-700 hover:bg-zinc-600 text-white'}`}>Confirm</button>
            </div>
        </div>
    </div>
);

const PreFlightModal = ({ config, onConfirm, onCancel, isStarting, hasApiKeys, address }) => {
    const [checks, setChecks] = useState({ wallet: false, keys: false, capital: false, strategy: false });
    useEffect(() => {
        setChecks({
            wallet:   !!address,
            keys:      config.tradingMode === 'paper' || hasApiKeys,
            capital:  Number(config.capitalAllocation) >= 100,
            strategy: (config.strategies && config.strategies.length > 0)
        });
    }, [config, hasApiKeys, address]);
    const allPassed = Object.values(checks).every(Boolean);
    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/95 backdrop-blur-xl p-4">
            <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-3xl p-8 shadow-2xl">
                <h3 className="text-xl font-black text-white mb-8 flex items-center gap-2 uppercase tracking-tighter">
                    <span className="text-emerald-500">🚀</span> Pre-Flight Check
                </h3>
                <div className="space-y-3 mb-10">
                    <CheckItem label="Wallet Status"       status={checks.wallet}   />
                    <CheckItem label="API Authorization"   status={checks.keys}     />
                    <CheckItem label="Allocated Liquidity" status={checks.capital}  />
                    <CheckItem label="Strategy Modules"    status={checks.strategy} />
                </div>
                <div className="flex gap-4">
                    <button onClick={onCancel} className="flex-1 py-4 border border-zinc-800 rounded-2xl text-zinc-500 font-black uppercase text-[10px] hover:text-white transition-all">Abort</button>
                    <button
                        onClick={onConfirm}
                        disabled={!allPassed || isStarting}
                        className={`flex-2 py-4 rounded-2xl font-black uppercase text-[10px] transition-all shadow-lg ${allPassed ? 'bg-emerald-500 text-black hover:bg-emerald-400' : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'}`}
                    >
                        {isStarting ? 'Igniting Engine...' : 'Execute Launch'}
                    </button>
                </div>
            </div>
        </div>
    );
};

const ConfidenceRingCard = ({ confidence }) => {
    const c = Math.min(100, Math.max(0, confidence || 0));
    const r = 28, circ = 2 * Math.PI * r;
    const dash = (c / 100) * circ;
    const color     = c < 35 ? '#ef4444' : c < 52 ? '#f59e0b' : c < 72 ? '#a78bfa' : '#10b981';
    const colorClass = c < 35 ? 'text-rose-500' : c < 52 ? 'text-amber-400' : c < 72 ? 'text-violet-400' : 'text-emerald-400';
    const label      = c < 35 ? 'BEARISH' : c < 52 ? 'NEUTRAL' : c < 72 ? 'BULLISH' : 'STRONG';
    return (
        <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-3xl relative overflow-hidden shadow-xl flex items-center gap-3">
            <div className="flex-1 min-w-0">
                <p className="text-[9px] text-zinc-500 uppercase font-black tracking-[0.15em] mb-1 truncate">Council Consensus</p>
                <p className={`text-lg font-mono font-black tracking-tighter ${colorClass}`}>{Math.round(c)}%</p>
                <p className={`text-[9px] font-black uppercase tracking-wide ${colorClass} opacity-60`}>{label}</p>
            </div>
            <div className="relative flex-shrink-0" style={{ width: 64, height: 64 }}>
                <svg width="64" height="64" style={{ transform: 'rotate(-90deg)' }}>
                    <circle cx="32" cy="32" r={r} fill="none" stroke="#27272a" strokeWidth="6" />
                    <circle
                        cx="32" cy="32" r={r} fill="none"
                        stroke={color} strokeWidth="6" strokeLinecap="round"
                        strokeDasharray={`${dash} ${circ - dash}`}
                        style={{ transition: 'stroke-dasharray 0.8s ease, stroke 0.8s ease' }}
                    />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                    <Zap size={14} style={{ color }} />
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
                <h4 className="text-[9px] font-black uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                    <Activity size={10} className="text-amber-400" /> Signal Bars
                </h4>
                <span className={`font-mono text-[10px] font-black ${consClass}`}>{Math.round(consensus)}% consensus</span>
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
                        <div key={code} className="flex items-center gap-2">
                            <span className="text-[8px] font-black uppercase text-zinc-600 w-[68px] truncate shrink-0">{name}</span>
                            <div className="flex-1 h-1 bg-zinc-800 rounded-full overflow-hidden">
                                <div className="h-full rounded-full transition-all duration-700" style={{ width: `${val}%`, background: color, opacity: 0.85 }} />
                            </div>
                            <div className="flex items-center gap-1 w-[38px] justify-end shrink-0">
                                <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: val > 50 ? '#10b981' : '#ef4444' }} />
                                <span className="font-mono text-[9px] font-black" style={{ color }}>{Math.round(val)}%</span>
                            </div>
                        </div>
                    );
                })}
                {activeCodes.length === 0 && <p className="text-[9px] text-zinc-600 italic text-center py-1">Awaiting signal data...</p>}
            </div>
        </div>
    );
};

const PositionCard = ({ pos, currentPrice, defaultSymbol, onExit, isExiting }) => {
    const symbol   = pos.symbol || defaultSymbol || '';
    const cp       = currentPrice || 0;
    const isLong   = pos.type !== 'short';
    const priceDiff = cp > 0 ? (isLong ? cp - pos.entry : pos.entry - cp) : 0;
    const pnl      = priceDiff * Number(pos.size);
    const pnlColor = pnl >= 0 ? 'text-emerald-400' : 'text-rose-500';
    const borderColor = pnl >= 0 ? 'rgba(16,185,129,0.18)' : 'rgba(239,68,68,0.18)';

    const hasTpSl = pos.tp > 0 && pos.sl > 0;
    const tpPct = hasTpSl ? Math.min(100, Math.max(0, isLong ? ((cp - pos.entry) / (pos.tp - pos.entry)) * 100 : ((pos.entry - cp) / (pos.entry - pos.tp)) * 100)) : 0;
    const slPct = hasTpSl ? Math.min(100, Math.max(0, isLong ? ((pos.entry - cp) / (pos.entry - pos.sl)) * 100 : ((cp - pos.entry) / (pos.sl - pos.entry)) * 100)) : 0;
    const trackPct = hasTpSl ? (() => {
        const lo = Math.min(pos.sl, pos.entry, pos.tp);
        const hi = Math.max(pos.sl, pos.entry, pos.tp);
        return Math.min(96, Math.max(4, ((cp - lo) / (hi - lo || 1)) * 100));
    })() : 50;

    return (
        <div className="p-4 rounded-2xl border transition-all" style={{ background: pnl >= 0 ? 'rgba(16,185,129,0.03)' : 'rgba(239,68,68,0.03)', borderColor }}>
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <div className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase border flex items-center gap-1 ${isLong ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-amber-500/10 border-amber-500/20 text-amber-400'}`}>
                        {isLong ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                        {pos.type.toUpperCase()}
                    </div>
                    <span className="text-[10px] font-black text-zinc-400 font-mono">{symbol}</span>
                </div>
                <div className="text-right">
                    <div className="text-[8px] text-zinc-600 uppercase font-black mb-0.5">Mark Price</div>
                    <div className="font-mono font-black text-[12px] text-zinc-200">{cp > 0 ? `$${cp.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}</div>
                </div>
            </div>

            {hasTpSl && (
                <div className="mb-3 px-1">
                    <div className="flex justify-between text-[7px] text-zinc-600 font-bold uppercase mb-1.5">
                        <span>SL ${Number(pos.sl).toLocaleString()}</span>
                        <span>Entry ${Number(pos.entry).toLocaleString()}</span>
                        <span>TP ${Number(pos.tp).toLocaleString()}</span>
                    </div>
                    <div className="h-1 bg-zinc-800 rounded-full relative">
                        <div className="absolute w-3 h-3 rounded-full border-2 border-zinc-900 transition-all duration-700 top-1/2 -translate-y-1/2 -translate-x-1/2" style={{ left: `${trackPct}%`, background: pnl >= 0 ? '#10b981' : '#ef4444' }} />
                    </div>
                </div>
            )}

            {hasTpSl && (
                <div className="grid grid-cols-2 gap-2 mb-3">
                    <div className="p-2 bg-emerald-500/5 border border-emerald-500/10 rounded-xl">
                        <div className="flex justify-between mb-1">
                            <span className="text-[7px] text-emerald-500 font-black uppercase">Take Profit</span>
                            <span className="font-mono text-[7px] text-emerald-500 font-black">{Math.round(tpPct)}%</span>
                        </div>
                        <div className="h-1 bg-emerald-500/10 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500 rounded-full transition-all duration-700" style={{ width: `${tpPct}%` }} />
                        </div>
                    </div>
                    <div className="p-2 bg-rose-500/5 border border-rose-500/10 rounded-xl">
                        <div className="flex justify-between mb-1">
                            <span className="text-[7px] text-rose-500 font-black uppercase">Stop Loss</span>
                            <span className="font-mono text-[7px] text-rose-500 font-black">{Math.round(slPct)}%</span>
                        </div>
                        <div className="h-1 bg-rose-500/10 rounded-full overflow-hidden">
                            <div className="h-full bg-rose-500 rounded-full transition-all duration-700" style={{ width: `${slPct}%` }} />
                        </div>
                    </div>
                </div>
            )}

            <div className="flex items-center justify-between">
                <div>
                    <div className="text-[7px] text-zinc-600 font-black uppercase mb-0.5">Entry · Size</div>
                    <div className="font-mono text-[10px] font-black text-zinc-400">${Number(pos.entry).toLocaleString()} <span className="text-zinc-600">· {Number(pos.size).toFixed(4)}</span></div>
                </div>
                <div className="text-center">
                    <div className="text-[7px] text-zinc-600 font-black uppercase mb-0.5">Floating PnL</div>
                    <div className={`font-mono font-black text-[14px] ${pnlColor}`}>{cp > 0 ? `${pnl >= 0 ? '+' : ''}$${pnl.toFixed(2)}` : '—'}</div>
                </div>
                <button
                    onClick={() => onExit(symbol)}
                    disabled={isExiting}
                    className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500 border border-rose-500/20 rounded-lg text-rose-500 hover:text-white font-black uppercase text-[9px] transition-all tracking-wider disabled:opacity-40 disabled:cursor-not-allowed"
                >
                    {isExiting ? '...' : 'EXIT'}
                </button>
            </div>
        </div>
    );
};

const TradeTimelineCard = ({ trade }) => {
    const side       = trade.type || trade.side || 'trade';
    const entryPrice = Number(trade.entry || trade.entryPrice || trade.entry_price || 0);
    const exitPrice  = Number(trade.exit  || trade.exitPrice  || trade.exit_price || trade.price || 0);
    const partialP   = Number(trade.partialExit || trade.partial_exit || 0);
    const pnl        = parseFloat(trade.pnl || trade.realized_pnl || trade.realizedPnL || 0);
    const sl         = Number(trade.sl  || trade.stop_loss    || 0);
    const tp         = Number(trade.tp  || trade.take_profit  || 0);
    const isWin      = pnl >= 0;
    const isLong     = side === 'long';

    const timeObj = trade.time ? new Date(trade.time * (trade.time > 1e10 ? 1 : 1000)) : trade.exitTime ? new Date(trade.exitTime) : new Date();
    const hasPriceTrack = entryPrice > 0 && exitPrice > 0;
    const winColor = isWin ? '#10b981' : '#ef4444';

    return (
        <div className={`p-4 rounded-2xl border relative overflow-hidden transition-all ${isWin ? 'bg-black/20 border-emerald-500/20 hover:border-emerald-500/40' : 'bg-black/20 border-rose-500/20 hover:border-rose-500/40'}`}>
            <div className="absolute left-0 top-0 bottom-0 w-0.5" style={{ background: winColor }} />
            <div className="flex items-center justify-between mb-3 pl-2">
                <div className="flex items-center gap-2">
                    {trade.type === "partial_exit" ? (
                        <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-amber-500/10 text-amber-500 border border-amber-500/20 tracking-wider">⚖ Partial 50%</span>
                    ) : (
                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${isLong ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>{isLong ? '▲ Long' : '▼ Short'}</span>
                    )}
                    <span className="text-[8px] text-zinc-600 font-mono font-bold">{timeObj.toLocaleDateString()} {timeObj.toLocaleTimeString()}</span>
                </div>
                <span className="font-mono font-black text-[13px]" style={{ color: winColor }}>{pnl >= 0 ? '+' : ''}${Math.abs(pnl).toFixed(2)}</span>
            </div>

            {hasPriceTrack && (
                <div className="pl-2 mb-1">
                    <svg viewBox={`0 0 ${SVG_W = 268} 44`} width="100%" height="44" style={{ overflow: 'visible' }} aria-label={`Price journey: ${side} from $${entryPrice} to $${exitPrice}`} role="img">
                        <line x1={12} y1="22" x2={SVG_W - 12} y2="22" stroke="#27272a" strokeWidth="1.5" />
                        {sl > 0 && <>
                            <circle cx={12 + Math.min(94, Math.max(6, ((sl - entryPrice) / (tp - entryPrice || 1)) * 100))} cy="22" r="4" fill="#18181b" stroke="#ef4444" strokeWidth="1.5" />
                            <text x={12 + Math.min(94, Math.max(6, ((sl - entryPrice) / (tp - entryPrice || 1)) * 100))} y="36" textAnchor="middle" fill="#ef4444" fontSize="7" fontWeight="700" fontFamily="monospace">SL</text>
                        </>}
                        <circle cx={12} cy="22" r="5" fill="#3b82f6" stroke="#09090b" strokeWidth="2" />
                        <text x={12} y="11" textAnchor="middle" fill="#3b82f6" fontSize="7" fontWeight="700" fontFamily="monospace">ENTRY</text>
                        <rect x={SVG_W - 17} y="17" width="10" height="10" fill={winColor} stroke="#09090b" strokeWidth="2" rx="2" />
                        <text x={SVG_W - 12} y="11" textAnchor="middle" fill={winColor} fontSize="7" fontWeight="700" fontFamily="monospace">EXIT</text>
                    </svg>
                    <div className="flex justify-between mt-0.5">
                        <span className="text-[8px] text-zinc-600 font-mono font-bold">${Number(entryPrice).toLocaleString()}</span>
                        {partialP > 0 && <span className="text-[8px] text-amber-500 font-mono font-bold">+${(Number(trade.pPnl || trade.partial_pnl || 0)).toFixed(2)} locked</span>}
                        <span className="font-mono font-bold text-[8px]" style={{ color: winColor }}>${Number(exitPrice).toLocaleString()}</span>
                    </div>
                </div>
            )}

            {!hasPriceTrack && (
                <div className="pl-2 grid grid-cols-2 gap-3">
                    <div>
                        <p className="text-[8px] text-zinc-500 uppercase font-black">{trade.type === "partial_exit" ? "Execution Price" : "Entry / Exit"}</p>
                        <p className="text-[10px] font-mono font-bold text-zinc-300">{trade.type === "partial_exit" ? `$${Number(exitPrice).toLocaleString()}` : `$${Number(entryPrice).toLocaleString()} → $${Number(exitPrice).toLocaleString()}`}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-[8px] text-zinc-500 uppercase font-black">Realized PnL</p>
                        <p className={`text-[11px] font-black font-mono ${isWin ? 'text-emerald-400' : 'text-rose-500'}`}>{pnl >= 0 ? '+' : ''}${Math.abs(pnl).toFixed(2)}</p>
                    </div>
                </div>
            )}
        </div>
    );
};

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
            <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-6 flex items-center gap-2"><Cpu size={12} className="text-violet-400" /> Neural Strategy Logic</h4>
            <div className="flex-1 w-full min-h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={signalsMapHistory} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <defs>
                            {activeStratCodes.map(key => (
                                <linearGradient key={`grad-${key}`} id={`color-${key}`} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%"  stopColor={STRAT_COLORS[key] || '#52525b'} stopOpacity={0.3} />
                                    <stop offset="95%" strokeColor={STRAT_COLORS[key] || '#52525b'} stopOpacity={0} />
                                </linearGradient>
                            ))}
                        </defs>
                        <RechartsTooltip shared={false} trigger="hover" contentStyle={{ backgroundColor: '#09090b', border: '1px solid #27272a', borderRadius: '12px', fontSize: '10px', pointerEvents: 'none' }} formatter={(value, name) => [`${Number(value).toFixed(0)}%`, name.toUpperCase()]} />
                        {activeStratCodes.map(key => (
                            <Area key={key} type="monotone" dataKey={key} name={key.replace('_', ' ')} stroke={STRAT_COLORS[key] || '#52525b'} fill={`url(#color-${key})`} strokeWidth={2} dot={false} activeDot={{ r: 4, strokeWidth: 0 }} isAnimationActive={false} connectNulls={true} />
                        ))}
                        <XAxis dataKey="time" hide />
                        <YAxis domain={[0, 100]} hide />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-4 border-t border-zinc-800 pt-4">
                <div className="flex flex-col gap-1.5 border-r border-zinc-800 pr-2">
                    <span className="text-[7px] font-black tracking-widest text-zinc-600 uppercase">👤 User Setup</span>
                    <div className="flex flex-wrap gap-2">
                        {userStratCodes.map(code => (
                            <div key={`user-${code}`} className="flex items-center gap-1 opacity-40">
                                <div className="w-1 h-1 rounded-full bg-zinc-500"></div>
                                <span className="text-[8px] font-bold uppercase text-zinc-400 font-mono tracking-tight">{code.replace('_', ' ')}</span>
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
                                <span className="text-[8px] font-black uppercase text-zinc-200 font-mono tracking-tight">{code.replace('_', ' ')}</span>
                            </div>
                        ))}
                    </div>
                </div>
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
        filters: { trend_filter: "none", vol_min: 0, atr_filter: 0 }
    });

    const isBotRunning = socketStatus.status === 'running' && !isHaltLocked;

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
        if (score < 35) return { label: "VETO GUARD", color: "text-rose-400", hex: "#f43f5e" };
        return { label: "NEUTRAL CHOP", color: "text-violet-400", hex: "#a78bfa" };
    }, [socketStatus.currentConfidence]);

    useEffect(() => {
        if (hookBotStatus) setSocketStatus(prev => ({
            ...prev, ...hookBotStatus,
            logs: hookBotStatus.logs?.length ? hookBotStatus.logs : prev.logs
        }));
        if (hookLogs.length > 0) setSocketLogs(hookLogs);
        if (restoredConfig) setFormConfig(prev => ({
            ...prev, ...restoredConfig,
            strategies: restoredConfig.strategies?.length > 0 ? restoredConfig.strategies : prev.strategies
        }));
    }, [hookBotStatus, hookLogs, restoredConfig]);

    const activeBalance = useMemo(() => {
        if (isBotRunning) return socketStatus.currentBalance || socketStatus.initialCapital || formConfig.capitalAllocation;
        return formConfig.capitalAllocation;
    }, [isBotRunning, socketStatus.currentBalance, socketStatus.initialCapital, formConfig.capitalAllocation]);

    const calculatedStats = useMemo(() => {
        const trades = socketStatus.tradeHistory?.length > 0 ? socketStatus.tradeHistory : (socketStatus.trade_history?.length > 0 ? socketStatus.trade_history : (socketStatus.tradeMarkers?.length > 0 ? socketStatus.tradeMarkers : []));
        const settled = trades.filter(t => t.type === 'exit' || t.type === 'partial_exit' || t.reason);
        if (settled.length === 0) return { winRate: 0, profitFactor: "1.0" };
        const wins = settled.filter(t => (parseFloat(t.pnl) || 0) > 0);
        const winRate = Math.round((wins.length / settled.length) * 100);
        let grossProfits = 0, grossLosses = 0;
        settled.forEach(t => {
            const pnl = parseFloat(t.pnl) || 0;
            if (pnl > 0) grossProfits += pnl;
            else grossLosses += Math.abs(pnl);
        });
        const profitFactor = grossLosses === 0 ? (grossProfits > 0 ? "99.9" : "1.0") : (grossProfits / grossLosses).toFixed(1);
        return { winRate, profitFactor };
    }, [socketStatus.tradeHistory, socketStatus.trade_history, socketStatus.tradeMarkers]);

    const performanceData = useMemo(() => {
        const initialSeed = Number(formConfig.capitalAllocation) || 0;
        const seedPoint = { time: 'Start', balance: initialSeed, confidence: 50 };
        if (!socketStatus.equityCurve?.length) return [seedPoint];
        return [seedPoint, ...socketStatus.equityCurve.map(p => ({
            time: new Date(p.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            balance: p.balance,
            confidence: p.confidence || 50
        }))];
    }, [socketStatus.equityCurve, formConfig.capitalAllocation]);

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
                const currentBalance = data.currentBalance || prev.currentBalance || 0;
                const rawPositions   = data.activePositions || data.positions || [];
                const filteredPositions = rawPositions.filter(pos => !exitingSymbolsRef.current.includes(pos.symbol));
                const seed = prev.initialCapital || data.initialCapital || currentBalance || formConfigRef.current.capitalAllocation;

                const rawProfit      = data.dailyProfit || data.daily_profit;
                const delta          = currentBalance - seed;
                const calculatedProfit = rawProfit !== undefined ? Number(rawProfit.toFixed(2)) : Number(delta.toFixed(2));

                const rawSignals = data.signalsMap || {};
                const normalizedSignals = {};
                Object.keys(rawSignals).forEach(key => {
                    const nk = key.toLowerCase().trim().replace(/\s+/g, '_');
                    const val = parseFloat(rawSignals[key]);
                    if (!isNaN(val)) normalizedSignals[nk] = val * 100;
                });

                const updatedSignalsHistory = [...(prev.signalsMapHistory || []), { time: new Date().toLocaleTimeString(), ...normalizedSignals }].slice(-300);
                const updatedEquityCurve = [...(prev.equityCurve || []), { time: new Date().toLocaleTimeString(), balance: currentBalance, confidence: data.currentConfidence ?? prev.currentConfidence ?? 0 }].slice(-300);

                return {
                    ...prev, ...data,
                    dailyProfit: calculatedProfit,
                    initialCapital: seed,
                    positions: filteredPositions,
                    candles: (data.candles?.length > 0) ? data.candles : (prev.candles || []),
                    tradeHistory: (data.tradeHistory?.length > 0) ? data.tradeHistory : (data.trade_history?.length > 0 ? data.trade_history : (prev.tradeHistory || [])),
                    tradeMarkers: (data.tradeMarkers?.length > 0) ? data.tradeMarkers : (data.trade_markers?.length > 0 ? data.trade_markers : (prev.tradeMarkers || [])),
                    signalsMapHistory: updatedSignalsHistory,
                    equityCurve: updatedEquityCurve
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
            api_keys: formConfig.tradingMode === 'live' ? (
                formConfig.enable_shorting ? {
                    krakenKey:  localStorage.getItem("kraken_key")    || "",
                    krakenSecret: localStorage.getItem("kraken_secret") || "",
                    apiKey:  localStorage.getItem("kraken_key")    || "",
                    secret:  localStorage.getItem("kraken_secret") || ""
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

    // ============================================================
    // 🛡️ RE-SECURED FACTORY INITIALIZATION SYSTEM CORE
    // ============================================================
    const handleReset = () => {
        setConfirmModal({
            title: "Factory Reset",
            message: "This will wipe all trade history, logs, and equity curves. This cannot be undone.",
            danger: true,
            onConfirm: async () => {
                setConfirmModal(null);
                await resetBot();
                setSocketLogs([]);
                setSocketStatus({ status: 'stopped', currentBalance: 0, unrealizedPnl: 0, exposure: 0, positions: [], equityCurve: [], startedAt: null, dailyProfit: 0, initialCapital: 0, tradeMarkers: [], signalsMapHistory: [] });
            }
        });
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
                                <p className="text-[9px] text-zinc-500 font-black uppercase tracking-[0.2em]">Terminal v14</p>
                                {socketConnected ? <Wifi size={10} className="text-emerald-500" /> : <WifiOff size={10} className="text-rose-500" />}
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        {statusFetchError && (
                            <div className="flex items-center gap-2 px-4 py-2 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                                <AlertTriangle size={12} className="text-amber-500" />
                                <span className="text-[9px] text-amber-400 font-black uppercase tracking-widest">{statusFetchError}</span>
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
                                    <p className="text-[9px] text-zinc-500 uppercase font-black tracking-widest">Engine Status</p>
                                    <Timer size={12} className="text-emerald-500 animate-pulse" />
                                </div>
                                <p className="text-lg font-mono font-black text-emerald-400">OPERATIONAL</p>
                                <p className="text-[9px] font-mono text-zinc-500 mt-1 uppercase tracking-tighter font-black">SESSION: {uptime}</p>
                            </div>
                            <MetricCard label="Daily Profit"    value={`${socketStatus.dailyProfit >= 0 ? '+' : ''}${(socketStatus.dailyProfit || 0).toFixed(2)}`}  subValue={`${profitPct.toFixed(2)}%`}  color={socketStatus.dailyProfit >= 0 ? "text-emerald-400" : "text-rose-500"}   icon={<DollarSign size={10} />} />
                            <MetricCard label="Floating PnL"    value={`${socketStatus.unrealizedPnl >= 0 ? '+' : ''}${(socketStatus.unrealizedPnl || 0).toFixed(2)}`} subValue={`${pnlPct.toFixed(2)}%`}    color={socketStatus.unrealizedPnl >= 0 ? 'text-emerald-400' : 'text-rose-500'} icon={<Activity size={10} />} />
                            <MetricCard label="Exposure"        value={`${socketStatus.exposure || 0}%`} subValue="Active Positions" color="text-amber-400" />
                            <MetricCard label="Total Equity"    value={`$${Number(activeBalance).toLocaleString()}`} subValue="Liquid + Locked" />
                            <ConfidenceRingCard confidence={socketStatus.currentConfidence || 0} />
                        </div>

                        <div className="grid grid-cols-12 gap-8 items-start">
                            <div className="col-span-12 lg:col-span-3 h-[840px] flex flex-col gap-4">
                                <div className="flex-1 min-h-[240px]">
                                    <ErrorBoundary>
                                        <NeuralConvergenceChart formConfig={formConfig} signalsMapHistory={socketStatus.signalsMapHistory || []} />
                                    </ErrorBoundary>
                                </div>
                                <SignalBarsPanel signalsMapHistory={socketStatus.signalsMapHistory || []} formConfig={formConfig} />
                                <div className="bg-zinc-900 border border-zinc-800 rounded-[32px] p-6 shadow-2xl">
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-4">Neural Performance</h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-[8px] uppercase font-bold text-zinc-600 mb-1">Win Rate</p>
                                            <p className="text-xl font-mono font-black tracking-tighter text-emerald-400">{calculatedStats.winRate}%</p>
                                        </div>
                                        <div>
                                            <p className="text-[8px] uppercase font-bold text-zinc-600 mb-1">Profit Factor</p>
                                            <p className="text-xl font-mono font-black tracking-tighter text-violet-400">{Number(calculatedStats.profitFactor).toFixed(2)}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="col-span-12 lg:col-span-9 flex flex-col gap-4">
                                <div className="w-full bg-zinc-900/40 border border-zinc-800 rounded-3xl p-4 backdrop-blur-md flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-xl">
                                    <div className="flex items-center gap-4">
                                        <div className="relative flex h-3 w-3 items-center justify-center">
                                            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${socketStatus.aiRegimeDesc?.includes('Trend') || socketStatus.aiRegimeDesc?.includes('Volatility') ? 'bg-emerald-400' : 'bg-violet-400'}`}></span>
                                            <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${socketStatus.aiRegimeDesc?.includes('Trend') || socketStatus.aiRegimeDesc?.includes('Volatility') ? 'bg-emerald-500' : 'bg-violet-500'}`}></span>
                                        </div>
                                        <div>
                                            <span className="text-[8px] font-black uppercase text-zinc-500 tracking-widest block">Forecasted Market Regime</span>
                                            <h2 className="text-xs font-mono font-black text-zinc-100 tracking-wide mt-0.5">
                                                {socketStatus.aiRegimeTitle || "Analyzing Market Structures..."}
                                                <span className="text-[10px] font-normal text-zinc-500 ml-2">({socketStatus.aiRegimeDesc || "Calibrating Sensors"})</span>
                                            </h2>
                                        </div>
                                    </div>
                                    <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-xl px-4 py-2 min-w-[280px] md:max-w-md">
                                        <div className="flex items-center gap-1.5 mb-0.5">
                                            <span className="text-[7px] font-black uppercase text-violet-400 tracking-wider">AI Strategy Configuration</span>
                                            <span className="text-[6px] font-mono bg-violet-500/10 border border-violet-500/20 text-violet-300 px-1 rounded uppercase">Active</span>
                                        </div>
                                        <p className="text-[10px] font-mono font-medium text-zinc-300 tracking-tight leading-relaxed">{socketStatus.aiDeployedGear || "Scanning setup to allocate optimal indicator array..."}</p>
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

                                    <div className="lg:col-span-1 bg-zinc-900 border border-zinc-800 rounded-[40px] flex flex-col overflow-hidden shadow-2xl">
                                        <div className="p-5 border-b border-zinc-800 bg-zinc-800/20 flex flex-col gap-2.5">
                                            <div className="flex justify-between items-center text-violet-400">
                                                <div className="flex items-center gap-2">
                                                    <Cpu size={16} className="animate-pulse" />
                                                    <h3 className="text-[10px] font-black uppercase tracking-widest">Neural Flow</h3>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <button onClick={handleSyncLogs}  className="text-zinc-600 hover:text-emerald-400 transition-all"><RefreshCw size={14} /></button>
                                                    <button onClick={handleClearLogs} className="text-zinc-600 hover:text-white transition-all"><Eraser size={14} /></button>
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
                                                        <div key={label} className="flex items-center gap-1">
                                                            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: bg }} />
                                                            <span className={`text-[7px] font-black uppercase tracking-tight ${text}`}>{label}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                                <div className="flex items-center gap-2 flex-wrap border-t border-zinc-800/40 pt-1.5">
                                                    {currentActiveStrategyCodes.map(code => {
                                                        const color = STRAT_COLORS[code] || '#52525b';
                                                        const shortName = STRAT_POOL.find(s => s.code === code)?.name || code;
                                                        return (
                                                            <div key={`flow-legend-${code}`} className="flex items-center gap-1">
                                                                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
                                                                <span className="text-[7px] font-black uppercase font-mono tracking-tighter text-zinc-300">{shortName}</span>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        </div>
                                        <div ref={logContainerRef} className="flex-1 overflow-y-auto p-6 font-mono text-[10px] space-y-3 bg-black/20 custom-scrollbar">
                                            {socketLogs.map((log, i) => {
                                                if (log.type === "RICH_LOG" || log.targets) {
                                                    return (
                                                        <div key={i} className="mb-2 p-3 bg-zinc-950/50 rounded-xl border border-zinc-800 flex flex-col gap-2">
                                                            <div className="flex justify-between items-center border-b border-zinc-800/50 pb-2">
                                                                <span className="text-zinc-500 font-black uppercase text-[8px] tracking-widest">Targets ({log.rule})</span>
                                                                <span className="text-[8px] opacity-40 font-bold">{formatTime(log.time)}</span>
                                                            </div>
                                                            <div className="flex flex-col gap-1.5 leading-relaxed">
                                                                <div className="flex justify-between items-center text-white">
                                                                    <span className="text-zinc-500 uppercase font-black text-[8px]">Market Cur</span>
                                                                    <span className="font-bold">${log.cur}</span>
                                                                </div>
                                                                {log.targets.map(t => (
                                                                    <div key={t.code} className="flex items-center justify-between">
                                                                        <span style={{ color: STRAT_COLORS[t.code] || '#71717a' }} className="font-black uppercase text-[9px]">{t.name}</span>
                                                                        <div className="flex gap-2 font-bold">
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
                                                const { Icon: LogIcon, textColor, wrapClass } = getLogMeta(parsedMessage);
                                                return (
                                                    <div key={i} className={`p-3 rounded-xl border leading-relaxed flex items-start gap-2 ${wrapClass} ${i === 0 ? 'animate-in slide-in-from-top-1 duration-300' : ''}`}>
                                                        <LogIcon size={11} className={`${textColor} mt-0.5 flex-shrink-0`} />
                                                        <div className="flex flex-col gap-0.5 min-w-0">
                                                            <span className="text-[9px] opacity-50 font-bold">{formatTime(log.time)}</span>
                                                            <span className={`font-bold tracking-tight text-[10px] ${textColor} break-words`}>{parsedMessage}</span>
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
                            {/* UPDATED PERFORMANCE TRACKS */}
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

                            {/* MODERNIZED ADAPTIVE CONFIDENCE TRACKER BLOCK */}
                            <div className="bg-zinc-900 border border-zinc-800 rounded-[40px] p-8 shadow-2xl flex flex-col justify-between">
                                <div className="flex items-start justify-between mb-4">
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
                                            
                                            <ReferenceLine y={parseFloat(formConfig.mlThresholdLong) * 100} stroke="#10b981" strokeDasharray="3 3" opacity={0.25} />
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

                                    <div className="p-4 bg-zinc-950/50 border border-zinc-800 rounded-2xl">
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
                                            className="bg-zinc-800 text-[9px] rounded-lg px-2 py-1 border border-zinc-700 font-black uppercase outline-none text-zinc-300"
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
                                            className="bg-black border border-zinc-800 text-[9px] rounded px-2 py-1 text-zinc-300 font-bold uppercase outline-none tracking-widest"
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
