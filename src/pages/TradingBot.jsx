
// File: src/pages/TradingBot.jsx
// 🚀 FIX: v13.13 - Final Integration (Halt, Sync, Clear, Risk)

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
    CandlestickChart, AlertTriangle, RotateCcw, Eraser
} from "lucide-react"; 

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';

import "./TradingBot.css";
import "../styles/Themes.css";

// 🟢 CONFIGURATION
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

// ... (STRAT_POOL, MODEL_POOL, DEFAULT_STRATEGY_PARAMS remain same) ...
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
    const { startBot, stopBot, resetBot, refreshState, restoredConfig, botStatus: hookBotStatus, logs: hookLogs } = useBot(); 
    const { isConnected, address } = useAccount();
    
    const [isModeSelected, setIsModeSelected] = useState(false);
    const [hasApiKeys, setHasApiKeys] = useState(false);
    const [showPreFlight, setShowPreFlight] = useState(false);
    const [isStarting, setIsStarting] = useState(false);
    const [paperBalance, setPaperBalance] = useState(10000);
    const [modeStep, setModeStep] = useState('selection');
    const [viewMode, setViewMode] = useState('active');
    
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
        symbol: "BTC-USD", timeframe: "1h", capitalAllocation: 1000,
        tradingMode: "paper", strategies: [{ code: "rsi_threshold", params: DEFAULT_STRATEGY_PARAMS.rsi_threshold }],
        mlMode: "off", mlModel: "xgboost", mlThreshold: 0.5,
        riskManagementMode: "static", 
        riskPercentage: 1, 
        maxDailyLoss: 5, 
        maxDrawdown: 10, 
        maxTradesPerDay: 20,
        hybridMode: "AND",
        enable_shorting: true,
        maxPyramiding: 5,
        params: { take_profit: 0.05, stop_loss: 0.02, trailing_stop: 0.01, long_threshold: 0.5, short_threshold: 0.5 },
        filters: { trend_filter: "none", vol_min: 0, atr_filter: 0 }
    });

    const isBotRunning = socketStatus.status === 'running' && !isHaltLocked;

    useEffect(() => {
        if (hookBotStatus) setSocketStatus(prev => ({ ...prev, ...hookBotStatus, logs: hookBotStatus.logs?.length ? hookBotStatus.logs : prev.logs }));
        if (hookLogs.length > 0) setSocketLogs(hookLogs);
        if (restoredConfig) setFormConfig(prev => ({ ...prev, ...restoredConfig, strategies: restoredConfig.strategies && restoredConfig.strategies.length > 0 ? restoredConfig.strategies : prev.strategies }));
    }, [hookBotStatus, hookLogs, restoredConfig]);

    const activeBalance = useMemo(() => {
        if (isBotRunning) return socketStatus.currentBalance || socketStatus.initialCapital || formConfig.capitalAllocation;
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

    useEffect(() => {
        if (!address) return;
        socketRef.current = io(SOCKET_URL, { query: { userId: address }, transports: ['websocket'] });
        socketRef.current.on("connect", () => setSocketConnected(true));
        socketRef.current.on("disconnect", () => setSocketConnected(false));
        socketRef.current.on("bot_status_update", (data) => {
            if (isHaltLocked) return; 
            setSocketStatus(prev => ({ ...prev, ...data, positions: data.activePositions || data.positions || prev.positions, tradeMarkers: data.tradeMarkers || prev.tradeMarkers, startedAt: data.startedAt || prev.startedAt, initialCapital: data.initialCapital || prev.initialCapital }));
        });
        socketRef.current.on("bot_log", (newLog) => {
            const logObj = typeof newLog === 'string' ? { message: newLog, time: new Date().toISOString() } : newLog;
            setSocketLogs(prev => {
                if (prev.some(l => parseLog(l.message || l) === parseLog(logObj.message || logObj))) return prev;
                return [logObj, ...prev].slice(0, 100);
            });
        });
        return () => { if (socketRef.current) socketRef.current.disconnect(); };
    }, [address, isHaltLocked]);

    const performanceData = useMemo(() => {
        if (!socketStatus.equityCurve?.length) return [{ time: 'Start', balance: formConfig.capitalAllocation }];
        return socketStatus.equityCurve.map(p => ({ time: new Date(p.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), balance: p.balance, confidence: (Math.random() * 20) + 80 }));
    }, [socketStatus.equityCurve, formConfig.capitalAllocation]);

   const handleConfirmStart = async () => {
    setIsStarting(true);
    setIsHaltLocked(false);
    setSocketStatus(prev => ({ ...prev, equityCurve: [], tradeMarkers: [], positions: [], candles: [] }));
    setSocketLogs([]);
    const finalConfig = {
        ...formConfig,
        capitalAllocation: Number(formConfig.capitalAllocation) || Number(paperBalance) || 1000,
        mlMode: formConfig.mlMode || "off", 
        mlModel: formConfig.mlModel || "stacking", 
        mlThresholdLong: parseFloat(formConfig.params.long_threshold) || 0.8,
        mlThresholdShort: parseFloat(formConfig.params.short_threshold) || 0.9,
        enable_shorting: formConfig.enable_shorting === true,
        maxPyramiding: Number(formConfig.maxPyramiding),
        comboConfig: { strategyCodes: formConfig.strategies.map(s => s.code), combinationRule: formConfig.hybridMode || "AND", minVotesRequired: formConfig.hybridMode === "AND" ? formConfig.strategies.length : 1 }
    };
    try {
        const response = await startBot({ userId: address, config: finalConfig });
        if (response && response.status === 'running') {
            toast.success(`Protocol Ignited: ${finalConfig.symbol}`);
            setShowPreFlight(false);
            logContainerRef.current?.scrollIntoView({ behavior: 'smooth' });
        } else { console.warn("Invalid start response", response); }
    } catch (e) { toast.error(`Engine Failure: ${e.response?.data?.detail || e.message}`); } finally { setIsStarting(false); }
};

    const handleHalt = async () => {
        setIsHaltLocked(true);
        try {
            await stopBot();
            toast.success("Safe Abort: Terminal Memory Purged");
            setTimeout(() => setIsHaltLocked(false), 5000); 
        } catch (e) { toast.error("Halt Command Failed"); setIsHaltLocked(false); }
    };

    const handleManualExit = async () => {
        if (!socketStatus.positions.length) return;
        try {
            const token = localStorage.getItem("token");
            await axios.post(`${API_BASE}/bot/close_position`, { userId: address, symbol: formConfig.symbol }, { headers: { Authorization: `Bearer ${token}` } });
            toast.success("Position Forced Closed");
        } catch (e) { toast.error("Exit Failed: " + (e.response?.data?.detail || e.message)); }
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
        toast.success("Neural Stream Synced");
    };

    if (!isConnected) {
        return (
            <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6">
                <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-[40px] p-12 text-center shadow-2xl">
                    <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-inner"><Wallet className="text-emerald-500 w-8 h-8" /></div>
                    <h2 className="text-2xl font-black text-white mb-3 uppercase tracking-tighter">Terminal Encrypted</h2>
                    <ConnectButton />
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

                {/* 1. LAYER: OVERLAYS */}
                {!isModeSelected && !isBotRunning && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black bg-opacity-95 backdrop-blur-md">
                        <div className="max-w-4xl w-full p-6 text-center">
                            {modeStep === 'selection' ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div onClick={() => setModeStep('paper_setup')} className="cursor-pointer bg-zinc-900 p-16 rounded-[40px] border border-white border-opacity-5 hover:border-emerald-500 transition-all shadow-2xl"><h3 className="text-3xl font-black text-emerald-400">PAPER</h3></div>
                                    <div onClick={() => setIsModeSelected(true)} className="cursor-pointer bg-zinc-900 p-16 rounded-[40px] border border-white border-opacity-5 hover:border-red-500 transition-all shadow-2xl"><h3 className="text-3xl font-black text-red-500">LIVE</h3></div>
                                </div>
                            ) : (
                                <div className="max-w-md mx-auto bg-zinc-900 border border-zinc-800 p-12 rounded-[40px] shadow-2xl text-center">
                                    <h3 className="text-xl font-black text-white mb-6 uppercase">Initial Balance</h3>
                                    <input type="number" value={paperBalance} onChange={(e) => setPaperBalance(Number(e.target.value))} className="w-full bg-black border border-zinc-800 p-5 text-emerald-500 mb-8 rounded-2xl text-center text-2xl font-mono outline-none" />
                                    <button onClick={() => setIsModeSelected(true)} className="w-full py-4 bg-emerald-500 text-black rounded-2xl font-black uppercase tracking-widest">Ignite Engine</button>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* 2. LAYER: HEADER */}
                <header className="max-w-[1800px] mx-auto mb-10 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Activity className="text-emerald-500 w-8 h-8" />
                        <div>
                            <h1 className="text-lg font-black uppercase tracking-widest text-white">Sovereign <span className="text-emerald-500">Live</span></h1>
                            <p className="text-[9px] text-zinc-500 font-black uppercase">Session Sync: <span className="text-emerald-500 font-mono">{uptime}</span></p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        {isBotRunning ? (
                            <button onClick={stopBot} className="px-6 py-3 bg-rose-500 bg-opacity-10 border border-rose-500 border-opacity-20 text-rose-500 rounded-xl font-black text-[10px] uppercase hover:bg-rose-500 transition-all"><Power size={12} className="mr-2 inline"/> Halt</button>
                        ) : (
                            <button onClick={resetBot} className="px-6 py-3 bg-zinc-800 bg-opacity-50 border border-zinc-700 text-zinc-400 rounded-xl font-black text-[10px] uppercase hover:bg-white hover:text-black transition-all flex items-center gap-2"><RotateCcw size={12} className="mr-2 inline"/> Reset</button>
                        )}
                        <ConnectButton />
                    </div>
                </header>

                {/* 3. LAYER: MAIN GRID */}
                <div className="max-w-[1800px] mx-auto grid grid-cols-12 gap-8 items-start">
                    
                    {/* 🟢 COLUMN 1: SIDEBAR */}
                    <div className="col-span-12 lg:col-span-3 h-[780px] relative overflow-hidden">
                        <div className={`absolute inset-0 transition-all duration-700 ease-in-out ${isBotRunning ? '-translate-x-full opacity-0 pointer-events-none' : 'translate-x-0 opacity-100'}`}>
                            <div className="bg-zinc-900 border border-zinc-800 rounded-[32px] p-8 space-y-8 shadow-2xl h-full overflow-y-auto custom-scrollbar">
                                
                                {/* 🔴 FULL MARKET FEED SECTION RESTORED */}
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 text-zinc-400"><CandlestickChart size={16}/><h4 className="text-[10px] font-black uppercase tracking-widest">Market Feed</h4></div>
                                    <div className="grid grid-cols-3 gap-2">
                                        <div className="col-span-2"><label className={labelClass}>Asset</label><select value={formConfig.symbol} onChange={(e)=>setFormConfig({...formConfig, symbol: e.target.value})} className={inputClass}>{COIN_PAIRS.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                                        <div className="col-span-1"><label className={labelClass}>Period</label><select value={formConfig.timeframe} onChange={(e)=>setFormConfig({...formConfig, timeframe: e.target.value})} className={inputClass}>{TIMEFRAMES.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
                                    </div>
                                </div>

                                {/* 🔴 DIRECTION SECTION */}
                                <div className="pt-6 border-t border-zinc-800 border-opacity-50">
                                    <div className="flex justify-between items-center"><div className="flex items-center gap-2 text-blue-400"><ArrowDownRight size={16}/><h4 className="text-[10px] font-black uppercase tracking-widest">Direction</h4></div>
                                    <select value={formConfig.enable_shorting} onChange={(e)=>setFormConfig({...formConfig, enable_shorting: e.target.value === 'true'})} className="bg-zinc-800 text-[9px] rounded-lg px-2 py-1 border border-zinc-700 font-black uppercase">
                                        <option value="false">Spot Only</option>
                                        <option value="true">Cross Margin</option>
                                    </select></div>
                                </div>

                                {/* 🔴 NEURAL GATE SECTION */}
                                <div className="pt-6 border-t border-zinc-800 border-opacity-50 space-y-4">
                                    <div className="flex justify-between items-center"><div className="flex items-center gap-2 text-violet-400"><Cpu size={16}/><h4 className="text-[10px] font-black uppercase tracking-widest">Neural Gate</h4></div>
                                    <select value={formConfig.mlMode} onChange={(e)=>setFormConfig({...formConfig, mlMode: e.target.value})} className="bg-zinc-800 text-[9px] rounded px-2 py-1 border border-zinc-700 uppercase font-black"><option value="off">Bypass</option><option value="on">Active</option></select></div>
                                    {formConfig.mlMode === 'on' && (
                                        <div className="space-y-4">
                                            <select className={inputClass} value={formConfig.mlModel} onChange={(e)=>setFormConfig({...formConfig, mlModel: e.target.value})}>{MODEL_POOL.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</select>
                                            <div className="grid grid-cols-2 gap-2">
                                                <div><label className={labelClass}>L-Gate</label><input type="number" step="0.01" value={formConfig.params.long_threshold} onChange={(e)=>setFormConfig({...formConfig, params:{...formConfig.params, long_threshold: parseFloat(e.target.value)}})} className={inputClass}/></div>
                                                <div><label className={labelClass}>S-Gate</label><input type="number" step="0.01" value={formConfig.params.short_threshold} onChange={(e)=>setFormConfig({...formConfig, params:{...formConfig.params, short_threshold: parseFloat(e.target.value)}})} className={inputClass}/></div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* 🔴 RISK PROTOCOL SECTION */}
                                <div className="pt-6 border-t border-zinc-800 border-opacity-50 space-y-4">
                                    <div className="flex items-center gap-2 text-rose-500"><AlertTriangle size={16}/><h4 className="text-[10px] font-black uppercase tracking-widest">Risk Shield</h4></div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div><label className={labelClass}>Risk %</label><input type="number" step="0.1" value={formConfig.riskPercentage} onChange={(e)=>setFormConfig({...formConfig, riskPercentage: parseFloat(e.target.value)})} className={inputClass}/></div>
                                        <div><label className={labelClass}>Max Loss %</label><input type="number" step="0.1" value={formConfig.maxDailyLoss} onChange={(e)=>setFormConfig({...formConfig, maxDailyLoss: parseFloat(e.target.value)})} className={inputClass}/></div>
                                        <div className="col-span-2"><label className={labelClass}>Pyramiding Legs</label><input type="number" value={formConfig.maxPyramiding} onChange={(e)=>setFormConfig({...formConfig, maxPyramiding: parseInt(e.target.value)})} className={inputClass}/></div>
                                    </div>
                                </div>

                                {/* 🔴 LOGIC ENSEMBLE SECTION */}
                                <div className="pt-6 border-t border-zinc-800 border-opacity-50 space-y-4">
                                    <div className="flex justify-between items-center"><h4 className="text-[10px] text-amber-500 font-black uppercase">Logic Ensemble</h4><select value={formConfig.hybridMode} onChange={(e)=>setFormConfig({...formConfig, hybridMode: e.target.value})} className="bg-zinc-950 border border-zinc-800 text-[9px] px-2 py-1 uppercase font-black"><option value="AND">Strict</option><option value="OR">Loose</option></select></div>
                                    <div className="space-y-3">
                                        {formConfig.strategies.map((s, i) => (
                                            <div key={i} className="p-4 bg-black bg-opacity-40 rounded-xl border border-zinc-800">
                                                <div className="flex justify-between mb-3">
                                                    <select value={s.code} onChange={(e) => { const n = [...formConfig.strategies]; n[i] = { code: e.target.value, params: DEFAULT_STRATEGY_PARAMS[e.target.value] }; setFormConfig({...formConfig, strategies: n}); }} className="bg-transparent text-[10px] font-black text-amber-500 uppercase outline-none">{STRAT_POOL.map(opt => <option key={opt.code} value={opt.code}>{opt.name}</option>)}</select>
                                                    <button onClick={() => setFormConfig(p => ({ ...p, strategies: p.strategies.filter((_, idx) => idx !== i) }))} className="text-zinc-600 hover:text-rose-500"><Trash2 size={12}/></button>
                                                </div>
                                                <StrategyParamInputs strategy={s} onChange={(p) => { const n = [...formConfig.strategies]; n[i].params = p; setFormConfig({...formConfig, strategies: n}); }} />
                                            </div>
                                        ))}
                                        <button onClick={() => setFormConfig(p => ({ ...p, strategies: [...p.strategies, { code: "rsi_threshold", params: DEFAULT_STRATEGY_PARAMS.rsi_threshold }] }))} className="w-full py-2 border border-dashed border-zinc-800 rounded-lg text-[9px] uppercase font-black text-zinc-600 hover:text-emerald-500 transition-all">+ Add Logic</button>
                                    </div>
                                </div>

                                <button onClick={() => startBot({ userId: address, config: formConfig })} className="w-full py-5 bg-emerald-500 text-black rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl">Initiate Engine</button>
                            </div>
                        </div>

                        {/* INTEL PANE (Slides in when running) */}
                        <div className={`absolute inset-0 transition-all duration-1000 delay-200 ease-out ${isBotRunning ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0 pointer-events-none'}`}>
                            <NeuralConvergenceChart strategies={formConfig.strategies} signalsMapHistory={socketStatus.signalsMapHistory || []} />
                        </div>
                    </div>

                    {/* 🟢 COLUMN 2: MAIN AREA */}
                    <div className="col-span-12 lg:col-span-9 space-y-8 transition-all duration-700">
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                            <MetricCard label="Engine Status" value={isBotRunning ? 'OPERATIONAL' : 'STANDBY'} color={isBotRunning ? 'text-emerald-400' : 'text-zinc-600'} />
                            <MetricCard label="Pyramid Stage" value={`${socketStatus.positions.length}/5`} legs={socketStatus.positions.length} color="text-emerald-400" />
                            <MetricCard label="Daily Profit" value={`$${(socketStatus.dailyProfit || 0).toFixed(2)}`} />
                            <MetricCard label="Exposure" value={`${socketStatus.exposure || 0}%`} color="text-amber-400" />
                            <MetricCard label="Total Equity" value={`$${Number(activeBalance).toLocaleString()}`} />
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <div className={`${isBotRunning ? 'lg:col-span-2' : 'lg:col-span-3'} bg-zinc-900 border border-zinc-800 rounded-[40px] overflow-hidden flex flex-col h-[650px] shadow-2xl relative`}>
                                <div className="bg-zinc-800 bg-opacity-20 p-6 border-b border-zinc-800 border-opacity-50 flex items-center justify-between">
                                    <span className="text-[11px] font-black uppercase text-zinc-100">{formConfig.symbol} Live Alpha</span>
                                    <div className="flex bg-zinc-950 p-1 rounded-xl border border-zinc-800">
                                        <button onClick={() => setViewMode('active')} className={`px-3 py-1 text-[9px] font-black rounded-lg transition-all ${viewMode === 'active' ? 'bg-zinc-800 text-emerald-400 shadow-lg' : 'text-zinc-600'}`}>ACTIVE</button>
                                        <button onClick={() => setViewMode('history')} className={`px-3 py-1 text-[9px] font-black rounded-lg transition-all ${viewMode === 'history' ? 'bg-zinc-800 text-amber-400 shadow-lg' : 'text-zinc-600'}`}>HISTORY</button>
                                    </div>
                                </div>
                                <div className="flex-1 bg-black bg-opacity-40 overflow-auto">
                                    {viewMode === 'active' ? (
                                        <LiveTradingChart symbol={formConfig.symbol} activePositions={socketStatus.positions} />
                                    ) : (
                                        <div className="p-6">
                                            <table className="w-full text-left text-[11px]">
                                                <thead className="text-zinc-600 border-b border-zinc-800 uppercase font-black"><tr><th className="pb-4">Type</th><th className="pb-4">Price</th><th className="pb-4 text-right">Time</th></tr></thead>
                                                <tbody>{socketStatus.tradeMarkers.map((t, i) => (<tr key={i} className="border-b border-zinc-800 border-opacity-30"><td className={`py-4 font-black ${t.type === 'short' ? 'text-rose-400' : 'text-emerald-400'}`}>{t.type.toUpperCase()}</td><td className="py-4 font-mono font-bold">${t.price.toLocaleString()}</td><td className="py-4 text-right text-zinc-500 font-mono">{formatTime(t.time)}</td></tr>))}</tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {isBotRunning && (
                                <div className="lg:col-span-1 bg-zinc-900 border border-zinc-800 rounded-[40px] flex flex-col h-[650px] overflow-hidden shadow-2xl animate-in slide-in-from-right duration-700">
                                    <div className="p-5 border-b border-zinc-800 bg-zinc-800 bg-opacity-20 flex justify-between items-center"><div className="flex items-center gap-2 text-violet-400"><Cpu size={16} className="animate-pulse"/><h3 className="text-[10px] font-black uppercase">Neural Flow</h3></div><RefreshCw size={14} className="text-zinc-600 cursor-pointer hover:text-white" onClick={refreshState} /></div>
                                    <div ref={logContainerRef} className="flex-1 overflow-y-auto p-6 font-mono text-[10px] space-y-3 bg-black bg-opacity-20 custom-scrollbar">
                                        {socketLogs.map((log, i) => (<div key={i} className={`p-3 rounded-xl border leading-relaxed flex flex-col gap-1 ${getLogStyle(parseLog(log.message || log))}`}><span className="text-[9px] opacity-50 block mb-1 font-bold">{formatTime(log.time)}</span><span className="leading-relaxed">{parseLog(log.message || log)}</span></div>))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* 📈 PERFORMANCE ANALYTICS SECTION */}
                        {isBotRunning && (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in slide-in-from-bottom-10 duration-1000 pb-20">
                                <div className="bg-zinc-900 border border-zinc-800 rounded-[40px] p-8 shadow-2xl">
                                    <div className="flex items-center gap-2 mb-8"><BarChart size={18} className="text-emerald-500"/><h3 className="text-[11px] font-black uppercase tracking-widest">Equity Path</h3></div>
                                    <div className="h-48 w-full">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart data={socketStatus.equityCurve}>
                                                <Area type="monotone" dataKey="balance" stroke="#10b981" fill="#10b981" fillOpacity={0.1} strokeWidth={3} />
                                                <XAxis dataKey="time" hide />
                                                <YAxis hide domain={['auto', 'auto']} />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                                <div className="bg-zinc-900 border border-zinc-800 rounded-[40px] p-8 shadow-2xl">
                                    <div className="flex items-center gap-2 mb-8"><Zap size={18} className="text-violet-500"/><h3 className="text-[11px] font-black uppercase tracking-widest">Logic conviction</h3></div>
                                    <div className="h-48 w-full">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart data={socketStatus.signalsMapHistory}>
                                                <Area type="step" dataKey="confidence" stroke="#a78bfa" fill="#a78bfa" fillOpacity={0.1} strokeWidth={2} />
                                                <XAxis dataKey="time" hide />
                                                <YAxis hide domain={[0, 100]} />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div> {/* Closes Main Area Column */}
                </div> {/* Closes Grid-12 Parent */}
            </div> {/* Closes Background Wrapper */}
        </UIModeProvider>
    );
};

// --- SUB-COMPONENTS ---

const NeuralConvergenceChart = ({ strategies, signalsMapHistory }) => {
    const chartData = useMemo(() => signalsMapHistory?.slice(-40) || [], [signalsMapHistory]);
    return (
        <div className="bg-zinc-900 border border-zinc-800 rounded-[32px] p-6 h-full flex flex-col shadow-2xl overflow-hidden">
            <div className="flex items-center gap-2 mb-8 text-violet-400">
                <Zap size={16} className="animate-pulse" />
                <h3 className="text-[10px] font-black uppercase tracking-widest text-white">Neural Strategy Convergence</h3>
            </div>
            <div className="flex-1">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                        <XAxis dataKey="time" hide />
                        <YAxis hide domain={['auto', 'auto']} />
                        {strategies.map((s, i) => (
                            <Area key={s.code} type="monotone" dataKey={s.code} stroke={i % 2 === 0 ? "#a78bfa" : "#10b981"} fill={i % 2 === 0 ? "#8b5cf6" : "#10b981"} fillOpacity={0.05} strokeWidth={2} stackId="1" />
                        ))}
                    </AreaChart>
                </ResponsiveContainer>
            </div>
            <div className="mt-4 pt-4 border-t border-zinc-800 border-opacity-50">
                <p className="text-[8px] text-zinc-500 font-black uppercase tracking-widest mb-2">Council Sync</p>
                <div className="grid grid-cols-2 gap-1">
                    {strategies.map((s, i) => (
                        <div key={i} className="text-[7px] text-zinc-400 uppercase font-bold truncate">● {s.code.replace('_', ' ')}</div>
                    ))}
                </div>
            </div>
        </div>
    );
};

const MetricCard = ({ label, value, subValue, color = "text-white" }) => (
    <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl shadow-xl">
        <p className="text-[9px] text-zinc-500 uppercase font-black mb-2 tracking-widest">{label}</p>
        <div className="flex flex-col">
            <p className={`text-lg font-mono font-black ${color}`}>{value}</p>
            {subValue && <p className="text-[8px] font-black text-zinc-600 mt-1 uppercase tracking-tighter">{subValue}</p>}
        </div>
    </div>
);

function StrategyParamInputs({ strategy, onChange }) {
    const { code, params = {} } = strategy;
    const f = (l, k, s = "1") => (
        <div className="flex flex-col">
            <label className="text-[8px] text-zinc-600 uppercase font-bold ml-1">{l}</label>
            <input type="number" step={s} value={params[k] ?? ""} onChange={(e) => onChange({...params, [k]: parseFloat(e.target.value)})} className="bg-zinc-950 border border-zinc-700 rounded-lg px-2 py-1 text-[9px] text-amber-500 font-mono outline-none" />
        </div>
    );
    return (
        <div className="grid grid-cols-2 gap-2">
            {code === "rsi_threshold" && <>{f("Length", "rsi_length")}{f("Oversold", "oversold")}{f("Overbought", "overbought")}</>}
            {code === "sma_crossover" && <>{f("Fast", "fast_sma")}{f("Slow", "slow_sma")}</>}
            {code === "supertrend" && <>{f("ATR", "st_atr")}{f("Factor", "st_factor", "0.1")}</>}
            {code === "macd_crossover" && <>{f("Fast", "fast")}{f("Slow", "slow")}{f("Signal", "signal")}</>}
            {code === "atr_breakout" && <>{f("Len", "atr_length")}{f("Mult", "multiplier", "0.1")}</>}
            {code === "bb_fade" && <>{f("Period", "bb_period")}{f("StdDev", "bb_std", "0.1")}</>}
            {code === "stoch" && <>{f("K-Per", "k_period")}{f("D-Per", "d_period")}</>}
            {code === "ema_cloud" && <>{f("Fast", "fast_ema")}{f("Slow", "slow_ema")}</>}
            {code === "pa_breakout" && <>{f("Lookback", "lookback")}{f("Buffer", "buffer", "0.01")}</>}
            {code === "vol_profile" && <>{f("MA", "vol_ma")}{f("Ratio", "threshold", "0.1")}</>}
        </div>
    );
}

export default TradingBotContainer;
