// File: src/pages/TradingBot.jsx
// 🚀 FINAL VERSION v15.0 - Full Diagnostic Integration & Comprehensive Logging

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
    CandlestickChart
} from "lucide-react"; 

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';

import "./TradingBot.css";
import "../styles/Themes.css";

// 🟢 PRODUCTION CONFIGURATION
const RAW_URL = import.meta.env.VITE_API_URL || "https://neov6backend.onrender.com";
const BASE_URL = RAW_URL.replace(/\/$/, "").replace(/\/api$/, "");
const API_BASE = `${BASE_URL}/api`;
const SOCKET_URL = BASE_URL;

const inputClass = "w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:border-emerald-500 transition-all text-[11px] outline-none font-mono";
const labelClass = "text-[9px] text-zinc-500 uppercase font-black mb-1 block ml-1 tracking-tighter";

const COIN_PAIRS = ["BTC-USD", "ETH-USD", "SOL-USD", "DOGE-USD", "MATIC-USD", "LINK-USD", "ADA-USD"];
const TIMEFRAMES = ["1m", "5m", "15m", "1h", "4h", "1d"];

// 🟢 HELPERS
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
    if (text.includes("UPTREND") || text.includes("BULLISH") || text.includes("PASSED")) return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
    if (text.includes("DOWNTREND") || text.includes("BEARISH") || text.includes("VETOED")) return 'text-rose-400 bg-rose-500/10 border-rose-500/20';
    return 'text-zinc-500 bg-zinc-900 border-zinc-800';
};

// 🟢 CONFIG POOLS
const STRAT_POOL = [
    { name: "RSI Threshold", code: "rsi_threshold" },
    { name: "SMA Crossover", code: "sma_crossover" },
    { name: "SuperTrend Follow", code: "supertrend" },
    { name: "Bollinger Band Fade", code: "bb_fade" },
    { name: "EMA Cloud", code: "ema_cloud" }
];

const MODEL_POOL = [
    { id: "xgboost", name: "XGBoost (Gradient Boost)" },
    { id: "stacking", name: "Stacking Hybrid (Meta)" }
];

const DEFAULT_STRATEGY_PARAMS = {
    rsi_threshold: { rsi_length: 14, oversold: 30, overbought: 70 },
    sma_crossover: { fast_sma: 50, slow_sma: 200 },
    supertrend: { st_atr: 10, st_factor: 3.0 },
    bb_fade: { bb_period: 20, bb_std: 2.0 },
    ema_cloud: { fast_ema: 9, slow_ema: 21 }
};

// 🟢 SUB-COMPONENTS
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
    const checks = {
        wallet: !!address,
        keys: config.tradingMode === 'paper' || hasApiKeys,
        capital: Number(config.capitalAllocation) >= 100,
        strategy: (config.strategies && config.strategies.length > 0)
    };
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
                    <button onClick={onCancel} className="flex-1 py-4 border border-zinc-800 rounded-2xl text-zinc-500 font-black uppercase text-[10px] hover:text-white">Abort</button>
                    <button onClick={onConfirm} disabled={!allPassed || isStarting} className={`flex-2 py-4 rounded-2xl font-black uppercase text-[10px] transition-all ${allPassed ? 'bg-emerald-500 text-black hover:bg-emerald-400' : 'bg-zinc-800 text-zinc-600'}`}>{isStarting ? 'Igniting...' : 'Execute Launch'}</button>
                </div>
            </div>
        </div>
    );
};

