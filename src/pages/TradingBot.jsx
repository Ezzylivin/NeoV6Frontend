// File: src/pages/TradingBot.jsx
// 🚀 UPGRADE: v12.21 - Fixed ReferenceErrors & Restored API Key Logic

import React, { useState, useEffect, useRef, useMemo } from "react";
import axios from "axios";
import { useAccount, useBalance } from "wagmi"; 
import { ConnectButton } from '@rainbow-me/rainbowkit';
import toast, { Toaster } from "react-hot-toast";
import { io } from "socket.io-client"; 
import { useBot } from "../hooks/useBot";
import { UIModeProvider } from "../context/UIModeContext";
import { LiveTradingChart } from "../components/LiveTradingChart.jsx"; 
import { 
    Plus, Trash2, Shield, Globe, Cpu, Filter, TrendingUp, 
    Activity, Scale, Power, RefreshCw, Wallet, Wifi, WifiOff,
    ArrowUpRight, Clock, Box, Timer
} from "lucide-react"; 

import { 
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer 
} from 'recharts';

import "./TradingBot.css";
import "../styles/Themes.css";

const VITE_API = import.meta.env.VITE_API_URL || "https://neov6backend.onrender.com";
const SOCKET_URL = VITE_API.endsWith('/api') ? VITE_API.replace('/api', '') : VITE_API;
const API_BASE = VITE_API.endsWith('/api') ? VITE_API : `${VITE_API}/api`;

const inputClass = "w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:border-emerald-500 transition-all text-xs outline-none";
const labelClass = "text-[10px] text-zinc-500 uppercase font-bold mb-1 block ml-1";

const parseLog = (log) => {
    if (!log) return "";
    if (typeof log === 'string') return log;
    return log.message || log.msg || JSON.stringify(log);
};

// --- MODALS (Restore the Check Logic) ---
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-xl">
            <div className="max-w-md w-full bg-[#111] border border-white/10 rounded-xl p-6 shadow-2xl">
                <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2"><span className="text-emerald-500">🚀</span> Pre-Flight Check</h3>
                <div className="space-y-3 mb-8">
                    <CheckItem label="Wallet Connection" status={checks.wallet} />
                    <CheckItem label={config.tradingMode === 'live' ? "API Keys (Active)" : "API Keys (Bypassed)"} status={checks.keys} />
                    <CheckItem label={`Capital ($${config.capitalAllocation})`} status={checks.capital} />
                    <CheckItem label={`Logic (${config.strategies.length} Modules)`} status={checks.strategy} />
                </div>
                <div className="flex gap-3">
                    <button onClick={onCancel} className="flex-1 py-3 rounded-lg border border-white/10 text-neutral-400 hover:text-white transition">Abort</button>
                    <button onClick={onConfirm} disabled={!allPassed || isStarting} className={`flex-1 py-3 rounded-lg font-bold text-black transition flex justify-center items-center gap-2 ${allPassed ? 'bg-emerald-500 hover:bg-emerald-400' : 'bg-neutral-800 text-neutral-500 cursor-not-allowed'}`}>{isStarting ? 'Igniting...' : 'LAUNCH BOT'}</button>
                </div>
            </div>
        </div>
    );
};

const CheckItem = ({ label, status }) => (
    <div className="flex items-center justify-between p-3 bg-black/40 rounded border border-white/5">
        <span className="text-sm text-neutral-300">{label}</span>
        {status ? <span className="text-green-500 font-bold text-xs">✔ OK</span> : <span className="text-red-500 font-bold text-xs">MISSING</span>}
    </div>
);

