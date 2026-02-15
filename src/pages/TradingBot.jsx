// File: src/pages/TradingBot.jsx
// 🚀 FIX: v13.21 - Restored Exposure + Fixed Chart Sync + Log Flow

import React, { useState, useEffect, useRef, useMemo } from "react";
import axios from "axios";
import { useAccount } from "wagmi"; 
import { ConnectButton } from '@rainbow-me/rainbowkit';
import toast, { Toaster } from "react-hot-toast";
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

const inputClass = "w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:border-emerald-500 transition-all text-[11px] outline-none font-mono";
const labelClass = "text-[9px] text-zinc-500 uppercase font-black mb-1 block ml-1 tracking-tighter";

// ... (Configuration Constants STRAT_POOL, MODEL_POOL, DEFAULT_STRATEGY_PARAMS remain the same) ...
const RAW_URL = import.meta.env.VITE_API_URL || "https://neov6backend.onrender.com";
const API_BASE = `${RAW_URL.replace(/\/$/, "").replace(/\/api$/, "")}/api`;

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
    if (text.includes("VETOED") || text.includes("STALKING SHORT")) return 'text-rose-400 bg-rose-500/10 border-rose-500/20'; 
    if (text.includes("PASSED") || text.includes("STALKING LONG")) return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
    return 'text-zinc-500 bg-zinc-900 border-zinc-800'; 
};

