import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { useBacktest } from "../hooks/useBacktest.js";
import { ChartIndependent } from "../components/ChartIndependent.jsx";
import { 
    Play, BarChart3, Layers, Plus, Trash2, 
    Shield, Globe, Cpu, Zap, Activity, Percent, Calendar, Wallet
} from "lucide-react";

const VITE_API = import.meta.env.VITE_API_URL || "https://neov6backend.onrender.com";
const API_BASE = VITE_API.endsWith('/api') ? VITE_API : `${VITE_API}/api`;

const inputClass = "w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:border-amber-500 transition-all text-xs outline-none";
const labelClass = "text-[10px] text-zinc-500 uppercase font-bold mb-1 block ml-1";

const DEFAULT_STRATEGY_PARAMS = {
    rsi_threshold: { rsi_length: 14, oversold: 30, overbought: 70 },
    sma_crossover: { fast_sma: 50, slow_sma: 200 },
    supertrend: { st_atr: 10, st_factor: 3.0 },
    macd_crossover: { fast: 12, slow: 26, signal: 9 },
    atr_breakout: { atr_length: 14, multiplier: 1.5 },
    bb_fade: { bb_period: 20, bb_std: 2.0 }
};

const STRAT_POOL = [
    { name: "RSI Threshold", code: "rsi_threshold" },
    { name: "SMA Crossover", code: "sma_crossover" },
    { name: "SuperTrend Follow", code: "supertrend" },
    { name: "MACD Crossover", code: "macd_crossover" },
    { name: "ATR Breakout", code: "atr_breakout" }
];

