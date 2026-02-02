import React, { useState, useEffect } from "react";
import axios from "axios";
// ✅ FIXED: Relative path to bypass Vercel/Vite alias errors
import { useBacktest } from "../hooks/useBacktest.js";
import { ChartIndependent } from "../components/ChartIndependent.jsx";
import { 
    Play, BarChart3, Layers, Plus, Trash2, 
    Shield, Globe, Cpu, Zap, Activity, Percent
} from "lucide-react";

const API_BASE = import.meta.env.VITE_API_URL || "http://74.208.28.77:8000";

// --- STYLING ---
const inputClass = "w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:border-amber-500 transition-all text-xs outline-none";
const labelClass = "text-[10px] text-zinc-500 uppercase font-bold mb-1 block ml-1";

// --- 🎯 MASTER STRATEGY DEFAULTS ---
const DEFAULT_STRATEGY_PARAMS = {
    rsi_threshold: { rsi_length: 14, oversold: 30, overbought: 70 },
    sma_crossover: { fast_sma: 50, slow_sma: 200 },
    ema_cloud: { lead_ema: 20, base_ema: 50 },
    macd_crossover: { fast: 12, slow: 26, signal: 9 },
    atr_breakout: { atr_length: 14, multiplier: 1.5 },
    bb_fade: { bb_period: 20, bb_std: 2.0 },
    supertrend: { st_atr: 10, st_factor: 3.0 },
    vol_profile: { vp_lookback: 24, vp_va: 70 },
    stoch_oscillator: { stoch_k: 14, stoch_d: 3 },
    adx_filter: { adx_len: 14, adx_min: 25 }
};

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

