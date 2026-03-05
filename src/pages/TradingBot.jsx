// File: src/pages/TradingBot.jsx
// 🚀 FIX: v13.11 - Added "Sync Stream" Button

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
    Activity, Scale, Power, RefreshCw, Wallet, Wifi, WifiOff, // 🟢 Added RefreshCw
    ArrowUpRight, Clock, Box, Timer, DollarSign, Info, BarChart, Settings2, Zap, ArrowDownRight,
    CandlestickChart, AlertTriangle, RotateCcw, Eraser, Book, 
    HelpCircle, ShieldAlert, 
    ChevronDown, ChevronUp, Search, ExternalLink 
} from "lucide-react";

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';

import "./TradingBot.css";
import "../styles/Themes.css";

const initialConfig = {
    capitalAllocation: 1000,
    symbol: "BTC-USD",
    timeframe: "1h",
    tradingMode: "paper",
    mlMode: "off",
    hybridMode: "AND"
};

// ... (Configuration Constants & Helper Functions remain EXACTLY the same) ...
const RAW_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
const BASE_URL = RAW_URL.replace(/\/$/, "").replace(/\/api$/, "");
const API_BASE = `${BASE_URL}/api`;
const SOCKET_URL = BASE_URL;

const inputClass = "w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:border-emerald-500 transition-all text-[11px] outline-none font-mono";
const labelClass = "text-[9px] text-zinc-500 uppercase font-black mb-1 block ml-1 tracking-tighter";

const COIN_PAIRS = ["BTC-USD", "ETH-USD", "SOL-USD", "DOGE-USD", "MATIC-USD", "LINK-USD", "ADA-USD"];
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


// ... (STRAT_POOL, MODEL_POOL, DEFAULT_STRATEGY_PARAMS, Components remain same) ...
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

