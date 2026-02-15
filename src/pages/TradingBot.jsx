// File: src/pages/TradingBot.jsx
// 🚀 FIX: v13.13 - Scope & DOM Compliance Fix

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

// --- GLOBAL STYLING CONSTANTS (FIXES ReferenceError) ---
const labelClass = "text-[9px] text-zinc-500 uppercase font-black mb-1 block ml-1 tracking-tighter";
const inputClass = "w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:border-emerald-500 transition-all text-[11px] outline-none font-mono";

// --- CONFIGURATION CONSTANTS ---
const RAW_URL = import.meta.env.VITE_API_URL || "https://neov6backend.onrender.com";
const BASE_URL = RAW_URL.replace(/\/$/, "").replace(/\/api$/, "");
const API_BASE = `${BASE_URL}/api`;
const SOCKET_URL = BASE_URL;

const COIN_PAIRS = ["BTC-USD", "ETH-USD", "SOL-USD", "DOGE-USD", "MATIC-USD", "LINK-USD", "ADA-USD"];
const TIMEFRAMES = ["1m", "5m", "15m", "1h", "4h", "1d"];

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
    { id: "stacking", name: "Stacking Hybrid (Meta)" }
];

// --- HELPER FUNCTIONS ---
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
    return 'text-zinc-500 bg-zinc-900 border-zinc-800'; 
};

