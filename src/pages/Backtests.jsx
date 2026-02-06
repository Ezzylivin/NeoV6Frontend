import React, { useState, useEffect, useRef, useMemo } from "react";
import axios from "axios";
import { useBacktest } from "../hooks/useBacktest.js";
import { ChartIndependent } from "../components/ChartIndependent.jsx";
import { PerformanceChart } from "../components/PerformanceChart.jsx";
import { 
    Play, BarChart3, Layers, Plus, Trash2, 
    Shield, Globe, Cpu, Zap, Activity, Percent, Calendar, Filter, TrendingUp, Settings2, Footprints, Wallet
} from "lucide-react";

const VITE_API = import.meta.env.VITE_API_URL || "https://neov6backend.onrender.com";
const API_BASE = VITE_API.endsWith('/api') ? VITE_API : `${VITE_API}/api`;

const inputClass = "w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:border-amber-500 transition-all text-xs outline-none";
const labelClass = "text-[10px] text-zinc-500 uppercase font-bold mb-1 block ml-1";

// --- 🎯 CONFIGURATION: 10 STRATEGIES ---
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

const DEFAULT_STRATEGY_PARAMS = {
    rsi_threshold: { rsi_length: 14, oversold: 30, overbought: 70 },
    sma_crossover: { fast_sma: 50, slow_sma: 200 },
    supertrend: { st_atr: 10, st_factor: 3.0 },
    macd_crossover: { fast: 12, slow: 26, signal: 9 },
    atr_breakout: { atr_length: 14, multiplier: 1.5 },
    bb_fade: { bb_period: 20, bb_std: 2.0 },
    stoch: { k_period: 14, d_period: 3, slowing: 3 },
    ema_cloud: { fast_ema: 9, slow_ema: 21 },
    pa_breakout: { lookback: 20, buffer: 0.01 },
    vol_profile: { vol_ma: 20, threshold: 1.5 }
};