const MODEL_POOL = [
    { id: "xgboost", name: "XGBoost (Gradient Boost)" },
    { id: "random_forest", name: "Random Forest (Ensemble)" },
    { id: "gradient_boosting", name: "GBM (Scikit-Learn)" },
    { id: "lstm", name: "LSTM (Deep Temporal)" },
    { id: "transformer", name: "Transformer (Attention)" },
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
    // 🟢 DESTRUCTURE refreshState
    const { 
    startBot, 
    stopBot, 
    resetBot, 
    closePosition, // 🟢 ADD THIS HERE
    refreshState, 
    restoredConfig, 
    botStatus: hookBotStatus, 
    logs: hookLogs 
} = useBot(); 
    const { isConnected, address } = useAccount();
    
    const [isModeSelected, setIsModeSelected] = useState(false);
    const [hasApiKeys, setHasApiKeys] = useState(false);
    const [showPreFlight, setShowPreFlight] = useState(false);
    const [isStarting, setIsStarting] = useState(false);
    const [paperBalance, setPaperBalance] = useState(initialConfig?.capitalAllocation || 0);
    const [modeStep, setModeStep] = useState('selection');
    
    const socketRef = useRef(null);
    const [isHaltLocked, setIsHaltLocked] = useState(false);
    
    const [socketLogs, setSocketLogs] = useState([]);
    const [socketStatus, setSocketStatus] = useState({ 
        status: 'stopped', currentBalance: 0, unrealizedPnl: 0, exposure: 0, positions: [], equityCurve: [], startedAt: null, dailyProfit: 0, initialCapital: 0, tradeMarkers: []
    });
    const [socketConnected, setSocketConnected] = useState(false);
    const [uptime, setUptime] = useState("00:00:00");
    const logContainerRef = useRef(null);

    const [formConfig, setFormConfig] = useState({
        symbol: "BTC-USD",
        timeframe: "1h",
        capitalAllocation: 1000,
        tradingMode: "paper",
        strategies: [{ code: "rsi_threshold", params: DEFAULT_STRATEGY_PARAMS.rsi_threshold }],
        mlMode: "off",
        mlModel: "xgboost",
        mlThreshold: 0.5,
        riskManagementMode: "static",
        riskPercentage: 1,
        maxDailyLoss: 5,
        maxDrawdown: 10,
        maxTradesPerDay: 20, // 🆕 Added
        hybridMode: "AND",
        minVotesRequired: 1,  // 🆕 Added
        enable_shorting: true,
        leverage: 1,          // 🆕 Added
        slippageTolerance: 0.5, // 🆕 Added
        params: { 
            take_profit: 0.05, 
            stop_loss: 0.02, 
            trailing_stop: 0.01, 
            long_threshold: 0.5, 
            short_threshold: 0.5 
        },
        filters: { trend_filter: "none", vol_min: 0, atr_filter: 0 }
    });

    const [activeOpsTab, setActiveOpsTab] = useState("live")

    const api = axios.create({ baseURL: API_BASE });

    const isBotRunning = socketStatus.status === 'running' && !isHaltLocked;

    useEffect(() => {
        if (hookBotStatus) setSocketStatus(prev => ({ ...prev, ...hookBotStatus, logs: hookBotStatus.logs?.length ? hookBotStatus.logs : prev.logs }));
        if (hookLogs.length > 0) setSocketLogs(hookLogs);
        if (restoredConfig) setFormConfig(prev => ({ ...prev, ...restoredConfig, strategies: restoredConfig.strategies && restoredConfig.strategies.length > 0 ? restoredConfig.strategies : prev.strategies }));
    }, [hookBotStatus, hookLogs, restoredConfig]);

    const activeBalance = useMemo(() => {
    // 1. If the bot is running, check if the engine has a real, active balance
    if (isBotRunning) {
        // We only use socketStatus if it's not 0 or null
        return socketStatus.currentBalance || socketStatus.initialCapital || formConfig.capitalAllocation;
    }
    // 2. If not running, ALWAYS show the user's input
    return formConfig.capitalAllocation;
}, [isBotRunning, socketStatus.currentBalance, socketStatus.initialCapital, formConfig.capitalAllocation]);

    useEffect(() => {
        if (isConnected) {
            axios.get(`${API_BASE}/users/keys`, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }).then(res => setHasApiKeys((Array.isArray(res.data) ? res.data : res.data.keys || []).length > 0)).catch(() => setHasApiKeys(false));
        }
    }, [isConnected]);

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

    
    // ---------------------------------------------------------
    // --- BLOCK 1: INITIAL DATA GRAB ---
    // ---------------------------------------------------------
    useEffect(() => {
        if (!address) return;
        const token = localStorage.getItem("token");

        // 🟢 2. Pass the token in the Authorization header
        api.get(`/bot/status?userId=${address}`, {
            headers: { 
                Authorization: `Bearer ${token}`
            } 
            }) 
            .then(res => {
                console.log("✅ Initial Status Received:", res.data);
                setSocketStatus(res.data);
            })
            .catch(err => {
                console.error("❌ Initial Fetch Failed:", err);
                // Handle specific auth failures
                if (err.response?.status === 401) {
                    toast.error("Session expired. Please reconnect your wallet.");
                }
            });
        }, [address]);

    // ---------------------------------------------------------
    // --- BLOCK 2: NEURAL LINK (SOCKET) ---
    // 🚩 MOVE ALL SOCKET.ON LOGIC INSIDE THIS BLOCK
    // ---------------------------------------------------------
    useEffect(() => {
        if (!address) return;

        if (!socketRef.current) {
            socketRef.current = io(SOCKET_URL, { 
                query: { userId: address },
                transports: ['websocket']
            });
        }

        const socket = socketRef.current;

        socket.on("connect", () => {
            setSocketConnected(true);
            console.log("Neural Link Established");
        });

        socket.on("disconnect", () => {
            setSocketConnected(false);
            console.log("Neural Link Severed");
        });

        // 🟢 THE CORRECT PLACE FOR THE STATUS UPDATE LISTENER
        socket.on("bot_status_update", (data) => {
            if (isHaltLocked) return; 
        
            setSocketStatus(prev => {
                // --- 1. DATA PREP & CLEANING ---
                const rawProfit = data.dailyProfit || data.daily_profit;
                const currentBalance = data.currentBalance || prev.currentBalance || 0;
                const rawPositions = data.activePositions || data.positions || [];
                const filteredPositions = rawPositions.filter(pos => !exitingSymbols.includes(pos.symbol));
                
                // target: Lock the initial capital so profit stays relative to the start
                const seed = prev.initialCapital || data.initialCapital || currentBalance || formConfig.capitalAllocation;
        
                // ROUNDING: Prevent scientific notation (e.g., 0.09000000341)
                const delta = (currentBalance - seed);
                const calculatedProfit = rawProfit !== undefined 
                    ? Number(rawProfit.toFixed(2)) 
                    : Number(delta.toFixed(2));
        
                const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                
                // --- 2. SIGNAL NORMALIZATION ---
                const rawSignals = data.signalsMap || {};
                const normalizedSignals = {};
                Object.keys(rawSignals).forEach(key => {
                    const normalizedKey = key.toLowerCase().trim().replace(/\s+/g, '_');
                    const val = parseFloat(rawSignals[key]);
                    if (!isNaN(val)) normalizedSignals[normalizedKey] = val;
                });
        
                // --- 3. ROLLING HISTORIES ---
                const updatedSignalsHistory = [
                    ...(prev.signalsMapHistory || []), 
                    { time: timeStr, ...normalizedSignals }
                ].slice(-300);
        
                const updatedEquityCurve = [
                    ...(prev.equityCurve || []), 
                    {
                        time: timeStr,
                        balance: currentBalance,
                        confidence: data.currentConfidence ?? prev.currentConfidence ?? 0
                    }
                ].slice(-300);
        
                // --- 4. FINAL STATE RETURN (With full Persistence) ---
                return { 
                    ...prev, 
                    ...data, 
                    dailyProfit: calculatedProfit, 
                    initialCapital: seed,
                    
                    // POSITIONS: Fallback for different backend naming conventions
                    positions: filteredPositions,
                    
                    // CANDLES: If new packet is empty (delta update), keep existing chart data
                    candles: (data.candles && data.candles.length > 0) ? data.candles : (prev.candles || []),
                    
                    // TRADE HISTORY: Crucial for Audit Tab persistence
                    tradeHistory: (data.tradeHistory && data.tradeHistory.length > 0) 
                        ? data.tradeHistory 
                        : (prev.tradeHistory || []),
                    
                    // TRADE MARKERS: Keep the buy/sell icons on the chart visible
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
            socket.off("connect");
            socket.off("disconnect");
            socket.off("bot_status_update");
            socket.off("bot_log");
        };
    }, [address, isHaltLocked, formConfig]);
    

    const performanceData = useMemo(() => {
    // 1. Establish the "Seed" value as a number
    const initialSeed = Number(formConfig.capitalAllocation) || 0;
    
    // 2. Create the first point so the chart always starts at the user's capital
    const seedPoint = { 
        time: 'Start', 
        balance: initialSeed, 
        confidence: 100 
    };

    // 3. If no history exists, return just the seed point
    if (!socketStatus.equityCurve?.length) {
        return [seedPoint];
    }
    
    // 4. Map existing history and append it to the seed point
    const history = socketStatus.equityCurve.map(p => ({ 
        time: new Date(p.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), 
        balance: p.balance, 
        // Maintain your randomized confidence logic or use real data if available
        confidence: p.confidence || (Math.random() * 20) + 80 
    }));

    return [seedPoint, ...history];
}, [socketStatus.equityCurve, formConfig.capitalAllocation]); // ✅ Watching specific value

   const handleConfirmStart = async () => {
    setIsStarting(true);
    setIsHaltLocked(false);
    
    const targetCapital = Number(formConfig.capitalAllocation) || Number(paperBalance) || 1000;

    setSocketStatus({ 
        status: 'initializing', 
        currentBalance: targetCapital, 
        initialCapital: targetCapital, 
        equityCurve: [], 
        tradeMarkers: [], 
        positions: [], 
        candles: [],
        unrealizedPnl: 0,
        dailyProfit: 0,
        tradeHistory: [] 
    });

    setSocketLogs([]);
       
    const finalConfig = {
        ...formConfig,
        capitalAllocation: targetCapital,
        // 🟢 REAL VALUES ONLY: No hardcoded defaults
        mlMode: formConfig.mlMode, 
        mlModel: formConfig.mlModel,
        mlThreshold: parseFloat(formConfig.mlThreshold),
        maxPyramiding: formConfig.maxPyramiding,
        maxTradesPerDay: parseInt(formConfig.maxTradesPerDay),
        leverage: parseFloat(formConfig.leverage),
        slippageTolerance: parseFloat(formConfig.slippageTolerance),
        enable_shorting: !!formConfig.enable_shorting,
        
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
            status: 'stopped', 
            // 🟢 FIX: Reference formConfig.capitalAllocation instead of targetCapital
            currentBalance: Number(formConfig.capitalAllocation), 
            unrealizedPnl: 0, 
            positions: [], 
            equityCurve: [], 
            tradeMarkers: [],
            startedAt: null 
        });
        
        setSocketLogs([]); 
        localStorage.removeItem("neo_active_bot_id");
        toast.success("🚨 SYSTEM PURGED: Engine Stopped & Session Reset");

        setTimeout(() => {
            setIsHaltLocked(false);
            refreshState(); 
        }, 3000);

    } catch (e) {
        console.error("Halt Error:", e); // This will now show up since we fixed the filters!
        toast.error("Halt Command Failed");
        setIsHaltLocked(false);
    }
};

    const handleResetRiskSettings = () => {
    setFormConfig(prev => ({
        ...prev,
        // Return these specific fields to their 'Safe Zone' defaults
        riskPercentage: 1,
        maxDailyLoss: 5,
        maxDrawdown: 10,
        maxTradesPerDay: 20,
        slippageTolerance: 0.5,
        params: {
            ...prev.params,
            take_profit: 0.05,
            stop_loss: 0.02,
            trailing_stop: 0.01
        }
    }));
    toast.success("Risk Protocol: Reverted to Factory Defaults");
};


    const [exitingSymbols, setExitingSymbols] = useState([]);
    
    const handleManualExit = async () => {
    if (!socketStatus.positions?.length) return;
    
    const symbolToExit = formConfig.symbol;

    try {
        // 🟢 1. LOCK THE SYMBOL: Add to exiting list
        setExitingSymbols(prev => [...prev, symbolToExit]);

        // 🟢 2. OPTIMISTIC UI: Clear the table immediately
        setSocketStatus(prev => ({
            ...prev,
            positions: [],
            activePositions: []
        }));

        setActiveOpsTab("audit"); 

        await closePosition({ userId: address, symbol: symbolToExit });
        toast.success("Manual Exit Executed: Syncing Ledger...");

        
        setTimeout(async () => {
            await refreshState();
            setExitingSymbols(prev => prev.filter(s => s !== symbolToExit));
        }, 5000);
        
    } catch (e) { 
        setExitingSymbols(prev => prev.filter(s => s !== symbolToExit));
        console.error("Manual Exit UI Error:", e);
    }
};

    const handleReset = async () => {
        if(!confirm("⚠️ FACTORY RESET: This will wipe all trade history, logs, and equity curves for this bot. Are you sure?")) return;
        await resetBot();
        setSocketLogs([]);
        setSocketStatus({ status: 'stopped', currentBalance: 0, unrealizedPnl: 0, exposure: 0, positions: [], equityCurve: [], startedAt: null, dailyProfit: 0, initialCapital: 0, tradeMarkers: [] });
    };

    // 🟢 HANDLE CLEAR LOGS
    const handleClearLogs = () => {
        setSocketLogs([]);
        toast.success("Terminal View Cleared");
    };

    // 🟢 HANDLE SYNC LOGS
    const handleSyncLogs = async () => {
        await refreshState();
        toast.success("Neural Stream Synced (Last 200 Thoughts)");
    };

    if (!isConnected) {
        return (
            <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6">
                <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-[40px] p-12 text-center shadow-2xl">
                    <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-inner">
                        <Wallet className="text-emerald-500 w-8 h-8" />
                    </div>
                    <h2 className="text-2xl font-black text-white mb-6 uppercase tracking-tighter">Terminal Encrypted</h2>
                    <div className="flex justify-center">
                        <ConnectButton />
                    </div>
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
            
            {/* 1. PROTOCOL SELECTION OVERLAY */}
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
                                    <div onClick={() => { if(hasApiKeys) { setFormConfig(p=>({...p, tradingMode: 'live'})); setIsModeSelected(true); } else { toast.error("Connect API Keys First"); } }} 
                                         className={`p-16 rounded-[40px] border transition-all ${hasApiKeys ? 'cursor-pointer bg-zinc-900 border-white/5 hover:border-red-500 shadow-2xl' : 'bg-zinc-900/50 opacity-20'}`}>
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
                                    <button onClick={() => { setFormConfig(p=>({...p, tradingMode: 'paper', capitalAllocation: paperBalance})); setIsModeSelected(true); }} className="flex-2 py-4 bg-emerald-500 text-black rounded-2xl font-black uppercase text-[10px]">Ignite</button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* 2. PRE-FLIGHT CHECK MODAL */}
            {showPreFlight && <PreFlightModal config={formConfig} onConfirm={handleConfirmStart} onCancel={() => setShowPreFlight(false)} isStarting={isStarting} hasApiKeys={hasApiKeys} address={address} />}

            {/* 3. BRAND HEADER */}
            <header className="max-w-[1800px] mx-auto mb-10 flex items-center justify-between transition-all">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-lg"><Activity className="text-black w-7 h-7" /></div>
                    <div>
                        <h1 className="text-lg font-black uppercase tracking-widest">Sovereign <span className="text-emerald-500">Live</span></h1>
                        <p className="text-[9px] text-zinc-500 font-black uppercase tracking-[0.2em]">Terminal v13.12</p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    {isBotRunning ? (
                        <button onClick={handleHalt} className="px-6 py-3 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-xl font-black text-[10px] uppercase hover:bg-rose-500 hover:text-white transition-all flex items-center gap-2 shadow-lg shadow-rose-500/10"><Power size={12}/> Emergency Halt</button>
                    ) : (
                        <button onClick={handleReset} className="px-6 py-3 bg-zinc-800/50 border border-zinc-700 text-zinc-400 rounded-xl font-black text-[10px] uppercase hover:bg-white hover:text-black transition-all flex items-center gap-2"><RotateCcw size={12}/> Factory Reset</button>
                    )}
                    <ConnectButton />
                </div>
            </header>

            {/* 🚀 DYNAMIC GRID ENGINE */}
            {isBotRunning ? (
                /* 🟢 OPERATIONAL MODE: Metrics Row move to top to align Sidebar and Chart */
                <div className="max-w-[1800px] mx-auto space-y-8 animate-in fade-in duration-1000">
                    
                    {/* METRICS ROW (FULL WIDTH) */}
                    <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl shadow-xl">
                            <div className="flex justify-between items-start mb-1"><p className="text-[9px] text-zinc-500 uppercase font-black tracking-widest">Engine Status</p><Timer size={12} className="text-emerald-500 animate-pulse" /></div>
                            <p className="text-lg font-mono font-black text-emerald-400">OPERATIONAL</p>
                            <p className="text-[9px] font-mono text-zinc-500 mt-1 uppercase tracking-tighter font-black">SESSION: {uptime}</p>
                        </div>
                        <MetricCard label="Daily Profit" value={`${socketStatus.dailyProfit >= 0 ? '+' : ''}${(socketStatus.dailyProfit || 0).toFixed(2)}`} subValue={`${profitPct.toFixed(2)}%`} color={socketStatus.dailyProfit >= 0 ? "text-emerald-400" : "text-rose-500"} icon={<DollarSign size={10}/>} />
                        <MetricCard label="Floating PnL" value={`${socketStatus.unrealizedPnl >= 0 ? '+' : ''}${(socketStatus.unrealizedPnl || 0).toFixed(2)}`} subValue={`${pnlPct.toFixed(2)}%`} color={socketStatus.unrealizedPnl >= 0 ? 'text-emerald-400' : 'text-rose-500'} icon={<Activity size={10}/>} />
                        <MetricCard label="Exposure" value={`${socketStatus.exposure || 0}%`} subValue="Active Positions" color="text-amber-400" />
                        <MetricCard label="Total Equity" value={`$${Number(activeBalance).toLocaleString()}`} subValue="Liquid + Locked" />
                        <MetricCard label="Council Consensus" value={`${Math.round(socketStatus.currentConfidence || 0)}%`} color="text-violet-400" icon={<Zap size={10}/>} />
                    </div>

                    <div className="grid grid-cols-12 gap-8 items-start">
                        {/* COLUMN 1: INTELLIGENCE SIDEBAR */}
                        <div className="col-span-12 lg:col-span-3 h-[720px] flex flex-col gap-4">
                            <div className="flex-1 min-h-[400px]">
                                <NeuralConvergenceChart 
                                    formConfig={formConfig} 
                                    signalsMapHistory={socketStatus.signalsMapHistory || []} 
                                />
                            </div>
                            <div className="bg-zinc-900 border border-zinc-800 rounded-[32px] p-6 shadow-2xl">
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-4">Neural Performance</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div><p className="text-[8px] uppercase font-bold text-zinc-600 mb-1">Win Rate</p><p className="text-xl font-mono font-black text-emerald-500">{socketStatus.winRate || 0}%</p></div>
                                    <div><p className="text-[8px] uppercase font-bold text-zinc-600 mb-1">Profit Factor</p><p className="text-xl font-mono font-black text-violet-400">{socketStatus.profitFactor || '1.0'}</p></div>
                                </div>
                            </div>
                        </div>

                        {/* COLUMN 2: CHARTS & TERMINAL FLOW */}
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
                                    {/* --- Replace lines 335 to 380 with this corrected block --- */}

                                    <div ref={logContainerRef} className="flex-1 overflow-y-auto p-6 font-mono text-[10px] space-y-3 bg-black/20 custom-scrollbar">
                                        {socketLogs.map((log, i) => {
                                            // 🟢 1. Check for "Rich Log" (Structured data for targets)
                                            if (log.type === "RICH_LOG" || log.targets) {
                                                return (
                                                    <div key={i} className="mb-2 p-3 bg-zinc-950/50 rounded-xl border border-zinc-800 flex flex-col gap-2">
                                                        <div className="flex justify-between items-center border-b border-zinc-800/50 pb-2">
                                                            <span className="text-zinc-500 font-black uppercase text-[8px] tracking-widest">
                                                                🎯 Targets ({log.rule})
                                                            </span>
                                                            <span className="text-[8px] opacity-40 font-bold">{formatTime(log.time)}</span>
                                                        </div>
                                                        
                                                        <div className="flex flex-col gap-1.5 leading-relaxed">
                                                            <div className="flex justify-between items-center text-white">
                                                                <span className="text-zinc-500 uppercase font-black text-[8px]">Market Cur</span>
                                                                <span className="font-bold">${log.cur}</span>
                                                            </div>
                                    
                                                            {log.targets.map(t => (
                                                                <div key={t.code} className="flex items-center justify-between">
                                                                    <span style={{ color: STRAT_COLORS[t.code] || '#71717a' }} className="font-black uppercase text-[9px]">
                                                                        {t.name}
                                                                    </span>
                                                                    <div className="flex gap-2 font-bold">
                                                                        <span className="text-zinc-400 font-mono">${t.target}</span>
                                                                        <span className={t.trend === 'UP' ? 'text-emerald-500' : 'text-rose-500'}>
                                                                            ({t.diff > 0 ? '+' : ''}${t.diff})
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                );
                                            }
                                    
                                            // ⚪ 2. Standard Fallback for plain text messages
                                            const parsedMessage = parseLog(log.message || log);
                                            return (
                                                <div key={i} className={`p-3 rounded-xl border leading-relaxed flex flex-col gap-1 ${getLogStyle(parsedMessage)}`}>
                                                    <span className="text-[9px] opacity-50 font-bold">{formatTime(log.time)}</span>
                                                    <span className="font-bold tracking-tight">{parsedMessage}</span>
                                                </div>
                                            );
                                        })} {/* 🟢 Corrected: Closes function body AND map function */}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 🚀 EDGE-TO-EDGE BOTTOM ROW: Expanded across entire page width */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-20 animate-in slide-in-from-bottom-10 duration-1000">
                        {/* 1. SESSION EQUITY CHART */}
                        <div className="bg-zinc-900 border border-zinc-800 rounded-[40px] p-8 shadow-2xl">
                            <div className="flex items-center gap-2 mb-8"><BarChart size={18} className="text-emerald-500"/><h3 className="text-[11px] font-black uppercase tracking-widest">Session Equity</h3></div>
                            <div className="h-48 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={socketStatus.equityCurve}>
                                        <defs>
                                            <linearGradient id="colorEquity" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                                                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                            </linearGradient>
                                        </defs>
                                        {/* 🟢 TOOLTIP RESTORED */}
                                        <RechartsTooltip 
                                            contentStyle={{ backgroundColor: '#09090b', border: '1px solid #27272a', borderRadius: '12px', fontSize: '10px' }}
                                            itemStyle={{ color: '#10b981' }}
                                        />
                                        <Area type="monotone" dataKey="balance" stroke="#10b981" fill="url(#colorEquity)" strokeWidth={3} isAnimationActive={false} />
                                        <XAxis dataKey="time" hide />
                                        <YAxis 
                                            hide 
                                            // target the bottom to your starting capital
                                            // We add a tiny bit of padding (0.95) so the line isn't touching the absolute bottom
                                            domain={[
                                                formConfig.capitalAllocation * 0.98, 
                                                'auto'
                                            ]} 
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                        
                        {/* 2. LOGIC CONFIDENCE CHART */}
                        <div className="bg-zinc-900 border border-zinc-800 rounded-[40px] p-8 shadow-2xl">
                            <div className="flex items-center gap-2 mb-8"><Zap size={18} className="text-violet-500"/><h3 className="text-[11px] font-black uppercase tracking-widest">Logic Confidence</h3></div>
                            <div className="h-48 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={socketStatus.equityCurve}>
                                        <defs>
                                            <linearGradient id="colorConf" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#a78bfa" stopOpacity={0.3}/>
                                                <stop offset="95%" stopColor="#a78bfa" stopOpacity={0}/>
                                            </linearGradient>
                                        </defs>
                                        {/* 🟢 TOOLTIP RESTORED */}
                                        <RechartsTooltip 
                                            contentStyle={{ backgroundColor: '#09090b', border: '1px solid #27272a', borderRadius: '12px', fontSize: '10px' }}
                                            itemStyle={{ color: '#a78bfa' }}
                                        />
                                        <Area type="step" dataKey="confidence" stroke="#a78bfa" fill="url(#colorConf)" strokeWidth={2} isAnimationActive={false} />
                                        <XAxis dataKey="time" hide />
                                        <YAxis hide domain={[80, 100]} /> {/* 🟢 ZOOMED SCALE: Shows movements between 80-100% clearly */}
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                        
                        <div className="bg-zinc-900 border border-zinc-800 rounded-[40px] p-8 shadow-2xl overflow-hidden flex flex-col min-h-[450px]">
                            {/* HEADER SECTION: Controls the view toggle */}
                            <div className="flex items-center justify-between mb-8">
                                <div className="flex items-center gap-4">
                                    {/* LIVE TAB BUTTON */}
                                    <button 
                                        onClick={() => setActiveOpsTab("live")}
                                        className={`flex items-center gap-2 transition-all cursor-pointer ${activeOpsTab === 'live' ? 'text-amber-400' : 'text-zinc-600 hover:text-zinc-400'}`}
                                    >
                                        <Box size={18}/>
                                        <h3 className="text-[11px] font-black uppercase tracking-widest">Live Operations</h3>
                                    </button>
                        
                                    <span className="text-zinc-800 font-bold">/</span>
                        
                                    {/* AUDIT TAB BUTTON: Note the lowercase "audit" to match the state check */}
                                    <button 
                                        onClick={() => setActiveOpsTab("audit")}
                                        className={`text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer z-50 pointer-events-auto ${activeOpsTab === 'audit' ? 'text-emerald-500' : 'text-zinc-500 hover:text-zinc-300'}`}
                                    >
                                        Audit History
                                    </button>
                                </div>
                        
                                {/* Neural Pulse Indicator */}
                                <div className="flex items-center gap-2">
                                    <div className={`w-1.5 h-1.5 rounded-full ${activeOpsTab === 'live' ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-700'}`}></div>
                                    <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest">Neural Link</span>
                                </div>
                            </div>
                        
                            {/* CONTENT SECTION: Switches based on activeOpsTab */}
                            <div className="flex-1 overflow-x-auto custom-scrollbar">
                                {activeOpsTab === "live" ? (
    
                                    <table className="w-full text-left text-[11px]">
                                        <thead>
                                            <tr className="text-zinc-600 uppercase font-black border-b border-zinc-800 pb-4">
                                                <th className="pb-4">Type</th>
                                                <th className="pb-4">Entry</th>
                                                <th className="pb-4 text-right">Size</th>
                                                <th className="pb-4 text-right pr-2">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-zinc-800/50">
                                            {(socketStatus.positions?.length > 0 || socketStatus.activePositions?.length > 0) ? (
                                                (socketStatus.positions || socketStatus.activePositions).map((pos, idx) => (
                                                    <tr key={idx} className="group hover:bg-white/[0.01] transition-colors">
                                                        <td className={`py-5 font-black flex items-center gap-2 ${pos.type === 'short' ? 'text-amber-500' : 'text-emerald-400'}`}>
                                                            {pos.type === 'short' ? <ArrowDownRight size={14}/> : <ArrowUpRight size={14}/>} 
                                                            {pos.type.toUpperCase()}
                                                        </td>
                                                        <td className="py-5 font-mono font-black text-zinc-200">
                                                            ${Number(pos.entry).toLocaleString()}
                                                        </td>
                                                        <td className="py-5 font-mono text-zinc-500 text-right">
                                                            {Number(pos.size).toFixed(4)}
                                                        </td>
                                                        <td className="py-5 text-right">
                                                            <button onClick={handleManualExit} className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500 border border-rose-500/20 rounded-lg text-rose-500 hover:text-white font-black uppercase text-[9px] transition-all tracking-wider">
                                                                EXIT
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr>
                                                    <td colSpan="4" className="py-24 text-center text-zinc-600 italic font-bold uppercase tracking-widest opacity-30">
                                                        Waiting for Signal...
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                ) : (
                                    
                                    <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
                                        {(socketStatus.tradeHistory?.length > 0 || socketStatus.tradeMarkers?.length > 0) ? (
                                            <div className="space-y-3">
                                                {(socketStatus.tradeHistory || socketStatus.tradeMarkers).map((trade, idx) => (
                                                    <div key={idx} className="p-4 bg-black/20 rounded-2xl border border-zinc-800/50 flex flex-col gap-2 hover:border-emerald-500/30 transition-all">
                                                        <div className="flex justify-between items-center">
                                                            <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${trade.type === 'long' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                                                                {trade.type} Closed
                                                            </span>
                                                            <span className="text-[8px] text-zinc-600 font-bold font-mono">
                                                                {new Date(trade.time * 1000).toLocaleDateString()}
                                                            </span>
                                                        </div>
                                                        
                                                        <div className="grid grid-cols-2 gap-4 mt-1">
                                                            <div>
                                                                <p className="text-[8px] text-zinc-500 uppercase font-black">Entry/Exit</p>
                                                                <p className="text-[10px] font-mono font-bold text-zinc-300">
                                                                    ${Number(trade.entry).toLocaleString()} → ${Number(trade.exit || trade.price).toLocaleString()}
                                                                </p>
                                                            </div>
                                                            <div className="text-right">
                                                                <p className="text-[8px] text-zinc-500 uppercase font-black">Realized PnL</p>
                                                                <p className={`text-[11px] font-black font-mono ${trade.pnl >= 0 ? 'text-emerald-400' : 'text-rose-500'}`}>
                                                                    {trade.pnl >= 0 ? '+' : ''}${Number(trade.pnl).toFixed(2)}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center justify-center py-20 text-center animate-in fade-in zoom-in-95 duration-500">
                                                <div className="p-4 bg-emerald-500/5 rounded-full mb-4 border border-emerald-500/10">
                                                    <Book className="text-emerald-500/40" size={32} />
                                                </div>
                                                <h4 className="text-zinc-400 text-[10px] font-black uppercase tracking-widest">Trade Ledger Empty</h4>
                                                <p className="text-zinc-600 text-[9px] mt-2 max-w-[220px] leading-relaxed font-bold uppercase">
                                                    No closed trades detected in this session.
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                /* ⚙️ STANDBY MODE: 3/9 CONFIGURATION VIEW */
                <div className="max-w-[1800px] mx-auto grid grid-cols-12 gap-8 items-start animate-in fade-in duration-700">
                    <div className="col-span-12 lg:col-span-3 h-[780px] relative">
                        <div className="bg-zinc-900 border border-zinc-800 rounded-[32px] p-8 space-y-10 shadow-2xl h-full overflow-y-auto custom-scrollbar">
                            
                            {/* 🟢 MARKET FEED */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-2 text-zinc-400"><CandlestickChart size={16} /><h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Market Feed</h4></div>
                                <div className="grid grid-cols-3 gap-2">
                                    <div className="col-span-2"><label className={labelClass}>Asset</label><select value={formConfig.symbol} onChange={(e)=>setFormConfig({...formConfig, symbol: e.target.value})} className={inputClass}>{COIN_PAIRS.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                                    <div className="col-span-1"><label className={labelClass}>Period</label><select value={formConfig.timeframe} onChange={(e)=>setFormConfig({...formConfig, timeframe: e.target.value})} className={inputClass}>{TIMEFRAMES.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
                                </div>
                            </div>

                            {/* 🟢 DIRECTION & LEVERAGE */}
                            <div className="space-y-4 border-t border-zinc-800/50 pt-8">
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-2 text-blue-400">
                                        <ArrowDownRight size={16}/>
                                        <h4 className="text-[10px] font-black uppercase tracking-widest">Direction</h4>
                                    </div>
                                    <select 
                                        value={formConfig.enable_shorting} 
                                        onChange={(e) => setFormConfig({...formConfig, enable_shorting: e.target.value === 'true'})} 
                                        className="bg-zinc-800 text-[9px] rounded-lg px-2 py-1 border border-zinc-700 font-black uppercase"
                                    >
                                        <option value="false">Spot Only (Long)</option>
                                        <option value="true">Margin (Long/Short)</option>
                                    </select>
                                </div>
                            
                                {/* 🆕 Dynamic Leverage Slider */}
                                {formConfig.enable_shorting && (
                                    <div className="mt-4 p-4 bg-zinc-950/50 border border-zinc-800 rounded-2xl animate-in fade-in slide-in-from-top-1 duration-300">
                                        <div className="flex justify-between items-center mb-3">
                                            <label className={labelClass}>Leverage Multiplier</label>
                                            <span className="text-[11px] font-mono font-black text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                                                {formConfig.leverage}x
                                            </span>
                                        </div>
                                        <input 
                                            type="range" 
                                            min="1" 
                                            max="20" 
                                            step="1"
                                            value={formConfig.leverage}
                                            onChange={(e) => setFormConfig({...formConfig, leverage: parseInt(e.target.value)})}
                                            className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-500 hover:accent-emerald-400 transition-all"
                                        />
                                        <div className="flex justify-between mt-2 px-1">
                                            <span className="text-[8px] text-zinc-700 font-bold">1X</span>
                                            <span className="text-[8px] text-zinc-700 font-bold">10X</span>
                                            <span className="text-[8px] text-zinc-700 font-bold">20X</span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* 🟢 NEURAL GATE */}
                            <div className="space-y-4 border-t border-zinc-800/50 pt-8">
                                <div className="flex justify-between items-center"><div className="flex items-center gap-2 text-violet-400"><Cpu size={16}/><h4 className="text-[10px] font-black uppercase tracking-widest">Neural Gate</h4></div>
                                <select value={formConfig.mlMode} onChange={(e)=>setFormConfig({...formConfig, mlMode: e.target.value})} className="bg-zinc-800 text-[9px] rounded-lg px-2 py-1 border border-zinc-700 font-black uppercase"><option value="off">Bypass</option><option value="on">Active</option></select></div>
                                {formConfig.mlMode === 'on' && (
                                    <div className="space-y-4 animate-in slide-in-from-top-2">
                                        <div><label className={labelClass}>Architecture</label><select className={inputClass} value={formConfig.mlModel} onChange={(e)=>setFormConfig({...formConfig, mlModel: e.target.value})}>{MODEL_POOL.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</select></div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div><label className={labelClass}>Long Gate</label><input type="number" step="0.01" value={formConfig.params.long_threshold} onChange={(e)=>setFormConfig({...formConfig, params:{...formConfig.params, long_threshold: parseFloat(e.target.value)}})} className={inputClass}/></div>
                                            <div><label className={labelClass}>Short Gate</label><input type="number" step="0.01" value={formConfig.params.short_threshold} onChange={(e)=>setFormConfig({...formConfig, params:{...formConfig.params, short_threshold: parseFloat(e.target.value)}})} className={inputClass}/></div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* 🟢 RISK PROTOCOL WITH MAX PYRAMIDING RESTORED */}
                            <div className="space-y-4 border-t border-zinc-800/50 pt-8">
                                <div className="flex justify-between items-center"><div className="flex items-center gap-2 text-rose-500"><AlertTriangle size={16}/><h4 className="text-[10px] font-black uppercase tracking-widest">Risk Protocol</h4></div>
                                <select value={formConfig.riskManagementMode} onChange={(e)=>setFormConfig({...formConfig, riskManagementMode: e.target.value})} className="bg-zinc-800 text-[9px] rounded-lg px-2 py-1 border border-zinc-700 font-black uppercase"><option value="static">Static</option><option value="dynamic">Dynamic</option></select></div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div><label className={labelClass}>Risk/Trade %</label><input type="number" step="0.1" value={formConfig.riskPercentage} onChange={(e)=>setFormConfig({...formConfig, riskPercentage: parseFloat(e.target.value)})} className={inputClass}/></div>
                                    <div><label className={labelClass}>Max Daily Loss %</label><input type="number" step="0.1" value={formConfig.maxDailyLoss} onChange={(e)=>setFormConfig({...formConfig, maxDailyLoss: parseFloat(e.target.value)})} className={inputClass}/></div>
                                    <div className="col-span-1"><label className={labelClass}>Hard Stop %</label><input type="number" step="0.1" value={formConfig.maxDrawdown} onChange={(e)=>setFormConfig({...formConfig, maxDrawdown: parseFloat(e.target.value)})} className={inputClass}/></div>
                                    <div className="flex flex-col gap-2 p-4 bg-zinc-900/50 rounded-2xl border border-zinc-800">
                                        <label className="text-xs font-black uppercase tracking-widest text-zinc-500">
                                            🛡️ Max Pyramiding
                                        </label>
                                        <input 
                                            type="number" 
                                            min="1" 
                                            max="5" 
                                            value={formConfig?.maxPyramiding || 1}
                                            onChange={(e) => {
                                            // 1. Get the raw value
                                            const val = parseInt(e.target.value);
                                            
                                            // 2. Use the functional updater (prev) to ensure we don't lose other settings
                                            setFormConfig(prev => ({
                                                ...prev, 
                                                // 3. Clamp the value between 1 and 5
                                                maxPyramiding: isNaN(val) ? 1 : Math.min(5, Math.max(1, val))
                                            }));
                                        }}
                                            className="bg-black border border-zinc-700 text-emerald-500 font-mono p-2 rounded-lg focus:outline-none focus:border-emerald-500"
                                        />
                                        <p className="text-[10px] text-zinc-500 italic">
                                            *Limits bot to 1-5 concurrent legs based on conviction climb.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* 🟢 ENSEMBLE & VOTING LOGIC */}
                            <div className="space-y-4 border-t border-zinc-800/50 pt-8">
                                <div className="flex justify-between items-center">
                                    <h4 className="text-[10px] text-emerald-400 font-black uppercase tracking-widest">Ensemble</h4>
                                    <select 
                                        value={formConfig.hybridMode} 
                                        onChange={(e) => {
                                            const newMode = e.target.value;
                                            setFormConfig({
                                                ...formConfig, 
                                                hybridMode: newMode,
                                                // Auto-set votes to max if switched to AND
                                                minVotesRequired: newMode === "AND" ? formConfig.strategies.length : formConfig.minVotesRequired
                                            });
                                        }} 
                                        className="bg-zinc-950 border border-zinc-700 text-[9px] rounded px-2 py-1 text-emerald-500 font-bold uppercase outline-none"
                                    >
                                        <option value="AND">Strict (AND)</option>
                                        <option value="OR">Loose (OR)</option>
                                    </select>
                                </div>
                            
                                {/* 🆕 Dynamic Consensus Vote Input */}
                                {formConfig.hybridMode === "OR" && (
                                    <div className="p-4 bg-violet-500/5 border border-violet-500/10 rounded-2xl animate-in fade-in slide-in-from-top-1 duration-300">
                                        <div className="flex justify-between items-center mb-2">
                                            <label className={labelClass}>Min Consensus Votes</label>
                                            <span className="text-[10px] font-mono font-black text-violet-400">
                                                {formConfig.minVotesRequired} / {formConfig.strategies.length}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <input 
                                                type="range" 
                                                min="1" 
                                                max={formConfig.strategies.length} 
                                                step="1"
                                                value={formConfig.minVotesRequired}
                                                onChange={(e) => setFormConfig({...formConfig, minVotesRequired: parseInt(e.target.value)})}
                                                className="flex-1 h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-violet-500"
                                            />
                                        </div>
                                        <p className="text-[8px] text-zinc-600 mt-2 italic uppercase font-bold tracking-tighter">
                                            *Requires {formConfig.minVotesRequired} modules to agree before execution.
                                        </p>
                                    </div>
                                )}
                            
                                <div className="space-y-3">
                                    {formConfig.strategies.map((s, i) => (
                                        <div key={i} className="p-4 bg-zinc-800/30 rounded-2xl border border-zinc-800 shadow-inner">
                                            <div className="flex justify-between mb-3">
                                                <select 
                                                    value={s.code} 
                                                    onChange={(e) => { 
                                                        const n = [...formConfig.strategies]; 
                                                        n[i] = { code: e.target.value, params: DEFAULT_STRATEGY_PARAMS[e.target.value] }; 
                                                        setFormConfig({...formConfig, strategies: n}); 
                                                    }} 
                                                    className="bg-transparent text-[10px] font-black text-amber-500 uppercase outline-none"
                                                >
                                                    {STRAT_POOL.map(opt => <option key={opt.code} value={opt.code}>{opt.name}</option>)}
                                                </select>
                                                <button 
                                                    type="button" 
                                                    onClick={() => {
                                                        const filtered = formConfig.strategies.filter((_, idx) => idx !== i);
                                                        setFormConfig(p => ({ 
                                                            ...p, 
                                                            strategies: filtered,
                                                            // Ensure minVotes doesn't exceed new length
                                                            minVotesRequired: Math.min(p.minVotesRequired, filtered.length)
                                                        }));
                                                    }} 
                                                    className="text-zinc-600 hover:text-rose-500 transition-colors"
                                                >
                                                    <Trash2 size={12}/>
                                                </button>
                                            </div>
                                            <StrategyParamInputs strategy={s} onChange={(p) => { const n = [...formConfig.strategies]; n[i].params = p; setFormConfig({...formConfig, strategies: n}); }} />
                                        </div>
                                    ))}
                                    
                                    <button 
                                        type="button" 
                                        onClick={() => setFormConfig(p => ({ ...p, strategies: [...p.strategies, { code: "rsi_threshold", params: DEFAULT_STRATEGY_PARAMS.rsi_threshold }] }))} 
                                        className="w-full py-3 border border-dashed border-zinc-800 rounded-xl text-zinc-600 hover:text-emerald-500 transition-all flex items-center justify-center gap-2 font-black text-[9px] uppercase tracking-tighter"
                                    >
                                        <Plus size={12}/> Add Signal Module
                                    </button>
                                </div>
                            </div>
                            
                            {/* 🟢 SHIELD (RISK & PROTECTION) */}
                            <div className="space-y-4 border-t border-zinc-800/50 pt-8">
                                <div className="flex items-center gap-2 text-amber-500">
                                    <Shield size={16}/>
                                    <h4 className="text-[10px] font-black uppercase tracking-widest">Shield</h4>
                                </div>

                                {/* 🆕 Reset Button */}
                                <button 
                                    onClick={handleResetRiskSettings}
                                    className="group flex items-center gap-1.5 px-2 py-1 bg-zinc-800/50 hover:bg-zinc-800 rounded-lg border border-zinc-700/50 transition-all"
                                    title="Reset Risk Defaults"
                                >
                                    <RotateCcw size={10} className="text-zinc-500 group-hover:text-amber-500 group-hover:rotate-[-45deg] transition-all" />
                                    <span className="text-[8px] font-black text-zinc-500 group-hover:text-zinc-300 uppercase tracking-tighter">Reset</span>
                                </button>
                            </div>
                            
                                <div className="grid grid-cols-2 gap-3">
                                    {/* Row 1: TP / SL */}
                                    <div>
                                        <label className={labelClass}>TP %</label>
                                        <input 
                                            type="number" step="0.001" 
                                            value={formConfig.params.take_profit} 
                                            onChange={(e) => setFormConfig({...formConfig, params:{...formConfig.params, take_profit: parseFloat(e.target.value)}})} 
                                            className={inputClass}
                                        />
                                    </div>
                                    <div>
                                        <label className={labelClass}>SL %</label>
                                        <input 
                                            type="number" 
                                            step="0.001" 
                                            value={formConfig.params.stop_loss} 
                                            onChange={(e) => setFormConfig({
                                                ...formConfig, 
                                                params: { ...formConfig.params, stop_loss: parseFloat(e.target.value) }
                                            })} 
                                            className={inputClass}
                                        />
                                    </div>
                            
                                    {/* Row 2: Trailing Stop (Full Width) */}
                                    <div className="col-span-2">
                                        <div className="flex justify-between items-center">
                                            <label className={labelClass}>Trailing Stop %</label>
                                            <Tooltip text="Adjusts stop level dynamically as price moves in favor.">
                                                <Info size={10} className="text-zinc-600"/>
                                            </Tooltip>
                                        </div>
                                        <input 
                                            type="number" step="0.001" 
                                            value={formConfig.params.trailing_stop} 
                                            onChange={(e) => setFormConfig({...formConfig, params:{...formConfig.params, trailing_stop: parseFloat(e.target.value)}})} 
                                            className={inputClass}
                                        />
                                    </div>
                            
                                    {/* 🆕 Row 3: Slippage & Trade Frequency */}
                                    <div>
                                        <div className="flex justify-between items-center">
                                            <label className={labelClass}>Slippage Tol. %</label>
                                            <Tooltip text="Maximum price difference allowed between signal and execution.">
                                                <Info size={10} className="text-zinc-600"/>
                                            </Tooltip>
                                        </div>
                                        <input 
                                            type="number" step="0.1" 
                                            value={formConfig.slippageTolerance}
                                            onChange={(e) => setFormConfig({...formConfig, slippageTolerance: parseFloat(e.target.value)})}
                                            className={inputClass}
                                        />
                                    </div>
                                    <div>
                                        <label className={labelClass}>Max Daily Trades</label>
                                        <input 
                                            type="number" 
                                            value={formConfig.maxTradesPerDay}
                                            onChange={(e) => setFormConfig({...formConfig, maxTradesPerDay: parseInt(e.target.value)})}
                                            className={inputClass}
                                        />
                                    </div>
                                </div>
                            </div>
                            
                            {/* 🟢 ENGINE INITIATION BUTTON (Ensure this is OUTSIDE the Shield grid but INSIDE the sidebar div) */}
                            <button 
                                onClick={() => setShowPreFlight(true)} 
                                className="w-full py-5 bg-emerald-500 text-black rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-emerald-400 transition-all shadow-xl mt-6"
                            >
                                Initiate Engine
                            </button>
                        </div> 
                    </div>
                
                    {/* 🟢 LINE 1284: This should now be clear of errors */}
                    <div className="col-span-12 lg:col-span-9 space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                            <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl shadow-xl">
                                <p className="text-[9px] text-zinc-500 uppercase font-black mb-1">Engine Status</p>
                                <p className="text-lg font-mono font-black text-zinc-600">STANDBY</p>
                                <p className="text-[9px] font-mono text-zinc-500 mt-1 uppercase font-black">SESSION: 00:00:00</p>
                            </div>
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
    rsi_threshold: "#3b82f6", // Blue
    sma_crossover: "#ef4444", // Red
    supertrend: "#10b981",    // Emerald
    macd_crossover: "#f59e0b", // Amber
    atr_breakout: "#8b5cf6",  // Violet
    bb_fade: "#ec4899",       // Pink
    stoch: "#06b6d4",         // Cyan
    ema_cloud: "#f97316",     // Orange
    pa_breakout: "#14b8a6",   // Teal
    vol_profile: "#a855f7"    // Purple
};

const NeuralConvergenceChart = ({ signalsMapHistory, formConfig }) => {
    return (
        <div className="bg-zinc-900 border border-zinc-800 rounded-[32px] p-6 shadow-2xl h-full flex flex-col">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-6 flex items-center gap-2">
                <Cpu size={12} className="text-violet-400" /> Neural Strategy Logic
            </h4>
            
            <div className="flex-1 w-full min-h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={signalsMapHistory}>
                        <defs>
                            {/* 🟢 Generate gradients for EVERY strategy in the pool */}
                            {Object.keys(STRAT_COLORS).map((key) => (
                                <linearGradient key={`grad-${key}`} id={`color-${key}`} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={STRAT_COLORS[key]} stopOpacity={0.1}/>
                                    <stop offset="95%" stopColor={STRAT_COLORS[key]} stopOpacity={0}/>
                                </linearGradient>
                            ))}
                        </defs>
                        
                        <RechartsTooltip 
                            shared={false} 
                            trigger="hover"
                            coordinate={{ x: 0, y: 0 }} 
                            contentStyle={{ 
                                backgroundColor: '#09090b', 
                                border: '1px solid #27272a', 
                                borderRadius: '8px',
                                pointerEvents: 'none'
                            }}
                            formatter={(value, name, props) => {
                                // 🟢 PREVENT CLUSTERING: 
                                // If shared={false} still shows a list, we only return data for the 
                                // SPECIFIC payload being hovered.
                                if (!props?.payload) return null;
                        
                                const key = name.toLowerCase().replace(/\s+/g, '_');
                                const description = STRAT_DESCRIPTIONS[key] || "Neural Signal Layer";
                                const symbol = formConfig?.symbol || "Asset";
                                const confidence = (value * 100).toFixed(0);
                        
                                return [
                                    <span key="val" style={{ color: '#10b981', fontWeight: 'bold' }}>
                                        {confidence}% | {description}
                                    </span>,
                                    <span key="name" style={{ color: '#94a3b8' }}>
                                        {symbol} | {name.toUpperCase()}
                                    </span>
                                ];
                            }}
                        />
                        {Object.keys(STRAT_COLORS).map((key) => (
                            <Area 
                                key={key} 
                                type="monotone" 
                                dataKey={key} 
                                name={key.replace('_', ' ').toUpperCase()} // 🟢 This provides the 'name' to the formatter
                                stroke={STRAT_COLORS[key]} 
                                fill={`url(#color-${key})`}
                                strokeWidth={2}
                                activeDot={{ r: 4, strokeWidth: 0 }}
                                isAnimationActive={false} 
                            />
                        ))}
                        
                        <XAxis dataKey="time" hide />
                        <YAxis 
                            domain={[0.1, 1.0]} 
                            tick={{ fill: '#3f3f46', fontSize: 8 }}
                            tickFormatter={(val) => `${val * 100}%`}
                            width={35}
                            axisLine={false}
                            tickLine={false}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
            
            {/* 🟢 FULL LEGEND: Always visible */}
            <div className="mt-4 grid grid-cols-2 gap-y-2 gap-x-4 border-t border-zinc-800 pt-4">
                {Object.keys(STRAT_COLORS).map((key) => (
                    <div key={key} className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: STRAT_COLORS[key] }}></div>
                        <span className="text-[8px] font-black uppercase text-zinc-500 tracking-tighter">
                            {key.replace('_', ' ')}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
};;

// ... (MetricCard & StrategyParamInputs remain same) ...
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
            <div className="flex justify-between items-center mb-1">
                <label className="text-[8px] text-zinc-600 uppercase font-bold ml-1">{l}</label>
                {desc && <Tooltip text={desc}><Info size={8} className="text-zinc-700" /></Tooltip>}
            </div>
            <input type="number" step={s} value={params[k] ?? ""} onChange={(e) => onChange({...params, [k]: parseFloat(e.target.value)})} className="bg-zinc-950 border border-zinc-700 rounded-lg px-2 py-1 text-[9px] text-amber-500 outline-none font-mono" />
        </div>
    );
    return (
        <div className="grid grid-cols-2 gap-2">
            {code === "rsi_threshold" && <>{f("Length", "rsi_length", "1")}{f("Oversold", "oversold", "1")}{f("Overbought", "overbought", "1")}</>}
            {code === "sma_crossover" && <>{f("Fast", "fast_sma", "1")}{f("Slow", "slow_sma", "1")}</>}
            {code === "supertrend" && <>{f("Period", "st_atr", "1")}{f("Mult", "st_factor", "0.1")}</>}
            {code === "macd_crossover" && <>{f("Fast", "fast", "1")}{f("Slow", "slow", "1")}</>}
            {code === "atr_breakout" && <>{f("Len", "atr_length", "1")}{f("Mult", "multiplier", "0.1")}</>}
            {code === "bb_fade" && <>{f("Per", "bb_period", "1")}{f("Std", "bb_std", "0.1")}</>}
            {code === "stoch" && <>{f("K-P", "k_period", "1")}{f("D-P", "d_period", "1")}</>}
            {code === "ema_cloud" && <>{f("Fast", "fast_ema", "1")}{f("Slow", "slow_ema", "1")}</>}
            {code === "pa_breakout" && <>{f("LB", "lookback", "1")}{f("Buf", "buffer", "0.01")}</>}
            {code === "vol_profile" && <>{f("MA", "vol_ma", "1")}{f("T", "threshold", "0.1")}</>}
        </div>
    );
}

export default TradingBotContainer;
