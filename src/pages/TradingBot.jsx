// File: src/pages/TradingBot.jsx

import React, { useState, useEffect, useRef, useMemo } from "react";
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
    ChevronDown, ChevronUp, Search, ExternalLink
} from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import "./TradingBot.css";
import "../styles/Themes.css";

const RAW_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
const BASE_URL = RAW_URL.replace(/\/$/, "").replace(/\/api$/, "");
const API_BASE = `${BASE_URL}/api`;
const SOCKET_URL = BASE_URL;

const inputClass = "w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:border-emerald-500 transition-all text-[11px] outline-none font-mono";
const labelClass = "text-[9px] text-zinc-500 uppercase font-black mb-1 block ml-1 tracking-tighter";

// ============================================================
// 🔧 FIX T2-8: Added all trained symbols
// ============================================================
// OLD: Only BTC, ETH, SOL, DOGE, MATIC, LINK, ADA
//      MATIC and LINK have no trained models
// NEW: Matches what engineer_and_train.py actually trained
const COIN_PAIRS = [
    "BTC-USD", "ETH-USD", "SOL-USD", "DOGE-USD",
    "ADA-USD", "XRP-USD", "SUI-USD", "PEPE-USD"
];
const TIMEFRAMES = ["1m", "5m", "15m", "1h", "4h", "1d"];

const parseLog = (log) => {
    if (!log) return "";
    const msg = typeof log === 'string' ? log : (log.message || log.msg || JSON.stringify(log));
    return msg.replace(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d+Z\s*/, '');
};

const formatTime = (isoString) => {
    if (!isoString) return "";
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
};

const getLogStyle = (msg) => {
    const text = msg.toUpperCase();
    if (text.includes("VETOED") || text.includes("STALKING SHORT") || text.includes("SHORT GATE")) return 'text-rose-400 bg-rose-500/10 border-rose-500/20';
    if (text.includes("PASSED") || text.includes("STALKING LONG") || text.includes("LONG GATE")) return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
    if (text.includes("UPTREND") || text.includes("BULLISH") || text.includes("EXPANSION")) return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
    if (text.includes("DOWNTREND") || text.includes("BEARISH") || text.includes("CONTRACTION")) return 'text-rose-400 bg-rose-500/10 border-rose-500/20';
    if (text.includes("MINDSET")) {
        const pctMatch = text.match(/(\d+)%/);
        if (pctMatch) {
            const val = parseInt(pctMatch[1]);
            if (val >= 80) return 'text-rose-400 bg-rose-500/10 border-rose-500/20';
            if (val <= 20) return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
            return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
        }
    }
    return 'text-zinc-500 bg-zinc-900 border-zinc-800';
};

const STRAT_POOL = [
    { name: "RSI Threshold", code: "rsi_threshold" },
    { name: "SMA Crossover", code: "sma_crossover" },
    { name: "SuperTrend Follow", code: "supertrend" },
    { name: "MACD Crossover", code: "macd_crossover" },
    { name: "ATR Breakout", code: "atr_breakout" },
    { name: "Bollinger Band Fade", code: "bb_fade" },
    { name: "Stochastic Osc", code: "stoch" },
    { name: "EMA Cloud", code: "ema_cloud" },
    { name: "Price Action Break", code: "pa_breakout" },
    { name: "Volume Profile", code: "vol_profile" }
];

const STRAT_DESCRIPTIONS = {
    rsi_threshold: "Measures overbought/oversold momentum levels.",
    sma_crossover: "Detects trend shifts using moving average convergence.",
    macd_crossover: "Identifies momentum changes via moving average gaps.",
    supertrend: "Follows volatility-adjusted price direction.",
    bb_fade: "Scalps mean-reversion entries at Bollinger Band walls.",
    atr_breakout: "Identifies breakouts beyond standard volatility ranges.",
    pa_breakout: "Tracks price movement beyond recent high/low levels.",
    vol_profile: "Detects institutional interest via volume spikes.",
    stoch: "Analyzes closing price speed relative to price range.",
    ema_cloud: "Visualizes trend strength using fast/slow EMA separation."
};

// ============================================================
// 🔧 FIX T1-1a: Model IDs match backend exactly
// ============================================================
// OLD: "random_forest" (underscore), "gradient_boosting" (doesn't exist),
//      "lstm" (backend calls it "transformer")
// NEW: IDs match what ModelFactory.load_model() searches for
const MODEL_POOL = [
    { id: "xgboost", name: "XGBoost (Gradient Boost)" },
    { id: "randomforest", name: "Random Forest (Ensemble)" },
    { id: "transformer", name: "LSTM (Deep Temporal)" },
    { id: "stacking", name: "Stacking Hybrid (Meta)" }
];

const DEFAULT_STRATEGY_PARAMS = {
    rsi_threshold: { rsi_length: 14, oversold: 30, overbought: 70 },
    sma_crossover: { fast_sma: 50, slow_sma: 200 },
    supertrend: { st_atr: 10, st_factor: 3.0 },
    macd_crossover: { fast: 12, slow: 26, signal: 9 },
    atr_breakout: { atr_length: 14, multiplier: 1.5 },
    bb_fade: { bb_period: 20, bb_std: 2.0 },
    stoch: { k_period: 14, d_period: 3 },
    ema_cloud: { fast_ema: 9, slow_ema: 21 },
    pa_breakout: { lookback: 20, buffer: 0.01 },
    vol_profile: { vol_ma: 20, threshold: 1.5 }
};

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
        {status ? <span className="text-emerald-500 text-[9px] font-black tracking-widest">✔ READY</span> : <span className="text-rose-500 text-[9px] font-black tracking-widest">MISSING</span>}
    </div>
);

const PreFlightModal = ({ config, onConfirm, onCancel, isStarting, hasApiKeys, address }) => {
    const [checks, setChecks] = useState({ wallet: false, keys: false, capital: false, strategy: false });
    useEffect(() => {
        setChecks({
            wallet: !!address,
            keys: config.tradingMode === 'paper' || hasApiKeys,
            capital: Number(config.capitalAllocation) >= 100,
            strategy: (config.strategies && config.strategies.length > 0)
        });
    }, [config, hasApiKeys, address]);
    const allPassed = Object.values(checks).every(Boolean);
    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/95 backdrop-blur-xl p-4">
            <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-3xl p-8 shadow-2xl">
                <h3 className="text-xl font-black text-white mb-8 flex items-center gap-2 uppercase tracking-tighter"><span className="text-emerald-500">🚀</span> Pre-Flight Check</h3>
                <div className="space-y-3 mb-10">
                    <CheckItem label="Wallet Status" status={checks.wallet} />
                    <CheckItem label="API Authorization" status={checks.keys} />
                    <CheckItem label="Allocated Liquidity" status={checks.capital} />
                    <CheckItem label="Strategy Modules" status={checks.strategy} />
                </div>
                <div className="flex gap-4">
                    <button onClick={onCancel} className="flex-1 py-4 border border-zinc-800 rounded-2xl text-zinc-500 font-black uppercase text-[10px] hover:text-white transition-all">Abort</button>
                    <button onClick={onConfirm} disabled={!allPassed || isStarting} className={`flex-2 py-4 rounded-2xl font-black uppercase text-[10px] transition-all shadow-lg ${allPassed ? 'bg-emerald-500 text-black hover:bg-emerald-400' : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'}`}>{isStarting ? 'Igniting Engine...' : 'Execute Launch'}</button>
                </div>
            </div>
        </div>
    );
};

