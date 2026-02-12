// File: src/pages/TradingBot.jsx
// 🚀 UPGRADE: v12.26 - Fixed Hook Order Error #310 + Maintained All Restored Features

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
    ArrowUpRight, Clock, Box, Timer, DollarSign, Info
} from "lucide-react"; 

import { 
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer 
} from 'recharts';

import "./TradingBot.css";
import "../styles/Themes.css";

const VITE_API = import.meta.env.VITE_API_URL || "https://neov6backend.onrender.com";
const SOCKET_URL = VITE_API.endsWith('/api') ? VITE_API.replace('/api', '') : VITE_API;
const API_BASE = VITE_API.endsWith('/api') ? VITE_API : `${VITE_API}/api`;

const inputClass = "w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:border-emerald-500 transition-all text-[11px] outline-none font-mono";
const labelClass = "text-[9px] text-zinc-500 uppercase font-black mb-1 block ml-1 tracking-tighter";

const parseLog = (log) => {
    if (!log) return "";
    if (typeof log === 'string') return log;
    return log.message || log.msg || JSON.stringify(log);
};

const STRAT_POOL = [
    { name: "RSI Threshold", code: "rsi_threshold" },
    { name: "SMA Crossover", code: "sma_crossover" },
    { name: "Bollinger Band Fade", code: "bb_fade" },
    { name: "Stochastic Osc", code: "stoch" },
    { name: "MACD Crossover", code: "macd_crossover" }
];

const DEFAULT_STRATEGY_PARAMS = {
    rsi_threshold: { rsi_length: 14, oversold: 30, overbought: 70 },
    sma_crossover: { fast_sma: 50, slow_sma: 200 },
    stoch: { k_period: 14, d_period: 3, slowing: 3 },
    bb_fade: { bb_period: 20, bb_std: 2.0 },
    macd_crossover: { fast: 12, slow: 26, signal: 9 }
};

// --- MODAL COMPONENTS ---
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
                    <div className="flex items-center justify-between p-4 bg-black/40 rounded-xl border border-zinc-800"><span className="text-[10px] text-zinc-400 font-bold uppercase">Wallet Access</span>{checks.wallet ? <span className="text-emerald-500 text-[9px] font-black tracking-widest">✔ READY</span> : <span className="text-rose-500 text-[9px] font-black tracking-widest">MISSING</span>}</div>
                    <div className="flex items-center justify-between p-4 bg-black/40 rounded-xl border border-zinc-800"><span className="text-[10px] text-zinc-400 font-bold uppercase">API Status</span>{checks.keys ? <span className="text-emerald-500 text-[9px] font-black tracking-widest">✔ READY</span> : <span className="text-rose-500 text-[9px] font-black tracking-widest">MISSING</span>}</div>
                    <div className="flex items-center justify-between p-4 bg-black/40 rounded-xl border border-zinc-800"><span className="text-[10px] text-zinc-400 font-bold uppercase">Capital Pool</span>{checks.capital ? <span className="text-emerald-500 text-[9px] font-black tracking-widest">✔ READY</span> : <span className="text-rose-500 text-[9px] font-black tracking-widest">MIN $100</span>}</div>
                </div>
                <div className="flex gap-4">
                    <button onClick={onCancel} className="flex-1 py-4 border border-zinc-800 rounded-2xl text-zinc-500 font-black uppercase text-[10px] hover:text-white transition-all">Abort</button>
                    <button onClick={onConfirm} disabled={!allPassed || isStarting} className={`flex-2 py-4 rounded-2xl font-black uppercase text-[10px] transition-all shadow-lg ${allPassed ? 'bg-emerald-500 text-black hover:bg-emerald-400' : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'}`}>{isStarting ? 'Igniting...' : 'Execute Launch'}</button>
                </div>
            </div>
        </div>
    );
};

