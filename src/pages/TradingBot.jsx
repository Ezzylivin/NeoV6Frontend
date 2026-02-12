// File: src/pages/TradingBot.jsx
// 🚀 UPGRADE: v12.19 - Full Performance & Equity Analytics Integration

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
    ArrowUpRight, ArrowDownRight, Clock, Box, LayoutGrid
} from "lucide-react"; 

// 🟢 Performance Charting
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

// --- UTILS ---
const parseLog = (log) => {
    if (!log) return "";
    if (typeof log === 'string') return log;
    return log.message || log.msg || JSON.stringify(log);
};

const Tooltip = ({ text, children }) => {
    const [visible, setVisible] = useState(false);
    return (
        <div className="relative flex items-center" onMouseEnter={() => setVisible(true)} onMouseLeave={() => setVisible(false)}>
            {children}
            {visible && (
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-64 bg-zinc-800 text-zinc-200 text-[11px] p-3 rounded-lg shadow-xl z-50 border border-zinc-700 pointer-events-none">
                    {text}
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-zinc-800"></div>
                </div>
            )}
        </div>
    );
};

const STRAT_POOL = [
    { name: "RSI Threshold", code: "rsi_threshold" },
    { name: "SMA Crossover", code: "sma_crossover" },
    { name: "Bollinger Band Fade", code: "bb_fade" },
    { name: "Stochastic Osc", code: "stoch" }
];

const DEFAULT_STRATEGY_PARAMS = {
    rsi_threshold: { rsi_length: 14, oversold: 30, overbought: 70 },
    sma_crossover: { fast_sma: 50, slow_sma: 200 },
    stoch: { k_period: 14, d_period: 3, slowing: 3 },
    bb_fade: { bb_period: 20, bb_std: 2.0 }
};

// --- MODALS ---
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-xl animate-in fade-in duration-300">
            <div className="max-w-md w-full bg-[#111] border border-white/10 rounded-xl p-6 shadow-2xl">
                <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2"><span className="text-emerald-500">🚀</span> Pre-Flight Check</h3>
                <div className="space-y-3 mb-8">
                    <CheckItem label="Wallet Connection" status={checks.wallet} />
                    <CheckItem label={config.tradingMode === 'live' ? "API Keys (Required)" : "API Keys (Optional)"} status={checks.keys} />
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

const ModeSelectionModal = ({ onSelect, isConnected, hasApiKeys, onReset }) => {
    const [step, setStep] = useState('selection');
    const [paperBalance, setPaperBalance] = useState(10000);
    if (!isConnected) return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md">
            <div className="bg-[#111] p-8 rounded-2xl border border-white/10 text-center max-w-md">
                <div className="text-4xl mb-4">🦊</div>
                <h2 className="text-2xl font-bold text-white mb-2">Connect Wallet</h2>
                <div className="flex justify-center mt-6"><ConnectButton /></div>
            </div>
        </div>
    );
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-md animate-in zoom-in-95 duration-300">
            <div className="max-w-5xl w-full p-6 text-center">
                {step === 'selection' && (
                    <>
                        <h1 className="text-3xl font-bold text-white mb-2">TRADING ENVIRONMENT</h1>
                        <p className="text-neutral-500 mb-10 text-sm">SELECT YOUR OPERATIONAL MODE</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
                            <div onClick={() => setStep('paper_setup')} className="group cursor-pointer bg-[#0a0a0a] border border-white/10 hover:border-emerald-500/50 p-8 rounded-xl transition-all"><h3 className="text-xl font-bold text-emerald-400 mb-2">Paper Trading</h3><p className="text-neutral-400 text-sm">Simulate trades with virtual capital.</p></div>
                            <div onClick={() => { if (hasApiKeys) onSelect('live', null); else toast.error("Add API Keys first!"); }} className={`group p-8 rounded-xl border transition-all ${hasApiKeys ? 'cursor-pointer bg-[#0a0a0a] border-white/10 hover:border-red-500/50' : 'bg-neutral-900/50 border-white/5 opacity-50 cursor-not-allowed'}`}><h3 className="text-xl font-bold text-red-500 mb-2">Live Trading</h3><p className="text-neutral-400 text-sm">Execute real orders. Capital at risk.</p></div>
                        </div>
                    </>
                )}
                {step === 'paper_setup' && (
                    <div className="max-w-sm mx-auto bg-[#111] border border-white/10 p-8 rounded-xl">
                        <h3 className="text-xl font-bold text-white mb-4">Initial Balance</h3>
                        <input type="number" value={paperBalance} onChange={(e) => setPaperBalance(Number(e.target.value))} className="w-full bg-black border border-white/20 rounded p-3 text-xl text-white mb-6 focus:border-emerald-500 outline-none" />
                        <div className="flex gap-3 mb-6">
                            <button onClick={() => setStep('selection')} className="flex-1 py-3 text-neutral-400 hover:text-white">Back</button>
                            <button onClick={() => onSelect('paper', paperBalance)} className="flex-[2] bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded">Start</button>
                        </div>
                        <div className="pt-4 border-t border-zinc-800"><button onClick={onReset} className="text-[10px] text-zinc-500 hover:text-rose-500 flex items-center justify-center gap-1.5 w-full transition-colors uppercase font-bold tracking-wide"><RefreshCw size={10} /> Reset Session Data</button></div>
                    </div>
                )}
            </div>
        </div>
    );
};

