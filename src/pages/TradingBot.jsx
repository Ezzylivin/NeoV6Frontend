// File: src/pages/TradingBot.jsx
// 🚀 UPGRADE: v14.0 - Diagnostic Edition (Full Data Logging & Sync Verification)

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
    const pctMatch = text.match(/(\d+)%/);
    if (pctMatch) {
        const val = parseInt(pctMatch[1]);
        if (val >= 80) return 'text-rose-400 bg-rose-500/10 border-rose-500/20';
        if (val <= 20) return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
        return 'text-zinc-400 bg-zinc-800/30 border-zinc-700';
    }
    if (text.includes("UPTREND") || text.includes("BULLISH") || text.includes("EXPANSION")) return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
    if (text.includes("DOWNTREND") || text.includes("BEARISH") || text.includes("CONTRACTION")) return 'text-rose-400 bg-rose-500/10 border-rose-500/20';
    if (text.includes("PASSED") || text.includes("STALKING LONG")) return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
    if (text.includes("VETOED") || text.includes("STALKING SHORT")) return 'text-rose-400 bg-rose-500/10 border-rose-500/20';
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
        status: 'stopped', currentBalance: 0, unrealizedPnl: 0, exposure: 0, positions: [], equityCurve: [], startedAt: null, dailyProfit: 0, initialCapital: 0, tradeMarkers: []
    });
    const [socketConnected, setSocketConnected] = useState(false);
    const [uptime, setUptime] = useState("00:00:00");
    const logContainerRef = useRef(null);

    const [formConfig, setFormConfig] = useState({
        symbol: "BTC-USD", timeframe: "1h", capitalAllocation: 1000,
        tradingMode: "paper", strategies: [{ code: "rsi_threshold", params: DEFAULT_STRATEGY_PARAMS.rsi_threshold }],
        mlMode: "off", mlModel: "xgboost", mlThreshold: 0.5,
        riskManagementMode: "static", riskPercentage: 1, hybridMode: "AND",
        maxDailyLoss: 5, maxDrawdown: 10, maxTradesPerDay: 20,
        enable_shorting: true, 
        params: { take_profit: 0.05, stop_loss: 0.02, trailing_stop: 0.01, long_threshold: 0.5, short_threshold: 0.5 },
        filters: { trend_filter: "none", vol_min: 0, atr_filter: 0 }
    });

    const isBotRunning = socketStatus.status === 'running' && !isHaltLocked;

    // 🟢 DIAGNOSTIC LOG 1: COMPONENT STATE RESTORE
    useEffect(() => {
        if (restoredConfig) {
            console.log("♻️ [RESTORE]: Applying Config from Backend:", restoredConfig);
            setFormConfig(prev => ({ ...prev, ...restoredConfig }));
        }
    }, [restoredConfig]);

    useEffect(() => {
        if (hookBotStatus) {
            console.log("📥 [STATUS SYNC]: Updating Hook Status:", hookBotStatus);
            setSocketStatus(prev => ({ ...prev, ...hookBotStatus }));
        }
        if (hookLogs.length > 0) {
            setSocketLogs(hookLogs);
        }
    }, [hookBotStatus, hookLogs]);

    const activeBalance = useMemo(() => {
        const bal = socketStatus.currentBalance || socketStatus.initialCapital || formConfig.capitalAllocation;
        return bal;
    }, [isBotRunning, socketStatus.currentBalance, socketStatus.initialCapital, formConfig.capitalAllocation]);

    useEffect(() => {
        if (isConnected) {
            console.log("🔐 [AUTH]: Checking API keys for address:", address);
            axios.get(`${API_BASE}/users/keys`, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } })
                .then(res => setHasApiKeys((Array.isArray(res.data) ? res.data : res.data.keys || []).length > 0))
                .catch(() => setHasApiKeys(false));
        }
    }, [isConnected, address]);

    // 🟢 DIAGNOSTIC LOG 2: SOCKET LIFECYCLE
    useEffect(() => {
        if (!address) return;
        
        console.log("🔌 [SOCKET]: Attempting connection to:", SOCKET_URL);
        socketRef.current = io(SOCKET_URL, { query: { userId: address }, transports: ['websocket'] });
        
        socketRef.current.on("connect", () => {
            console.log("✅ [SOCKET]: Connected. SID:", socketRef.current.id);
            setSocketConnected(true);
            socketRef.current.emit("join", { userId: address });
        });

        socketRef.current.on("disconnect", () => {
            console.warn("❌ [SOCKET]: Disconnected from server.");
            setSocketConnected(false);
        });

        socketRef.current.on("bot_status_update", (data) => {
            if (isHaltLocked) return; 
            // 🟢 CRITICAL LOG: Visualizes the exact data payload for the chart
            console.log(`📊 [PAYLOAD]: Status: ${data.status} | Candles: ${data.candles?.length || 0} | Positions: ${data.positions?.length || 0}`);
            
            setSocketStatus(prev => ({ 
                ...prev, ...data, 
                positions: data.activePositions || data.positions || prev.positions,
                tradeMarkers: data.tradeMarkers || prev.tradeMarkers,
                startedAt: data.startedAt || prev.startedAt,
                initialCapital: data.initialCapital || prev.initialCapital
            }));
        });

        socketRef.current.on("bot_log", (newLog) => {
            const logObj = typeof newLog === 'string' ? { message: newLog, time: new Date().toISOString() } : newLog;
            setSocketLogs(prev => [logObj, ...prev].slice(0, 100));
        });

        return () => { if (socketRef.current) socketRef.current.disconnect(); };
    }, [address, isHaltLocked]);

    const performanceData = useMemo(() => {
        if (!socketStatus.equityCurve?.length) return [{ time: 'Start', balance: formConfig.capitalAllocation }];
        const mapped = socketStatus.equityCurve.map(p => ({ 
            time: new Date(p.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), 
            balance: p.balance,
            confidence: p.confidence || 50
        }));
        return mapped;
    }, [socketStatus.equityCurve, formConfig.capitalAllocation]);

    // 🟢 DIAGNOSTIC LOG 3: ENGINE IGNITION
    const handleConfirmStart = async () => {
        console.log("🚀 [IGNITION]: Preparing Final Config...");
        setIsStarting(true);
        setIsHaltLocked(false);

        const finalConfig = {
            ...formConfig,
            capitalAllocation: Number(formConfig.capitalAllocation) || Number(paperBalance) || 1000,
            mlMode: formConfig.mlMode || "on", 
            mlModel: formConfig.mlModel || "stacking", 
            mlThresholdLong: parseFloat(formConfig.params.long_threshold) || 0.8,
            mlThresholdShort: parseFloat(formConfig.params.short_threshold) || 0.9,
            enable_shorting: formConfig.enable_shorting === true,
            comboConfig: { 
                strategyCodes: formConfig.strategies.map(s => s.code), 
                combinationRule: formConfig.hybridMode || "AND", 
                minVotesRequired: formConfig.hybridMode === "AND" ? formConfig.strategies.length : 1
            }
        };

        console.log("📤 [API/START]: Sending Payload:", finalConfig);

        try {
            const response = await startBot({ userId: address, config: finalConfig });
            if (response && response.status === 'running') {
                console.log("✅ [ENGINE]: Start response confirmed 'running'");
                toast.success(`Protocol Ignited: ${finalConfig.symbol}`);
                setShowPreFlight(false);
            }
        } catch (e) {
            console.error("❌ [ENGINE ERROR]: Start call failed:", e);
            toast.error(`Engine Failure: ${e.response?.data?.detail || e.message}`);
        } finally {
            setIsStarting(false);
        }
    };

    const handleHalt = async () => {
        console.log("🛑 [HALT]: Initiating Emergency Stop...");
        setIsHaltLocked(true);
        if (socketRef.current) socketRef.current.disconnect();
        try {
            await stopBot();
            toast.success("Safe Abort: Terminal Memory Purged");
            setTimeout(() => setIsHaltLocked(false), 3000); 
        } catch (e) { 
            toast.error("Halt Command Failed"); 
            setIsHaltLocked(false); 
        }
    };

    const handleManualExit = async () => {
        if (!socketStatus.positions.length) return;
        try {
            const token = localStorage.getItem("token");
            await axios.post(`${API_BASE}/bot/close_position`, { userId: address, symbol: formConfig.symbol }, { headers: { Authorization: `Bearer ${token}` } });
            toast.success("Position Forced Closed");
        } catch (e) {
            toast.error("Exit Failed: " + (e.response?.data?.detail || e.message));
        }
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
            <div className="min-h-screen bg-zinc-950 text-white font-sans p-6 overflow-x-hidden">
                <Toaster position="top-right" />
                
                {!isModeSelected && !isBotRunning && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-md">
                        <div className="max-w-4xl w-full p-6 text-center">
                            {modeStep === 'selection' ? (
                                <>
                                    <h1 className="text-4xl font-black text-white mb-10 tracking-tighter uppercase">Protocol Selection</h1>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div onClick={() => setModeStep('paper_setup')} className="group cursor-pointer bg-zinc-900 border border-white/5 hover:border-emerald-500/50 p-16 rounded-[40px] transition-all shadow-2xl"><h3 className="text-3xl font-black text-emerald-400 mb-3 uppercase">PAPER</h3><p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">Logic Simulation</p></div>
                                        <div onClick={() => { if(hasApiKeys) { setFormConfig(p=>({...p, tradingMode: 'live'})); setIsModeSelected(true); } else { toast.error("Connect API Keys First"); } }} className={`p-16 rounded-[40px] border transition-all ${hasApiKeys ? 'cursor-pointer bg-zinc-900 border-white/5 hover:border-red-500 shadow-2xl' : 'bg-zinc-900/50 opacity-20'}`}><h3 className="text-3xl font-black text-red-500 mb-3 uppercase">LIVE</h3><p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">Real Capital Execution</p></div>
                                    </div>
                                </>
                            ) : (
                                <div className="max-w-md mx-auto bg-zinc-900 border border-zinc-800 p-12 rounded-[40px] shadow-2xl">
                                    <h3 className="text-2xl font-black text-white mb-8 uppercase tracking-tighter">Treasury Seed</h3>
                                    <input type="number" value={paperBalance} onChange={(e) => setPaperBalance(Number(e.target.value))} className="w-full bg-black border border-zinc-800 rounded-2xl p-5 text-2xl font-mono text-center text-emerald-500 mb-8 outline-none shadow-inner" />
                                    <div className="flex gap-4"><button onClick={() => setModeStep('selection')} className="flex-1 py-4 border border-zinc-800 rounded-2xl text-zinc-500 font-black uppercase text-[10px]">Back</button><button onClick={() => { setFormConfig(p=>({...p, tradingMode: 'paper', capitalAllocation: paperBalance})); setIsModeSelected(true); }} className="flex-2 py-4 bg-emerald-500 text-black rounded-2xl font-black uppercase text-[10px]">Ignite</button></div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {showPreFlight && <PreFlightModal config={formConfig} onConfirm={handleConfirmStart} onCancel={() => setShowPreFlight(false)} isStarting={isStarting} hasApiKeys={hasApiKeys} address={address} />}

                <header className="max-w-[1800px] mx-auto mb-10 flex items-center justify-between transition-all">
                    <div className="flex items-center gap-3"><div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-lg"><Activity className="text-black w-7 h-7" /></div><div><h1 className="text-lg font-black uppercase tracking-widest">Sovereign <span className="text-emerald-500">Live</span></h1><p className="text-[9px] text-zinc-500 font-black uppercase tracking-[0.2em]">Terminal v14.0</p></div></div>
                    <div className="flex items-center gap-4">
                        {isBotRunning && <button onClick={handleHalt} className="px-6 py-3 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-xl font-black text-[10px] uppercase hover:bg-rose-500 hover:text-white transition-all flex items-center gap-2 shadow-lg shadow-rose-500/10"><Power size={12}/> Emergency Halt</button>}
                        <ConnectButton />
                    </div>
                </header>

                <div className="max-w-[1800px] mx-auto grid grid-cols-12 gap-8">
                    {!isBotRunning && (
                        <div className="col-span-12 lg:col-span-3 space-y-6">
                            <div className="bg-zinc-900 border border-zinc-800 rounded-[32px] p-8 space-y-10 shadow-2xl sticky top-6 max-h-[85vh] overflow-y-auto custom-scrollbar">
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2"><CandlestickChart size={16} className="text-zinc-400" /><h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Market Feed</h4></div>
                                    <div className="grid grid-cols-3 gap-2">
                                        <div className="col-span-2"><label className={labelClass}>Asset</label><select value={formConfig.symbol} onChange={(e)=>setFormConfig({...formConfig, symbol: e.target.value})} className={inputClass}>{COIN_PAIRS.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                                        <div className="col-span-1"><label className={labelClass}>Period</label><select value={formConfig.timeframe} onChange={(e)=>setFormConfig({...formConfig, timeframe: e.target.value})} className={inputClass}>{TIMEFRAMES.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
                                    </div>
                                </div>
                                <button onClick={() => setShowPreFlight(true)} className="w-full py-5 bg-emerald-500 text-black rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-emerald-400 transition-all shadow-xl shadow-emerald-500/20">Initiate Engine</button>
                            </div>
                        </div>
                    )}

                    <div className={`${isBotRunning ? 'col-span-12' : 'col-span-12 lg:col-span-9'} space-y-8`}>
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                            <MetricCard label="Floating PnL" value={`${socketStatus.unrealizedPnl >= 0 ? '+' : ''}${(socketStatus.unrealizedPnl || 0).toFixed(2)}`} subValue={`${pnlPct >= 0 ? '+' : ''}${pnlPct.toFixed(2)}%`} color={socketStatus.unrealizedPnl >= 0 ? 'text-emerald-400' : 'text-rose-500'} icon={<Activity size={10}/>} />
                            <MetricCard label="Total Equity" value={`$${Number(activeBalance).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`} subValue="Liquid + Locked" /> 
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[720px]">
                            <div className="lg:col-span-3 bg-zinc-900 border border-zinc-800 rounded-[40px] overflow-hidden flex flex-col relative shadow-2xl">
                                <div className="flex-1 bg-[#090b0f] pb-8">
                                    <LiveTradingChart symbol={formConfig.symbol} timeframe={formConfig.timeframe} isRunning={isBotRunning} activePositions={socketStatus.positions} tradeMarkers={socketStatus.tradeMarkers} candleData={socketStatus.candles || []} strategies={formConfig.strategies} />
                                </div>
                            </div>
                            <div className="lg:col-span-1 bg-zinc-900 border border-zinc-800 rounded-[40px] flex flex-col overflow-hidden shadow-2xl">
                                <div className="p-5 border-b border-zinc-800 bg-zinc-800/20 flex justify-between items-center">
                                    <div className="flex items-center gap-2 text-violet-400"><Cpu size={16} /><h3 className="text-[10px] font-black uppercase tracking-widest">Neural Flow</h3></div>
                                    {socketConnected ? <Wifi size={14} className="text-emerald-500" /> : <WifiOff size={14} className="text-rose-500" />}
                                </div>
                                <div ref={logContainerRef} className="flex-1 overflow-y-auto p-6 font-mono text-[10px] space-y-3 bg-black/20 custom-scrollbar">
                                    {socketLogs.map((log, i) => (
                                        <div key={i} className={`p-3 rounded-xl border leading-relaxed flex flex-col gap-1 ${getLogStyle(parseLog(log.message || log))}`}>
                                            <span className="text-[9px] opacity-50 font-bold tracking-widest">{formatTime(log.time)}</span>
                                            <span>{parseLog(log.message || log)}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </UIModeProvider>
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
            <div className="flex justify-between items-center mb-1">
                <label className="text-[8px] text-zinc-600 uppercase font-bold ml-1">{l}</label>
            </div>
            <input type="number" step={s} value={params[k] ?? ""} onChange={(e) => onChange({...params, [k]: parseFloat(e.target.value)})} className="bg-zinc-950 border border-zinc-700 rounded-lg px-2 py-1 text-[9px] text-amber-500 outline-none font-mono" />
        </div>
    );
    return (
        <div className="grid grid-cols-2 gap-2">
            {code === "rsi_threshold" && <>{f("Length", "rsi_length", "1")}{f("Oversold", "oversold", "1")}{f("Overbought", "overbought", "1")}</>}
            {code === "sma_crossover" && <>{f("Fast", "fast_sma", "1")}{f("Slow", "slow_sma", "1")}</>}
        </div>
    );
}

export default TradingBotContainer;
