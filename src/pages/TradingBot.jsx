// File: src/pages/TradingBot.jsx
// 🚀 FINAL PRODUCTION v14.2 - Full Sync & Neural Heartbeat Diagnostic

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
    if (text.includes("UPTREND") || text.includes("BULLISH") || text.includes("PASSED")) return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
    if (text.includes("DOWNTREND") || text.includes("BEARISH") || text.includes("VETOED")) return 'text-rose-400 bg-rose-500/10 border-rose-500/20';
    return 'text-zinc-500 bg-zinc-900 border-zinc-800';
};

const STRAT_POOL = [
    { name: "Bollinger Band Fade", code: "bb_fade" },
    { name: "RSI Threshold", code: "rsi_threshold" },
    { name: "SMA Crossover", code: "sma_crossover" },
    { name: "SuperTrend Follow", code: "supertrend" },
    { name: "MACD Crossover", code: "macd_crossover" }
];

const DEFAULT_STRATEGY_PARAMS = {
    rsi_threshold: { rsi_length: 14, oversold: 30, overbought: 70 },
    sma_crossover: { fast_sma: 50, slow_sma: 200 },
    supertrend: { st_atr: 10, st_factor: 3.0 },
    macd_crossover: { fast: 12, slow: 26, signal: 9 },
    bb_fade: { bb_period: 20, bb_std: 2.0 }
};

const CheckItem = ({ label, status }) => (
    <div className="flex items-center justify-between p-4 bg-black/40 rounded-xl border border-zinc-800">
        <span className="text-[10px] text-zinc-400 font-bold uppercase">{label}</span>
        {status ? <span className="text-emerald-500 text-[9px] font-black tracking-widest">✔ READY</span> : <span className="text-rose-500 text-[9px] font-black tracking-widest">MISSING</span>}
    </div>
);

const PreFlightModal = ({ config, onConfirm, onCancel, isStarting, address }) => {
    const allPassed = !!address && Number(config.capitalAllocation) >= 100;
    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/95 backdrop-blur-xl p-4">
            <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-3xl p-8 shadow-2xl">
                <h3 className="text-xl font-black text-white mb-8 uppercase tracking-tighter">🚀 Pre-Flight Audit</h3>
                <div className="space-y-3 mb-10">
                    <CheckItem label="Wallet Link" status={!!address} />
                    <CheckItem label="Liquidity Gate" status={Number(config.capitalAllocation) >= 100} />
                    <CheckItem label="Logic Ensemble" status={config.strategies.length > 0} />
                </div>
                <div className="flex gap-4">
                    <button onClick={onCancel} className="flex-1 py-4 border border-zinc-800 rounded-2xl text-zinc-500 font-black uppercase text-[10px]">Abort</button>
                    <button onClick={onConfirm} disabled={!allPassed || isStarting} className={`flex-2 py-4 rounded-2xl font-black uppercase text-[10px] ${allPassed ? 'bg-emerald-500 text-black' : 'bg-zinc-800 text-zinc-600'}`}>
                        {isStarting ? 'Igniting...' : 'Execute Launch'}
                    </button>
                </div>
            </div>
        </div>
    );
};

