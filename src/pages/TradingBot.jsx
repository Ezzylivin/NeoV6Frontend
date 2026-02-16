// File: src/pages/TradingBot.jsx
// 🚀 FINAL PRODUCTION v14.5 - Comprehensive Diagnostic & Data Integrity File

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

const PreFlightModal = ({ config, onConfirm, onCancel, isStarting, address }) => {
    const allPassed = !!address && Number(config.capitalAllocation) >= 100;
    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/95 backdrop-blur-xl p-4">
            <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-3xl p-8 shadow-2xl">
                <h3 className="text-xl font-black text-white mb-8 flex items-center gap-2 uppercase tracking-tighter"><span className="text-emerald-500">🚀</span> Pre-Flight Check</h3>
                <div className="space-y-3 mb-10">
                    <CheckItem label="Wallet Connection" status={!!address} />
                    <CheckItem label="Liquidity Gate" status={Number(config.capitalAllocation) >= 100} />
                    <CheckItem label="Strategy Modules" status={config.strategies.length > 0} />
                </div>
                <div className="flex gap-4">
                    <button onClick={onCancel} className="flex-1 py-4 border border-zinc-800 rounded-2xl text-zinc-500 font-black uppercase text-[10px]">Abort</button>
                    <button onClick={onConfirm} disabled={!allPassed || isStarting} className={`flex-2 py-4 rounded-2xl font-black uppercase text-[10px] ${allPassed ? 'bg-emerald-500 text-black hover:bg-emerald-400' : 'bg-zinc-800 text-zinc-600'}`}>{isStarting ? 'Igniting Engine...' : 'Execute Launch'}</button>
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

    useEffect(() => {
        if (restoredConfig) {
            console.log("♻️ [RESTORE]: Synchronizing configuration with backend storage.");
            setFormConfig(prev => ({ ...prev, ...restoredConfig }));
        }
    }, [restoredConfig]);

    useEffect(() => {
        if (!address) return;
        
        console.log("🔌 [SOCKET]: Establishing neural uplink to:", SOCKET_URL);
        socketRef.current = io(SOCKET_URL, { query: { userId: address }, transports: ['websocket'] });
        
        socketRef.current.on("connect", () => {
            console.log("✅ [SOCKET]: Node synchronized. SID:", socketRef.current.id);
            setSocketConnected(true);
            socketRef.current.emit("join", { userId: address });
        });

        socketRef.current.on("disconnect", () => {
            console.warn("❌ [SOCKET]: Uplink severed. Attempting reconnect...");
            setSocketConnected(false);
        });

        socketRef.current.on("bot_status_update", (data) => {
            console.log(`💓 [HEARTBEAT]: Data packet received at ${new Date().toLocaleTimeString()}`);
            console.log(`📊 [PAYLOAD]: Status: ${data.status} | Candles: ${data.candles?.length || 0} | PnL: $${data.unrealizedPnl || 0}`);
            
            setSocketStatus(prev => ({ ...prev, ...data }));
        });

        socketRef.current.on("bot_log", (newLog) => {
            const logObj = typeof newLog === 'string' ? { message: newLog, time: new Date().toISOString() } : newLog;
            setSocketLogs(prev => [logObj, ...prev].slice(0, 100));
        });

        return () => { if (socketRef.current) socketRef.current.disconnect(); };
    }, [address]);

    const performanceData = useMemo(() => {
        if (!socketStatus.equityCurve?.length) return [{ time: 'Start', balance: formConfig.capitalAllocation }];
        return socketStatus.equityCurve.map(p => ({ 
            time: formatTime(p.time), 
            balance: p.balance,
            confidence: p.confidence || 50
        }));
    }, [socketStatus.equityCurve, formConfig.capitalAllocation]);

    const handleConfirmStart = async () => {
        setIsStarting(true);
        console.log("🚀 [LAUNCH]: Igniting ML engine for:", formConfig.symbol);
        try {
            const res = await startBot({ userId: address, config: formConfig });
            if (res?.status === 'running') {
                toast.success("Protocol Active");
                setShowPreFlight(false);
                setIsModeSelected(true);
            }
        } catch (e) {
            console.error("❌ [LAUNCH ERROR]:", e);
            toast.error("Ignition Failure");
        } finally {
            setIsStarting(false);
        }
    };

    if (!isConnected) {
        return (
            <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6">
                <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-[40px] p-12 text-center shadow-2xl">
                    <Wallet className="text-emerald-500 w-12 h-12 mx-auto mb-6 shadow-glow" />
                    <h2 className="text-xl font-black text-white mb-4 uppercase tracking-tighter">Terminal Encrypted</h2>
                    <ConnectButton />
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
                        <div><h1 className="text-lg font-black uppercase tracking-widest">Sovereign <span className="text-emerald-500">Live</span></h1><p className="text-[9px] text-zinc-500 font-black uppercase tracking-[0.2em]">Terminal v14.5</p></div>
                    </div>
                    <div className="flex items-center gap-4">
                        {socketStatus.status === 'running' && <button onClick={() => stopBot()} className="px-6 py-3 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-xl font-black text-[10px] uppercase hover:bg-rose-500 hover:text-white transition-all">Emergency Halt</button>}
                        <ConnectButton />
                    </div>
                </header>

                <div className="max-w-[1800px] mx-auto grid grid-cols-12 gap-8">
                    {/* CONFIGURATION COLUMN */}
                    {socketStatus.status !== 'running' && (
                        <div className="col-span-12 lg:col-span-3 space-y-6">
                            <div className="bg-zinc-900 border border-zinc-800 rounded-[32px] p-8 space-y-8 shadow-2xl">
                                <div>
                                    <label className={labelClass}>Asset Pair</label>
                                    <select value={formConfig.symbol} onChange={(e)=>setFormConfig({...formConfig, symbol: e.target.value})} className={inputClass}>
                                        {COIN_PAIRS.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className={labelClass}>Timeframe</label>
                                    <select value={formConfig.timeframe} onChange={(e)=>setFormConfig({...formConfig, timeframe: e.target.value})} className={inputClass}>
                                        {TIMEFRAMES.map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className={labelClass}>Treasury Allocation ($)</label>
                                    <input type="number" value={formConfig.capitalAllocation} onChange={(e)=>setFormConfig({...formConfig, capitalAllocation: e.target.value})} className={inputClass} />
                                </div>
                                
                                <div className="pt-4 border-t border-zinc-800/50">
                                    <div className="flex justify-between items-center mb-4"><h4 className="text-[10px] text-emerald-400 font-black uppercase">Active Logic</h4></div>
                                    <div className="space-y-3">
                                        {formConfig.strategies.map((s, i) => (
                                            <div key={i} className="p-4 bg-zinc-800/30 rounded-2xl border border-zinc-800">
                                                <div className="flex justify-between mb-3">
                                                    <span className="text-[10px] font-black text-amber-500 uppercase">{s.code.replace('_', ' ')}</span>
                                                    <button onClick={() => setFormConfig(p => ({ ...p, strategies: p.strategies.filter((_, idx) => idx !== i) }))} className="text-zinc-600 hover:text-rose-500"><Trash2 size={12}/></button>
                                                </div>
                                                <StrategyParamInputs strategy={s} onChange={(params) => { const n = [...formConfig.strategies]; n[i].params = params; setFormConfig({...formConfig, strategies: n}); }} />
                                            </div>
                                        ))}
                                        <button onClick={() => setFormConfig(p => ({ ...p, strategies: [...p.strategies, { code: "rsi_threshold", params: DEFAULT_STRATEGY_PARAMS.rsi_threshold }] }))} className="w-full py-3 border border-dashed border-zinc-800 rounded-xl text-zinc-600 text-[9px] uppercase font-black">+ Add Logic Module</button>
                                    </div>
                                </div>
                                
                                <button onClick={() => setShowPreFlight(true)} className="w-full py-5 bg-emerald-500 text-black rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-emerald-400 transition-all shadow-xl shadow-emerald-500/20">Initiate Engine</button>
                            </div>
                        </div>
                    )}

                    {/* MAIN TRADING TERMINAL */}
                    <div className={`${socketStatus.status === 'running' ? 'col-span-12' : 'col-span-12 lg:col-span-9'} space-y-8`}>
                        {/* CHART & LOGS AREA */}
                        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[720px]">
                            <div className="lg:col-span-3 bg-zinc-900 border border-zinc-800 rounded-[40px] overflow-hidden flex flex-col relative shadow-2xl">
                                <div className="p-6 bg-zinc-800/20 border-b border-zinc-800/50 flex justify-between items-center">
                                    <div className="flex items-center gap-3"><TrendingUp size={18} className="text-emerald-500" /><span className="text-[11px] font-black uppercase tracking-widest">{formConfig.symbol} Live Neural Stream</span></div>
                                    <div className="flex items-center gap-2"><div className={`w-2 h-2 rounded-full ${socketConnected ? 'bg-emerald-500 animate-pulse shadow-glow' : 'bg-rose-500'}`}></div><span className="text-[9px] font-black uppercase">Sync Status</span></div>
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

                            <div className="lg:col-span-1 bg-zinc-900 border border-zinc-800 rounded-[40px] flex flex-col overflow-hidden shadow-2xl">
                                <div className="p-5 border-b border-zinc-800 bg-zinc-800/20"><h3 className="text-[10px] font-black uppercase tracking-widest text-violet-400">Neural Flow</h3></div>
                                <div ref={logContainerRef} className="flex-1 overflow-y-auto p-6 font-mono text-[10px] space-y-3 bg-black/20 custom-scrollbar">
                                    {socketLogs.length === 0 ? (
                                        <div className="h-full flex items-center justify-center text-zinc-600 italic">Waiting for neural link...</div>
                                    ) : (
                                        socketLogs.map((log, i) => (
                                            <div key={i} className={`p-3 rounded-xl border leading-relaxed flex flex-col gap-1 ${getLogStyle(parseLog(log.message || log))}`}>
                                                <span className="text-[9px] opacity-40 font-bold">{formatTime(log.time)}</span>
                                                <span>{parseLog(log.message || log)}</span>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* BOTTOM METRICS BAR */}
                        {socketStatus.status === 'running' && (
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                <MetricBox label="Floating PnL" value={`$${(socketStatus.unrealizedPnl || 0).toFixed(2)}`} color={socketStatus.unrealizedPnl >= 0 ? 'text-emerald-400' : 'text-rose-500'} />
                                <MetricBox label="Current Equity" value={`$${(socketStatus.currentBalance || 0).toLocaleString()}`} color="text-white" />
                                <MetricBox label="Signal Confidence" value={`${(performanceData[performanceData.length - 1]?.confidence || 0).toFixed(0)}%`} color="text-violet-400" />
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </UIModeProvider>
    );
};

const MetricBox = ({ label, value, color }) => (
    <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-[32px] shadow-xl">
        <p className="text-[10px] text-zinc-500 uppercase font-black tracking-widest mb-2">{label}</p>
        <p className={`text-3xl font-mono font-black ${color}`}>{value}</p>
    </div>
);

function StrategyParamInputs({ strategy, onChange }) {
    const { code, params = {} } = strategy;
    const f = (l, k, s = "1") => (
        <div className="flex flex-col">
            <label className="text-[8px] text-zinc-600 uppercase font-bold mb-1 ml-1">{l}</label>
            <input type="number" step={s} value={params[k] ?? ""} onChange={(e) => onChange({...params, [k]: parseFloat(e.target.value)})} className="bg-zinc-950 border border-zinc-700 rounded-lg px-2 py-1 text-[9px] text-amber-500 font-mono" />
        </div>
    );
    return (
        <div className="grid grid-cols-2 gap-2">
            {code === "rsi_threshold" && <>{f("Length", "rsi_length")}{f("Oversold", "oversold")}</>}
            {code === "bb_fade" && <>{f("Period", "bb_period")}{f("Std Dev", "bb_std", "0.1")}</>}
            {code === "sma_crossover" && <>{f("Fast", "fast_sma")}{f("Slow", "slow_sma")}</>}
        </div>
    );
}

export default TradingBotContainer;