const TradingBotContainer = () => {
    const { startBot, stopBot, resetBot, refreshState, restoredConfig, botStatus: hookBotStatus, logs: hookLogs } = useBot(); 
    const { isConnected, address } = useAccount();
    
    const [isModeSelected, setIsModeSelected] = useState(false);
    const [showPreFlight, setShowPreFlight] = useState(false);
    const [isStarting, setIsStarting] = useState(false);
    const [uptime, setUptime] = useState("00:00:00");
    const logContainerRef = useRef(null);

    const [formConfig, setFormConfig] = useState({
        symbol: "BTC-USD", timeframe: "1h", capitalAllocation: 1000,
        tradingMode: "paper", strategies: [{ code: "rsi_threshold", params: DEFAULT_STRATEGY_PARAMS.rsi_threshold }],
        mlMode: "on", mlModel: "stacking", hybridMode: "AND", enable_shorting: true, 
        mlThresholdLong: 0.8, mlThresholdShort: 0.9,
        riskManagementMode: "static", riskPercentage: 1, maxDailyLoss: 5, maxDrawdown: 10,
        params: { take_profit: 0.05, stop_loss: 0.02, trailing_stop: 0.01 }
    });

    // 🟢 UNIFIED STATE: Derived from hook to ensure chart data exists
    const socketStatus = useMemo(() => ({
        status: hookBotStatus?.status || 'stopped',
        currentBalance: hookBotStatus?.currentBalance || hookBotStatus?.balance || 0,
        unrealizedPnl: hookBotStatus?.unrealizedPnl || 0,
        exposure: hookBotStatus?.exposure || 0,
        positions: hookBotStatus?.positions || hookBotStatus?.activePositions || [],
        equityCurve: hookBotStatus?.equityCurve || [],
        tradeMarkers: hookBotStatus?.tradeMarkers || [],
        candles: hookBotStatus?.candles || [],
        startedAt: hookBotStatus?.startedAt || null
    }), [hookBotStatus]);

    const isBotRunning = socketStatus.status === 'running';

    useEffect(() => {
        if (restoredConfig) {
            setFormConfig(prev => ({ ...prev, ...restoredConfig }));
            setIsModeSelected(true);
        }
    }, [restoredConfig]);

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

    const handleConfirmStart = async () => {
        setIsStarting(true);
        try {
            const response = await startBot(formConfig);
            if (response) {
                setIsModeSelected(true);
                setShowPreFlight(false);
                toast.success("Protocol Ignited");
            }
        } catch (e) { toast.error("Ignition failure."); } finally { setIsStarting(false); }
    };

    const handleEmergencyPurge = async () => {
        if(!confirm("🚨 SYSTEM PURGE: Halt engine and WIPE database history?")) return;
        try {
            await stopBot();
            await resetBot();
            window.location.reload();
        } catch (e) { toast.error("Purge Failed"); }
    };

    const activeBalance = useMemo(() => isBotRunning ? socketStatus.currentBalance : formConfig.capitalAllocation, [isBotRunning, socketStatus.currentBalance, formConfig.capitalAllocation]);
    
    // Performance parsing logic
    const performanceData = useMemo(() => {
        if (!socketStatus.equityCurve?.length) return [{ time: '00:00', balance: Number(activeBalance), confidence: 50 }];
        return socketStatus.equityCurve.map(p => ({
            time: formatTime(p.time),
            balance: p.balance || p.equity,
            confidence: p.confidence || 0
        }));
    }, [socketStatus.equityCurve, activeBalance]);

    if (!isConnected) {
        return (
            <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6">
                <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-[40px] p-12 text-center shadow-2xl">
                    <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center mx-auto mb-8"><Wallet className="text-emerald-500 w-8 h-8" /></div>
                    <ConnectButton />
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
                        <div><h1 className="text-lg font-black uppercase tracking-widest">Sovereign <span className="text-emerald-500">Live</span></h1><p className="text-[9px] text-zinc-500 font-black uppercase">Terminal v13.21</p></div>
                    </div>
                    <div className="flex items-center gap-4">
                        {isBotRunning && (
                            <button onClick={handleEmergencyPurge} className="px-6 py-3 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-xl font-black text-[10px] uppercase hover:bg-rose-500 transition-all flex items-center gap-2 shadow-lg"><Power size={12}/> Emergency Halt & Purge</button>
                        )}
                        <ConnectButton />
                    </div>
                </header>

                <div className="max-w-[1800px] mx-auto grid grid-cols-12 gap-8">
                    {!isBotRunning && (
                        <div className="col-span-12 lg:col-span-3 space-y-6">
                            <div className="bg-zinc-900 border border-zinc-800 rounded-[32px] p-8 space-y-10 shadow-2xl sticky top-6">
                                <div><label className={labelClass}>Market Feed</label>
                                    <div className="grid grid-cols-3 gap-2">
                                        <select value={formConfig.symbol} onChange={(e)=>setFormConfig({...formConfig, symbol: e.target.value})} className={inputClass + " col-span-2"}>{COIN_PAIRS.map(c => <option key={c} value={c}>{c}</option>)}</select>
                                        <select value={formConfig.timeframe} onChange={(e)=>setFormConfig({...formConfig, timeframe: e.target.value})} className={inputClass}>{TIMEFRAMES.map(t => <option key={t} value={t}>{t}</option>)}</select>
                                    </div>
                                </div>
                                {/* ... (Sidebars remain same: Neural Gate, Risk Protocol, Signal Ensemble) ... */}
                                <button onClick={() => setShowPreFlight(true)} className="w-full py-5 bg-emerald-500 text-black rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-emerald-400 shadow-xl">Initiate Engine</button>
                            </div>
                        </div>
                    )}

                    <div className={`${isBotRunning ? 'col-span-12' : 'col-span-12 lg:col-span-9'} space-y-8`}>
                        {/* 🟢 Metrics Grid with Exposure Card restored */}
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                            <MetricCard label="Engine Status" value={isBotRunning ? 'OPERATIONAL' : 'STANDBY'} subValue={`SESSION: ${uptime}`} color={isBotRunning ? 'text-emerald-400' : 'text-zinc-600'} icon={<Timer size={10}/>} />
                            <MetricCard label="Floating PnL" value={`$${(socketStatus.unrealizedPnl || 0).toFixed(2)}`} subValue="Open Positions" color={socketStatus.unrealizedPnl >= 0 ? 'text-emerald-400' : 'text-rose-500'} icon={<Activity size={10}/>} />
                            <MetricCard label="Exposure" value={`${socketStatus.exposure || 0}%`} subValue={socketStatus.positions.length > 0 ? "Active Risk" : "Cash Heavy"} color="text-amber-400" icon={<Shield size={10}/>} />
                            <MetricCard label="Total Equity" value={`$${Number(activeBalance).toLocaleString()}`} subValue="Liquid + Locked" />
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[720px]">
                            <div className="lg:col-span-3 bg-zinc-900 border border-zinc-800 rounded-[40px] overflow-hidden flex flex-col relative shadow-2xl">
                                <div className="p-6 border-b border-zinc-800 flex justify-between bg-zinc-800/10">
                                    <span className="text-[11px] font-black uppercase tracking-widest">{formConfig.symbol} visual stream</span>
                                    <div className="flex items-center gap-2"><div className={`w-1.5 h-1.5 rounded-full ${isBotRunning ? 'bg-emerald-500' : 'bg-rose-500 animate-pulse'}`}></div><span className="text-[9px] font-black uppercase">Neural Sync</span></div>
                                </div>
                                <div className="flex-1 bg-black/40">
                                    {/* 🟢 Candle Data sync fix */}
                                    <LiveTradingChart symbol={formConfig.symbol} candleData={socketStatus.candles} tradeMarkers={socketStatus.tradeMarkers} activePositions={socketStatus.positions} isRunning={isBotRunning} strategies={formConfig.strategies} />
                                </div>
                            </div>
                            <div className="lg:col-span-1 bg-zinc-900 border border-zinc-800 rounded-[40px] flex flex-col overflow-hidden shadow-2xl">
                                <div className="p-5 border-b border-zinc-800 bg-zinc-800/20 flex justify-between items-center">
                                    <div className="flex items-center gap-2 text-violet-400"><Cpu size={16}/><h3 className="text-[10px] font-black uppercase tracking-widest">Neural Flow</h3></div>
                                    <button onClick={() => refreshState()} className="text-zinc-600 hover:text-emerald-400 transition-all"><RefreshCw size={14} /></button>
                                </div>
                                <div className="flex-1 overflow-y-auto p-6 font-mono text-[10px] space-y-3 bg-black/20 custom-scrollbar">
                                    {/* 🟢 Logs from single source of truth */}
                                    {hookLogs.map((log, i) => (
                                        <div key={i} className={`p-3 rounded-xl border ${getLogStyle(parseLog(log.message || log))}`}>
                                            <span className="text-[8px] block opacity-50 mb-1">{formatTime(log.time)}</span>
                                            {parseLog(log.message || log)}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {isBotRunning && (
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-20">
                                <div className="bg-zinc-900 border border-zinc-800 rounded-[40px] p-8 shadow-2xl">
                                    <div className="flex items-center gap-2 mb-8"><BarChart size={18} className="text-emerald-500"/><h3 className="text-[11px] font-black uppercase tracking-widest">Session Equity</h3></div>
                                    <div className="h-48 w-full"><ResponsiveContainer width="100%" height="100%"><AreaChart data={performanceData}><Area type="monotone" dataKey="balance" stroke="#10b981" fill="#10b981" fillOpacity={0.1} strokeWidth={3} /><XAxis dataKey="time" hide /><YAxis hide domain={['auto', 'auto']} /></AreaChart></ResponsiveContainer></div>
                                </div>
                                <div className="bg-zinc-900 border border-zinc-800 rounded-[40px] p-8 shadow-2xl">
                                    <div className="flex items-center gap-2 mb-8"><Zap size={18} className="text-violet-500"/><h3 className="text-[11px] font-black uppercase tracking-widest">Logic Confidence</h3></div>
                                    <div className="h-48 w-full"><ResponsiveContainer width="100%" height="100%"><AreaChart data={performanceData}><Area type="step" dataKey="confidence" stroke="#a78bfa" fill="#a78bfa" fillOpacity={0.1} strokeWidth={2} /><XAxis dataKey="time" hide /><YAxis hide /></AreaChart></ResponsiveContainer></div>
                                </div>
                                <div className="bg-zinc-900 border border-zinc-800 rounded-[40px] p-8 shadow-2xl flex flex-col">
                                    <div className="flex items-center gap-2 mb-8"><Box size={18} className="text-amber-500"/><h3 className="text-[11px] font-black uppercase tracking-widest">Live Operations</h3></div>
                                    <table className="w-full text-left text-[11px]">
                                        <thead><tr className="text-zinc-600 uppercase font-black border-b border-zinc-800 pb-4"><th>Type</th><th>Entry</th><th className="text-right">Action</th></tr></thead>
                                        <tbody className="divide-y divide-zinc-800/50">
                                            {socketStatus.positions.map((pos, idx) => (
                                                <tr key={idx}>
                                                    <td className={`py-4 font-black ${pos.type === 'short' ? 'text-amber-500' : 'text-emerald-400'}`}>{pos.type.toUpperCase()}</td>
                                                    <td className="py-4 font-mono text-zinc-200">${pos.entry.toLocaleString()}</td>
                                                    <td className="py-4 text-right"><button onClick={handleManualExit} className="px-3 py-1 bg-rose-500/10 hover:bg-rose-500 rounded-lg text-rose-500 hover:text-white font-black uppercase text-[9px] transition-all">EXIT</button></td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </UIModeProvider>
    );
};

// ... (Sub-components MetricCard, PreFlightModal, CheckItem, StrategyParamInputs remain same) ...
export default TradingBotContainer;