// --- MAIN COMPONENT ---
const TradingBotContainer = () => {
    const { startBot, stopBot, resetBot, refreshState, restoredConfig, botStatus: hookBotStatus, logs: hookLogs } = useBot(); 
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
        status: 'stopped', currentBalance: 0, unrealizedPnl: 0, exposure: 0, positions: [], equityCurve: [], startedAt: null, dailyProfit: 0, initialCapital: 0, tradeMarkers: [], candles: []
    });
    const [socketConnected, setSocketConnected] = useState(false);
    const [uptime, setUptime] = useState("00:00:00");
    const logContainerRef = useRef(null);

    const [formConfig, setFormConfig] = useState({
        symbol: "BTC-USD", timeframe: "1h", capitalAllocation: 1000,
        tradingMode: "paper", strategies: [{ code: "rsi_threshold", params: DEFAULT_STRATEGY_PARAMS.rsi_threshold }],
        mlMode: "on", mlModel: "stacking", hybridMode: "AND", enable_shorting: true, 
        params: { take_profit: 0.05, stop_loss: 0.02, trailing_stop: 0.01, long_threshold: 0.8, short_threshold: 0.9 }
    });

    const isBotRunning = socketStatus.status === 'running' && !isHaltLocked;

    useEffect(() => {
        if (!address || !isConnected) return;
        const restoreSession = async () => {
            try {
                const token = localStorage.getItem("token");
                if (!token) return;

                const { data } = await axios.get(`${API_BASE}/bot/status`, {
                    params: { userId: address },
                    headers: { Authorization: `Bearer ${token}` }
                });

                if (data && (data.status === 'running' || data.balance > 0)) {
                    setIsModeSelected(true); 
                    setSocketStatus(prev => ({ ...prev, ...data, currentBalance: data.balance }));
                    if (data.config) setFormConfig(prev => ({ ...prev, ...data.config }));
                    if (data.logs) setSocketLogs(data.logs);
                }
            } catch (e) { console.log("Fresh Session Mode."); }
        };
        restoreSession();
    }, [address, isConnected]);

    useEffect(() => {
        if (!address) return;
        socketRef.current = io(SOCKET_URL, { query: { userId: address }, transports: ['websocket'] });
        socketRef.current.on("connect", () => setSocketConnected(true));
        socketRef.current.on("disconnect", () => setSocketConnected(false));
        socketRef.current.on("bot_status_update", (data) => {
            if (isHaltLocked) return; 
            setSocketStatus(prev => ({ ...prev, ...data, positions: data.activePositions || data.positions || prev.positions }));
        });
        socketRef.current.on("bot_log", (newLog) => {
            const logObj = typeof newLog === 'string' ? { message: newLog, time: new Date().toISOString() } : newLog;
            setSocketLogs(prev => [logObj, ...prev].slice(0, 100));
        });
        return () => socketRef.current?.disconnect();
    }, [address, isHaltLocked]);

    const handleConfirmStart = async () => {
        setIsStarting(true);
        const targetCapital = Number(formConfig.capitalAllocation);
        setSocketStatus(prev => ({ ...prev, status: 'initializing', currentBalance: targetCapital, logs: [] }));
        try {
            const response = await startBot({ userId: address, config: formConfig });
            if (response && response.status === 'running') {
                toast.success(`Protocol Ignited: ${formConfig.symbol}`);
                setShowPreFlight(false);
                setSocketStatus(prev => ({ ...prev, status: 'running', startedAt: new Date().toISOString() }));
            }
        } catch (e) {
            toast.error(`Engine Failure: ${e.response?.data?.detail || e.message}`);
        } finally { setIsStarting(false); }
    };

    const handleHalt = async () => {
        setIsHaltLocked(true); 
        try {
            await stopBot();
            setSocketStatus(prev => ({ ...prev, status: 'stopped', positions: [], equityCurve: [] }));
            setSocketLogs([]); 
            localStorage.removeItem("neo_active_bot_id");
            toast.success("🚨 SYSTEM PURGED");
            setTimeout(() => setIsHaltLocked(false), 2000);
        } catch (e) { setIsHaltLocked(false); }
    };

    const activeBalance = useMemo(() => isBotRunning ? (socketStatus.currentBalance || formConfig.capitalAllocation) : formConfig.capitalAllocation, [isBotRunning, socketStatus.currentBalance, formConfig.capitalAllocation]);

    if (!isConnected) {
        return (
            <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6">
                <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-[40px] p-12 text-center shadow-2xl">
                    <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center mx-auto mb-8"><Wallet className="text-emerald-500 w-8 h-8" /></div>
                    <h2 className="text-2xl font-black text-white mb-3 uppercase tracking-tighter">Terminal Encrypted</h2>
                    <ConnectButton />
                    {/* Fixed Auth element with autocomplete to resolve DOM Warning */}
                    <input name="password" type="password" autoComplete="current-password" disabled className="hidden" value="password" />
                </div>
            </div>
        );
    }

    return (
        <UIModeProvider>
            <div className="min-h-screen bg-zinc-950 text-white font-sans p-6 overflow-x-hidden">
                <Toaster position="top-right" />
                
                {showPreFlight && <PreFlightModal config={formConfig} onConfirm={handleConfirmStart} onCancel={() => setShowPreFlight(false)} isStarting={isStarting} address={address} />}

                <header className="max-w-[1800px] mx-auto mb-10 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-lg"><Activity className="text-black w-7 h-7" /></div>
                        <div><h1 className="text-lg font-black uppercase tracking-widest">Sovereign <span className="text-emerald-500">Live</span></h1><p className="text-[9px] text-zinc-500 font-black uppercase tracking-[0.2em]">Terminal v13.13</p></div>
                    </div>
                    <div className="flex items-center gap-4">
                        {isBotRunning ? (
                            <button onClick={handleHalt} className="px-6 py-3 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-xl font-black text-[10px] uppercase hover:bg-rose-500 hover:text-white transition-all flex items-center gap-2"><Power size={12}/> Emergency Halt</button>
                        ) : <ConnectButton />}
                    </div>
                </header>

                <main className="max-w-[1800px] mx-auto grid grid-cols-12 gap-8">
                    {!isBotRunning && (
                        <div className="col-span-12 lg:col-span-3 space-y-6">
                            <div className="bg-zinc-900 border border-zinc-800 rounded-[32px] p-8 space-y-8 shadow-2xl sticky top-6">
                                <div><label className={labelClass}>Asset Pair</label><select value={formConfig.symbol} onChange={(e)=>setFormConfig({...formConfig, symbol: e.target.value})} className={inputClass}>{COIN_PAIRS.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                                <div><label className={labelClass}>Initial Capital</label><input type="number" value={formConfig.capitalAllocation} onChange={(e)=>setFormConfig({...formConfig, capitalAllocation: e.target.value})} className={inputClass}/></div>
                                <button onClick={() => setShowPreFlight(true)} className="w-full py-5 bg-emerald-500 text-black rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-emerald-400 transition-all shadow-xl">Initiate Engine</button>
                            </div>
                        </div>
                    )}

                    <div className={`${isBotRunning ? 'col-span-12' : 'col-span-12 lg:col-span-9'} space-y-8`}>
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                            <MetricCard label="Engine Status" value={isBotRunning ? 'OPERATIONAL' : 'STANDBY'} color={isBotRunning ? 'text-emerald-400' : 'text-zinc-600'} />
                            <MetricCard label="Floating PnL" value={`$${socketStatus.unrealizedPnl.toFixed(2)}`} color={socketStatus.unrealizedPnl >= 0 ? 'text-emerald-400' : 'text-rose-500'} />
                            <MetricCard label="Total Equity" value={`$${Number(activeBalance).toLocaleString()}`} />
                        </div>
                        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[700px] flex-1">
                             <div className="lg:col-span-3 bg-zinc-900 border border-zinc-800 rounded-[40px] overflow-hidden flex flex-col relative shadow-2xl">
                                <div className="p-6 border-b border-zinc-800 flex justify-between bg-zinc-800/10">
                                    <span className="text-[11px] font-black uppercase tracking-widest">{formConfig.symbol} Feed</span>
                                    <div className="flex items-center gap-2"><div className={`w-1.5 h-1.5 rounded-full ${socketConnected ? 'bg-emerald-500' : 'bg-rose-500 animate-pulse'}`}></div><span className="text-[9px] font-black uppercase">{socketConnected ? 'Neural Sync' : 'Link Dead'}</span></div>
                                </div>
                                <div className="flex-1 bg-black/40">
                                    <LiveTradingChart symbol={formConfig.symbol} candleData={socketStatus.candles} tradeMarkers={socketStatus.tradeMarkers} activePositions={socketStatus.positions} />
                                </div>
                            </div>
                            <div className="lg:col-span-1 bg-zinc-900 border border-zinc-800 rounded-[40px] flex flex-col overflow-hidden shadow-2xl">
                                <div className="p-5 border-b border-zinc-800 bg-zinc-800/20 flex justify-between items-center">
                                    <div className="flex items-center gap-2 text-violet-400"><Cpu size={16}/><h3 className="text-[10px] font-black uppercase tracking-widest">Neural Flow</h3></div>
                                    <button onClick={() => setSocketLogs([])} className="text-zinc-600 hover:text-white transition-all"><Eraser size={14} /></button>
                                </div>
                                <div className="flex-1 overflow-y-auto p-6 font-mono text-[10px] space-y-3 bg-black/20 custom-scrollbar">
                                    {socketLogs.map((log, i) => (
                                        <div key={i} className={`p-3 rounded-xl border ${getLogStyle(parseLog(log.message || log))}`}>
                                            <span className="text-[8px] block opacity-50 mb-1">{formatTime(log.time)}</span>
                                            {parseLog(log.message || log)}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </UIModeProvider>
    );
};

// --- CHILD COMPONENTS ---
const MetricCard = ({ label, value, subValue, color = "text-white", icon = null }) => (
    <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl relative overflow-hidden shadow-xl">
        <p className="text-[9px] text-zinc-500 uppercase font-black tracking-[0.15em] mb-2">{label}</p>
        <div className="flex flex-col gap-1">
            <div className="flex items-center gap-1.5">{icon && <span className={color}>{icon}</span>}<p className={`text-lg font-mono font-black tracking-tighter ${color}`}>{value}</p></div>
            {subValue && <p className="text-[9px] font-black text-zinc-600 uppercase tracking-wide">{subValue}</p>}
        </div>
    </div>
);

const PreFlightModal = ({ config, onConfirm, onCancel, isStarting, address }) => {
    const allPassed = !!address && Number(config.capitalAllocation) >= 100;
    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/95 backdrop-blur-xl p-4">
            <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-3xl p-8 shadow-2xl">
                <h3 className="text-xl font-black text-white mb-8 flex items-center gap-2 uppercase tracking-tighter"><span className="text-emerald-500">🚀</span> Pre-Flight Check</h3>
                <div className="space-y-3 mb-10">
                    <CheckItem label="Wallet Link" status={!!address} />
                    <CheckItem label="Liquidity Check" status={Number(config.capitalAllocation) >= 100} />
                    <CheckItem label="Strategy Load" status={config.strategies?.length > 0} />
                </div>
                <div className="flex gap-4">
                    <button onClick={onCancel} className="flex-1 py-4 border border-zinc-800 rounded-2xl text-zinc-500 font-black uppercase text-[10px]">Abort</button>
                    <button onClick={onConfirm} disabled={!allPassed || isStarting} className={`flex-2 py-4 rounded-2xl font-black uppercase text-[10px] transition-all ${allPassed ? 'bg-emerald-500 text-black hover:bg-emerald-400' : 'bg-zinc-800 text-zinc-600'}`}>{isStarting ? 'Igniting...' : 'Execute Launch'}</button>
                </div>
            </div>
        </div>
    );
};

const CheckItem = ({ label, status }) => (
    <div className="flex items-center justify-between p-4 bg-black/40 rounded-xl border border-zinc-800">
        <span className="text-[10px] text-zinc-400 font-bold uppercase">{label}</span>
        {status ? <span className="text-emerald-500 text-[9px] font-black tracking-widest">✔ READY</span> : <span className="text-rose-500 text-[9px] font-black tracking-widest">MISSING</span>}
    </div>
);

export default TradingBotContainer;
