import React, { useState, useEffect } from "react";
import axios from "axios";
// ✅ FIXED: Relative path to bypass Vercel/Vite alias errors
import { useBacktest } from "../hooks/useBacktest.js";
import { ChartIndependent } from "../components/ChartIndependent.jsx";
import { 
    Play, BarChart3, Layers, Plus, Trash2, 
    Shield, Globe, Cpu, Zap, Activity 
} from "lucide-react";

const API_BASE = import.meta.env.VITE_API_URL || "http://74.208.28.77:8000";

// --- STYLING CONSTANTS ---
const inputClass = "w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:border-amber-500 transition-all text-xs outline-none";
const labelClass = "text-[10px] text-zinc-500 uppercase font-bold mb-1 block ml-1";

// --- FULL STRATEGY POOL (10 ENGINES) ---
const STRAT_POOL = [
    { name: "RSI Threshold", code: "rsi_threshold" },
    { name: "SMA Crossover", code: "sma_crossover" },
    { name: "EMA Cloud (Ribbon)", code: "ema_cloud" },
    { name: "MACD Crossover", code: "macd_crossover" },
    { name: "ATR Breakout", code: "atr_breakout" },
    { name: "Bollinger Fade", code: "bb_fade" },
    { name: "SuperTrend Follow", code: "supertrend" },
    { name: "Volume Profile", code: "vol_profile" },
    { name: "Stochastic OS/OB", code: "stoch_oscillator" },
    { name: "ADX Trend Strength", code: "adx_filter" }
];