// --- MAIN CONTAINER ---
const TradingBotContainer = () => {
    const { startBot, stopBot, resetBot } = useBot(); 
    const { isConnected, address } = useAccount();
    
    // 🟢 1. RESTORED STATE
    const [isModeSelected, setIsModeSelected] = useState(false);
    const [hasApiKeys, setHasApiKeys] = useState(false);
    const [showPreFlight, setShowPreFlight] = useState(false);
    const [isStarting, setIsStarting] = useState(false);
    
    const [socketLogs, setSocketLogs] = useState([]);
    const [socketStatus, setSocketStatus] = useState({ 
        status: 'stopped', currentBalance: 0, unrealizedPnl: 0, exposure: 0, positions: [], equityCurve: [], startedAt: null
    });
    const [socketConnected, setSocketConnected] = useState(false);
    const [uptime, setUptime] = useState("00:00:00");
    const logContainerRef = useRef(null);

    // 🟢 2. RESTORED API KEY CHECK
    useEffect(() => {
        if (isConnected) {
            axios.get(`${API_BASE}/users/keys`, { 
                headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } 
            }).then(res => {
                const keys = Array.isArray(res.data) ? res.data : (res.data.keys || []);
                setHasApiKeys(keys.length > 0);
            }).catch(() => setHasApiKeys(false));
        }
    }, [isConnected]);

    // 🟢 3. UPTIME LOGIC
    useEffect(() => {
        let interval;
        if (socketStatus.status === 'running' && socketStatus.startedAt) {
            interval = setInterval(() => {
                const start = new Date(socketStatus.startedAt).getTime();
                const now = new Date().getTime();
                const diff = Math.max(0, now - start);
                const h = Math.floor(diff / 3600000).toString().padStart(2, '0');
                const m = Math.floor((diff % 3600000) / 60000).toString().padStart(2, '0');
                const s = Math.floor((diff % 60000) / 1000).toString().padStart(2, '0');
                setUptime(`${h}:${m}:${s}`);
            }, 1000);
        } else { setUptime("00:00:00"); }
        return () => clearInterval(interval);
    }, [socketStatus.status, socketStatus.startedAt]);

    // 🟢 4. SOCKET
    useEffect(() => {
        if (!address) return;
        const socket = io(SOCKET_URL, { query: { userId: address }, transports: ['websocket', 'polling'] });
        socket.on("connect", () => setSocketConnected(true));
        socket.on("bot_status_update", (data) => {
            setSocketStatus(prev => ({ ...prev, ...data, positions: data.activePositions || [], equityCurve: data.equityCurve || [] }));
        });
        socket.on("bot_log", (newLog) => setSocketLogs(prev => [newLog, ...prev].slice(0, 100)));
        return () => socket.disconnect();
    }, [address]);

    const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
    const { data: nativeBalance } = useBalance({ address, enabled: !!address });

    const [formConfig, setFormConfig] = useState({
        symbol: "BTC-USD", timeframe: "1h", capitalAllocation: 1000,
        tradingMode: "paper", strategies: [{ code: "rsi_threshold", params: { rsi_length: 14, oversold: 30, overbought: 70 } }],
        mlMode: "off", mlModel: "", mlThreshold: 0.5,
        riskManagementMode: "static", riskPercentage: 1, hybridMode: "AND",
        maxDailyLoss: 5, maxDrawdown: 10, maxTradesPerDay: 20
    });

    const performanceData = useMemo(() => {
        if (!socketStatus.equityCurve || socketStatus.equityCurve.length === 0) {
            return [{ time: 'Start', balance: formConfig.capitalAllocation }];
        }
        return socketStatus.equityCurve.map(point => ({
            time: new Date(point.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            balance: point.balance
        }));
    }, [socketStatus.equityCurve, formConfig.capitalAllocation]);

    const uniqueLogs = useMemo(() => {
        if (!socketLogs.length) return [];
        return socketLogs.filter((log, i, self) => i === self.findIndex(t => parseLog(t) === parseLog(log)));
    }, [socketLogs]);

    const handleConfirmStart = async () => {
        setIsStarting(true);
        try {
            await startBot({ 
                userId: address, 
                config: { 
                    ...formConfig, 
                    comboConfig: { 
                        strategyCodes: formConfig.strategies.map(s => s.code), 
                        combinationRule: formConfig.hybridMode 
                    } 
                } 
            });
            setShowPreFlight(false);
        } finally { setIsStarting(false); }
    };

    return (
        <UIModeProvider>
            <div className="min-h-screen bg-zinc-950 text-white font-sans p-6 overflow-x-hidden">
                <Toaster position="top-right" />
                
                {/* 🟢 Render Modal if mode not selected AND bot not already running */}
                {!isModeSelected && socketStatus.status !== 'running' && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-md">
                        <div className="max-w-3xl w-full p-6 text-center">
                            <h1 className="text-3xl font-bold text-white mb-10">SELECT TRADING ENVIRONMENT</h1>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div onClick={() => { setFormConfig(p=>({...p, tradingMode: 'paper'})); setIsModeSelected(true); }} className="cursor-pointer bg-[#0a0a0a] border border-white/10 hover:border-emerald-500/50 p-10 rounded-xl transition-all">
                                    <h3 className="text-xl font-bold text-emerald-400 mb-2">Paper Trading</h3>
                                    <p className="text-neutral-400 text-sm">Virtual capital simulation.</p>
                                </div>
                                <div onClick={() => { if(hasApiKeys) { setFormConfig(p=>({...p, tradingMode: 'live'})); setIsModeSelected(true); } else { toast.error("Connect API Keys in Settings First"); } }} 
                                     className={`p-10 rounded-xl border transition-all ${hasApiKeys ? 'cursor-pointer bg-[#0a0a0a] border-white/10 hover:border-red-500' : 'bg-zinc-900/50 opacity-40 cursor-not-allowed'}`}>
                                    <h3 className="text-xl font-bold text-red-500 mb-2">Live Trading</h3>
                                    <p className="text-neutral-400 text-sm">Real capital execution.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {showPreFlight && <PreFlightModal config={formConfig} onConfirm={handleConfirmStart} onCancel={() => setShowPreFlight(false)} isStarting={isStarting} hasApiKeys={hasApiKeys} address={address} />}

                <header className={`max-w-[1800px] mx-auto mb-8 flex items-center justify-between transition-all ${(!isModeSelected && socketStatus.status !== 'running') || showPreFlight ? 'blur-sm' : ''}`}>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg"><Activity className="text-black w-6 h-6" /></div>
                        <div>
                            <h1 className="text-sm font-black uppercase tracking-widest">Sovereign <span className="text-emerald-500">Live</span></h1>
                            <p className="text-[9px] text-zinc-500 font-bold uppercase">Hybrid Intelligence Engine v12.21</p>
                        </div>
                    </div>
                </header>

                <div className={`max-w-[1800px] mx-auto grid grid-cols-12 gap-6 transition-all ${(!isModeSelected && socketStatus.status !== 'running') || showPreFlight ? 'blur-sm pointer-events-none' : ''}`}>
                    
                    {/* --- SIDEBAR --- */}
                    <div className="col-span-12 lg:col-span-3 space-y-6">
                        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex flex-col gap-1 shadow-lg">
                            <div className="flex justify-between items-start">
                                <div><p className="text-[8px] text-emerald-500 uppercase font-black mb-1">Operator</p><h2 className="text-sm font-bold truncate w-32">{storedUser.name || "Operator"}</h2></div>
                                <div className="text-right">
                                    <div className="flex items-center justify-end gap-1 text-zinc-400 mb-1"><Wallet size={10} /><span className="text-[9px] uppercase font-bold">Assets</span></div>
                                    <p className="text-sm font-mono text-emerald-400 font-bold">$0.00</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 sticky top-6 shadow-2xl">
                            <h4 className="text-[10px] text-emerald-400 font-black uppercase tracking-widest mb-6">System Controls</h4>
                            <button onClick={socketStatus.status === 'running' ? stopBot : () => setShowPreFlight(true)} className={`w-full py-4 rounded-2xl font-black uppercase text-xs transition-all ${socketStatus.status === 'running' ? 'bg-rose-500 hover:bg-rose-600' : 'bg-emerald-500 hover:bg-emerald-400 text-black'}`}>
                                {socketStatus.status === 'running' ? 'Emergency Abort' : 'Launch Operations'}
                            </button>
                            {socketStatus.status !== 'running' && (
                                <button onClick={resetBot} className="w-full mt-3 py-3 rounded-xl border border-zinc-800 text-zinc-500 text-[9px] font-bold uppercase hover:text-white transition-all flex items-center justify-center gap-2">
                                    <RefreshCw size={12} /> Purge Session History
                                </button>
                            )}
                        </div>
                    </div>

                    {/* --- MAIN DASHBOARD --- */}
                    <div className="col-span-12 lg:col-span-9 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl shadow-xl">
                                <div className="flex justify-between items-start mb-1">
                                    <p className="text-[9px] text-zinc-500 uppercase font-black tracking-widest">Engine State</p>
                                    {socketStatus.status === 'running' && <Timer size={12} className="text-emerald-500 animate-pulse" />}
                                </div>
                                <p className={`text-xl font-mono font-bold ${socketStatus.status === 'running' ? 'text-emerald-400' : 'text-zinc-500'}`}>{socketStatus.status === 'running' ? 'OPERATIONAL' : 'STANDBY'}</p>
                                <p className="text-[10px] font-mono text-zinc-400 mt-1 uppercase">UPTIME: {uptime}</p>
                            </div>

                            <MetricCard label="Exposure" value={`${socketStatus.exposure || 0}%`} />
                            <MetricCard label="Unrealized PnL" value={`${socketStatus.unrealizedPnl >= 0 ? '+' : ''}$${(socketStatus.unrealizedPnl || 0).toFixed(2)}`} color={socketStatus.unrealizedPnl >= 0 ? 'text-emerald-400' : 'text-rose-500'} />
                            <MetricCard label="Bot Balance" value={`$${(socketStatus.currentBalance || formConfig.capitalAllocation).toFixed(2)}`} />
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 h-[650px]">
                            <div className="lg:col-span-3 bg-zinc-900 border border-zinc-800 rounded-[32px] overflow-hidden flex flex-col relative shadow-2xl">
                                <div className="bg-zinc-800/30 p-4 border-b border-zinc-800/50 flex items-center justify-between">
                                    <div className="flex items-center gap-3"><TrendingUp size={16} className="text-emerald-500" /><span className="text-xs font-bold uppercase">{formConfig.symbol} Terminal</span></div>
                                </div>
                                <div className="flex-1 bg-[#0b0e14] pb-8"><LiveTradingChart symbol={formConfig.symbol} timeframe={formConfig.timeframe} isRunning={socketStatus.status === 'running'} activePositions={socketStatus.positions} candleData={socketStatus.candles || []} /></div>
                            </div>

                            <div className="lg:col-span-1 bg-zinc-900 border border-zinc-800 rounded-[32px] flex flex-col overflow-hidden shadow-2xl">
                                <div className="p-4 border-b border-zinc-800 bg-zinc-800/30 flex justify-between items-center"><h3 className="text-[10px] font-black text-violet-400 uppercase tracking-widest flex items-center gap-2">Neural Stream</h3>{socketConnected ? <Wifi size={14} className="text-emerald-500" /> : <WifiOff size={14} className="text-rose-500" />}</div>
                                <div ref={logContainerRef} className="flex-1 overflow-y-auto p-5 font-mono text-[10px] space-y-4 bg-black/20 custom-scrollbar">{uniqueLogs.map((log, i) => <div key={i} className={`p-2 rounded border ${parseLog(log).includes('🟢') ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400' : 'bg-zinc-800/20 border-transparent text-zinc-500'}`}>{parseLog(log)}</div>)}</div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-10">
                            <div className="bg-zinc-900 border border-zinc-800 rounded-[32px] p-6 shadow-2xl">
                                <div className="flex items-center justify-between mb-6">
                                    <div className="flex items-center gap-2"><TrendingUp size={16} className="text-emerald-500"/><h3 className="text-[10px] font-black uppercase tracking-widest">Equity Growth</h3></div>
                                </div>
                                <div className="h-64 w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={performanceData}>
                                            <defs><linearGradient id="colorBal" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/><stop offset="95%" stopColor="#10b981" stopOpacity={0}/></linearGradient></defs>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} /><XAxis dataKey="time" stroke="#52525b" fontSize={9} tickLine={false} axisLine={false} /><YAxis hide domain={['auto', 'auto']} /><RechartsTooltip contentStyle={{ backgroundColor: '#111', border: '1px solid #333', borderRadius: '12px', fontSize: '10px' }} />
                                            <Area type="monotone" dataKey="balance" stroke="#10b981" fillOpacity={1} fill="url(#colorBal)" strokeWidth={2} />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            <div className="bg-zinc-900 border border-zinc-800 rounded-[32px] p-6 shadow-2xl">
                                <div className="flex items-center gap-2 mb-6"><Box size={16} className="text-amber-500"/><h3 className="text-[10px] font-black uppercase tracking-widest">Active Operations</h3></div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-[11px]">
                                        <thead><tr className="text-zinc-500 uppercase font-bold border-b border-zinc-800"><th className="pb-3">Type</th><th className="pb-3">Entry</th><th className="pb-3">Size</th><th className="pb-3 text-right">Command</th></tr></thead>
                                        <tbody className="divide-y divide-zinc-800">
                                            {socketStatus.positions.length > 0 ? socketStatus.positions.map((pos, idx) => (
                                                <tr key={idx} className="group">
                                                    <td className="py-4 font-bold text-emerald-400">LONG</td>
                                                    <td className="py-4 font-mono font-bold">${pos.entry.toLocaleString()}</td>
                                                    <td className="py-4 font-mono text-zinc-400">{pos.size.toFixed(4)}</td>
                                                    <td className="py-4 text-right"><button onClick={stopBot} className="px-3 py-1 bg-rose-500/10 text-rose-500 border border-rose-500/20 rounded-lg hover:bg-rose-500 transition-all font-black text-[9px] uppercase">Abort Trade</button></td>
                                                </tr>
                                            )) : <tr><td colSpan="4" className="py-14 text-center text-zinc-600 italic">System awaiting entry signal...</td></tr>}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </UIModeProvider>
    );
};

const MetricCard = ({ label, value, color = "text-white", active = false }) => (
    <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl relative overflow-hidden shadow-xl">
        <p className="text-[9px] text-zinc-500 uppercase font-black tracking-widest mb-1">{label}</p>
        <div className="flex items-center gap-2">
            {active && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>}
            <p className={`text-xl font-mono font-bold ${color}`}>{value}</p>
        </div>
    </div>
);

export default TradingBotContainer;