export default function Backtests() {
    const { runNewBacktest, runComboBacktest } = useBacktest();
    const [activeTab, setActiveTab] = useState('single');
    const [isSimulating, setIsSimulating] = useState(false);
    const [backtestResults, setBacktestResults] = useState(null);
    const [progress, setProgress] = useState(0);
    const [statusMsg, setStatusMsg] = useState("");
    
    // 🎯 NEW: Track the specific Job ID for the poller
    const [currentJobId, setCurrentJobId] = useState(null);

    const [data, setData] = useState({
        symbol: "SOL-USD",
        timeframe: "1h",
        startDate: "2025-06-01",
        endDate: "2026-01-31",
        initialBalance: 1000,
        risk_percentage: 1.0,
        mlMode: "on",
        combinationRule: "OR",
        code: "rsi_threshold",
        strategies: [{ code: "rsi_threshold", params: { ...DEFAULT_STRATEGY_PARAMS.rsi_threshold } }],
        params: {
            model_type: "stacking",
            long_threshold: 0.81,
            short_threshold: 0.95,
            take_profit: 0.052,
            stop_loss: 0.019,
            commission: 0.004,
            slippage: 0.0008,
            ...DEFAULT_STRATEGY_PARAMS.rsi_threshold 
        }
    });

    // --- 📡 POLLING ENGINE (JOB-ID SYNCED) ---
    useEffect(() => {
        let poller;
        if (isSimulating && currentJobId) {
            poller = setInterval(async () => {
                try {
                    const token = localStorage.getItem('token');
                    
                    // ✅ FIXED: Sending jobId instead of userId to match new backend schema
                    const res = await axios.get(`${API_BASE}/backtest/status`, {
                        params: { jobId: currentJobId },
                        headers: { 'Authorization': `Bearer ${token}` }
                    });

                    if (res.data) {
                        setProgress(res.data.progress || 0);
                        setStatusMsg(res.data.status || "Analyzing Market...");
                        if (res.data.progress >= 100 || res.data.status === "COMPLETED") {
                            setIsSimulating(false);
                            clearInterval(poller);
                        }
                    }
                } catch (e) { 
                    console.error("Poller Error:", e.response?.data?.message || e.message);
                }
            }, 1500);
        }
        return () => clearInterval(poller);
    }, [isSimulating, currentJobId]);

    // --- 🚀 EXECUTION HANDLER ---
    const handleRun = async (e) => {
        e.preventDefault();
        setBacktestResults(null);
        setProgress(1);
        setStatusMsg("Initializing Engine...");
        
        const userStr = localStorage.getItem('user');
        const dynamicUserId = userStr ? JSON.parse(userStr)._id : null;
        const payload = { ...data, userId: dynamicUserId };

        try {
            // 1. Kick off simulation
            const runner = activeTab === 'combo' ? runComboBacktest : runNewBacktest;
            const res = await runner(payload);
            
            // 🎯 NEW: Grab the Job ID if simulation starts but isn't finished yet
            if (res?.jobId) {
                setCurrentJobId(res.jobId);
                setIsSimulating(true);
            }

            // 2. Process final data if it returns instantly
            if (res && res.equityCurve) {
                const formattedCurve = res.equityCurve.map(pt => ({
                    time: Math.floor(new Date(pt.time).getTime() / 1000),
                    value: pt.balance
                }));
                setBacktestResults({ ...res, equityCurve: formattedCurve });
                setIsSimulating(false);
            }
        } catch (err) {
            console.error("Run failed:", err);
            setIsSimulating(false);
        }
    };

    const handleAtomicCodeChange = (code) => setData(p => ({ ...p, code, params: { ...p.params, ...DEFAULT_STRATEGY_PARAMS[code] } }));
    const onParamChange = (k, v) => setData(p => ({ ...p, params: { ...p.params, [k]: v } }));

    return (
        <div className="min-h-screen bg-zinc-950 text-white font-sans">
            <header className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-sm sticky top-0 z-50 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg"><BarChart3 className="w-5 h-5 text-white" /></div>
                    <div><h1 className="text-sm font-black uppercase tracking-widest text-white">Sovereign Quant Suite</h1></div>
                </div>
                <div className="px-3 py-1 bg-zinc-900 rounded-full border border-zinc-800 text-[10px] font-mono text-zinc-400">
                    <Activity className="w-3 h-3 inline mr-2 text-emerald-500" /> GATEWAY: SYNCED
                </div>
            </header>

            <div className="max-w-[1800px] mx-auto p-6 grid grid-cols-12 gap-8">
                <div className="col-span-12 lg:col-span-4 xl:col-span-3">
                    <div className="bg-zinc-900/40 border border-zinc-800 rounded-3xl p-6 sticky top-24">
                        <div className="flex gap-1 p-1 bg-zinc-800/50 rounded-xl mb-8">
                            {['single', 'combo'].map(tab => (
                                <button key={tab} type="button" onClick={() => setActiveTab(tab)}
                                    className={`flex-1 py-2.5 rounded-lg text-[10px] font-black uppercase transition-all ${activeTab === tab ? 'bg-zinc-700 text-white shadow-xl' : 'text-zinc-500'}`}>{tab === 'single' ? 'Atomic' : 'Hybrid'}</button>
                            ))}
                        </div>

                        <form onSubmit={handleRun} className="space-y-8 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
                            <AIConfig mlMode={data.mlMode} setMlMode={(m)=>setData({...data, mlMode:m})} params={data.params} onParamChange={onParamChange} />
                            
                            <div className="space-y-4 border-t border-zinc-800 pt-6">
                                <div className="flex justify-between items-center">
                                    <h4 className="text-[10px] text-emerald-400 font-black uppercase tracking-widest">Logic Ensemble</h4>
                                    {activeTab === 'combo' && <button type="button" onClick={() => setData(p => ({ ...p, strategies: [...p.strategies, { code: "rsi_threshold", params: { ...DEFAULT_STRATEGY_PARAMS.rsi_threshold } }] }))} className="p-1.5 bg-emerald-500/10 text-emerald-500 rounded-lg border border-emerald-500/20"><Plus className="w-3.5 h-3.5" /></button>}
                                </div>
                                {activeTab === 'single' ? (
                                    <div className="space-y-3">
                                        <select value={data.code} onChange={(e) => handleAtomicCodeChange(e.target.value)} className={inputClass}>{STRAT_POOL.map(s => <option key={s.code} value={s.code}>{s.name}</option>)}</select>
                                        <StrategyParamInputs strategy={data} onChange={(p) => setData({...data, params: {...data.params, ...p}})} />
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {data.strategies.map((s, i) => (
                                            <div key={i} className="p-4 bg-zinc-800/30 rounded-2xl border border-zinc-700/50 relative">
                                                <div className="flex justify-between mb-3">
                                                    <select value={s.code} onChange={(e) => {
                                                        const newStrats = [...data.strategies];
                                                        newStrats[i] = { code: e.target.value, params: DEFAULT_STRATEGY_PARAMS[e.target.value] };
                                                        setData({...data, strategies: newStrats});
                                                    }} className="bg-transparent text-[10px] font-black outline-none text-emerald-400">{STRAT_POOL.map(opt => <option key={opt.code} value={opt.code}>{opt.name}</option>)}</select>
                                                    {data.strategies.length > 1 && <button type="button" onClick={() => setData(p => ({ ...p, strategies: p.strategies.filter((_, idx) => idx !== i) }))} className="text-zinc-600 hover:text-rose-500"><Trash2 className="w-3.5 h-3.5" /></button>}
                                                </div>
                                                <StrategyParamInputs strategy={s} onChange={(p) => {
                                                    const newStrats = [...data.strategies];
                                                    newStrats[i].params = p;
                                                    setData({...data, strategies: newStrats});
                                                }} />
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <ExecutionParams params={data.params} onParamChange={onParamChange} />
                            
                            <div className="space-y-4 border-t border-zinc-800 pt-6">
                                <div className="flex items-center gap-2"><Globe className="w-3 h-3 text-cyan-400"/><h4 className="text-[10px] text-cyan-400 font-black uppercase tracking-widest">Market Environment</h4></div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="col-span-2"><label className={labelClass}>Asset</label><select value={data.symbol} onChange={(e)=>setData({...data, symbol:e.target.value})} className={inputClass}><option value="SOL-USD">SOL-USD</option><option value="BTC-USD">BTC-USD</option><option value="ETH-USD">ETH-USD</option></select></div>
                                    <div><label className={labelClass}>Initial Cash</label><input type="number" value={data.initialBalance} onChange={(e)=>setData({...data, initialBalance: parseFloat(e.target.value)})} className={inputClass}/></div>
                                    <div><label className={labelClass}>Risk %</label><input type="number" step="0.1" value={data.risk_percentage} onChange={(e)=>setData({...data, risk_percentage: parseFloat(e.target.value)})} className={inputClass}/></div>
                                    <div><label className={labelClass}>Start</label><input type="date" value={data.startDate} onChange={(e)=>setData({...data, startDate: e.target.value})} className={inputClass}/></div>
                                    <div><label className={labelClass}>End</label><input type="date" value={data.endDate} onChange={(e)=>setData({...data, endDate: e.target.value})} className={inputClass}/></div>
                                </div>
                            </div>

                            <button type="submit" disabled={isSimulating} className="w-full py-5 bg-amber-500 hover:bg-amber-400 disabled:bg-zinc-800 text-zinc-950 font-black uppercase text-xs rounded-2xl shadow-xl transition-all">
                                {isSimulating ? 'Crunching...' : 'Initiate Simulation'}
                            </button>
                        </form>
                    </div>
                </div>

                <div className="col-span-12 lg:col-span-8 xl:col-span-9 space-y-8">
                    {backtestResults ? (
                        <div className="animate-in fade-in slide-in-from-bottom-5 duration-700 space-y-8">
                            <MetricsPanel metrics={backtestResults.metrics || {}} />
                            <div className="bg-zinc-900/40 border border-zinc-800 rounded-[40px] p-8 shadow-2xl h-[650px]">
                                <ChartIndependent results={backtestResults} symbol={data.symbol} />
                            </div>
                        </div>
                    ) : (
                        <div className="h-[85vh] flex flex-col items-center justify-center border-2 border-dashed border-zinc-800 rounded-[48px] bg-zinc-900/5">
                            {isSimulating ? <ProgressIndicator progress={progress} statusMsg={statusMsg} symbol={data.symbol} /> : <div className="opacity-30 text-center"><BarChart3 className="w-20 h-20 mx-auto mb-4" /><p className="uppercase tracking-widest text-xs">Waiting for Quantitative Parameters</p></div>}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// --- SUB-COMPONENTS ---
function StrategyParamInputs({ strategy, onChange }) {
    const { code, params = {} } = strategy;
    const update = (k, v) => onChange({ ...params, [k]: v });
    const f = (l, k, s = "1") => (<div className="flex flex-col"><label className={labelClass}>{l}</label><input type="number" step={s} value={params[k] ?? ""} onChange={(e)=>update(k, parseFloat(e.target.value))} className="bg-zinc-950/50 border border-zinc-700/50 rounded-lg px-2 py-1.5 text-[10px] text-amber-400 outline-none" /></div>);
    return (
        <div className="grid grid-cols-2 gap-3 mt-3">
            {code === "rsi_threshold" && <>{f("RSI Len", "rsi_length")}{f("Oversold", "oversold")}{f("Overbought", "overbought")}</>}
            {code === "sma_crossover" && <>{f("Fast SMA", "fast_sma")}{f("Slow SMA", "slow_sma")}</>}
            {code === "supertrend" && <>{f("ATR Len", "st_atr")}{f("Factor", "st_factor", "0.1")}</>}
            {code === "macd_crossover" && <>{f("Fast", "fast")}{f("Slow", "slow")}{f("Signal", "signal")}</>}
        </div>
    );
}

function AIConfig({ mlMode, setMlMode, params, onParamChange }) {
    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-2"><Cpu className="w-3 h-3 text-violet-400"/><h4 className="text-[10px] text-violet-400 font-black uppercase tracking-widest">Neural Gates</h4></div>
                <select value={mlMode} onChange={(e)=>setMlMode(e.target.value)} className="bg-zinc-800 text-[9px] rounded-md px-2 py-1 text-violet-300"><option value="off">BYPASS</option><option value="on">ACTIVE</option></select>
            </div>
            {mlMode === "on" && (
                <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2"><label className={labelClass}>Architecture</label><select value={params.model_type} onChange={(e)=>onParamChange('model_type', e.target.value)} className={inputClass}><option value="stacking">Council Consensus</option><option value="Transformer">Transformer</option></select></div>
                    <div><label className={labelClass}>Long Gate</label><input type="number" step="0.01" value={params.long_threshold} onChange={(e)=>onParamChange('long_threshold', parseFloat(e.target.value))} className={inputClass}/></div>
                    <div><label className={labelClass}>Short Gate</label><input type="number" step="0.01" value={params.short_threshold} onChange={(e)=>onParamChange('short_threshold', parseFloat(e.target.value))} className={inputClass}/></div>
                </div>
            )}
        </div>
    );
}

function ExecutionParams({ params, onParamChange }) {
    return (
        <div className="space-y-4 border-t border-zinc-800 pt-6">
            <div className="flex items-center gap-2"><Shield className="w-3 h-3 text-amber-400"/><h4 className="text-[10px] text-amber-400 font-black uppercase tracking-widest">Execution Shield</h4></div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-4">
                <div><label className={labelClass}>TP %</label><input type="number" step="0.001" value={params.take_profit} onChange={(e)=>onParamChange('take_profit', parseFloat(e.target.value))} className={inputClass}/></div>
                <div><label className={labelClass}>SL %</label><input type="number" step="0.001" value={params.stop_loss} onChange={(e)=>onParamChange('stop_loss', parseFloat(e.target.value))} className={inputClass}/></div>
                <div><label className={labelClass}>Fee %</label><input type="number" step="0.001" value={params.commission} onChange={(e)=>onParamChange('commission', parseFloat(e.target.value))} className={inputClass}/></div>
                <div><label className={labelClass}>Slip %</label><input type="number" step="0.0001" value={params.slippage} onChange={(e)=>onParamChange('slippage', parseFloat(e.target.value))} className={inputClass}/></div>
            </div>
        </div>
    );
}

function MetricsPanel({ metrics }) {
    const s = [{ l: "ROI", v: `${(metrics.roi || 0).toFixed(2)}%`, c: "text-emerald-400" }, { l: "WIN", v: `${(metrics.winRate || 0).toFixed(1)}%`, c: "text-violet-400" }, { l: "DRAW", v: `${(metrics.maxDrawdown || 0).toFixed(2)}%`, c: "text-rose-500" }, { l: "PF", v: (metrics.profitFactor || 0).toFixed(2), c: "text-amber-400" }];
    return (<div className="grid grid-cols-4 gap-6">{s.map((st, i) => (<div key={i} className="bg-zinc-900/60 border border-zinc-800 p-6 rounded-3xl text-center shadow-lg"><p className="text-[10px] uppercase font-black text-zinc-500 mb-2 tracking-widest">{st.l}</p><p className={`text-2xl font-mono font-bold ${st.c}`}>{st.v}</p></div>))}</div>);
}

function ProgressIndicator({ progress, statusMsg, symbol }) {
    return (<div className="w-full max-w-sm space-y-6 text-center animate-in zoom-in"><div className="flex justify-between items-end"><span className="text-white text-lg font-black">{symbol}</span><span className="text-3xl font-mono font-bold text-white">{progress}%</span></div><div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden border border-zinc-700/50"><div className="h-full bg-gradient-to-r from-amber-600 to-amber-400 transition-all duration-700" style={{ width: `${progress}%` }} /></div><p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest animate-pulse">{statusMsg}</p></div>);
}