const TradingBotContainer = () => {
    const {
        startBot, stopBot, resetBot, closePosition,
        refreshState, restoredConfig,
        botStatus: hookBotStatus, logs: hookLogs
    } = useBot();
    const { isConnected, address } = useAccount();

    const [isModeSelected, setIsModeSelected] = useState(false);
    const [hasApiKeys, setHasApiKeys] = useState(false);
    const [showPreFlight, setShowPreFlight] = useState(false);
    const [isStarting, setIsStarting] = useState(false);
    const [paperBalance, setPaperBalance] = useState(1000);
    const [modeStep, setModeStep] = useState('selection');

    const socketRef = useRef(null);
    const [isHaltLocked, setIsHaltLocked] = useState(false);

    const [socketLogs, setSocketLogs] = useState([]);
    const [socketStatus, setSocketStatus] = useState({
        status: 'stopped', currentBalance: 0, unrealizedPnl: 0, exposure: 0,
        positions: [], equityCurve: [], startedAt: null, dailyProfit: 0,
        initialCapital: 0, tradeMarkers: []
    });
    const [socketConnected, setSocketConnected] = useState(false);
    const [uptime, setUptime] = useState("00:00:00");
    const logContainerRef = useRef(null);
    const [exitingSymbols, setExitingSymbols] = useState([]);

    // ============================================================
    // 🔧 FIX T1-1b & T2-9: Correct default config
    // ============================================================
    // - mlThresholdLong/Short as TOP-LEVEL keys (backend reads these)
    // - Defaults lowered from 0.9 to 0.55 (honest models score 50-57%)
    // - mlModel defaults to "stacking"
    const [formConfig, setFormConfig] = useState({
        symbol: "BTC-USD",
        timeframe: "1h",
        capitalAllocation: 1000,
        tradingMode: "paper",
        strategies: [{ code: "rsi_threshold", params: DEFAULT_STRATEGY_PARAMS.rsi_threshold }],
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
        params: {
            atr_tp_mult: 3.0,
            atr_sl_mult: 1.5,
        },
        filters: { trend_filter: "none", vol_min: 0, atr_filter: 0 }
    });

    const [activeOpsTab, setActiveOpsTab] = useState("live");
    const api = axios.create({ baseURL: API_BASE });
    const isBotRunning = socketStatus.status === 'running' && !isHaltLocked;

    // Sync hook state into local state
    useEffect(() => {
        if (hookBotStatus) setSocketStatus(prev => ({ ...prev, ...hookBotStatus, logs: hookBotStatus.logs?.length ? hookBotStatus.logs : prev.logs }));
        if (hookLogs.length > 0) setSocketLogs(hookLogs);
        if (restoredConfig) setFormConfig(prev => ({ ...prev, ...restoredConfig, strategies: restoredConfig.strategies && restoredConfig.strategies.length > 0 ? restoredConfig.strategies : prev.strategies }));
    }, [hookBotStatus, hookLogs, restoredConfig]);

    const activeBalance = useMemo(() => {
        if (isBotRunning) {
            return socketStatus.currentBalance || socketStatus.initialCapital || formConfig.capitalAllocation;
        }
        return formConfig.capitalAllocation;
    }, [isBotRunning, socketStatus.currentBalance, socketStatus.initialCapital, formConfig.capitalAllocation]);

    useEffect(() => {
        if (isConnected) {
            axios.get(`${API_BASE}/users/keys`, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } })
                .then(res => setHasApiKeys((Array.isArray(res.data) ? res.data : res.data.keys || []).length > 0))
                .catch(() => setHasApiKeys(false));
        }
    }, [isConnected]);

    // Uptime timer
    useEffect(() => {
        let interval;
        if (isBotRunning && socketStatus.startedAt) {
            interval = setInterval(() => {
                const diff = Math.max(0, new Date().getTime() - new Date(socketStatus.startedAt).getTime());
                const h = Math.floor(diff / 3600000).toString().padStart(2, '0');
                const m = Math.floor((diff % 3600000) / 60000).toString().padStart(2, '0');
                const s = Math.floor((diff % 60000) / 1000).toString().padStart(2, '0');
                setUptime(`${h}:${m}:${s}`);
            }, 1000);
        } else { setUptime("00:00:00"); }
        return () => clearInterval(interval);
    }, [isBotRunning, socketStatus.startedAt]);

    // Initial status fetch
    useEffect(() => {
        if (!address) return;
        const token = localStorage.getItem("token");
        api.get(`/bot/status?userId=${address}`, {
            headers: { Authorization: `Bearer ${token}` }
        })
            .then(res => setSocketStatus(res.data))
            .catch(err => {
                if (err.response?.status === 401) toast.error("Session expired. Please reconnect.");
            });
    }, [address]);

    // ============================================================
    // 🔧 FIX T1-3 & T3-11 & T3-12: Single socket, reconnection,
    //     stable dependency array
    // ============================================================
    // OLD: Both useBot AND this component created separate io() connections.
    //      formConfig was in the dependency array, causing listener churn
    //      on every keystroke. No reconnection logic.
    // NEW: This is the ONLY socket. useBot is HTTP-only.
    //      Dependencies are only [address] — stable.
    //      Reconnection is built in via socket.io defaults.
    //      We use refs for values needed inside handlers to avoid
    //      stale closures without adding them as dependencies.
    const isHaltLockedRef = useRef(isHaltLocked);
    useEffect(() => { isHaltLockedRef.current = isHaltLocked; }, [isHaltLocked]);

    const formConfigRef = useRef(formConfig);
    useEffect(() => { formConfigRef.current = formConfig; }, [formConfig]);

    const exitingSymbolsRef = useRef(exitingSymbols);
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

        socket.on("connect", () => {
            setSocketConnected(true);
            console.log("Neural Link Established");
        });

        socket.on("disconnect", () => {
            setSocketConnected(false);
            console.log("Neural Link Severed — reconnecting...");
        });

        socket.on("bot_status_update", (data) => {
            if (isHaltLockedRef.current) return;

            setSocketStatus(prev => {
                const currentBalance = data.currentBalance || prev.currentBalance || 0;
                const rawPositions = data.activePositions || data.positions || [];
                const filteredPositions = rawPositions.filter(pos => !exitingSymbolsRef.current.includes(pos.symbol));
                const seed = prev.initialCapital || data.initialCapital || currentBalance || formConfigRef.current.capitalAllocation;

                const rawProfit = data.dailyProfit || data.daily_profit;
                const delta = currentBalance - seed;
                const calculatedProfit = rawProfit !== undefined
                    ? Number(rawProfit.toFixed(2))
                    : Number(delta.toFixed(2));

                const rawSignals = data.signalsMap || {};
                const normalizedSignals = {};
                Object.keys(rawSignals).forEach(key => {
                    const normalizedKey = key.toLowerCase().trim().replace(/\s+/g, '_');
                    const val = parseFloat(rawSignals[key]);
                    // 🔧 FIX T2-7: Scale 0-1 to 0-100 for chart display
                    if (!isNaN(val)) normalizedSignals[normalizedKey] = val * 100;
                });

                const updatedSignalsHistory = [
                    ...(prev.signalsMapHistory || []),
                    { time: new Date().toLocaleTimeString(), ...normalizedSignals }
                ].slice(-300);

                const updatedEquityCurve = [
                    ...(prev.equityCurve || []),
                    {
                        time: new Date().toLocaleTimeString(),
                        balance: currentBalance,
                        confidence: data.currentConfidence ?? prev.currentConfidence ?? 0
                    }
                ].slice(-300);

                return {
                    ...prev,
                    ...data,
                    dailyProfit: calculatedProfit,
                    initialCapital: seed,
                    positions: filteredPositions,
                    candles: (data.candles && data.candles.length > 0) ? data.candles : (prev.candles || []),
                    tradeHistory: (data.tradeHistory && data.tradeHistory.length > 0) ? data.tradeHistory : (prev.tradeHistory || []),
                    tradeMarkers: (data.tradeMarkers && data.tradeMarkers.length > 0) ? data.tradeMarkers : (prev.tradeMarkers || []),
                    signalsMapHistory: updatedSignalsHistory,
                    equityCurve: updatedEquityCurve
                };
            });
        });

        socket.on("bot_log", (newLog) => {
            setSocketLogs(prev => [newLog, ...prev].slice(0, 100));
        });

        return () => {
            socket.disconnect();
            socketRef.current = null;
        };
    }, [address]); // 🔧 FIX: Only address — stable

    const performanceData = useMemo(() => {
        const initialSeed = Number(formConfig.capitalAllocation) || 0;
        const seedPoint = { time: 'Start', balance: initialSeed, confidence: 50 };
        if (!socketStatus.equityCurve?.length) return [seedPoint];
        const history = socketStatus.equityCurve.map(p => ({
            time: new Date(p.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            balance: p.balance,
            confidence: p.confidence || 50
        }));
        return [seedPoint, ...history];
    }, [socketStatus.equityCurve, formConfig.capitalAllocation]);

    // ============================================================
    // 🔧 FIX T1-1c: Config mapping in handleConfirmStart
    // ============================================================
    const handleConfirmStart = async () => {
        setIsStarting(true);
        setIsHaltLocked(false);

        const targetCapital = Number(formConfig.capitalAllocation) || 1000;

        setSocketStatus({
            status: 'initializing', currentBalance: targetCapital,
            initialCapital: targetCapital, equityCurve: [], tradeMarkers: [],
            positions: [], candles: [], unrealizedPnl: 0, dailyProfit: 0, tradeHistory: []
        });
        setSocketLogs([]);

        const finalConfig = {
            ...formConfig,
            capitalAllocation: targetCapital,
            trading_mode: formConfig.tradingMode,

            // 🔧 FIX T1-1c: Map to the exact keys backend reads
            // OLD: mlThreshold (single value), params.long_threshold/short_threshold
            // NEW: Top-level mlThresholdLong and mlThresholdShort
            mlThresholdLong: parseFloat(formConfig.mlThresholdLong),
            mlThresholdShort: parseFloat(formConfig.mlThresholdShort),
            mlMode: formConfig.mlMode,
            mlModel: formConfig.mlModel,

            maxPyramiding: formConfig.maxPyramiding,
            maxTradesPerDay: parseInt(formConfig.maxTradesPerDay),
            leverage: parseFloat(formConfig.leverage),
            enable_shorting: !!formConfig.enable_shorting,

            // 🔧 FIX T3-10: Note about API keys
            // These are stored in localStorage which is accessible to any JS on the page.
            // For production, consider a secure backend vault or session-based key storage.
            api_keys: formConfig.tradingMode === 'live' ? (
                formConfig.enable_shorting ? {
                    krakenKey: localStorage.getItem("kraken_key") || "",
                    krakenSecret: localStorage.getItem("kraken_secret") || "",
                    apiKey: localStorage.getItem("kraken_key") || "",
                    secret: localStorage.getItem("kraken_secret") || ""
                } : {
                    apiKey: localStorage.getItem("coinbase_key") || "",
                    secret: localStorage.getItem("coinbase_secret") || ""
                }
            ) : {},

            comboConfig: {
                strategyCodes: formConfig.strategies.map(s => s.code),
                combinationRule: formConfig.hybridMode,
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
        try {
            await stopBot();
            setSocketStatus({
                status: 'stopped', currentBalance: Number(formConfig.capitalAllocation),
                unrealizedPnl: 0, positions: [], equityCurve: [], tradeMarkers: [], startedAt: null
            });
            setSocketLogs([]);
            localStorage.removeItem("neo_active_bot_id");
            toast.success("SYSTEM PURGED: Engine Stopped & Session Reset");
            setTimeout(() => { setIsHaltLocked(false); refreshState(); }, 3000);
        } catch (e) {
            console.error("Halt Error:", e);
            toast.error("Halt Command Failed");
            setIsHaltLocked(false);
        }
    };

    const handleResetRiskSettings = () => {
        setFormConfig(prev => ({
            ...prev,
            riskPercentage: 1, maxDailyLoss: 5, maxDrawdown: 10,
            maxTradesPerDay: 20, slippageTolerance: 0.5,
            params: { ...prev.params, take_profit: 0.05, trailing_stop: 0.01 }
        }));
        toast.success("Risk Protocol: Reverted to Factory Defaults");
    };

   const handleManualExit = async (targetSymbol) => {
        if (!socketStatus.positions?.length) return;
        
        // 🚀 FIX: Ensure we grab the actual string symbol, not a mouse click event
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
            console.error("Manual Exit UI Error:", e);
            toast.error("Exit Command Failed");
        }
    };
    
    const handleReset = async () => {
        if (!confirm("FACTORY RESET: This will wipe all trade history, logs, and equity curves. Are you sure?")) return;
        await resetBot();
        setSocketLogs([]);
        setSocketStatus({ status: 'stopped', currentBalance: 0, unrealizedPnl: 0, exposure: 0, positions: [], equityCurve: [], startedAt: null, dailyProfit: 0, initialCapital: 0, tradeMarkers: [] });
    };

    const handleClearLogs = () => { setSocketLogs([]); toast.success("Terminal View Cleared"); };
    const handleSyncLogs = async () => { await refreshState(); toast.success("Neural Stream Synced"); };

    if (!isConnected) {
        return (
            <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6">
                <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-[40px] p-12 text-center shadow-2xl">
                    <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-inner">
                        <Wallet className="text-emerald-500 w-8 h-8" />
                    </div>
                    <h2 className="text-2xl font-black text-white mb-6 uppercase tracking-tighter">Terminal Encrypted</h2>
                    <div className="flex justify-center"><ConnectButton /></div>
                </div>
            </div>
        );
    }

    const startCap = socketStatus.initialCapital || formConfig.capitalAllocation || 1;
    const profitPct = ((socketStatus.dailyProfit || 0) / startCap) * 100;
    const pnlPct = ((socketStatus.unrealizedPnl || 0) / startCap) * 100;

    return (
        <UIModeProvider>
            <div className="min-h-screen bg-zinc-950 text-white font-sans p-6 overflow-x-hidden transition-all duration-700">
                <Toaster position="top-right" />

                {/* PROTOCOL SELECTION OVERLAY */}
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
                                        <div onClick={() => {
                                            if (hasApiKeys) { setFormConfig(p => ({ ...p, tradingMode: 'live' })); setIsModeSelected(true); }
                                            else {
                                                const key = prompt("Enter Coinbase API Key:");
                                                const secret = prompt("Enter Coinbase API Secret:");
                                                if (key && secret) {
                                                    localStorage.setItem("coinbase_key", key);
                                                    localStorage.setItem("coinbase_secret", secret);
                                                    setHasApiKeys(true);
                                                    setFormConfig(p => ({ ...p, tradingMode: 'live' }));
                                                    setIsModeSelected(true);
                                                    toast.success("Keys accepted for this session.");
                                                } else { toast.error("API Keys are required for Live Execution."); }
                                            }
                                        }} className="p-16 rounded-[40px] border transition-all cursor-pointer bg-zinc-900 border-white/5 hover:border-red-500 shadow-2xl">
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

                {/* HEADER */}
                <header className="max-w-[1800px] mx-auto mb-10 flex items-center justify-between transition-all">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-lg"><Activity className="text-black w-7 h-7" /></div>
                        <div>
                            <h1 className="text-lg font-black uppercase tracking-widest">Sovereign <span className="text-emerald-500">Live</span></h1>
                            <div className="flex items-center gap-2">
                                <p className="text-[9px] text-zinc-500 font-black uppercase tracking-[0.2em]">Terminal v14</p>
                                {socketConnected ? <Wifi size={10} className="text-emerald-500" /> : <WifiOff size={10} className="text-rose-500" />}
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        {isBotRunning ? (
                            <button onClick={handleHalt} className="px-6 py-3 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-xl font-black text-[10px] uppercase hover:bg-rose-500 hover:text-white transition-all flex items-center gap-2 shadow-lg shadow-rose-500/10"><Power size={12} /> Emergency Halt</button>
                        ) : (
                            <button onClick={handleReset} className="px-6 py-3 bg-zinc-800/50 border border-zinc-700 text-zinc-400 rounded-xl font-black text-[10px] uppercase hover:bg-white hover:text-black transition-all flex items-center gap-2"><RotateCcw size={12} /> Factory Reset</button>
                        )}
                        <ConnectButton />
                    </div>
                </header>

                {isBotRunning ? (
                    <div className="max-w-[1800px] mx-auto space-y-8 animate-in fade-in duration-1000">
                        {/* METRICS ROW */}
                        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                            <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl shadow-xl">
                                <div className="flex justify-between items-start mb-1"><p className="text-[9px] text-zinc-500 uppercase font-black tracking-widest">Engine Status</p><Timer size={12} className="text-emerald-500 animate-pulse" /></div>
                                <p className="text-lg font-mono font-black text-emerald-400">OPERATIONAL</p>
                                <p className="text-[9px] font-mono text-zinc-500 mt-1 uppercase tracking-tighter font-black">SESSION: {uptime}</p>
                            </div>
                            <MetricCard label="Daily Profit" value={`${socketStatus.dailyProfit >= 0 ? '+' : ''}${(socketStatus.dailyProfit || 0).toFixed(2)}`} subValue={`${profitPct.toFixed(2)}%`} color={socketStatus.dailyProfit >= 0 ? "text-emerald-400" : "text-rose-500"} icon={<DollarSign size={10} />} />
                            <MetricCard label="Floating PnL" value={`${socketStatus.unrealizedPnl >= 0 ? '+' : ''}${(socketStatus.unrealizedPnl || 0).toFixed(2)}`} subValue={`${pnlPct.toFixed(2)}%`} color={socketStatus.unrealizedPnl >= 0 ? 'text-emerald-400' : 'text-rose-500'} icon={<Activity size={10} />} />
                            <MetricCard label="Exposure" value={`${socketStatus.exposure || 0}%`} subValue="Active Positions" color="text-amber-400" />
                            <MetricCard label="Total Equity" value={`$${Number(activeBalance).toLocaleString()}`} subValue="Liquid + Locked" />
                            <MetricCard label="Council Consensus" value={`${Math.round(socketStatus.currentConfidence || 0)}%`} color="text-violet-400" icon={<Zap size={10} />} />
                        </div>

                        <div className="grid grid-cols-12 gap-8 items-start">
                            {/* INTELLIGENCE SIDEBAR */}
                            <div className="col-span-12 lg:col-span-3 h-[720px] flex flex-col gap-4">
                                <div className="flex-1 min-h-[400px]">
                                    <NeuralConvergenceChart formConfig={formConfig} signalsMapHistory={socketStatus.signalsMapHistory || []} />
                                </div>
                                <div className="bg-zinc-900 border border-zinc-800 rounded-[32px] p-6 shadow-2xl">
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-4">Neural Performance</h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div><p className="text-[8px] uppercase font-bold text-zinc-600 mb-1">Win Rate</p><p className="text-xl font-mono font-black text-emerald-500">{socketStatus.winRate || 0}%</p></div>
                                        <div><p className="text-[8px] uppercase font-bold text-zinc-600 mb-1">Profit Factor</p><p className="text-xl font-mono font-black text-violet-400">{socketStatus.profitFactor || '1.0'}</p></div>
                                    </div>
                                </div>
                            </div>

                            {/* CHART & TERMINAL */}
                            <div className="col-span-12 lg:col-span-9">
                                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[720px]">
                                    <div className="lg:col-span-3 bg-zinc-900 border border-zinc-800 rounded-[40px] overflow-hidden flex flex-col relative shadow-2xl">
                                        <div className="bg-zinc-800/20 p-6 border-b border-zinc-800/50 flex items-center justify-between">
                                            <div className="flex items-center gap-3"><TrendingUp size={18} className="text-emerald-500" /><span className="text-[11px] font-black uppercase tracking-widest">{formConfig.symbol} Live Feed</span></div>
                                            <div className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></div><span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">Neural Sync Active</span></div>
                                        </div>
                                        <div className="flex-1 bg-[#090b0f] pb-8">
                                            <LiveTradingChart symbol={formConfig.symbol} timeframe={formConfig.timeframe} isRunning={true} activePositions={socketStatus.positions} candleData={socketStatus.candles || []} />
                                        </div>
                                    </div>
                                    <div className="lg:col-span-1 bg-zinc-900 border border-zinc-800 rounded-[40px] flex flex-col overflow-hidden shadow-2xl">
                                        <div className="p-5 border-b border-zinc-800 bg-zinc-800/20 flex justify-between items-center text-violet-400">
                                            <div className="flex items-center gap-2"><Cpu size={16} className="animate-pulse" /><h3 className="text-[10px] font-black uppercase tracking-widest">Neural Flow</h3></div>
                                            <div className="flex items-center gap-2">
                                                <button onClick={handleSyncLogs} className="text-zinc-600 hover:text-emerald-400 transition-all"><RefreshCw size={14} /></button>
                                                <button onClick={handleClearLogs} className="text-zinc-600 hover:text-white transition-all"><Eraser size={14} /></button>
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
                                                return (
                                                    <div key={i} className={`p-3 rounded-xl border leading-relaxed flex flex-col gap-1 ${getLogStyle(parsedMessage)}`}>
                                                        <span className="text-[9px] opacity-50 font-bold">{formatTime(log.time)}</span>
                                                        <span className="font-bold tracking-tight">{parsedMessage}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* BOTTOM ROW */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-20 animate-in slide-in-from-bottom-10 duration-1000">
                            {/* SESSION EQUITY */}
                            <div className="bg-zinc-900 border border-zinc-800 rounded-[40px] p-8 shadow-2xl">
                                <div className="flex items-center gap-2 mb-8"><BarChart size={18} className="text-emerald-500" /><h3 className="text-[11px] font-black uppercase tracking-widest">Session Equity</h3></div>
                                <div className="h-48 w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={socketStatus.equityCurve}>
                                            <defs><linearGradient id="colorEquity" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.3} /><stop offset="95%" stopColor="#10b981" stopOpacity={0} /></linearGradient></defs>
                                            <RechartsTooltip contentStyle={{ backgroundColor: '#09090b', border: '1px solid #27272a', borderRadius: '12px', fontSize: '10px' }} itemStyle={{ color: '#10b981' }} />
                                            <Area type="monotone" dataKey="balance" stroke="#10b981" fill="url(#colorEquity)" strokeWidth={3} isAnimationActive={false} />
                                            <XAxis dataKey="time" hide />
                                            <YAxis hide domain={[formConfig.capitalAllocation * 0.98, 'auto']} />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* 🔧 FIX T2-6: CONFIDENCE CHART */}
                            <div className="bg-zinc-900 border border-zinc-800 rounded-[40px] p-8 shadow-2xl">
                                <div className="flex items-center gap-2 mb-8"><Zap size={18} className="text-violet-500" /><h3 className="text-[11px] font-black uppercase tracking-widest">Logic Confidence</h3></div>
                                <div className="h-48 w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={socketStatus.equityCurve}>
                                            <defs><linearGradient id="colorConf" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#a78bfa" stopOpacity={0.3} /><stop offset="95%" stopColor="#a78bfa" stopOpacity={0} /></linearGradient></defs>
                                            <RechartsTooltip contentStyle={{ backgroundColor: '#09090b', border: '1px solid #27272a', borderRadius: '12px', fontSize: '10px' }} itemStyle={{ color: '#a78bfa' }} />
                                            <Area type="step" dataKey="confidence" stroke="#a78bfa" fill="url(#colorConf)" strokeWidth={2} isAnimationActive={false} />
                                            <XAxis dataKey="time" hide />
                                            {/* 🔧 FIX: Was [80,100]. Models score 45-85%. Auto-scale instead. */}
                                            <YAxis hide domain={[0, 100]} />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* OPERATIONS / AUDIT */}
                            <div className="bg-zinc-900 border border-zinc-800 rounded-[40px] p-8 shadow-2xl overflow-hidden flex flex-col min-h-[450px]">
                                <div className="flex items-center justify-between mb-8">
                                    <div className="flex items-center gap-4">
                                        <button onClick={() => setActiveOpsTab("live")} className={`flex items-center gap-2 transition-all cursor-pointer ${activeOpsTab === 'live' ? 'text-amber-400' : 'text-zinc-600 hover:text-zinc-400'}`}>
                                            <Box size={18} /><h3 className="text-[11px] font-black uppercase tracking-widest">Live Operations</h3>
                                        </button>
                                        <span className="text-zinc-800 font-bold">/</span>
                                        <button onClick={() => setActiveOpsTab("audit")} className={`text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer ${activeOpsTab === 'audit' ? 'text-emerald-500' : 'text-zinc-500 hover:text-zinc-300'}`}>Audit History</button>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className={`w-1.5 h-1.5 rounded-full ${activeOpsTab === 'live' ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-700'}`}></div>
                                        <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest">Neural Link</span>
                                    </div>
                                </div>
                                <div className="flex-1 overflow-x-auto custom-scrollbar">
                                    {activeOpsTab === "live" ? (
                                        <table className="w-full text-left text-[11px]">
                                            <thead><tr className="text-zinc-600 uppercase font-black border-b border-zinc-800 pb-4"><th className="pb-4">Type</th><th className="pb-4">Entry</th><th className="pb-4 text-right">Size</th><th className="pb-4 text-right pr-2">Action</th></tr></thead>
                                            <tbody className="divide-y divide-zinc-800/50">
                                                {(socketStatus.positions?.length > 0) ? (
                                                    socketStatus.positions.map((pos, idx) => (
                                                        <tr key={idx} className="group hover:bg-white/[0.01] transition-colors">
                                                            <td className={`py-5 font-black flex items-center gap-2 ${pos.type === 'short' ? 'text-amber-500' : 'text-emerald-400'}`}>{pos.type === 'short' ? <ArrowDownRight size={14} /> : <ArrowUpRight size={14} />} {pos.type.toUpperCase()}</td>
                                                            <td className="py-5 font-mono font-black text-zinc-200">${Number(pos.entry).toLocaleString()}</td>
                                                            <td className="py-5 font-mono text-zinc-500 text-right">{Number(pos.size).toFixed(4)}</td>
                                                            <td className="py-5 text-right"><button onClick={() => handleManualExit(pos.symbol)} className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500 border border-rose-500/20 rounded-lg text-rose-500 hover:text-white font-black uppercase text-[9px] transition-all tracking-wider">EXIT</button></td>
                                                        </tr>
                                                    ))
                                                ) : (<tr><td colSpan="4" className="py-24 text-center text-zinc-600 italic font-bold uppercase tracking-widest opacity-30">Waiting for Signal...</td></tr>)}
                                            </tbody>
                                        </table>
                                    ) : (
                                        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
                                            {(socketStatus.tradeHistory?.length > 0 || socketStatus.tradeMarkers?.length > 0) ? (
                                                <div className="space-y-3">
                                                    {(socketStatus.tradeHistory || socketStatus.trade_history || socketStatus.tradeMarkers || []).map((trade, idx) => {
                                                // 🚀 FIX: Catch both Python snake_case and Node camelCase keys
                                                const side = trade.type || trade.side || 'trade';
                                                const entryPrice = trade.entry || trade.entryPrice || trade.entry_price || 0;
                                                const exitPrice = trade.exit || trade.exitPrice || trade.exit_price || trade.price || 0;
                                                const pnl = trade.pnl || trade.realized_pnl || trade.realizedPnL || 0;
                                                
                                                // Format timestamps correctly whether it's a UNIX int or ISO string
                                                const timeObj = trade.time ? new Date(trade.time * (trade.time > 1e10 ? 1 : 1000)) : (trade.exitTime ? new Date(trade.exitTime) : new Date());

                                                return (
                                                    <div key={idx} className="p-4 bg-black/20 rounded-2xl border border-zinc-800/50 flex flex-col gap-2 hover:border-emerald-500/30 transition-all">
                                                        <div className="flex justify-between items-center">
                                                            <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${side === 'long' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>{side} Closed</span>
                                                            <span className="text-[8px] text-zinc-600 font-bold font-mono">{timeObj.toLocaleDateString()} {timeObj.toLocaleTimeString()}</span>
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-4 mt-1">
                                                            <div><p className="text-[8px] text-zinc-500 uppercase font-black">Entry/Exit</p><p className="text-[10px] font-mono font-bold text-zinc-300">${Number(entryPrice).toLocaleString()} → ${Number(exitPrice).toLocaleString()}</p></div>
                                                            <div className="text-right"><p className="text-[8px] text-zinc-500 uppercase font-black">Realized PnL</p><p className={`text-[11px] font-black font-mono ${pnl >= 0 ? 'text-emerald-400' : 'text-rose-500'}`}>{pnl >= 0 ? '+' : ''}${Number(pnl).toFixed(2)}</p></div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                                </div>
                                            ) : (
                                                <div className="flex flex-col items-center justify-center py-20 text-center">
                                                    <div className="p-4 bg-emerald-500/5 rounded-full mb-4 border border-emerald-500/10"><Book className="text-emerald-500/40" size={32} /></div>
                                                    <h4 className="text-zinc-400 text-[10px] font-black uppercase tracking-widest">Trade Ledger Empty</h4>
                                                    <p className="text-zinc-600 text-[9px] mt-2 max-w-[220px] leading-relaxed font-bold uppercase">No closed trades detected in this session.</p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    
        
                   /* STANDBY MODE - CONFIG VIEW */
                    <div className="max-w-[1800px] mx-auto grid grid-cols-12 gap-8 items-start animate-in fade-in duration-700">
                        {/* THE MASTER CONFIGURATION SIDEBAR */}
                        <div className="col-span-12 lg:col-span-3 h-[850px] relative">
                            <div className="bg-zinc-900 border border-zinc-800 rounded-[32px] p-8 space-y-8 shadow-2xl h-full overflow-y-auto custom-scrollbar">

                                {/* 1. TREASURY & ROUTING */}
                                <div className="space-y-5">
                                    <div className="flex items-center gap-2 text-emerald-400 mb-2"><Wallet size={16} /><h4 className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Treasury & Routing</h4></div>
                                    
                                    <div className="grid grid-cols-3 gap-2">
                                        <div className="col-span-2"><label className={labelClass}>Asset</label><select value={formConfig.symbol} onChange={(e) => setFormConfig({ ...formConfig, symbol: e.target.value })} className={inputClass}>{COIN_PAIRS.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                                        <div className="col-span-1"><label className={labelClass}>Period</label><select value={formConfig.timeframe} onChange={(e) => setFormConfig({ ...formConfig, timeframe: e.target.value })} className={inputClass}>{TIMEFRAMES.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
                                    </div>
                                    
                                    <div className="p-4 bg-zinc-950/50 border border-zinc-800 rounded-2xl">
                                         <label className={labelClass}>Deployed Capital (USD)</label>
                                         <input type="number" value={formConfig.capitalAllocation} onChange={(e) => setFormConfig({ ...formConfig, capitalAllocation: parseFloat(e.target.value) })} className="w-full bg-black border border-zinc-700 p-2 rounded-lg font-mono text-emerald-500 focus:outline-none focus:border-emerald-500 text-lg" />
                                    </div>

                                    <div className="flex justify-between items-center">
                                        <div className="flex items-center gap-2 text-zinc-400"><ArrowDownRight size={14} /><span className="text-[10px] font-black uppercase tracking-widest">Routing</span></div>
                                        <select value={formConfig.enable_shorting} onChange={(e) => {
                                            const isMargin = e.target.value === 'true';
                                            if (isMargin) {
                                                if (!window.confirm("Margin trading involves high risk. This will route to Kraken. Proceed?")) return;
                                                const krakenKey = localStorage.getItem("kraken_key");
                                                if (!krakenKey) {
                                                    const key = prompt("Enter your Kraken API Key:");
                                                    const secret = prompt("Enter your Kraken API Secret:");
                                                    if (key && secret) { localStorage.setItem("kraken_key", key); localStorage.setItem("kraken_secret", secret); toast.success("Kraken Margin Authorized."); }
                                                    else { toast.error("Kraken API keys required for Shorting."); return; }
                                                }
                                            }
                                            setFormConfig({ ...formConfig, enable_shorting: isMargin });
                                        }} className="bg-zinc-800 text-[9px] rounded-lg px-2 py-1 border border-zinc-700 font-black uppercase outline-none text-zinc-300">
                                            <option value="false">Spot (Coinbase)</option>
                                            <option value="true">Margin (Kraken)</option>
                                        </select>
                                    </div>
                                    
                                    {formConfig.enable_shorting && (
                                        <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-2xl animate-in fade-in duration-300">
                                            <div className="flex justify-between items-center mb-3"><label className="text-[9px] font-black uppercase text-amber-500/80 tracking-widest">Leverage Multiplier</label><span className="text-[11px] font-mono font-black text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">{formConfig.leverage}x</span></div>
                                            <input type="range" min="1" max="20" step="1" value={formConfig.leverage} onChange={(e) => setFormConfig({ ...formConfig, leverage: parseInt(e.target.value) })} className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-amber-500" />
                                        </div>
                                    )}
                                </div>

                                {/* 2. NEURAL COMPUTE */}
                                <div className="space-y-5 border-t border-zinc-800/50 pt-8">
                                    <div className="flex items-center gap-2 text-violet-400 mb-2"><Cpu size={16} /><h4 className="text-[10px] font-black uppercase tracking-widest text-violet-400">Neural Compute</h4></div>
                                    
                                    <div className="flex flex-col gap-1">
                                        <label className={labelClass}>Primary Brain</label>
                                        <select className={inputClass} value={formConfig.mlModel} onChange={(e) => setFormConfig({ ...formConfig, mlModel: e.target.value })}>{MODEL_POOL.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</select>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3 p-4 bg-violet-500/5 border border-violet-500/20 rounded-2xl">
                                        <div><label className="text-[9px] font-black uppercase text-violet-400/80 tracking-widest">Long Veto Limit</label><input type="number" step="0.01" value={formConfig.mlThresholdLong} onChange={(e) => setFormConfig({ ...formConfig, mlThresholdLong: parseFloat(e.target.value) })} className="mt-1 w-full bg-black border border-violet-500/30 rounded-lg px-2 py-1 text-violet-400 focus:border-violet-400 outline-none font-mono text-[10px]" /></div>
                                        <div><label className="text-[9px] font-black uppercase text-violet-400/80 tracking-widest">Short Veto Limit</label><input type="number" step="0.01" value={formConfig.mlThresholdShort} onChange={(e) => setFormConfig({ ...formConfig, mlThresholdShort: parseFloat(e.target.value) })} className="mt-1 w-full bg-black border border-violet-500/30 rounded-lg px-2 py-1 text-violet-400 focus:border-violet-400 outline-none font-mono text-[10px]" /></div>
                                    </div>
                                </div>

                                {/* 3. MACRO RISK PROTOCOL */}
                                <div className="space-y-5 border-t border-zinc-800/50 pt-8">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 text-rose-500"><AlertTriangle size={16} /><h4 className="text-[10px] font-black uppercase tracking-widest text-rose-500">Risk Protocol</h4></div>
                                        <button onClick={handleResetRiskSettings} className="group flex items-center gap-1 px-2 py-1 bg-zinc-800/50 hover:bg-zinc-800 rounded border border-zinc-700/50 transition-all"><RotateCcw size={8} className="text-zinc-500 group-hover:text-rose-400" /><span className="text-[8px] font-black text-zinc-500 group-hover:text-zinc-300 uppercase tracking-tighter">Reset</span></button>
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

                                    {/* 🚀 THE DYNAMIC ATR SHIELD SECTION */}
                                    <div className="p-4 bg-zinc-950/50 border border-zinc-800 rounded-2xl">
                                        <div className="flex items-center gap-2 mb-3"><Shield size={12} className="text-zinc-400"/><h4 className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Dynamic ATR Shield</h4></div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div><label className="text-[8px] font-black uppercase text-zinc-600 tracking-widest">Take Profit Multiplier</label><input type="number" step="0.5" value={formConfig.params.atr_tp_mult || 3.0} onChange={(e) => setFormConfig({ ...formConfig, params: { ...formConfig.params, atr_tp_mult: parseFloat(e.target.value) } })} className="mt-1 w-full bg-black border border-zinc-800 rounded px-2 py-1 text-zinc-300 outline-none font-mono text-[10px]" /></div>
                                            <div><label className="text-[8px] font-black uppercase text-zinc-600 tracking-widest">Stop Loss Multiplier</label><input type="number" step="0.5" value={formConfig.params.atr_sl_mult || 1.5} onChange={(e) => setFormConfig({ ...formConfig, params: { ...formConfig.params, atr_sl_mult: parseFloat(e.target.value) } })} className="mt-1 w-full bg-black border border-zinc-800 rounded px-2 py-1 text-zinc-300 outline-none font-mono text-[10px]" /></div>
                                        </div>
                                    </div>
                                </div>

                                {/* 4. THE ENSEMBLE */}
                                <div className="space-y-4 border-t border-zinc-800/50 pt-8">
                                    <div className="flex justify-between items-center">
                                        <h4 className="text-[10px] text-zinc-400 font-black uppercase tracking-widest">Technical Ensemble</h4>
                                        <select value={formConfig.hybridMode} onChange={(e) => { const newMode = e.target.value; setFormConfig({ ...formConfig, hybridMode: newMode, minVotesRequired: newMode === "AND" ? formConfig.strategies.length : formConfig.minVotesRequired }); }} className="bg-black border border-zinc-800 text-[9px] rounded px-2 py-1 text-zinc-300 font-bold uppercase outline-none">
                                            <option value="AND">Strict (AND)</option><option value="OR">Loose (OR)</option>
                                        </select>
                                    </div>
                                    <div className="space-y-3">
                                        {formConfig.strategies.map((s, i) => (
                                            <div key={i} className="p-4 bg-zinc-950/80 rounded-2xl border border-zinc-800 shadow-inner">
                                                <div className="flex justify-between mb-3">
                                                    <select value={s.code} onChange={(e) => { const n = [...formConfig.strategies]; n[i] = { code: e.target.value, params: DEFAULT_STRATEGY_PARAMS[e.target.value] }; setFormConfig({ ...formConfig, strategies: n }); }} className="bg-transparent text-[10px] font-black text-amber-500 uppercase outline-none">{STRAT_POOL.map(opt => <option key={opt.code} value={opt.code}>{opt.name}</option>)}</select>
                                                    <button type="button" onClick={() => { const filtered = formConfig.strategies.filter((_, idx) => idx !== i); setFormConfig(p => ({ ...p, strategies: filtered, minVotesRequired: Math.min(p.minVotesRequired, filtered.length) })); }} className="text-zinc-600 hover:text-rose-500 transition-colors"><Trash2 size={12} /></button>
                                                </div>
                                                <StrategyParamInputs strategy={s} onChange={(p) => { const n = [...formConfig.strategies]; n[i].params = p; setFormConfig({ ...formConfig, strategies: n }); }} />
                                            </div>
                                        ))}
                                        <button type="button" onClick={() => setFormConfig(p => ({ ...p, strategies: [...p.strategies, { code: "rsi_threshold", params: DEFAULT_STRATEGY_PARAMS.rsi_threshold }] }))} className="w-full py-4 border border-dashed border-zinc-800 rounded-xl text-zinc-600 hover:text-emerald-500 hover:border-emerald-500/50 transition-all flex items-center justify-center gap-2 font-black text-[9px] uppercase tracking-widest"><Plus size={12} /> Add Signal Module</button>
                                    </div>
                                </div>

                                <button onClick={() => setShowPreFlight(true)} className="w-full py-5 bg-emerald-500 text-black rounded-2xl font-black uppercase text-[12px] tracking-widest hover:bg-emerald-400 hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-emerald-500/20 mt-8">Initiate Engine</button>
                            </div>
                        </div>
                        
                        <div className="col-span-12 lg:col-span-9 space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                                <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl shadow-xl"><p className="text-[9px] text-zinc-500 uppercase font-black mb-1">Engine Status</p><p className="text-lg font-mono font-black text-zinc-600">STANDBY</p><p className="text-[9px] font-mono text-zinc-500 mt-1 uppercase font-black">SESSION: 00:00:00</p></div>
                                <MetricCard label="Daily Profit" value="$0.00" color="text-zinc-600" />
                                <MetricCard label="Floating PnL" value="+0.00" color="text-zinc-600" />
                                <MetricCard label="Exposure" value="0%" color="text-zinc-600" />
                                <MetricCard label="Total Equity" value={`$${formConfig.capitalAllocation}`} />
                            </div>
                            <div className="bg-zinc-900 border border-zinc-800 rounded-[40px] h-[600px] overflow-hidden flex items-center justify-center text-zinc-700 italic border-dashed">Initialize market link...</div>
                        </div>
                    </div>
                )}
            </div>
        </UIModeProvider>
    );
};


const STRAT_COLORS = {
    rsi_threshold: "#3b82f6", sma_crossover: "#ef4444", supertrend: "#10b981",
    macd_crossover: "#f59e0b", atr_breakout: "#8b5cf6", bb_fade: "#ec4899",
    stoch: "#06b6d4", ema_cloud: "#f97316", pa_breakout: "#14b8a6", vol_profile: "#a855f7"
};

const NeuralConvergenceChart = ({ signalsMapHistory, formConfig }) => {
    const activeStratCodes = formConfig.strategies.map(s => s.code);
    return (
        <div className="bg-zinc-900 border border-zinc-800 rounded-[32px] p-6 shadow-2xl h-full flex flex-col">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-6 flex items-center gap-2"><Cpu size={12} className="text-violet-400" /> Neural Strategy Logic</h4>
            <div className="flex-1 w-full min-h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={signalsMapHistory} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <defs>{activeStratCodes.map((key) => (<linearGradient key={`grad-${key}`} id={`color-${key}`} x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={STRAT_COLORS[key]} stopOpacity={0.3} /><stop offset="95%" stopColor={STRAT_COLORS[key]} stopOpacity={0} /></linearGradient>))}</defs>
                        <RechartsTooltip shared={false} trigger="hover" contentStyle={{ backgroundColor: '#09090b', border: '1px solid #27272a', borderRadius: '12px', fontSize: '10px', pointerEvents: 'none' }} formatter={(value, name) => [`${Number(value).toFixed(0)}%`, name.toUpperCase()]} />
                        {activeStratCodes.map((key) => (<Area key={key} type="monotone" dataKey={key} name={key.replace('_', ' ')} stroke={STRAT_COLORS[key] || '#52525b'} fill={`url(#color-${key})`} strokeWidth={2} dot={false} activeDot={{ r: 4, strokeWidth: 0 }} isAnimationActive={false} connectNulls={true} />))}
                        <XAxis dataKey="time" hide />
                        {/* 🔧 FIX T2-7: Values are now 0-100 (scaled in socket handler) */}
                        <YAxis domain={[0, 100]} hide />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 border-t border-zinc-800 pt-4">
                {formConfig.strategies.map((s) => (<div key={s.code} className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: STRAT_COLORS[s.code] }}></div><span className="text-[8px] font-black uppercase text-zinc-500 tracking-tighter">{s.code.replace('_', ' ')}</span></div>))}
            </div>
        </div>
    );
};

const MetricCard = ({ label, value, subValue, color = "text-white", icon = null }) => (
    <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl relative overflow-hidden shadow-xl">
        <p className="text-[9px] text-zinc-500 uppercase font-black tracking-[0.15em] mb-2">{label}</p>
        <div className="flex flex-col gap-1">
            <div className="flex items-center gap-1.5">{icon && <span className={color}>{icon}</span>}<p className={`text-lg font-mono font-black tracking-tighter ${color}`}>{value}</p></div>
            {subValue && <p className="text-[9px] font-black text-zinc-600 uppercase tracking-wide">{subValue}</p>}
        </div>
    </div>
);

function StrategyParamInputs({ strategy, onChange }) {
    const { code, params = {} } = strategy;
    const f = (l, k, s = "1", desc) => (
        <div className="flex flex-col">
            <div className="flex justify-between items-center mb-1"><label className="text-[8px] text-zinc-600 uppercase font-bold ml-1">{l}</label>{desc && <Tooltip text={desc}><Info size={8} className="text-zinc-700" /></Tooltip>}</div>
            <input type="number" step={s} value={params[k] ?? ""} onChange={(e) => onChange({ ...params, [k]: parseFloat(e.target.value) })} className="bg-zinc-950 border border-zinc-700 rounded-lg px-2 py-1 text-[9px] text-amber-500 outline-none font-mono" />
        </div>
    );
    return (
        <div className="grid grid-cols-2 gap-2">
            {code === "rsi_threshold" && <>{f("Length", "rsi_length")}{f("Oversold", "oversold")}{f("Overbought", "overbought")}</>}
            {code === "sma_crossover" && <>{f("Fast", "fast_sma")}{f("Slow", "slow_sma")}</>}
            {code === "supertrend" && <>{f("Period", "st_atr")}{f("Mult", "st_factor", "0.1")}</>}
            {code === "macd_crossover" && <>{f("Fast", "fast")}{f("Slow", "slow")}</>}
            {code === "atr_breakout" && <>{f("Len", "atr_length")}{f("Mult", "multiplier", "0.1")}</>}
            {code === "bb_fade" && <>{f("Per", "bb_period")}{f("Std", "bb_std", "0.1")}</>}
            {code === "stoch" && <>{f("K-P", "k_period")}{f("D-P", "d_period")}</>}
            {code === "ema_cloud" && <>{f("Fast", "fast_ema")}{f("Slow", "slow_ema")}</>}
            {code === "pa_breakout" && <>{f("LB", "lookback")}{f("Buf", "buffer", "0.01")}</>}
            {code === "vol_profile" && <>{f("MA", "vol_ma")}{f("T", "threshold", "0.1")}</>}
        </div>
    );
}

export default TradingBotContainer;