// --- MAIN CONTAINER ---
const TradingBotContainer = () => {
    const { startBot, stopBot, resetBot } = useBot(); 
    const { isConnected, address } = useAccount();
    
    // 🟢 ALL HOOKS CALLED FIRST (To avoid Error #310)
    const [isModeSelected, setIsModeSelected] = useState(false);
    const [hasApiKeys, setHasApiKeys] = useState(false);
    const [showPreFlight, setShowPreFlight] = useState(false);
    const [isStarting, setIsStarting] = useState(false);
    const [paperBalance, setPaperBalance] = useState(10000);
    const [modeStep, setModeStep] = useState('selection');
    
    const [socketLogs, setSocketLogs] = useState([]);
    const [socketStatus, setSocketStatus] = useState({ 
        status: 'stopped', currentBalance: 0, unrealizedPnl: 0, exposure: 0, positions: [], equityCurve: [], startedAt: null, dailyProfit: 0
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
        params: { take_profit: 0.05, stop_loss: 0.02, trailing_stop: 0.01, long_threshold: 0.5, short_threshold: 0.5 },
        filters: { trend_filter: "none", vol_min: 0, atr_filter: 0 }
    });

    // Hooks logic
    useEffect(() => {
        if (isConnected) {
            axios.get(`${API_BASE}/users/keys`, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } })
                .then(res => setHasApiKeys((Array.isArray(res.data) ? res.data : res.data.keys || []).length > 0))
                .catch(() => setHasApiKeys(false));
        }
    }, [isConnected]);

    useEffect(() => {
        let interval;
        if (socketStatus.status === 'running' && socketStatus.startedAt) {
            interval = setInterval(() => {
                const diff = Math.max(0, new Date().getTime() - new Date(socketStatus.startedAt).getTime());
                const h = Math.floor(diff / 3600000).toString().padStart(2, '0');
                const m = Math.floor((diff % 3600000) / 60000).toString().padStart(2, '0');
                const s = Math.floor((diff % 60000) / 1000).toString().padStart(2, '0');
                setUptime(`${h}:${m}:${s}`);
            }, 1000);
        } else { setUptime("00:00:00"); }
        return () => clearInterval(interval);
    }, [socketStatus.status, socketStatus.startedAt]);

    useEffect(() => {
        if (!address) return;
        const socket = io(SOCKET_URL, { query: { userId: address }, transports: ['websocket', 'polling'] });
        socket.on("connect", () => setSocketConnected(true));
        socket.on("bot_status_update", (data) => setSocketStatus(prev => ({ ...prev, ...data, positions: data.activePositions || [], equityCurve: data.equityCurve || [] })));
        socket.on("bot_log", (newLog) => setSocketLogs(prev => [newLog, ...prev].slice(0, 100)));
        return () => socket.disconnect();
    }, [address]);

    const performanceData = useMemo(() => {
        if (!socketStatus.equityCurve?.length) return [{ time: 'Start', balance: formConfig.capitalAllocation }];
        return socketStatus.equityCurve.map(p => ({ time: new Date(p.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), balance: p.balance }));
    }, [socketStatus.equityCurve, formConfig.capitalAllocation]);

    const uniqueLogs = useMemo(() => socketLogs.filter((log, i, self) => i === self.findIndex(t => parseLog(t) === parseLog(log))), [socketLogs]);

    const handleConfirmStart = async () => {
        setIsStarting(true);
        try { 
            await startBot({ userId: address, config: { ...formConfig, comboConfig: { strategyCodes: formConfig.strategies.map(s => s.code), combinationRule: formConfig.hybridMode } } }); 
            setShowPreFlight(false); 
        } finally { setIsStarting(false); }
    };

    // 🟢 ENFORCED CONNECTION GATE (Called AFTER Hooks)
    if (!isConnected) {
        return (
            <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6">
                <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-[40px] p-12 text-center shadow-2xl">
                    <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-inner"><Wallet className="text-emerald-500 w-8 h-8" /></div>
                    <h2 className="text-2xl font-black text-white mb-3 uppercase tracking-tighter">Terminal Encrypted</h2>
                    <p className="text-zinc-500 text-xs mb-10 font-bold uppercase tracking-widest leading-relaxed">Authorization required. Connect your wallet to access High-Frequency modules.</p>
                    <div className="flex justify-center scale-110"><ConnectButton /></div>
                </div>
            </div>
        );
    }

    return (
        <UIModeProvider>
            <div className="min-h-screen bg-zinc-950 text-white font-sans p-6 overflow-x-hidden">
                <Toaster position="top-right" />
                
                {/* 🟢 Protocol Selection Modal */}
                {!isModeSelected && socketStatus.status !== 'running' && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-md">
                        <div className="max-w-4xl w-full p-6 text-center">
                            {modeStep === 'selection' ? (
                                <>
                                    <h1 className="text-4xl font-black text-white mb-4 tracking-tighter uppercase">Protocol Selection</h1>
                                    <p className="text-zinc-500 text-xs font-bold uppercase tracking-[0.3em] mb-12">Select your operational environment</p>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div onClick={() => setModeStep('paper_setup')} className="group cursor-pointer bg-zinc-900 border border-white/5 hover:border-emerald-500/50 p-16 rounded-[40px] transition-all shadow-2xl"><h3 className="text-3xl font-black text-emerald-400 mb-3">PAPER</h3><p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">Logic-Only Simulation</p></div>
                                        <div onClick={() => { if(hasApiKeys) { setFormConfig(p=>({...p, tradingMode: 'live'})); setIsModeSelected(true); } else { toast.error("Connect API Keys First"); } }} className={`p-16 rounded-[40px] border transition-all ${hasApiKeys ? 'cursor-pointer bg-zinc-900 border-white/5 hover:border-red-500' : 'bg-zinc-900/50 opacity-20'}`}><h3 className="text-3xl font-black text-red-500 mb-3">LIVE</h3><p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">Real Capital Execution</p></div>
                                    </div>
                                </>
                            ) : (
                                <div className="max-w-md mx-auto bg-zinc-900 border border-zinc-800 p-12 rounded-[40px] shadow-2xl">
                                    <h3 className="text-2xl font-black text-white mb-2 uppercase tracking-tighter">Initial Balance</h3>
                                    <p className="text-zinc-500 text-[9px] font-black uppercase mb-8">Define your simulated treasury</p>
                                    <input type="number" value={paperBalance} onChange={(e) => setPaperBalance(Number(e.target.value))} className="w-full bg-black border border-zinc-800 rounded-2xl p-5 text-2xl font-mono text-center text-emerald-500 mb-8 outline-none" />
                                    <div className="flex gap-4"><button onClick={() => setModeStep('selection')} className="flex-1 py-4 border border-zinc-800 rounded-2xl text-zinc-500 font-black uppercase text-[10px]">Back</button><button onClick={() => { setFormConfig(p=>({...p, tradingMode: 'paper', capitalAllocation: paperBalance})); setIsModeSelected(true); }} className="flex-2 py-4 bg-emerald-500 text-black rounded-2xl font-black uppercase text-[10px]">Initialize</button></div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {showPreFlight && <PreFlightModal config={formConfig} onConfirm={handleConfirmStart} onCancel={() => setShowPreFlight(false)} isStarting={isStarting} hasApiKeys={hasApiKeys} address={address} />}

                <header className={`max-w-[1800px] mx-auto mb-10 flex items-center justify-between transition-all duration-500 ${(!isModeSelected && socketStatus.status !== 'running') || showPreFlight ? 'blur-sm' : ''}`}>
                    <div className="flex items-center gap-3"><div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-lg"><Activity className="text-black w-7 h-7" /></div><div><h1 className="text-lg font-black uppercase tracking-widest">Sovereign <span className="text-emerald-500">Live</span></h1><p className="text-[9px] text-zinc-500 font-black uppercase tracking-[0.2em]">Hybrid Intelligence Terminal v12.26</p></div></div>
                    <ConnectButton />
                </header>

                <div className={`max-w-[1800px] mx-auto grid grid-cols-12 gap-8 transition-all duration-500 ${(!isModeSelected && socketStatus.status !== 'running') || showPreFlight ? 'blur-sm pointer-events-none' : ''}`}>
                    
                    {/* --- SIDEBAR --- */}
                    <div className="col-span-12 lg:col-span-3 space-y-6">
                        <div className="bg-zinc-900 border border-zinc-800 rounded-[32px] p-8 space-y-10 shadow-2xl sticky top-6 max-h-[85vh] overflow-y-auto custom-scrollbar">
                            
                            {/* Neural Gate */}
                            <div className="space-y-4">
                                <div className="flex justify-between items-center"><div className="flex items-center gap-2"><Cpu size={16} className="text-violet-400" /><h4 className="text-[10px] font-black uppercase tracking-widest text-violet-400">Neural Gate</h4></div>
                                <select value={formConfig.mlMode} onChange={(e)=>setFormConfig({...formConfig, mlMode: e.target.value})} className="bg-zinc-800 text-[9px] rounded-lg px-2 py-1 border border-zinc-700 font-black uppercase"><option value="off">Bypass</option><option value="on">Active</option></select></div>
                                {formConfig.mlMode === 'on' && (
                                    <div className="space-y-4 animate-in slide-in-from-top-2">
                                        <div><label className={labelClass}>Architecture</label><select className={inputClass} value={formConfig.mlModel} onChange={(e)=>setFormConfig({...formConfig, mlModel: e.target.value})}><option value="xgboost">XGBoost Engine</option><option value="lstm">LSTM Temporal</option></select></div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div><label className={labelClass}>Long Gate</label><input type="number" step="0.01" value={formConfig.params.long_threshold} onChange={(e)=>setFormConfig({...formConfig, params:{...formConfig.params, long_threshold: parseFloat(e.target.value)}})} className={inputClass}/></div>
                                            <div><label className={labelClass}>Short Gate</label><input type="number" step="0.01" value={formConfig.params.short_threshold} onChange={(e)=>setFormConfig({...formConfig, params:{...formConfig.params, short_threshold: parseFloat(e.target.value)}})} className={inputClass}/></div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Logic Ensemble */}
                            <div className="space-y-4 border-t border-zinc-800/50 pt-8">
                                <div className="flex justify-between items-center"><h4 className="text-[10px] text-emerald-400 font-black uppercase tracking-widest">Logic Ensemble</h4><select value={formConfig.hybridMode} onChange={(e) => setFormConfig({...formConfig, hybridMode: e.target.value})} className="bg-zinc-950 border border-zinc-700 text-[9px] rounded px-2 py-1 text-emerald-500 font-bold uppercase"><option value="AND">Strict</option><option value="OR">Loose</option></select></div>
                                <div className="space-y-3">
                                    {formConfig.strategies.map((s, i) => (
                                        <div key={i} className="p-4 bg-zinc-800/30 rounded-2xl border border-zinc-800 shadow-inner">
                                            <div className="flex justify-between mb-3"><span className="text-[10px] font-black text-amber-500 uppercase">{s.code.replace('_', ' ')}</span><button type="button" onClick={() => setFormConfig(p => ({ ...p, strategies: p.strategies.filter((_, idx) => idx !== i) }))} className="text-zinc-600 hover:text-rose-500"><Trash2 size={12}/></button></div>
                                            <StrategyParamInputs strategy={s} onChange={(p) => { const n = [...formConfig.strategies]; n[i].params = p; setFormConfig({...formConfig, strategies: n}); }} />
                                        </div>
                                    ))}
                                    <button type="button" onClick={() => setFormConfig(p => ({ ...p, strategies: [...p.strategies, { code: "rsi_threshold", params: DEFAULT_STRATEGY_PARAMS.rsi_threshold }] }))} className="w-full py-3 border border-dashed border-zinc-800 rounded-xl text-zinc-600 hover:text-emerald-500 transition-all flex items-center justify-center gap-2 font-black text-[9px] uppercase tracking-tighter"><Plus size={12}/> Add Module</button>
                                </div>
                            </div>

                            {/* Execution Shield */}
                            <div className="space-y-4 border-t border-zinc-800/50 pt-8">
                                <div className="flex items-center gap-2"><Shield size={16} className="text-amber-500"/><h4 className="text-[10px] font-black uppercase tracking-widest text-amber-500">Execution Shield</h4></div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div><label className={labelClass}>TP %</label><input type="number" step="0.001" value={formConfig.params.take_profit} onChange={(e)=>setFormConfig({...formConfig, params:{...formConfig.params, take_profit: parseFloat(e.target.value)}})} className={inputClass}/></div>
                                    <div><label className={labelClass}>SL %</label><input type="number" step="0.001" value={formConfig.params.stop_loss} onChange={(e)=>setFormConfig({...formConfig, params:{...formConfig.params, stop_loss: parseFloat(e.target.value)}})} className={inputClass}/></div>
                                    <div className="col-span-2"><label className={labelClass}>Trailing Stop %</label><input type="number" step="0.001" value={formConfig.params.trailing_stop} onChange={(e)=>setFormConfig({...formConfig, params:{...formConfig.params, trailing_stop: parseFloat(e.target.value)}})} className={inputClass}/></div>
                                </div>
                            </div>

                            {/* Risk Protocols */}
                            <div className="space-y-4 border-t border-zinc-800/50 pt-8">
                                <div className="flex items-center gap-2"><Scale size={16} className="text-rose-400"/><h4 className="text-[10px] font-black uppercase tracking-widest text-rose-400">Risk Protocols</h4></div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div><label className={labelClass}>Mode</label><select value={formConfig.riskManagementMode} onChange={(e)=>setFormConfig({...formConfig, riskManagementMode: e.target.value})} className={inputClass}><option value="static">Static %</option><option value="kelly">Kelly</option></select></div>
                                    <div><label className={labelClass}>Risk/Trade %</label><input type="number" step="0.1" value={formConfig.riskPercentage} onChange={(e)=>setFormConfig({...formConfig, riskPercentage: parseFloat(e.target.value)})} className={inputClass}/></div>
                                    <div><label className={labelClass}>Max Drawdown</label><input type="number" step="0.1" value={formConfig.maxDrawdown} onChange={(e)=>setFormConfig({...formConfig, maxDrawdown: parseFloat(e.target.value)})} className={inputClass}/></div>
                                    <div><label className={labelClass}>Max Daily Loss</label><input type="number" step="1" value={formConfig.maxDailyLoss} onChange={(e)=>setFormConfig({...formConfig, maxDailyLoss: parseFloat(e.target.value)})} className={inputClass}/></div>
                                </div>
                            </div>

                            {/* Sanity Filters */}
                            <div className="space-y-4 border-t border-zinc-800/50 pt-8">
                                <div className="flex items-center gap-2"><Filter size={16} className="text-cyan-400"/><h4 className="text-[10px] font-black uppercase tracking-widest text-cyan-400">Sanity Filters</h4></div>
                                <div className="space-y-3">
                                    <div><label className={labelClass}>Trend Filter</label><select value={formConfig.filters.trend_filter} onChange={(e)=>setFormConfig({...formConfig, filters:{...formConfig.filters, trend_filter: e.target.value}})} className={inputClass}><option value="none">None</option><option value="ema_200">200 EMA</option><option value="sma_200">200 SMA</option></select></div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div><label className={labelClass}>Min Vol</label><input type="number" value={formConfig.filters.vol_min} onChange={(e)=>setFormConfig({...formConfig, filters:{...formConfig.filters, vol_min: parseFloat(e.target.value)}})} className={inputClass}/></div>
                                        <div><label className={labelClass}>ATR Min</label><input type="number" step="0.1" value={formConfig.filters.atr_filter} onChange={(e)=>setFormConfig({...formConfig, filters:{...formConfig.filters, atr_filter: parseFloat(e.target.value)}})} className={inputClass}/></div>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-4 space-y-3">
                                <button onClick={socketStatus.status === 'running' ? stopBot : () => setShowPreFlight(true)} className={`w-full py-5 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all ${socketStatus.status === 'running' ? 'bg-rose-500 hover:bg-rose-600 shadow-xl shadow-rose-500/20' : 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-xl shadow-emerald-500/20'}`}>{socketStatus.status === 'running' ? 'Emergency Abort' : 'Initiate Engine'}</button>
                                {socketStatus.status !== 'running' && (<button onClick={resetBot} className="w-full py-3 border border-zinc-800 rounded-xl text-zinc-500 text-[9px] font-black uppercase hover:text-white transition-all flex items-center justify-center gap-2 tracking-widest"><RefreshCw size={12}/> Reset Terminal</button>)}
                            </div>
                        </div>
                    </div>

                    {/* --- MAIN DASHBOARD --- */}
                    <div className="col-span-12 lg:col-span-9 space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                            <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl shadow-xl"><div className="flex justify-between items-start mb-1"><p className="text-[9px] text-zinc-500 uppercase font-black tracking-widest">Engine</p>{socketStatus.status === 'running' && <Timer size={12} className="text-emerald-500 animate-pulse" />}</div><p className={`text-lg font-mono font-black ${socketStatus.status === 'running' ? 'text-emerald-400' : 'text-zinc-600'}`}>{socketStatus.status === 'running' ? 'OPERATIONAL' : 'STANDBY'}</p><p className="text-[9px] font-mono text-zinc-500 mt-1 uppercase">UPTIME: {uptime}</p></div>
                            <MetricCard label="Daily Profit" value={`${socketStatus.dailyProfit >= 0 ? '+' : ''}$${(socketStatus.dailyProfit || 0).toFixed(2)}`} color={socketStatus.dailyProfit >= 0 ? 'text-emerald-400' : 'text-rose-500'} icon={<DollarSign size={10}/>} />
                            <MetricCard label="Floating PnL" value={`${socketStatus.unrealizedPnl >= 0 ? '+' : ''}$${(socketStatus.unrealizedPnl || 0).toFixed(2)}`} color={socketStatus.unrealizedPnl >= 0 ? 'text-emerald-400' : 'text-rose-500'} />
                            <MetricCard label="Exposure" value={`${socketStatus.exposure || 0}%`} />
                            <MetricCard label="Bot Balance" value={`$${(socketStatus.currentBalance || formConfig.capitalAllocation).toFixed(2)}`} />
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[680px]">
                            <div className="lg:col-span-3 bg-zinc-900 border border-zinc-800 rounded-[40px] overflow-hidden flex flex-col relative shadow-2xl">
                                <div className="bg-zinc-800/20 p-5 border-b border-zinc-800/50 flex items-center justify-between"><div className="flex items-center gap-3"><TrendingUp size={18} className="text-emerald-500" /><span className="text-[11px] font-black uppercase tracking-widest">{formConfig.symbol} Terminal</span></div><div className="px-3 py-1 bg-zinc-950 rounded-full border border-zinc-800 text-[10px] font-mono text-zinc-400 uppercase tracking-tighter">Live HLOC Feed</div></div>
                                <div className="flex-1 bg-[#090b0f] pb-8"><LiveTradingChart symbol={formConfig.symbol} timeframe={formConfig.timeframe} isRunning={socketStatus.status === 'running'} activePositions={socketStatus.positions} candleData={socketStatus.candles || []} /></div>
                            </div>
                            <div className="lg:col-span-1 bg-zinc-900 border border-zinc-800 rounded-[40px] flex flex-col overflow-hidden shadow-2xl">
                                <div className="p-5 border-b border-zinc-800 bg-zinc-800/20 flex justify-between items-center"><h3 className="text-[10px] font-black text-violet-400 uppercase tracking-widest">Neural Stream</h3>{socketConnected ? <Wifi size={14} className="text-emerald-500" /> : <WifiOff size={14} className="text-rose-500 animate-pulse" />}</div>
                                <div ref={logContainerRef} className="flex-1 overflow-y-auto p-6 font-mono text-[10px] space-y-5 bg-black/20 custom-scrollbar">{uniqueLogs.map((log, i) => <div key={i} className={`p-3 rounded-xl border leading-relaxed ${parseLog(log).includes('🟢') ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400 shadow-lg shadow-emerald-500/5' : 'bg-zinc-800/20 border-transparent text-zinc-500'}`}>{parseLog(log)}</div>)}</div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pb-20">
                            <div className="bg-zinc-900 border border-zinc-800 rounded-[40px] p-8 shadow-2xl">
                                <div className="flex items-center justify-between mb-8"><div className="flex items-center gap-2"><TrendingUp size={18} className="text-emerald-500"/><h3 className="text-[11px] font-black uppercase tracking-widest">Equity Growth</h3></div></div>
                                <div className="h-64 w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={performanceData}>
                                            <defs><linearGradient id="colorBal" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/><stop offset="95%" stopColor="#10b981" stopOpacity={0}/></linearGradient></defs>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} /><XAxis dataKey="time" stroke="#52525b" fontSize={10} tickLine={false} axisLine={false} /><YAxis hide domain={['auto', 'auto']} /><RechartsTooltip contentStyle={{ backgroundColor: '#000', border: '1px solid #333', borderRadius: '16px', fontSize: '11px', fontWeight: 'bold' }} />
                                            <Area type="monotone" dataKey="balance" stroke="#10b981" fillOpacity={1} fill="url(#colorBal)" strokeWidth={3} />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                            <div className="bg-zinc-900 border border-zinc-800 rounded-[40px] p-8 shadow-2xl">
                                <div className="flex items-center gap-2 mb-8"><Box size={18} className="text-amber-500"/><h3 className="text-[11px] font-black uppercase tracking-widest">Active Operations</h3></div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-[11px]">
                                        <thead><tr className="text-zinc-600 uppercase font-black border-b border-zinc-800 pb-4"><th className="pb-4 tracking-widest">Type</th><th className="pb-4 tracking-widest">Entry</th><th className="pb-4 tracking-widest">Size</th><th className="pb-4 text-right tracking-widest">Action</th></tr></thead>
                                        <tbody className="divide-y divide-zinc-800/50">
                                            {socketStatus.positions.length > 0 ? socketStatus.positions.map((pos, idx) => (
                                                <tr key={idx} className="group"><td className="py-5 font-black text-emerald-400 flex items-center gap-2"><ArrowUpRight size={14}/> LONG</td><td className="py-5 font-mono font-black text-zinc-200">${pos.entry.toLocaleString()}</td><td className="py-5 font-mono text-zinc-500">{pos.size.toFixed(4)} BTC</td><td className="py-5 text-right"><button onClick={stopBot} className="px-4 py-2 bg-rose-500/10 text-rose-500 border border-rose-500/20 rounded-xl hover:bg-rose-500 hover:text-white transition-all font-black text-[9px] uppercase tracking-widest">Liquidate</button></td></tr>
                                            )) : <tr><td colSpan="4" className="py-16 text-center text-zinc-600 italic font-bold uppercase tracking-widest">Awaiting Signal...</td></tr>}
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

const MetricCard = ({ label, value, color = "text-white", icon = null }) => (
    <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl relative overflow-hidden shadow-xl">
        <p className="text-[9px] text-zinc-500 uppercase font-black tracking-[0.15em] mb-2">{label}</p>
        <div className="flex items-center gap-1.5">{icon && <span className={color}>{icon}</span>}<p className={`text-lg font-mono font-black tracking-tighter ${color}`}>{value}</p></div>
    </div>
);

function StrategyParamInputs({ strategy, onChange }) {
    const { code, params = {} } = strategy;
    const f = (l, k, s = "1") => (<div className="flex flex-col"><label className="text-[8px] text-zinc-600 uppercase font-bold ml-1 mb-1">{l}</label><input type="number" step={s} value={params[k] || ""} onChange={(e) => onChange({...params, [k]: parseFloat(e.target.value)})} className="bg-zinc-950 border border-zinc-700 rounded-lg px-2 py-1 text-[9px] text-amber-500 outline-none font-mono" /></div>);
    return (<div className="grid grid-cols-2 gap-2">{code === "rsi_threshold" && <>{f("Length", "rsi_length")}{f("OS", "oversold")}{f("OB", "overbought")}</>}{code === "stoch" && <>{f("K-Per", "k_period")}{f("D-Per", "d_period")}</>}{code === "bb_fade" && <>{f("Per", "bb_period")}{f("Std", "bb_std", "0.1")}</>}</div>);
}

export default TradingBotContainer;