export default function Backtests() {
    const { runNewBacktest, runComboBacktest } = useBacktest();
    const [activeTab, setActiveTab] = useState('single');
    const [isSimulating, setIsSimulating] = useState(false);
    const [backtestResults, setBacktestResults] = useState(null);
    const [progress, setProgress] = useState(0);
    const [statusMsg, setStatusMsg] = useState("");

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
        strategies: [{ code: "rsi_threshold", params: { rsi_length: 12, oversold: 22, overbought: 80 } }],
        params: {
            model_type: "stacking",
            long_threshold: 0.81,
            short_threshold: 0.95,
            take_profit: 0.052,
            stop_loss: 0.019,
            tslAtrMult: 3.0,
            atrPeriod: 14,
            minAdxLevel: 25,
            commission: 0.004,
            slippage: 0.0008,
            squeeze_threshold: 0.003,
            vol_multiplier: 1.05,
            session_start: 0,
            session_end: 23
        }
    });

    // --- STRATEGY HANDLERS ---
    const addStrategy = () => {
        setData(prev => ({
            ...prev,
            strategies: [...prev.strategies, { code: "rsi_threshold", params: { rsi_length: 14, oversold: 30, overbought: 70 } }]
        }));
    };

    const removeStrategy = (index) => {
        setData(prev => ({
            ...prev,
            strategies: prev.strategies.filter((_, i) => i !== index)
        }));
    };

    const updateStrategy = (index, updatedStrat) => {
        const newStrats = [...data.strategies];
        newStrats[index] = updatedStrat;
        setData(prev => ({ ...prev, strategies: newStrats }));
    };

    const onParamChange = (name, val) => setData(p => ({ ...p, params: { ...p.params, [name]: val } }));

    // --- POLLING ENGINE ---
    useEffect(() => {
        let poller;
        if (isSimulating) {
            poller = setInterval(async () => {
                try {
                    const res = await axios.get(`${API_BASE}/api/backtest/status`);
                    if (res.data) {
                        setProgress(res.data.progress || 0);
                        setStatusMsg(res.data.status || "Processing...");
                        if (res.data.progress >= 100 || res.data.status === "COMPLETED") {
                            setIsSimulating(false);
                            clearInterval(poller);
                        }
                    }
                } catch (e) { console.error("Status poll failed"); }
            }, 1500);
        }
        return () => clearInterval(poller);
    }, [isSimulating]);

    const handleRun = async (e) => {
        e.preventDefault();
        setBacktestResults(null);
        setIsSimulating(true);
        setProgress(1);
        try {
            const runner = activeTab === 'combo' ? runComboBacktest : runNewBacktest;
            const res = await runner(data);
            if (res) setBacktestResults(res);
        } catch (err) {
            setStatusMsg("Simulation failed");
            setIsSimulating(false);
        }
    };

    return (
        <div className="min-h-screen bg-zinc-950 text-white font-sans selection:bg-amber-500/30">
            {/* 🟡 HEADER */}
            <header className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-sm sticky top-0 z-50 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/10">
                        <BarChart3 className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-sm font-black uppercase tracking-widest">Sovereign Quant Suite</h1>
                        <p className="text-[10px] text-zinc-500 font-mono">CORE_ENGINE: NEO-V7-PRO</p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 px-3 py-1 bg-zinc-900 rounded-full border border-zinc-800 text-[10px] font-mono text-zinc-400">
                        <Activity className="w-3 h-3 text-emerald-500" />
                        GATEWAY: {API_BASE.includes('localhost') ? 'LOCAL' : 'REMOTE'}
                    </div>
                </div>
            </header>

            <div className="max-w-[1800px] mx-auto p-6 grid grid-cols-12 gap-8">
                {/* 🟠 CONFIGURATION SIDEBAR */}
                <div className="col-span-12 lg:col-span-4 xl:col-span-3">
                    <div className="bg-zinc-900/40 border border-zinc-800 rounded-3xl p-6 sticky top-24">
                        <div className="flex gap-1 p-1 bg-zinc-800/50 rounded-xl mb-8">
                            {['single', 'combo'].map(tab => (
                                <button key={tab} type="button" onClick={() => setActiveTab(tab)}
                                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-[10px] font-black uppercase transition-all ${activeTab === tab ? 'bg-zinc-700 text-white shadow-xl' : 'text-zinc-500 hover:text-zinc-300'}`}>
                                    {tab === 'single' ? <Zap className="w-3 h-3"/> : <Layers className="w-3 h-3"/>}
                                    {tab === 'single' ? 'Atomic' : 'Hybrid'}
                                </button>
                            ))}
                        </div>

                        <form onSubmit={handleRun} className="space-y-8 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
                            {/* AI CONFIG */}
                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-2"><Cpu className="w-3 h-3 text-violet-400"/><h4 className="text-[10px] text-violet-400 font-black uppercase tracking-widest">Neural Gates</h4></div>
                                    <select value={data.mlMode} onChange={(e)=>setData({...data, mlMode: e.target.value})} className="bg-zinc-800 text-[9px] rounded-md px-2 py-1 outline-none text-violet-300 border border-violet-500/20">
                                        <option value="off">BYPASS</option><option value="on">ACTIVE</option>
                                    </select>
                                </div>
                                {data.mlMode === "on" && (
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="col-span-2">
                                            <label className={labelClass}>Architecture</label>
                                            <select value={data.params.model_type} onChange={(e)=>onParamChange('model_type', e.target.value)} className={inputClass}>
                                                {AI_ARCHITECTURES.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                                            </select>
                                        </div>
                                        <div><label className={labelClass}>Long Gate</label><input type="number" step="0.01" value={data.params.long_threshold} onChange={(e)=>onParamChange('long_threshold', parseFloat(e.target.value))} className={inputClass}/></div>
                                        <div><label className={labelClass}>Short Gate</label><input type="number" step="0.01" value={data.params.short_threshold} onChange={(e)=>onParamChange('short_threshold', parseFloat(e.target.value))} className={inputClass}/></div>
                                    </div>
                                )}
                            </div>

                            {/* SIGNAL ENGINE (DYNAMC) */}
                            <div className="space-y-4 border-t border-zinc-800 pt-6">
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-2"><Layers className="w-3 h-3 text-emerald-400"/><h4 className="text-[10px] text-emerald-400 font-black uppercase tracking-widest">Logic Ensemble</h4></div>
                                    {activeTab === 'combo' && <button type="button" onClick={addStrategy} className="p-1 hover:bg-emerald-500 hover:text-zinc-950 rounded-md transition-all border border-emerald-500/20"><Plus className="w-3 h-3"/></button>}
                                </div>
                                {activeTab === 'single' ? (
                                    <div className="space-y-3">
                                        <select value={data.code} onChange={(e)=>setData({...data, code: e.target.value})} className={inputClass}>
                                            {STRAT_POOL.map(s => <option key={s.code} value={s.code}>{s.name}</option>)}
                                        </select>
                                        <StrategyParamInputs strategy={data} onChange={(p) => setData({...data, params: {...data.params, ...p}})} />
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {data.strategies.map((s, i) => (
                                            <div key={i} className="p-4 bg-zinc-800/30 rounded-2xl border border-zinc-700/50 relative group">
                                                <div className="flex justify-between mb-3">
                                                    <select value={s.code} onChange={(e)=>updateStrategy(i, {...s, code:e.target.value})} className="bg-transparent text-[10px] font-black outline-none text-emerald-400">
                                                        {STRAT_POOL.map(opt => <option key={opt.code} value={opt.code}>{opt.name}</option>)}
                                                    </select>
                                                    {data.strategies.length > 1 && <button type="button" onClick={()=>removeStrategy(i)} className="text-zinc-600 hover:text-rose-500 transition-all"><Trash2 className="w-3 h-3"/></button>}
                                                </div>
                                                <StrategyParamInputs strategy={s} onChange={(p) => updateStrategy(i, {...s, params: p})} />
                                            </div>
                                        ))}
                                        <select value={data.combinationRule} onChange={(e)=>setData({...data, combinationRule:e.target.value})} className={inputClass}>
                                            <option value="OR">Rule: OR (Any Signal)</option><option value="AND">Rule: AND (Unanimous)</option>
                                        </select>
                                    </div>
                                )}
                            </div>

                            {/* EXECUTION SHIELD */}
                            <div className="space-y-4 border-t border-zinc-800 pt-6">
                                <div className="flex items-center gap-2"><Shield className="w-3 h-3 text-amber-400"/><h4 className="text-[10px] text-amber-400 font-black uppercase tracking-widest">Execution Shield</h4></div>
                                <div className="grid grid-cols-2 gap-x-3 gap-y-4">
                                    <div><label className={labelClass}>TSL Mult</label><input type="number" step="0.1" value={data.params.tslAtrMult} onChange={(e)=>onParamChange('tslAtrMult', parseFloat(e.target.value))} className={inputClass}/></div>
                                    <div><label className={labelClass}>ATR Period</label><input type="number" value={data.params.atrPeriod} onChange={(e)=>onParamChange('atrPeriod', parseInt(e.target.value))} className={inputClass}/></div>
                                    <div><label className={labelClass}>TP %</label><input type="number" step="0.001" value={data.params.take_profit} onChange={(e)=>onParamChange('take_profit', parseFloat(e.target.value))} className={inputClass}/></div>
                                    <div><label className={labelClass}>SL %</label><input type="number" step="0.001" value={data.params.stop_loss} onChange={(e)=>onParamChange('stop_loss', parseFloat(e.target.value))} className={inputClass}/></div>
                                    <div><label className={labelClass}>ADX Floor</label><input type="number" value={data.params.minAdxLevel} onChange={(e)=>onParamChange('minAdxLevel', parseInt(e.target.value))} className={inputClass}/></div>
                                    <div><label className={labelClass}>Vol Fuel</label><input type="number" step="0.01" value={data.params.vol_multiplier} onChange={(e)=>onParamChange('vol_multiplier', parseFloat(e.target.value))} className={inputClass}/></div>
                                </div>
                            </div>

                            <button type="submit" disabled={isSimulating} className="w-full flex items-center justify-center gap-3 py-5 bg-amber-500 hover:bg-amber-400 disabled:bg-zinc-800 disabled:text-zinc-600 text-zinc-950 font-black uppercase text-xs rounded-2xl transition-all shadow-xl shadow-amber-500/10 active:scale-[0.98]">
                                {isSimulating ? <div className="w-4 h-4 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin" /> : <Play className="w-4 h-4 fill-current" />}
                                {isSimulating ? 'Crunching...' : 'Initiate Simulation'}
                            </button>
                        </form>
                    </div>
                </div>

                {/* 📈 RESULTS VIEWPORT */}
                <div className="col-span-12 lg:col-span-8 xl:col-span-9 space-y-8">
                    {backtestResults ? (
                        <div className="animate-in fade-in slide-in-from-bottom-5 duration-700">
                            <MetricsPanel metrics={backtestResults.metrics || {}} />
                            <div className="bg-zinc-900/40 border border-zinc-800 rounded-[40px] p-8 shadow-2xl">
                                <div className="h-[650px] w-full">
                                    <ChartIndependent results={backtestResults} symbol={data.symbol} />
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="h-[85vh] flex flex-col items-center justify-center border-2 border-dashed border-zinc-800 rounded-[48px] bg-zinc-900/5">
                            {isSimulating ? (
                                <ProgressIndicator progress={progress} statusMsg={statusMsg} symbol={data.symbol} />
                            ) : (
                                <div className="text-center space-y-6 opacity-30 group cursor-default">
                                    <div className="w-20 h-20 mx-auto bg-zinc-800 rounded-3xl flex items-center justify-center group-hover:scale-110 transition-transform">
                                        <BarChart3 className="w-10 h-10 text-zinc-600" />
                                    </div>
                                    <div className="space-y-2">
                                        <h3 className="font-black uppercase tracking-[0.2em] text-sm text-white">Simulation Idle</h3>
                                        <p className="text-xs text-zinc-500">Awaiting Quantitative Parameters</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// --- INTEGRATED SUB-COMPONENTS ---

function StrategyParamInputs({ strategy, onChange }) {
    const { code, params = {} } = strategy;
    const update = (k, v) => onChange({ ...params, [k]: v });
    const field = (l, k, s = "1") => (
        <div className="flex flex-col">
            <label className={labelClass}>{l}</label>
            <input type="number" step={s} value={params[k] ?? ""} onChange={(e)=>update(k, parseFloat(e.target.value))} className="bg-zinc-950/50 border border-zinc-700/50 rounded-lg px-2 py-1.5 text-[10px] text-amber-400 outline-none" />
        </div>
    );

    return (
        <div className="grid grid-cols-2 gap-3 mt-3">
            {code === "rsi_threshold" && <>{field("RSI Len", "rsi_length")}{field("Oversold", "oversold")}{field("Overbought", "overbought")}</>}
            {code === "sma_crossover" && <>{field("Fast SMA", "fast_sma")}{field("Slow SMA", "slow_sma")}</>}
            {code === "ema_cloud" && <>{field("Lead EMA", "lead_ema")}{field("Base EMA", "base_ema")}</>}
            {code === "macd_crossover" && <>{field("Fast", "fast")}{field("Slow", "slow")}{field("Signal", "signal")}</>}
            {code === "atr_breakout" && <>{field("ATR Len", "atr_length")}{field("Mult", "multiplier", "0.1")}</>}
            {code === "bb_fade" && <>{field("Period", "bb_period")}{field("Std Dev", "bb_std", "0.1")}</>}
            {code === "supertrend" && <>{field("ATR Len", "st_atr")}{field("Factor", "st_factor", "0.1")}</>}
            {code === "vol_profile" && <>{field("Lookback", "vp_lookback")}{field("Value Area", "vp_va", "5")}</>}
            {code === "stoch_oscillator" && <>{field("%K Len", "stoch_k")}{field("%D Smooth", "stoch_d")}</>}
            {code === "adx_filter" && <>{field("ADX Len", "adx_len")}{field("Min ADX", "adx_min")}</>}
        </div>
    );
}

function MarketConfig({ data, setData, params, onParamChange }) {
    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2"><Globe className="w-3 h-3 text-cyan-400"/><h4 className="text-[10px] text-cyan-400 font-black uppercase tracking-widest">Environment</h4></div>
            <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                    <label className={labelClass}>Asset</label>
                    <select value={data.symbol} onChange={(e)=>setData({...data, symbol:e.target.value})} className={inputClass}>
                        <option value="SOL-USD">SOL-USD (Evolved)</option>
                        <option value="BTC-USD">BTC-USD (Heavy)</option>
                        <option value="ETH-USD">ETH-USD (Short)</option>
                        <option value="PEPE-USD">PEPE-USD (New)</option>
                    </select>
                </div>
                <div><label className={labelClass}>Cash</label><input type="number" value={data.initialBalance} onChange={(e)=>setData({...data, initialBalance: parseFloat(e.target.value)})} className={inputClass}/></div>
                <div><label className={labelClass}>Risk %</label><input type="number" step="0.1" value={data.risk_percentage} onChange={(e)=>setData({...data, risk_percentage: parseFloat(e.target.value)})} className={inputClass}/></div>
            </div>
        </div>
    );
}

function MetricsPanel({ metrics }) {
    const s = [
        { l: "Net ROI", v: `${(metrics.roi || 0).toFixed(2)}%`, c: "text-emerald-400" },
        { l: "Win Rate", v: `${(metrics.winRate || 0).toFixed(1)}%`, c: "text-violet-400" },
        { l: "Max Drawdown", v: `${(metrics.maxDrawdown || 0).toFixed(2)}%`, c: "text-rose-500" },
        { l: "Prof. Factor", v: (metrics.profitFactor || 0).toFixed(2), c: "text-amber-400" }
    ];
    return (
        <div className="grid grid-cols-4 gap-6">
            {s.map((stat, i) => (
                <div key={i} className="bg-zinc-900/60 border border-zinc-800 p-6 rounded-3xl text-center shadow-lg">
                    <p className="text-[10px] uppercase font-black text-zinc-500 mb-2 tracking-widest">{stat.l}</p>
                    <p className={`text-2xl font-mono font-bold ${stat.c}`}>{stat.v}</p>
                </div>
            ))}
        </div>
    );
}

function ProgressIndicator({ progress, statusMsg, symbol }) {
    return (
        <div className="w-full max-w-sm space-y-6 animate-in fade-in zoom-in duration-500">
            <div className="flex justify-between items-end">
                <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase text-amber-500 tracking-[0.2em]">Simulation Status</span>
                    <span className="text-white text-lg font-black">{symbol}</span>
                </div>
                <span className="text-3xl font-mono font-bold text-white">{progress}%</span>
            </div>
            <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden border border-zinc-700/50">
                <div className="h-full bg-gradient-to-r from-amber-600 to-amber-400 transition-all duration-700 ease-out shadow-[0_0_15px_rgba(245,158,11,0.3)]" style={{ width: `${progress}%` }} />
            </div>
            <p className="text-[10px] font-mono text-zinc-500 text-center uppercase tracking-widest animate-pulse">{statusMsg || "Awaiting Engine..."}</p>
        </div>
    );
}

const AI_ARCHITECTURES = [
  { id: "stacking", name: "Council Consensus" },
  { id: "XGBoost", name: "XGBoost (Boosted Trees)" },
  { id: "RandomForest", name: "RandomForest" },
  { id: "Transformer", name: "Transformer (Attention)" }
];