export default function Backtests() {
    const { runNewBacktest, runComboBacktest } = useBacktest();
    const [activeTab, setActiveTab] = useState('single');
    const [view, setView] = useState('execution'); 
    const [isSimulating, setIsSimulating] = useState(false);
    const [backtestResults, setBacktestResults] = useState(null);
    const [progress, setProgress] = useState(0);
    const [statusMsg, setStatusMsg] = useState("");
    const [currentJobId, setCurrentJobId] = useState(null);

    const [data, setData] = useState({
        symbol: "SOL-USD",
        timeframe: "1h",
        startDate: "2025-06-01",
        endDate: "2026-01-31",
        initialBalance: 1000,
        risk_percentage: 1.0,
        mlMode: "on",
        combinationRule: "OR", // Default rule
        code: "rsi_threshold",
        strategies: [{ code: "rsi_threshold", params: { ...DEFAULT_STRATEGY_PARAMS.rsi_threshold } }],
        advanced_filters: { trend_filter: "ema_200", vol_min: 0, atr_filter: 1.5, trade_window: "all" },
        params: {
            model_type: "stacking",
            long_threshold: 0.81,
            short_threshold: 0.95,
            take_profit: 0.052,
            stop_loss: 0.019,
            trailing_stop: 0.015,
            commission: 0.004,
            slippage: 0.0008,
            ...DEFAULT_STRATEGY_PARAMS.rsi_threshold 
        }
    });

    // --- 📡 POLLING ENGINE ---
    useEffect(() => {
        let poller;
        if (isSimulating && currentJobId) {
            poller = setInterval(async () => {
                try {
                    const token = localStorage.getItem('token');
                    const res = await axios.get(`${API_BASE}/backtest/status`, {
                        params: { jobId: currentJobId },
                        headers: { 'Authorization': `Bearer ${token}` }
                    });

                    if (res.data) {
                        setProgress(res.data.progress || 0);
                        setStatusMsg(res.data.status || "Analyzing...");

                        if (res.data.status === "COMPLETED") {
                            console.group("✅ BACKTEST COMPLETED");
                            clearInterval(poller);
                            const finalRes = await axios.get(`${API_BASE}/backtest/results/${currentJobId}`, {
                                headers: { 'Authorization': `Bearer ${token}` }
                            });
                            
                            const formattedCurve = finalRes.data.equityCurve.map(pt => ({
                                time: Math.floor(new Date(pt.time).getTime() / 1000),
                                value: pt.balance
                            })).sort((a,b) => a.time - b.time);

                            setBacktestResults({ ...finalRes.data, equityCurve: formattedCurve });
                            setIsSimulating(false);
                            console.groupEnd();
                        }
                    }
                } catch (e) { console.error("Poller Error:", e); }
            }, 1500);
        }
        return () => clearInterval(poller);
    }, [isSimulating, currentJobId]);

    const handleRun = async (e) => {
        e.preventDefault();
        console.group("🚀 BACKTEST START");
        setBacktestResults(null);
        setProgress(1);
        setStatusMsg("Initializing...");
        
        const dynamicUserId = JSON.parse(localStorage.getItem('user'))?._id;
        
        // Prepare Payload based on Tab
        let payload = { ...data, userId: dynamicUserId };

        if (activeTab === 'single') {
            // Remove Combo-specific fields
            const { strategies, combinationRule, ...rest } = payload;
            payload = rest;
        } else {
            // Hybrid Mode: Force code to 'hybrid_ensemble'
            const { code, ...rest } = payload;
            payload = { ...rest, code: 'hybrid_ensemble' };
        }

        console.log("📤 Sanitized Payload:", payload);
        console.groupEnd();

        try {
            const runner = activeTab === 'combo' ? runComboBacktest : runNewBacktest;
            const res = await runner(payload);
            if (res?.jobId) {
                setCurrentJobId(res.jobId);
                setIsSimulating(true);
            }
        } catch (err) { 
            console.error("Run failed:", err);
            setIsSimulating(false); 
        }
    };

    const handleAtomicCodeChange = (code) => {
        setData(p => ({ ...p, code, params: { ...p.params, ...DEFAULT_STRATEGY_PARAMS[code] } }));
    };

    return (
        <div className="min-h-screen bg-zinc-950 text-white font-sans p-6">
            <header className="max-w-[1800px] mx-auto mb-8 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/20">
                        <BarChart3 className="text-black w-6 h-6" />
                    </div>
                    <h1 className="text-sm font-black uppercase tracking-widest">Sovereign <span className="text-amber-500">Quant</span></h1>
                </div>
                <div className="flex gap-2 p-1 bg-zinc-900 rounded-xl border border-zinc-800">
                    {['single', 'combo'].map(tab => (
                        <button key={tab} type="button" onClick={() => setActiveTab(tab)}
                            className={`px-6 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${activeTab === tab ? 'bg-zinc-800 text-white shadow-xl' : 'text-zinc-500'}`}>
                            {tab === 'single' ? 'Atomic' : 'Hybrid'}
                        </button>
                    ))}
                </div>
            </header>

            <div className="max-w-[1800px] mx-auto grid grid-cols-12 gap-8">
                <div className="col-span-12 lg:col-span-3">
                    <div className="bg-zinc-900/40 border border-zinc-800 rounded-3xl p-6 sticky top-6 max-h-[90vh] overflow-y-auto custom-scrollbar">
                        <form onSubmit={handleRun} className="space-y-8">
                            <AIConfig 
                                mlMode={data.mlMode} 
                                setMlMode={(m)=>setData({...data, mlMode: m})} 
                                params={data.params} 
                                onParamChange={(k,v)=>setData(p=>({...p, params:{...p.params,[k]:v}}))} 
                            />
                            
                            <div className="space-y-4 border-t border-zinc-800 pt-6">
                                <div className="flex justify-between items-center">
                                    <h4 className="text-[10px] text-emerald-400 font-black uppercase tracking-widest">Logic Ensemble</h4>
                                    {activeTab === 'combo' && (
                                        <div className="flex gap-2">
                                            <select value={data.combinationRule} onChange={(e) => setData({...data, combinationRule: e.target.value})} className="bg-zinc-800 text-[9px] rounded-md px-2 py-1 text-emerald-400 border border-emerald-500/20 outline-none">
                                                <option value="OR">ANY (OR)</option>
                                                <option value="AND">ALL (AND)</option>
                                            </select>
                                            <button type="button" onClick={() => setData(p => ({ ...p, strategies: [...p.strategies, { code: "rsi_threshold", params: DEFAULT_STRATEGY_PARAMS.rsi_threshold }] }))} className="p-1 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-md">
                                                <Plus size={14} />
                                            </button>
                                        </div>
                                    )}
                                </div>
                                {activeTab === 'single' ? (
                                    <div className="space-y-3">
                                        <select value={data.code} onChange={(e) => handleAtomicCodeChange(e.target.value)} className={inputClass}>
                                            {STRAT_POOL.map(s => <option key={s.code} value={s.code}>{s.name}</option>)}
                                        </select>
                                        <StrategyParamInputs 
                                            strategy={{code: data.code, params: data.params}} 
                                            onChange={(p) => setData(p_old => ({...p_old, params: {...p_old.params, ...p}}))} 
                                        />
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {data.strategies.map((s, i) => (
                                            <div key={i} className="p-3 bg-zinc-800/30 rounded-xl border border-zinc-700">
                                                <div className="flex justify-between mb-2">
                                                    <select value={s.code} onChange={(e) => { 
                                                        const n = [...data.strategies]; 
                                                        n[i] = { code: e.target.value, params: DEFAULT_STRATEGY_PARAMS[e.target.value] }; 
                                                        setData({...data, strategies: n}); 
                                                    }} className="bg-transparent text-[10px] font-bold text-amber-500 outline-none">
                                                        {STRAT_POOL.map(o => <option key={o.code} value={o.code}>{o.name}</option>)}
                                                    </select>
                                                    <button type="button" onClick={() => setData(p => ({ ...p, strategies: p.strategies.filter((_, idx) => idx !== i) }))} className="text-zinc-500 hover:text-rose-500">
                                                        <Trash2 size={12}/>
                                                    </button>
                                                </div>
                                                <StrategyParamInputs strategy={s} onChange={(p) => { const n = [...data.strategies]; n[i].params = p; setData({...data, strategies: n}); }} />
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <AdvancedFilters 
                                filters={data.advanced_filters} 
                                onChange={(k,v)=>setData(p=>({...p, advanced_filters:{...p.advanced_filters,[k]:v}}))} 
                            />
                            
                            <div className="space-y-4 border-t border-zinc-800 pt-6">
                                <div className="flex items-center gap-2"><Shield size={14} className="text-amber-500"/><h4 className="text-[10px] text-amber-500 font-black uppercase tracking-widest">Execution Shield</h4></div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div><label className={labelClass}>TP %</label><input type="number" step="0.001" value={data.params.take_profit} onChange={(e)=>setData(p=>({...p,params:{...p.params,take_profit:parseFloat(e.target.value)}}))} className={inputClass}/></div>
                                    <div><label className={labelClass}>SL %</label><input type="number" step="0.001" value={data.params.stop_loss} onChange={(e)=>setData(p=>({...p,params:{...p.params,stop_loss:parseFloat(e.target.value)}}))} className={inputClass}/></div>
                                    <div className="col-span-2"><label className={labelClass}>Trailing Stop %</label><input type="number" step="0.001" value={data.params.trailing_stop} onChange={(e)=>setData(p=>({...p,params:{...p.params,trailing_stop:parseFloat(e.target.value)}}))} className={inputClass}/></div>
                                </div>
                            </div>

                            <div className="space-y-4 border-t border-zinc-800 pt-6">
                                <div className="flex items-center gap-2"><Globe size={14} className="text-cyan-400"/><h4 className="text-[10px] text-cyan-400 font-black uppercase tracking-widest">Market</h4></div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="col-span-2"><label className={labelClass}>Asset</label><select value={data.symbol} onChange={(e)=>setData({...data, symbol: e.target.value})} className={inputClass}><option value="SOL-USD">SOL-USD</option><option value="BTC-USD">BTC-USD</option></select></div>
                                    <div><label className={labelClass}>Start</label><input type="date" value={data.startDate} onChange={(e)=>setData({...data, startDate: e.target.value})} className={inputClass}/></div>
                                    <div><label className={labelClass}>End</label><input type="date" value={data.endDate} onChange={(e)=>setData({...data, endDate: e.target.value})} className={inputClass}/></div>
                                    <div><label className={labelClass}>Cash</label><input type="number" value={data.initialBalance} onChange={(e)=>setData({...data, initialBalance: parseFloat(e.target.value)})} className={inputClass}/></div>
                                    <div><label className={labelClass}>Risk %</label><input type="number" step="0.1" value={data.risk_percentage} onChange={(e)=>setData({...data, risk_percentage: parseFloat(e.target.value)})} className={inputClass}/></div>
                                </div>
                            </div>

                            <button type="submit" disabled={isSimulating} className="w-full py-4 bg-amber-500 text-zinc-950 font-black uppercase text-xs rounded-2xl hover:bg-amber-400 shadow-xl transition-all">
                                {isSimulating ? "Crunching..." : "Initiate Simulation"}
                            </button>
                        </form>
                    </div>
                </div>

                <div className="col-span-12 lg:col-span-9 space-y-6">
                    {backtestResults ? (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-5 duration-700">
                            <MetricsPanel metrics={backtestResults.metrics} />
                            <div className="bg-zinc-900 border border-zinc-800 rounded-[32px] overflow-hidden shadow-2xl">
                                <div className="flex bg-zinc-800/50 p-2 border-b border-zinc-800">
                                    <button onClick={() => setView('execution')} className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${view === 'execution' ? 'bg-zinc-700 text-white' : 'text-zinc-500'}`}>Execution</button>
                                    <button onClick={() => setView('performance')} className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${view === 'performance' ? 'bg-zinc-700 text-white' : 'text-zinc-500'}`}>Performance</button>
                                </div>
                                <div className="h-[600px] p-8">
                                    {view === 'execution' ? <ChartIndependent results={backtestResults} symbol={data.symbol} /> : <PerformanceChart results={backtestResults} />}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="h-[80vh] flex flex-col items-center justify-center border-2 border-dashed border-zinc-800 rounded-[48px] bg-zinc-900/10">
                            {isSimulating ? <ProgressIndicator progress={progress} statusMsg={statusMsg} /> : <div className="opacity-20 text-center"><BarChart3 size={64} className="mx-auto mb-4"/><p className="text-xs uppercase tracking-widest font-black">Awaiting Parameters</p></div>}
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
    const f = (l, k, s = "1") => (
        <div className="flex flex-col"><label className={labelClass}>{l}</label><input type="number" step={s} value={params[k] ?? ""} onChange={(e)=>onChange({...params, [k]: parseFloat(e.target.value)})} className="bg-zinc-950 border border-zinc-700 rounded-lg px-2 py-1 text-[10px] text-amber-500 outline-none" /></div>
    );
    return (
        <div className="grid grid-cols-2 gap-2 mt-2">
            {code === "rsi_threshold" && <>{f("RSI Len", "rsi_length")}{f("OB", "overbought")}{f("OS", "oversold")}</>}
            {code === "sma_crossover" && <>{f("Fast", "fast_sma")}{f("Slow", "slow_sma")}</>}
            {code === "supertrend" && <>{f("ATR", "st_atr")}{f("Factor", "st_factor", "0.1")}</>}
            {code === "macd_crossover" && <>{f("Fast", "fast")}{f("Slow", "slow")}{f("Signal", "signal")}</>}
            {code === "atr_breakout" && <>{f("ATR Len", "atr_length")}{f("Mult", "multiplier", "0.1")}</>}
            {code === "bb_fade" && <>{f("Period", "bb_period")}{f("Std", "bb_std", "0.1")}</>}
            {code === "stoch" && <>{f("K", "k_period")}{f("D", "d_period")}{f("Slow", "slowing")}</>}
            {code === "ema_cloud" && <>{f("Fast EMA", "fast_ema")}{f("Slow EMA", "slow_ema")}</>}
            {code === "pa_breakout" && <>{f("Lookback", "lookback")}{f("Buffer", "buffer", "0.001")}</>}
            {code === "vol_profile" && <>{f("Vol MA", "vol_ma")}{f("Thresh", "threshold", "0.1")}</>}
        </div>
    );
}

function AIConfig({ mlMode, setMlMode, params, onParamChange }) {
    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-2"><Cpu size={14} className="text-violet-400"/><h4 className="text-[10px] text-violet-400 font-black uppercase tracking-widest">Neural Gate</h4></div>
                <select value={mlMode} onChange={(e)=>setMlMode(e.target.value)} className="bg-zinc-800 text-[9px] rounded-md px-2 py-1"><option value="off">BYPASS</option><option value="on">ACTIVE</option></select>
            </div>
            {mlMode === "on" && (
                <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2"><label className={labelClass}>Architecture</label><select value={params.model_type} onChange={(e)=>onParamChange('model_type', e.target.value)} className={inputClass}><option value="stacking">Stacking</option><option value="Transformer">Transformer</option></select></div>
                    <div><label className={labelClass}>Long Gate</label><input type="number" step="0.01" value={params.long_threshold} onChange={(e)=>onParamChange('long_threshold', parseFloat(e.target.value))} className={inputClass}/></div>
                    <div><label className={labelClass}>Short Gate</label><input type="number" step="0.01" value={params.short_threshold} onChange={(e)=>onParamChange('short_threshold', parseFloat(e.target.value))} className={inputClass}/></div>
                </div>
            )}
        </div>
    );
}

function AdvancedFilters({ filters, onChange }) {
    return (
        <div className="space-y-4 border-t border-zinc-800 pt-6">
            <div className="flex items-center gap-2"><Filter size={14} className="text-indigo-400"/><h4 className="text-[10px] text-indigo-400 font-black uppercase tracking-widest">Sanity Filters</h4></div>
            <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2"><label className={labelClass}>Trend Filter</label><select value={filters.trend_filter} onChange={(e)=>onChange('trend_filter', e.target.value)} className={inputClass}><option value="none">None</option><option value="ema_200">200 EMA</option></select></div>
                <div><label className={labelClass}>Min Vol</label><input type="number" value={filters.vol_min} onChange={(e)=>onChange('vol_min', parseFloat(e.target.value))} className={inputClass}/></div>
                <div><label className={labelClass}>ATR Filter</label><input type="number" step="0.1" value={filters.atr_filter} onChange={(e)=>onChange('atr_filter', parseFloat(e.target.value))} className={inputClass}/></div>
            </div>
        </div>
    );
}

function MetricsPanel({ metrics }) {
    return (
        <div className="grid grid-cols-4 gap-4">
            {Object.entries(metrics || {}).map(([k, v]) => (
                <div key={k} className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl shadow-xl">
                    <p className="text-[10px] text-zinc-500 uppercase font-black mb-1">{k}</p>
                    <p className="text-2xl font-mono text-white">{typeof v === 'number' ? v.toFixed(2) : v}</p>
                </div>
            ))}
        </div>
    );
}

function ProgressIndicator({ progress, statusMsg }) {
    return (
        <div className="w-64 space-y-4 text-center">
            <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden border border-zinc-700">
                <div className="h-full bg-amber-500 transition-all duration-500" style={{ width: `${progress}%` }} />
            </div>
            <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-black animate-pulse">{statusMsg}</p>
        </div>
    );
}