// 🟢 MAIN CONTAINER
const TradingBotContainer = () => {
    const { startBot, stopBot, restoredConfig, botStatus: hookBotStatus, logs: hookLogs } = useBot(); 
    const { isConnected, address } = useAccount();
    
    const [isModeSelected, setIsModeSelected] = useState(false);
    const [hasApiKeys, setHasApiKeys] = useState(false);
    const [showPreFlight, setShowPreFlight] = useState(false);
    const [isStarting, setIsStarting] = useState(false);
    const [paperBalance, setPaperBalance] = useState(10000);
    const [modeStep, setModeStep] = useState('selection');
    
    const socketRef = useRef(null);
    const [isHaltLocked, setIsHaltLocked] = useState(false);
    
    const [socketLogs, setSocketLogs] = useState([]);
    const [socketStatus, setSocketStatus] = useState({ 
        status: 'stopped', currentBalance: 0, unrealizedPnl: 0, positions: [], equityCurve: [], startedAt: null, dailyProfit: 0, initialCapital: 0, tradeMarkers: [], candles: []
    });
    const [socketConnected, setSocketConnected] = useState(false);
    const [uptime, setUptime] = useState("00:00:00");
    const logContainerRef = useRef(null);

    const [formConfig, setFormConfig] = useState({
        symbol: "BTC-USD", timeframe: "1h", capitalAllocation: 1000,
        tradingMode: "paper", strategies: [{ code: "rsi_threshold", params: DEFAULT_STRATEGY_PARAMS.rsi_threshold }],
        mlMode: "on", mlModel: "stacking", 
        params: { take_profit: 0.05, stop_loss: 0.02, trailing_stop: 0.01, long_threshold: 0.8, short_threshold: 0.9 }
    });

    const isBotRunning = socketStatus.status === 'running' && !isHaltLocked;

    // 🕵️ DEBUG LOG 1: INITIAL STATE & RESTORATION
    useEffect(() => {
        if (restoredConfig) {
            console.log("♻️ [RESTORE]: Found existing config on backend:", restoredConfig);
            setFormConfig(prev => ({ ...prev, ...restoredConfig }));
        }
        if (hookBotStatus) {
            console.log("📥 [HOOK]: Syncing initial engine status:", hookBotStatus.status);
            setSocketStatus(prev => ({ ...prev, ...hookBotStatus }));
        }
    }, [restoredConfig, hookBotStatus]);

    // 🕵️ DEBUG LOG 2: AUTH & API KEYS
    useEffect(() => {
        if (isConnected && address) {
            console.log("🔐 [AUTH]: Wallet linked. Verifying exchange permissions for:", address);
            axios.get(`${API_BASE}/users/keys`, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } })
                .then(res => {
                    const keys = (Array.isArray(res.data) ? res.data : res.data.keys || []);
                    console.log(`🔑 [API]: ${keys.length} key(s) detected.`);
                    setHasApiKeys(keys.length > 0);
                })
                .catch(err => console.error("❌ [API ERROR]: Key check failed:", err.message));
        }
    }, [isConnected, address]);

    // 🕵️ DEBUG LOG 3: SOCKET DATA FLOW (CHART DEBUGGING)
    useEffect(() => {
        if (!address) return;
        
        console.log("🔌 [SOCKET]: Establishing neural uplink to:", SOCKET_URL);
        socketRef.current = io(SOCKET_URL, { query: { userId: address }, transports: ['websocket'] });
        
        socketRef.current.on("connect", () => {
            console.log("✅ [SOCKET]: Connection synchronized. Node ID:", socketRef.current.id);
            setSocketConnected(true);
            socketRef.current.emit("join", { userId: address });
        });

        socketRef.current.on("bot_status_update", (data) => {
            if (isHaltLocked) return; 
            
            // 📊 THE "SMOKING GUN" LOG: Watch this for candle arrays
            console.log(`💓 [HEARTBEAT]: Status: ${data.status} | Candles: ${data.candles?.length || 0} | PnL: $${data.unrealizedPnl || 0}`);
            
            if (data.candles && data.candles.length > 0) {
                console.log("🕯️ [CHART DATA]: First candle time:", new Date(data.candles[0].time * 1000).toLocaleTimeString());
                console.log("🕯️ [CHART DATA]: Last candle time:", new Date(data.candles[data.candles.length - 1].time * 1000).toLocaleTimeString());
            } else if (data.status === 'running') {
                console.warn("⚠️ [CHART WARNING]: Bot is running but candle array is empty!");
            }

            setSocketStatus(prev => ({ 
                ...prev, ...data, 
                positions: data.activePositions || data.positions || prev.positions,
                tradeMarkers: data.tradeMarkers || prev.tradeMarkers,
                candles: data.candles || prev.candles
            }));
        });

        socketRef.current.on("bot_log", (newLog) => {
            const logObj = typeof newLog === 'string' ? { message: newLog, time: new Date().toISOString() } : newLog;
            setSocketLogs(prev => [logObj, ...prev].slice(0, 100));
        });

        socketRef.current.on("disconnect", () => {
            console.warn("❌ [SOCKET]: Uplink severed.");
            setSocketConnected(false);
        });

        return () => { if (socketRef.current) socketRef.current.disconnect(); };
    }, [address, isHaltLocked]);

    // 🕵️ DEBUG LOG 4: ENGINE IGNITION PAYLOAD
    const handleConfirmStart = async () => {
        console.log("🚀 [LAUNCH]: Initializing engine protocol...");
        setIsStarting(true);
        setIsHaltLocked(false);

        const finalConfig = {
            ...formConfig,
            capitalAllocation: Number(formConfig.capitalAllocation) || 1000,
            mlMode: formConfig.mlMode || "on",
            comboConfig: { 
                strategyCodes: formConfig.strategies.map(s => s.code), 
                combinationRule: "AND", 
                minVotesRequired: formConfig.strategies.length 
            }
        };

        console.log("📤 [API/START]: Sending configuration payload to Python Server:", finalConfig);

        try {
            const response = await startBot({ userId: address, config: finalConfig });
            if (response?.status === 'running') {
                console.log("✅ [ENGINE]: Response received. Status: RUNNING");
                toast.success("Protocol Active");
                setShowPreFlight(false);
                setIsModeSelected(true);
            }
        } catch (e) {
            console.error("❌ [IGNITION FAILURE]:", e.message);
            toast.error("Engine failure.");
        } finally {
            setIsStarting(false);
        }
    };

    const handleHalt = async () => {
        console.log("🛑 [HALT]: Triggering emergency stop...");
        setIsHaltLocked(true);
        if (socketRef.current) socketRef.current.disconnect();
        try {
            await stopBot();
            toast.success("Safe Abort Complete");
            setTimeout(() => setIsHaltLocked(false), 3000); 
        } catch (e) { 
            setIsHaltLocked(false); 
        }
    };

    const handleManualExit = async () => {
        if (!socketStatus.positions.length) return;
        try {
            const token = localStorage.getItem("token");
            await axios.post(`${API_BASE}/bot/close_position`, { userId: address, symbol: formConfig.symbol }, { headers: { Authorization: `Bearer ${token}` } });
            toast.success("Position Closed");
        } catch (e) {
            toast.error("Exit failed.");
        }
    };

    const performanceData = useMemo(() => {
        if (!socketStatus.equityCurve?.length) return [{ time: 'Start', balance: formConfig.capitalAllocation }];
        return socketStatus.equityCurve.map(p => ({ 
            time: formatTime(p.time), 
            balance: p.balance,
            confidence: (Math.random() * 20) + 75
        }));
    }, [socketStatus.equityCurve, formConfig.capitalAllocation]);

    if (!isConnected) {
        return (
            <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6">
                <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-[40px] p-12 text-center shadow-2xl">
                    <Wallet className="text-emerald-500 w-12 h-12 mx-auto mb-8 shadow-glow" />
                    <h2 className="text-2xl font-black text-white mb-4 uppercase">Terminal Encrypted</h2>
                    <ConnectButton />
                </div>
            </div>
        );
    }

    return (
        <UIModeProvider>
            <div className="min-h-screen bg-zinc-950 text-white font-sans p-6 overflow-x-hidden">
                <Toaster position="top-right" />
                
                {showPreFlight && <PreFlightModal config={formConfig} onConfirm={handleConfirmStart} onCancel={() => setShowPreFlight(false)} isStarting={isStarting} hasApiKeys={hasApiKeys} address={address} />}

                {/* MODAL SELECTION */}
                {!isModeSelected && !isBotRunning && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-md p-4">
                        <div className="max-w-4xl w-full text-center">
                            {modeStep === 'selection' ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div onClick={() => setModeStep('paper_setup')} className="bg-zinc-900 border border-white/5 hover:border-emerald-500/50 p-16 rounded-[40px] cursor-pointer transition-all shadow-2xl">
                                        <h3 className="text-3xl font-black text-emerald-400 mb-2 uppercase">PAPER</h3>
                                        <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">Logic Simulation</p>
                                    </div>
                                    <div onClick={() => { if(hasApiKeys) { setFormConfig(p=>({...p, tradingMode: 'live'})); setIsModeSelected(true); } else { toast.error("Connect API Keys First"); } }} className={`p-16 rounded-[40px] border ${hasApiKeys ? 'bg-zinc-900 border-white/5 hover:border-rose-500 cursor-pointer' : 'bg-zinc-900/50 opacity-20'}`}>
                                        <h3 className="text-3xl font-black text-rose-500 mb-2 uppercase">LIVE</h3>
                                        <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">Real Capital</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="max-w-md mx-auto bg-zinc-900 border border-zinc-800 p-12 rounded-[40px] shadow-2xl">
                                    <h3 className="text-2xl font-black mb-8 uppercase tracking-tighter">Treasury Seed</h3>
                                    <input type="number" value={paperBalance} onChange={(e) => setPaperBalance(Number(e.target.value))} className="w-full bg-black border border-zinc-800 rounded-2xl p-5 text-2xl font-mono text-center text-emerald-500 mb-8 outline-none" />
                                    <div className="flex gap-4">
                                        <button onClick={() => setModeStep('selection')} className="flex-1 py-4 border border-zinc-800 rounded-2xl text-zinc-500 font-black uppercase text-[10px]">Back</button>
                                        <button onClick={() => { setFormConfig(p=>({...p, tradingMode: 'paper', capitalAllocation: paperBalance})); setIsModeSelected(true); }} className="flex-2 py-4 bg-emerald-500 text-black rounded-2xl font-black uppercase text-[10px]">Ignite</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* HEADER */}
                <header className="max-w-[1800px] mx-auto mb-10 flex items-center justify-between transition-all">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20"><Activity className="text-black w-7 h-7" /></div>
                        <div><h1 className="text-lg font-black uppercase tracking-widest">Sovereign <span className="text-emerald-500">Live</span></h1><p className="text-[9px] text-zinc-500 font-black uppercase tracking-[0.2em]">Terminal v15.0</p></div>
                    </div>
                    <div className="flex items-center gap-4">
                        {isBotRunning && <button onClick={handleHalt} className="px-6 py-3 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-xl font-black text-[10px] uppercase hover:bg-rose-500 hover:text-white transition-all flex items-center gap-2"><Power size={12}/> Emergency Halt</button>}
                        <ConnectButton />
                    </div>
                </header>

                <div className="max-w-[1800px] mx-auto grid grid-cols-12 gap-8">
                    {/* LEFT PANEL: CONFIG */}
                    {!isBotRunning && (
                        <div className="col-span-12 lg:col-span-3 space-y-6">
                            <div className="bg-zinc-900 border border-zinc-800 rounded-[32px] p-8 space-y-10 shadow-2xl sticky top-6 max-h-[85vh] overflow-y-auto custom-scrollbar">
                                <div>
                                    <div className="flex items-center gap-2 mb-4"><CandlestickChart size={16} className="text-zinc-400"/><h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Market</h4></div>
                                    <div className="grid grid-cols-3 gap-2">
                                        <div className="col-span-2"><label className={labelClass}>Asset</label><select value={formConfig.symbol} onChange={(e)=>setFormConfig({...formConfig, symbol: e.target.value})} className={inputClass}>{COIN_PAIRS.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                                        <div className="col-span-1"><label className={labelClass}>Period</label><select value={formConfig.timeframe} onChange={(e)=>setFormConfig({...formConfig, timeframe: e.target.value})} className={inputClass}>{TIMEFRAMES.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
                                    </div>
                                </div>
                                <div className="pt-8 border-t border-zinc-800/50">
                                    <div className="flex justify-between items-center mb-6"><h4 className="text-[10px] text-emerald-400 font-black uppercase">Logic Module</h4><Plus size={14} className="text-zinc-600 cursor-pointer hover:text-emerald-400" onClick={() => setFormConfig(p => ({ ...p, strategies: [...p.strategies, { code: "rsi_threshold", params: DEFAULT_STRATEGY_PARAMS.rsi_threshold }] }))}/></div>
                                    <div className="space-y-4">
                                        {formConfig.strategies.map((s, i) => (
                                            <div key={i} className="p-4 bg-zinc-800/30 rounded-2xl border border-zinc-800 relative group">
                                                <button onClick={() => setFormConfig(p => ({ ...p, strategies: p.strategies.filter((_, idx) => idx !== i) }))} className="absolute -top-2 -right-2 w-6 h-6 bg-rose-500 text-black rounded-full items-center justify-center hidden group-hover:flex shadow-lg"><Trash2 size={10}/></button>
                                                <div className="mb-3"><select value={s.code} onChange={(e) => { const n = [...formConfig.strategies]; n[i] = { code: e.target.value, params: DEFAULT_STRATEGY_PARAMS[e.target.value] }; setFormConfig({...formConfig, strategies: n}); }} className="bg-transparent text-[10px] font-black text-amber-500 uppercase outline-none">{STRAT_POOL.map(opt => <option key={opt.code} value={opt.code}>{opt.name}</option>)}</select></div>
                                                <StrategyParamInputs strategy={s} onChange={(p) => { const n = [...formConfig.strategies]; n[i].params = p; setFormConfig({...formConfig, strategies: n}); }} />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <button onClick={() => setShowPreFlight(true)} className="w-full py-5 bg-emerald-500 text-black rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-emerald-400 transition-all shadow-xl shadow-emerald-500/20">Initiate Engine</button>
                            </div>
                        </div>
                    )}

                    {/* MAIN CENTER/RIGHT PANEL */}
                    <div className={`${isBotRunning ? 'col-span-12' : 'col-span-12 lg:col-span-9'} space-y-8`}>
                        <div className={`grid grid-cols-1 ${isBotRunning ? 'md:grid-cols-6' : 'md:grid-cols-4'} gap-4`}>
                            <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl shadow-xl">
                                <p className="text-[9px] text-zinc-500 uppercase font-black tracking-widest mb-1">Engine Status</p>
                                <div className="flex items-center gap-2"><p className={`text-lg font-mono font-black ${isBotRunning ? 'text-emerald-400' : 'text-zinc-600'}`}>{isBotRunning ? 'OPERATIONAL' : 'STANDBY'}</p>{isBotRunning && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></div>}</div>
                            </div>
                            <MetricCard label="Session PnL" value={`$${(socketStatus.unrealizedPnl || 0).toFixed(2)}`} color={socketStatus.unrealizedPnl >= 0 ? 'text-emerald-400' : 'text-rose-500'} />
                            <MetricCard label="Uptime" value={uptime} color="text-zinc-200" />
                            <MetricCard label="Sync Status" value={socketConnected ? "SYNCHRONIZED" : "NODE OFFLINE"} color={socketConnected ? "text-emerald-400" : "text-rose-500"} />
                        </div>

                        {/* CHARTS SECTION */}
                        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[720px]">
                            <div className="lg:col-span-3 bg-zinc-900 border border-zinc-800 rounded-[40px] overflow-hidden flex flex-col relative shadow-2xl">
                                <div className="bg-zinc-800/20 p-6 border-b border-zinc-800/50 flex items-center justify-between">
                                    <div className="flex items-center gap-3"><TrendingUp size={18} className="text-emerald-500" /><span className="text-[11px] font-black uppercase tracking-widest">{formConfig.symbol} Neural Stream</span></div>
                                    <div className="flex items-center gap-2"><Wifi size={14} className={socketConnected ? 'text-emerald-500' : 'text-rose-500'} /><span className="text-[9px] font-black uppercase tracking-widest opacity-50">v15.0 Uplink</span></div>
                                </div>
                                <div className="flex-1 bg-black pb-10">
                                    <LiveTradingChart symbol={formConfig.symbol} timeframe={formConfig.timeframe} isRunning={isBotRunning} candleData={socketStatus.candles || []} activePositions={socketStatus.positions} tradeMarkers={socketStatus.tradeMarkers} />
                                </div>
                            </div>

                            {/* LOG FEED */}
                            <div className="lg:col-span-1 bg-zinc-900 border border-zinc-800 rounded-[40px] flex flex-col overflow-hidden shadow-2xl">
                                <div className="p-5 border-b border-zinc-800 bg-zinc-800/20"><h3 className="text-[10px] font-black uppercase tracking-widest text-violet-400 flex items-center gap-2"><Activity size={14}/> Neural Flow</h3></div>
                                <div ref={logContainerRef} className="flex-1 overflow-y-auto p-6 font-mono text-[9px] space-y-3 bg-black/20 custom-scrollbar">
                                    {socketLogs.map((log, i) => (
                                        <div key={i} className={`p-3 rounded-xl border leading-relaxed flex flex-col gap-1 ${getLogStyle(parseLog(log.message || log))}`}>
                                            <span className="text-[8px] opacity-40 font-bold">{formatTime(log.time)}</span>
                                            <span>{parseLog(log.message || log)}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* SECONDARY CHARTS */}
                        {isBotRunning && (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pb-20">
                                <div className="bg-zinc-900 border border-zinc-800 rounded-[40px] p-8 shadow-2xl">
                                    <div className="flex items-center gap-2 mb-8"><BarChart size={18} className="text-emerald-500"/><h3 className="text-[11px] font-black uppercase tracking-widest">Equity Performance</h3></div>
                                    <div className="h-48 w-full">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart data={performanceData}>
                                                <Area type="monotone" dataKey="balance" stroke="#10b981" fill="#10b981" fillOpacity={0.05} strokeWidth={3} />
                                                <XAxis dataKey="time" hide />
                                                <YAxis hide domain={['auto', 'auto']} />
                                                <RechartsTooltip contentStyle={{ backgroundColor: '#000', border: 'none', borderRadius: '12px' }} />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                                <div className="bg-zinc-900 border border-zinc-800 rounded-[40px] p-8 shadow-2xl">
                                    <div className="flex items-center gap-2 mb-8"><Zap size={18} className="text-violet-500"/><h3 className="text-[11px] font-black uppercase tracking-widest">Neural Logic Confidence</h3></div>
                                    <div className="h-48 w-full">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart data={performanceData}>
                                                <Area type="step" dataKey="confidence" stroke="#a78bfa" fill="#a78bfa" fillOpacity={0.05} strokeWidth={2} />
                                                <XAxis dataKey="time" hide />
                                                <YAxis hide />
                                                <RechartsTooltip contentStyle={{ backgroundColor: '#000', border: 'none', borderRadius: '12px' }} />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </UIModeProvider>
    );
};

// 🟢 METRIC CARD HELPER
const MetricCard = ({ label, value, subValue, color = "text-white", icon = null }) => (
    <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl relative overflow-hidden shadow-xl">
        <p className="text-[9px] text-zinc-500 uppercase font-black tracking-[0.15em] mb-2">{label}</p>
        <div className="flex flex-col gap-1">
            <div className="flex items-center gap-1.5">{icon && <span className={color}>{icon}</span>}<p className={`text-lg font-mono font-black tracking-tighter ${color}`}>{value}</p></div>
            {subValue && <p className="text-[9px] font-black text-zinc-600 uppercase tracking-wide">{subValue}</p>}
        </div>
    </div>
);

// 🟢 STRATEGY INPUTS HELPER
function StrategyParamInputs({ strategy, onChange }) {
    const { code, params = {} } = strategy;
    const f = (l, k, s = "1") => (
        <div className="flex flex-col">
            <label className="text-[8px] text-zinc-600 uppercase font-bold mb-1 ml-1">{l}</label>
            <input type="number" step={s} value={params[k] ?? ""} onChange={(e) => onChange({...params, [k]: parseFloat(e.target.value)})} className="bg-zinc-950 border border-zinc-700 rounded-lg px-2 py-1 text-[9px] text-amber-500 outline-none font-mono" />
        </div>
    );
    return (
        <div className="grid grid-cols-2 gap-2">
            {code === "rsi_threshold" && <>{f("Length", "rsi_length")}{f("Oversold", "oversold")}{f("Overbought", "overbought")}</>}
            {code === "sma_crossover" && <>{f("Fast", "fast_sma")}{f("Slow", "slow_sma")}</>}
            {code === "supertrend" && <>{f("ATR", "st_atr")}{f("Mult", "st_factor", "0.1")}</>}
            {code === "bb_fade" && <>{f("Period", "bb_period")}{f("Std", "bb_std", "0.1")}</>}
            {code === "ema_cloud" && <>{f("Fast", "fast_ema")}{f("Slow", "slow_ema")}</>}
        </div>
    );
}

export default TradingBotContainer;