// --- MAIN CONTAINER ---
const TradingBotContainer = () => {
    const { startBot, stopBot, resetBot } = useBot(); 
    const { isConnected, address } = useAccount();
    
    const [socketLogs, setSocketLogs] = useState([]);
    const [socketStatus, setSocketStatus] = useState({ 
        status: 'stopped', currentBalance: 0, unrealizedPnl: 0, exposure: 0, positions: [], equityCurve: [] 
    });
    const [socketConnected, setSocketConnected] = useState(false);
    const logContainerRef = useRef(null);

    // 🟢 WebSocket Setup
    useEffect(() => {
        if (!address) return;
        const socket = io(SOCKET_URL, { query: { userId: address }, transports: ['websocket', 'polling'] });
        socket.on("connect", () => setSocketConnected(true));
        socket.on("disconnect", () => setSocketConnected(false));
        socket.on("bot_status_update", (data) => {
            setSocketStatus(prev => ({ ...prev, ...data, positions: data.activePositions || [], equityCurve: data.equityCurve || [] }));
        });
        socket.on("bot_log", (newLog) => setSocketLogs(prev => [newLog, ...prev].slice(0, 100)));
        return () => socket.disconnect();
    }, [address]);

    const { data: nativeBalance } = useBalance({ address, enabled: !!address });
    const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
    const [nativePrice, setNativePrice] = useState(0);

    const [formConfig, setFormConfig] = useState({
        symbol: "BTC-USD", timeframe: "1h", capitalAllocation: 1000,
        tradingMode: "paper", strategies: [{ code: "rsi_threshold", params: DEFAULT_STRATEGY_PARAMS.rsi_threshold }],
        mlMode: "off", mlModel: "", mlThreshold: 0.5,
        riskManagementMode: "static", riskPercentage: 1, hybridMode: "AND",
        maxDailyLoss: 5, maxDrawdown: 10, maxTradesPerDay: 20,
        params: { ...DEFAULT_STRATEGY_PARAMS.rsi_threshold, take_profit: 0.05, stop_loss: 0.02, trailing_stop: 0.01 },
        filters: { trend_filter: "none", vol_min: 0, atr_filter: 0 }
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
        try {
            await startBot({ userId: address, config: { ...formConfig, comboConfig: { strategyCodes: formConfig.strategies.map(s => s.code), combinationRule: formConfig.hybridMode } } });
        } catch (e) {}
    };

    return (
        <UIModeProvider>
            <div className="min-h-screen bg-zinc-950 text-white font-sans p-6 overflow-x-hidden">
                <Toaster position="top-right" />
                
                {!isModeSelected && <ModeSelectionModal onSelect={(m, b) => { setFormConfig(p => ({...p, tradingMode: m, capitalAllocation: b || p.capitalAllocation})); setIsModeSelected(true); }} isConnected={isConnected} hasApiKeys={hasApiKeys} onReset={resetBot} />}
                {showPreFlight && <PreFlightModal config={formConfig} onConfirm={handleConfirmStart} onCancel={() => setShowPreFlight(false)} isStarting={isStarting} hasApiKeys={hasApiKeys} address={address} />}

                <header className={`max-w-[1800px] mx-auto mb-8 flex items-center justify-between transition-all ${!isModeSelected || showPreFlight ? 'blur-sm' : ''}`}>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20"><Activity className="text-black w-6 h-6" /></div>
                        <div>
                            <h1 className="text-sm font-black uppercase tracking-widest">Sovereign <span className="text-emerald-500">Live</span></h1>
                            <p className="text-[9px] text-zinc-500 font-bold uppercase">Hybrid Intelligence Engine v12.19</p>
                        </div>
                    </div>
                </header>

                <div className={`max-w-[1800px] mx-auto grid grid-cols-12 gap-6 transition-all ${!isModeSelected || showPreFlight ? 'blur-sm pointer-events-none' : ''}`}>
                    
                    {/* --- SIDEBAR --- */}
                    <div className="col-span-12 lg:col-span-3 space-y-6">
                        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex flex-col gap-1 shadow-lg">
                            <div className="flex justify-between items-start">
                                <div><p className="text-[8px] text-emerald-500 uppercase font-black mb-1">Operator</p><h2 className="text-sm font-bold truncate w-32">{storedUser.name || "User"}</h2></div>
                                <div className="text-right">
                                    <div className="flex items-center justify-end gap-1 text-zinc-400 mb-1"><Wallet size={10} /><span className="text-[9px] uppercase font-bold">Assets</span></div>
                                    <p className="text-sm font-mono text-emerald-400 font-bold">{nativeBalance ? `$${(parseFloat(nativeBalance.formatted) * nativePrice).toFixed(2)}` : "$0.00"}</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 sticky top-6 max-h-[75vh] overflow-y-auto custom-scrollbar shadow-2xl">
                            <form onSubmit={(e) => { e.preventDefault(); setShowPreFlight(true); }} className="space-y-8">
                                <AIConfig mlMode={formConfig.mlMode} setMlMode={(m)=>setFormConfig({...formConfig, mlMode: m})} params={formConfig.params} onParamChange={(k,v)=>setFormConfig(p=>({...p, params:{...p.params,[k]:v}}))} />
                                
                                <div className="space-y-4 border-t border-zinc-800 pt-6">
                                    <div className="flex justify-between items-center"><h4 className="text-[10px] text-emerald-400 font-black uppercase tracking-widest">Logic Ensemble</h4>
                                    <select value={formConfig.hybridMode} onChange={(e) => setFormConfig({...formConfig, hybridMode: e.target.value})} className="bg-zinc-950 border border-zinc-700 text-[9px] rounded px-2 py-1 text-emerald-500 font-bold uppercase"><option value="AND">Strict</option><option value="OR">Loose</option></select></div>
                                    {formConfig.strategies.map((s, i) => (
                                        <div key={i} className="p-3 bg-zinc-800/30 rounded-xl border border-zinc-700">
                                            <div className="flex justify-between mb-2"><span className="text-[10px] font-bold text-amber-500 uppercase">{s.code.replace('_', ' ')}</span><button type="button" onClick={() => setFormConfig(p => ({ ...p, strategies: p.strategies.filter((_, idx) => idx !== i) }))} className="text-zinc-500 hover:text-rose-500"><Trash2 size={12}/></button></div>
                                            <StrategyParamInputs strategy={s} onChange={(p) => { const n = [...formConfig.strategies]; n[i].params = p; setFormConfig({...formConfig, strategies: n}); }} />
                                        </div>
                                    ))}
                                </div>

                                <button type="submit" className={`w-full py-4 rounded-2xl font-black uppercase text-xs transition-all ${socketStatus.status === 'running' ? 'bg-rose-500 hover:bg-rose-600 shadow-rose-500/20' : 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-emerald-500/20'}`}>
                                    {socketStatus.status === 'running' ? 'Emergency Abort' : 'Launch Operations'}
                                </button>
                            </form>
                        </div>
                    </div>

                    {/* --- MAIN DASHBOARD --- */}
                    <div className="col-span-12 lg:col-span-9 space-y-6">
                        
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <MetricCard label="Engine State" value={socketStatus.status === 'running' ? 'OPERATIONAL' : 'STANDBY'} color={socketStatus.status === 'running' ? 'text-emerald-400' : 'text-zinc-500'} active={socketStatus.status === 'running'} />
                            <MetricCard label="Exposure" value={`${socketStatus.exposure || 0}%`} />
                            <MetricCard label="Unrealized PnL" value={`${socketStatus.unrealizedPnl >= 0 ? '+' : ''}$${(socketStatus.unrealizedPnl || 0).toFixed(2)}`} color={socketStatus.unrealizedPnl >= 0 ? 'text-emerald-400' : 'text-rose-500'} />
                            <MetricCard label="Bot Balance" value={`$${(socketStatus.currentBalance || formConfig.capitalAllocation).toFixed(2)}`} />
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 h-[650px]">
                            {/* CHART */}
                            <div className="lg:col-span-3 bg-zinc-900 border border-zinc-800 rounded-[32px] overflow-hidden flex flex-col relative shadow-2xl">
                                <div className="bg-zinc-800/30 p-4 border-b border-zinc-800/50 flex items-center justify-between">
                                    <div className="flex items-center gap-3"><TrendingUp size={16} className="text-emerald-500" /><span className="text-xs font-bold uppercase">{formConfig.symbol} Terminal</span></div>
                                </div>
                                <div className="flex-1 bg-[#0b0e14] pb-8"><LiveTradingChart symbol={formConfig.symbol} timeframe={formConfig.timeframe} isRunning={socketStatus.status === 'running'} activePositions={socketStatus.positions} candleData={socketStatus.candles || []} /></div>
                            </div>

                            {/* LOG STREAM */}
                            <div className="lg:col-span-1 bg-zinc-900 border border-zinc-800 rounded-[32px] flex flex-col overflow-hidden shadow-2xl">
                                <div className="p-4 border-b border-zinc-800 bg-zinc-800/30 flex justify-between items-center"><h3 className="text-[10px] font-black text-violet-400 uppercase tracking-widest">Neural Stream</h3><Tooltip text={socketConnected ? "Live" : "Offline"}>{socketConnected ? <Wifi size={14} className="text-emerald-500" /> : <WifiOff size={14} className="text-rose-500" />}</Tooltip></div>
                                <div ref={logContainerRef} className="flex-1 overflow-y-auto p-5 font-mono text-[10px] space-y-4 bg-black/20 custom-scrollbar">{uniqueLogs.map((log, i) => <div key={i} className={`p-2 rounded border ${parseLog(log).includes('🟢') ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400' : 'bg-zinc-800/20 border-transparent text-zinc-500'}`}>{parseLog(log)}</div>)}</div>
                            </div>
                        </div>

                        {/* 📊 PERFORMANCE ANALYTICS FOOTER */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Equity Curve Chart */}
                            <div className="bg-zinc-900 border border-zinc-800 rounded-[32px] p-6 shadow-2xl">
                                <div className="flex items-center justify-between mb-6">
                                    <div className="flex items-center gap-2"><TrendingUp size={16} className="text-emerald-500"/><h3 className="text-[10px] font-black uppercase tracking-widest">Equity Growth</h3></div>
                                    <span className="text-[9px] text-zinc-500 font-mono font-bold uppercase tracking-tighter">Real-Time PnL Tracker</span>
                                </div>
                                <div className="h-64 w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={performanceData}>
                                            <defs>
                                                <linearGradient id="colorBal" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                                            <XAxis dataKey="time" stroke="#52525b" fontSize={9} tickLine={false} axisLine={false} />
                                            <YAxis hide domain={['auto', 'auto']} />
                                            <RechartsTooltip contentStyle={{ backgroundColor: '#111', border: '1px solid #333', borderRadius: '12px', fontSize: '10px' }} />
                                            <Area type="monotone" dataKey="balance" stroke="#10b981" fillOpacity={1} fill="url(#colorBal)" strokeWidth={2} />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* Active Trades Table */}
                            <div className="bg-zinc-900 border border-zinc-800 rounded-[32px] p-6 shadow-2xl">
                                <div className="flex items-center gap-2 mb-6"><Box size={16} className="text-amber-500"/><h3 className="text-[10px] font-black uppercase tracking-widest">Active Operations</h3></div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-[11px]">
                                        <thead><tr className="text-zinc-500 uppercase font-bold border-b border-zinc-800"><th className="pb-3">Type</th><th className="pb-3">Entry</th><th className="pb-3">Size</th><th className="pb-3 text-right">Command</th></tr></thead>
                                        <tbody className="divide-y divide-zinc-800">
                                            {socketStatus.positions.length > 0 ? socketStatus.positions.map((pos, idx) => (
                                                <tr key={idx} className="group">
                                                    <td className="py-4 font-bold text-emerald-400 flex items-center gap-1.5"><ArrowUpRight size={12}/> LONG</td>
                                                    <td className="py-4 font-mono font-bold">${pos.entry.toLocaleString()}</td>
                                                    <td className="py-4 font-mono text-zinc-400">{pos.size.toFixed(4)}</td>
                                                    <td className="py-4 text-right"><button onClick={stopBot} className="px-3 py-1 bg-rose-500/10 text-rose-500 border border-rose-500/20 rounded-lg hover:bg-rose-500 hover:text-white transition-all font-black text-[9px] uppercase tracking-widest">Abort Trade</button></td>
                                                </tr>
                                            )) : <tr><td colSpan="4" className="py-14 text-center text-zinc-600 italic font-medium">System awaiting entry signal alignment...</td></tr>}
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

function AIConfig({ mlMode, setMlMode, params, onParamChange }) {
    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center"><div className="flex items-center gap-2"><Cpu size={14} className="text-violet-400" /><h4 className="text-[10px] font-black uppercase tracking-widest">Neural Gate</h4></div>
            <select value={mlMode} onChange={(e) => setMlMode(e.target.value)} className="bg-zinc-800 text-[9px] rounded-lg px-2 py-1 outline-none border border-zinc-700 font-bold uppercase"><option value="off">Bypass</option><option value="on">Active</option></select></div>
            {mlMode === "on" && (<div className="grid grid-cols-1 gap-3 animate-in fade-in">
                <label className={labelClass}>Architecture</label>
                <select className={inputClass}><option>XGBoost Engine</option><option>Deep LSTM</option></select>
                <div className="grid grid-cols-2 gap-2">
                    <div><label className={labelClass}>Gate L</label><input type="number" step="0.01" value={params.long_threshold} onChange={(e)=>onParamChange('long_threshold', parseFloat(e.target.value))} className={inputClass}/></div>
                    <div><label className={labelClass}>Gate S</label><input type="number" step="0.01" value={params.short_threshold} onChange={(e)=>onParamChange('short_threshold', parseFloat(e.target.value))} className={inputClass}/></div>
                </div>
            </div>)}
        </div>
    );
}

function StrategyParamInputs({ strategy, onChange }) {
    const { code, params = {} } = strategy;
    const f = (l, k, s = "1") => (<div className="flex flex-col"><label className="text-[8px] text-zinc-600 uppercase font-bold ml-1 mb-1">{l}</label><input type="number" step={s} value={params[k] || ""} onChange={(e) => onChange({...params, [k]: parseFloat(e.target.value)})} className="bg-zinc-950 border border-zinc-700 rounded-lg px-2 py-1 text-[9px] text-amber-500 outline-none font-mono" /></div>);
    return (<div className="grid grid-cols-2 gap-2">{code === "rsi_threshold" && <>{f("Length", "rsi_length")}{f("OS", "oversold")}</>}{code === "stoch" && <>{f("K", "k_period")}{f("D", "d_period")}</>}</div>);
}

export default TradingBotContainer;