const TradingBotContainer = () => {
    const { startBot, stopBot, restoredConfig, botStatus: hookBotStatus, logs: hookLogs } = useBot(); 
    const { isConnected, address } = useAccount();
    
    const [isModeSelected, setIsModeSelected] = useState(false);
    const [showPreFlight, setShowPreFlight] = useState(false);
    const [isStarting, setIsStarting] = useState(false);
    const [paperBalance, setPaperBalance] = useState(10000);
    
    const socketRef = useRef(null);
    const [socketStatus, setSocketStatus] = useState({ 
        status: 'stopped', currentBalance: 0, unrealizedPnl: 0, positions: [], equityCurve: [], startedAt: null, candles: []
    });
    const [socketLogs, setSocketLogs] = useState([]);
    const [socketConnected, setSocketConnected] = useState(false);
    const logContainerRef = useRef(null);

    const [formConfig, setFormConfig] = useState({
        symbol: "BTC-USD", timeframe: "1h", capitalAllocation: 1000,
        tradingMode: "paper", strategies: [{ code: "bb_fade", params: DEFAULT_STRATEGY_PARAMS.bb_fade }],
        mlMode: "on", mlModel: "stacking", 
        params: { take_profit: 0.05, stop_loss: 0.02, long_threshold: 0.8, short_threshold: 0.9 }
    });

    // 🟢 SYNC EFFECT: Apply Restored Config
    useEffect(() => {
        if (restoredConfig) {
            console.log("♻️ [RESTORE]: Configuration sync success.");
            setFormConfig(prev => ({ ...prev, ...restoredConfig }));
        }
    }, [restoredConfig]);

    // 🟢 SOCKET EFFECT: Neural Data Flow
    useEffect(() => {
        if (!address) return;
        
        console.log("🔌 [SOCKET]: Establishing secure link...");
        socketRef.current = io(SOCKET_URL, { query: { userId: address }, transports: ['websocket'] });
        
        socketRef.current.on("connect", () => {
            console.log("✅ [SOCKET]: Node Active. SID:", socketRef.current.id);
            setSocketConnected(true);
            socketRef.current.emit("join", { userId: address });
        });

        socketRef.current.on("bot_status_update", (data) => {
            // 💓 NEURAL HEARTBEAT DIAGNOSTIC
            console.log(`💓 [HEARTBEAT]: ${new Date().toLocaleTimeString()} | Candles: ${data.candles?.length || 0} | PnL: $${data.unrealizedPnl || 0}`);
            
            if (data.candles?.length > 0) {
                console.log("🕯️ [DATA]: First candle time:", new Date(data.candles[0].time * 1000).toLocaleString());
            }

            setSocketStatus(prev => ({ ...prev, ...data }));
        });

        socketRef.current.on("bot_log", (newLog) => {
            const logObj = typeof newLog === 'string' ? { message: newLog, time: new Date().toISOString() } : newLog;
            setSocketLogs(prev => [logObj, ...prev].slice(0, 100));
        });

        return () => { if (socketRef.current) socketRef.current.disconnect(); };
    }, [address]);

    const handleConfirmStart = async () => {
        setIsStarting(true);
        console.log("🚀 [LAUNCH]: Initializing engine for:", formConfig.symbol);
        
        try {
            const res = await startBot({ userId: address, config: formConfig });
            if (res?.status === 'running') {
                toast.success("Engine Operational");
                setShowPreFlight(false);
                setIsModeSelected(true);
            }
        } catch (e) {
            toast.error("Launch Failed");
        } finally {
            setIsStarting(false);
        }
    };

    if (!isConnected) {
        return (
            <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
                <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-[40px] p-12 text-center">
                    <Wallet className="text-emerald-500 w-12 h-12 mx-auto mb-6" />
                    <h2 className="text-xl font-black text-white mb-6 uppercase">Access Restricted</h2>
                    <ConnectButton />
                </div>
            </div>
        );
    }

    return (
        <UIModeProvider>
            <div className="min-h-screen bg-zinc-950 text-white font-sans p-6">
                <Toaster position="top-right" />
                
                {showPreFlight && <PreFlightModal config={formConfig} onConfirm={handleConfirmStart} onCancel={() => setShowPreFlight(false)} isStarting={isStarting} address={address} />}

                {/* HEADER */}
                <header className="max-w-[1800px] mx-auto mb-10 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center"><Activity className="text-black" /></div>
                        <div><h1 className="text-md font-black uppercase">NEO <span className="text-emerald-500">Sovereign</span></h1><p className="text-[8px] text-zinc-500 font-bold uppercase">Engine v14.2</p></div>
                    </div>
                    <div className="flex items-center gap-4">
                        {socketStatus.status === 'running' && <button onClick={() => stopBot()} className="px-4 py-2 bg-rose-500 text-black rounded-lg text-[10px] font-black uppercase">Halt</button>}
                        <ConnectButton />
                    </div>
                </header>

                <div className="max-w-[1800px] mx-auto grid grid-cols-12 gap-6">
                    {/* CONFIG PANEL */}
                    {socketStatus.status !== 'running' && (
                        <div className="col-span-12 lg:col-span-3 bg-zinc-900 border border-zinc-800 rounded-[32px] p-6 space-y-6">
                            <div className="space-y-4">
                                <label className={labelClass}>Target Asset</label>
                                <select value={formConfig.symbol} onChange={(e)=>setFormConfig({...formConfig, symbol: e.target.value})} className={inputClass}>
                                    {COIN_PAIRS.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                            <div className="space-y-4">
                                <label className={labelClass}>Treasury Allocation ($)</label>
                                <input type="number" value={formConfig.capitalAllocation} onChange={(e)=>setFormConfig({...formConfig, capitalAllocation: e.target.value})} className={inputClass} />
                            </div>
                            <button onClick={() => setShowPreFlight(true)} className="w-full py-4 bg-emerald-500 text-black rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-emerald-400 transition-all">Ignite Engine</button>
                        </div>
                    )}

                    {/* MAIN TERMINAL */}
                    <div className={`${socketStatus.status === 'running' ? 'col-span-12' : 'col-span-12 lg:col-span-9'} space-y-6`}>
                        {/* CHART BOX */}
                        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[680px]">
                            <div className="lg:col-span-3 bg-zinc-900 border border-zinc-800 rounded-[40px] overflow-hidden flex flex-col relative shadow-2xl">
                                <div className="p-6 bg-zinc-800/20 border-b border-zinc-800 flex justify-between">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500">{formConfig.symbol} Neural Stream</span>
                                    <div className="flex items-center gap-2"><div className={`w-2 h-2 rounded-full ${socketConnected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></div><span className="text-[8px] font-bold uppercase">Sync</span></div>
                                </div>
                                <div className="flex-1 bg-black">
                                    <LiveTradingChart 
                                        symbol={formConfig.symbol} 
                                        timeframe={formConfig.timeframe} 
                                        isRunning={socketStatus.status === 'running'} 
                                        candleData={socketStatus.candles || []} 
                                        activePositions={socketStatus.positions}
                                    />
                                </div>
                            </div>

                            {/* LOG BOX */}
                            <div className="lg:col-span-1 bg-zinc-900 border border-zinc-800 rounded-[40px] flex flex-col overflow-hidden">
                                <div className="p-4 bg-zinc-800/30 border-b border-zinc-800"><h3 className="text-[9px] font-black uppercase text-violet-400">Neural Flow</h3></div>
                                <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar font-mono text-[9px]">
                                    {socketLogs.map((log, i) => (
                                        <div key={i} className={`p-2 rounded-lg border ${getLogStyle(parseLog(log.message || log))}`}>
                                            <span className="opacity-40 block mb-1">{formatTime(log.time)}</span>
                                            {parseLog(log.message || log)}
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

export default TradingBotContainer;