// --- 🛠️ CHART DIAGNOSTIC COMPONENT ---
const ChartInspector = ({ results }) => {
    useEffect(() => {
        if (results) {
            console.group("📊 SOVEREIGN CHART DIAGNOSTICS");
            const curve = results.equityCurve || results.equity_curve;
            if (!curve) {
                console.error("❌ MISSING DATA: Neither 'equityCurve' nor 'equity_curve' found.");
            } else {
                console.log(`✅ FOUND CURVE: ${curve.length} data points.`);
                console.log("First Point Sample:", curve[0]);
            }
            console.groupEnd();
        }
    }, [results]);

    if (!results) return null;
    const curve = results.equityCurve || results.equity_curve || [];

    return (
        <div className="p-4 bg-zinc-900/60 border border-amber-500/20 rounded-2xl font-mono text-[9px] mb-6">
            <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                <h3 className="text-amber-500 font-black uppercase tracking-widest">Data Integrity Report</h3>
            </div>
            <div className="grid grid-cols-3 gap-4">
                <div><p className="text-zinc-500">CURVE_KEY:</p><p className="text-zinc-300 font-bold">{results.equityCurve ? "equityCurve" : results.equity_curve ? "equity_curve" : "MISSING"}</p></div>
                <div><p className="text-zinc-500">POINTS:</p><p className="text-zinc-300 font-bold">{curve.length}</p></div>
                <div><p className="text-zinc-500">TIME_VALID:</p><p className={curve[0]?.time ? "text-emerald-400" : "text-rose-500"}>{curve[0]?.time ? "YES" : "NO"}</p></div>
                <div className="col-span-3 border-t border-zinc-800 pt-2">
                    <p className="text-zinc-500 mb-1">RAW_SAMPLE:</p>
                    <pre className="text-amber-400/80 bg-black/40 p-2 rounded-lg overflow-x-auto">
                        {JSON.stringify(curve[0], null, 2)}
                    </pre>
                </div>
            </div>
        </div>
    );
};

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
        strategies: [{ 
            code: "rsi_threshold", 
            params: { ...DEFAULT_STRATEGY_PARAMS.rsi_threshold } 
        }],
        params: {
            model_type: "stacking",
            long_threshold: 0.81,
            short_threshold: 0.95,
            take_profit: 0.052,
            stop_loss: 0.019,
            tslAtrMult: 3.0,
            atrPeriod: 14,
            minAdxLevel: 25,
            commission: 0.004, // 0.4% Fee
            slippage: 0.0008,   // 0.08% Slippage
            squeeze_threshold: 0.003,
            vol_multiplier: 1.05,
            session_start: 0,
            session_end: 23,
            ...DEFAULT_STRATEGY_PARAMS.rsi_threshold 
        }
    });

    const handleAtomicCodeChange = (newCode) => {
        setData(prev => ({
            ...prev,
            code: newCode,
            params: { ...prev.params, ...DEFAULT_STRATEGY_PARAMS[newCode] }
        }));
    };

    const updateStrategy = (index, updatedStrat) => {
        const newStrats = [...data.strategies];
        if (newStrats[index].code !== updatedStrat.code) {
            updatedStrat.params = { ...DEFAULT_STRATEGY_PARAMS[updatedStrat.code] };
        }
        newStrats[index] = updatedStrat;
        setData(prev => ({ ...prev, strategies: newStrats }));
    };

    const addStrategy = () => {
        setData(prev => ({
            ...prev,
            strategies: [...prev.strategies, { code: "rsi_threshold", params: { ...DEFAULT_STRATEGY_PARAMS.rsi_threshold } }]
        }));
    };

    const removeStrategy = (index) => {
        setData(prev => ({ ...prev, strategies: prev.strategies.filter((_, i) => i !== index) }));
    };

    const onParamChange = (name, val) => setData(p => ({ ...p, params: { ...p.params, [name]: val } }));

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
            <header className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-sm sticky top-0 z-50 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg">
                        <BarChart3 className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-sm font-black uppercase tracking-widest">Sovereign Quant Suite</h1>
                        <p className="text-[10px] text-zinc-500 font-mono text-xs opacity-50">ENGINE: NEO-V7</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 px-3 py-1 bg-zinc-900 rounded-full border border-zinc-800 text-[10px] font-mono text-zinc-400">
                    <Activity className="w-3 h-3 text-emerald-500" />
                    GATEWAY: {API_BASE.includes('localhost') ? 'LOCAL' : 'REMOTE'}
                </div>
            </header>

            <div className="max-w-[1800px] mx-auto p-6 grid grid-cols-12 gap-8">
                <div className="col-span-12 lg:col-span-4 xl:col-span-3">
                    <div className="bg-zinc-900/40 border border-zinc-800 rounded-3xl p-6 sticky top-24">
                        <div className="flex gap-1 p-1 bg-zinc-800/50 rounded-xl mb-8">
                            {['single', 'combo'].map(tab => (
                                <button key={tab} type="button" onClick={() => setActiveTab(tab)}
                                    className={`flex-1 py-2.5 px-4 rounded-lg text-[10px] font-black uppercase transition-all ${activeTab === tab ? 'bg-zinc-700 text-white shadow-xl' : 'text-zinc-500 hover:text-zinc-300'}`}>
                                    {tab === 'single' ? 'Atomic' : 'Hybrid'}
                                </button>
                            ))}
                        </div>

                        <form onSubmit={handleRun} className="space-y-8 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
                            <AIConfig mlMode={data.mlMode} setMlMode={(m)=>setData({...data, mlMode:m})} params={data.params} onParamChange={onParamChange} />
                            
                            <div className="space-y-4 border-t border-zinc-800 pt-6">
                                <div className="flex justify-between items-center">
                                    <h4 className="text-[10px] text-emerald-400 font-black uppercase tracking-widest">Logic Ensemble</h4>
                                    {activeTab === 'combo' && (
                                        <button type="button" onClick={addStrategy} className="p-1.5 bg-emerald-500/10 hover:bg-emerald-500 hover:text-zinc-950 text-emerald-500 rounded-lg transition-all border border-emerald-500/20">
                                            <Plus className="w-3.5 h-3.5" />
                                        </button>
                                    )}
                                </div>
                                {activeTab === 'single' ? (
                                    <div className="space-y-3">
                                        <select value={data.code} onChange={(e) => handleAtomicCodeChange(e.target.value)} className={inputClass}>
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
                                                    {data.strategies.length > 1 && (
                                                        <button type="button" onClick={()=>removeStrategy(i)} className="text-zinc-600 hover:text-rose-500"><Trash2 className="w-3.5 h-3.5"/></button>
                                                    )}
                                                </div>
                                                <StrategyParamInputs strategy={s} onChange={(p) => updateStrategy(i, {...s, params: p})} />
                                            </div>
                                        ))}
                                        <select value={data.combinationRule} onChange={(e)=>setData({...data, combinationRule:e.target.value})} className={inputClass}>
                                            <option value="OR">OR Logic</option><option value="AND">AND Logic</option>
                                        </select>
                                    </div>
                                )}
                            </div>

                            {/* 💰 UPDATED: EXECUTION SHIELD WITH FEES */}
                            <ExecutionParams params={data.params} onParamChange={onParamChange} />
                            <MarketConfig data={data} setData={setData} />

                            <button type="submit" disabled={isSimulating} className="w-full flex items-center justify-center gap-3 py-5 bg-amber-500 hover:bg-amber-400 disabled:bg-zinc-800 text-zinc-950 font-black uppercase text-xs rounded-2xl transition-all shadow-xl">
                                {isSimulating ? 'Crunching...' : 'Initiate Simulation'}
                            </button>
                        </form>
                    </div>
                </div>

                <div className="col-span-12 lg:col-span-8 xl:col-span-9 space-y-8">
                    {backtestResults ? (
                        <div className="animate-in fade-in slide-in-from-bottom-5 duration-700 space-y-8">
                            <MetricsPanel metrics={backtestResults.metrics || {}} />
                            <ChartInspector results={backtestResults} />
                            <div className="bg-zinc-900/40 border border-zinc-800 rounded-[40px] p-8 shadow-2xl">
                                <div className="h-[650px] w-full">
                                    <ChartIndependent results={backtestResults} symbol={data.symbol} />
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="h-[85vh] flex flex-col items-center justify-center border-2 border-dashed border-zinc-800 rounded-[48px] bg-zinc-900/5 text-center">
                            {isSimulating ? <ProgressIndicator progress={progress} statusMsg={statusMsg} symbol={data.symbol} /> : <div className="opacity-30"><BarChart3 className="w-20 h-20 mx-auto text-zinc-800" /><h3 className="font-black uppercase tracking-widest text-sm mt-4">Simulation Idle</h3></div>}
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

function AIConfig({ mlMode, setMlMode, params, onParamChange }) {
    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-2"><Cpu className="w-3 h-3 text-violet-400"/><h4 className="text-[10px] text-violet-400 font-black uppercase tracking-widest">Neural Gates</h4></div>
                <select value={mlMode} onChange={(e)=>setMlMode(e.target.value)} className="bg-zinc-800 text-[9px] rounded-md px-2 py-1 text-violet-300">
                    <option value="off">BYPASS</option><option value="on">ACTIVE</option>
                </select>
            </div>
            {mlMode === "on" && (
                <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2"><label className={labelClass}>Architecture</label><select value={params.model_type} onChange={(e)=>onParamChange('model_type', e.target.value)} className={inputClass}><option value="stacking">Council Consensus</option><option value="XGBoost">XGBoost Engine</option><option value="RandomForest">RandomForest</option><option value="Transformer">Transformer</option></select></div>
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
                <div><label className={labelClass}>TSL Mult</label><input type="number" step="0.1" value={params.tslAtrMult} onChange={(e)=>onParamChange('tslAtrMult', parseFloat(e.target.value))} className={inputClass}/></div>
                <div><label className={labelClass}>ATR Period</label><input type="number" value={params.atrPeriod} onChange={(e)=>onParamChange('atrPeriod', parseInt(e.target.value))} className={inputClass}/></div>
                <div><label className={labelClass}>TP %</label><input type="number" step="0.001" value={params.take_profit} onChange={(e)=>onParamChange('take_profit', parseFloat(e.target.value))} className={inputClass}/></div>
                <div><label className={labelClass}>SL %</label><input type="number" step="0.001" value={params.stop_loss} onChange={(e)=>onParamChange('stop_loss', parseFloat(e.target.value))} className={inputClass}/></div>
                
                {/* 💰 NEW: FEE OPTIONS */}
                <div className="col-span-2 border-t border-zinc-800/50 mt-2 pt-4">
                     <div className="flex items-center gap-2 mb-3"><Percent className="w-3 h-3 text-rose-400"/><h4 className="text-[9px] text-rose-400 font-black uppercase tracking-widest">Exchange Constraints</h4></div>
                     <div className="grid grid-cols-2 gap-3">
                        <div><label className={labelClass}>Commission %</label><input type="number" step="0.001" value={params.commission} onChange={(e)=>onParamChange('commission', parseFloat(e.target.value))} className={inputClass}/></div>
                        <div><label className={labelClass}>Slippage %</label><input type="number" step="0.0001" value={params.slippage} onChange={(e)=>onParamChange('slippage', parseFloat(e.target.value))} className={inputClass}/></div>
                     </div>
                </div>
            </div>
        </div>
    );
}

function MarketConfig({ data, setData }) {
    return (
        <div className="space-y-4 border-t border-zinc-800 pt-6">
            <div className="flex items-center gap-2"><Globe className="w-3 h-3 text-cyan-400"/><h4 className="text-[10px] text-cyan-400 font-black uppercase tracking-widest">Environment</h4></div>
            <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2"><label className={labelClass}>Asset</label><select value={data.symbol} onChange={(e)=>setData({...data, symbol:e.target.value})} className={inputClass}><option value="SOL-USD">SOL-USD</option><option value="BTC-USD">BTC-USD</option><option value="ETH-USD">ETH-USD</option></select></div>
                <div><label className={labelClass}>Cash</label><input type="number" value={data.initialBalance} onChange={(e)=>setData({...data, initialBalance: parseFloat(e.target.value)})} className={inputClass}/></div>
                <div><label className={labelClass}>Risk %</label><input type="number" step="0.1" value={data.risk_percentage} onChange={(e)=>setData({...data, risk_percentage: parseFloat(e.target.value)})} className={inputClass}/></div>
            </div>
        </div>
    );
}

function MetricsPanel({ metrics }) {
    const s = [{ l: "Net ROI", v: `${(metrics.roi || 0).toFixed(2)}%`, c: "text-emerald-400" }, { l: "Win Rate", v: `${(metrics.winRate || 0).toFixed(1)}%`, c: "text-violet-400" }, { l: "Max Drawdown", v: `${(metrics.maxDrawdown || 0).toFixed(2)}%`, c: "text-rose-500" }, { l: "Prof. Factor", v: (metrics.profitFactor || 0).toFixed(2), c: "text-amber-400" }];
    return (<div className="grid grid-cols-4 gap-6">{s.map((stat, i) => (<div key={i} className="bg-zinc-900/60 border border-zinc-800 p-6 rounded-3xl text-center shadow-lg"><p className="text-[10px] uppercase font-black text-zinc-500 mb-2 tracking-widest">{stat.l}</p><p className={`text-2xl font-mono font-bold ${stat.c}`}>{stat.v}</p></div>))}</div>);
}

function ProgressIndicator({ progress, statusMsg, symbol }) {
    return (<div className="w-full max-w-sm space-y-6 text-center"><div className="flex justify-between items-end"><span className="text-white text-lg font-black">{symbol}</span><span className="text-3xl font-mono font-bold text-white">{progress}%</span></div><div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden border border-zinc-700/50"><div className="h-full bg-gradient-to-r from-amber-600 to-amber-400 transition-all duration-700" style={{ width: `${progress}%` }} /></div><p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest animate-pulse">{statusMsg || "Processing..."}</p></div>);
}
