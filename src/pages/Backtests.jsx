import React, { useState, useEffect } from "react";
import axios from "axios";
import { useBacktest } from "@/hooks/useBacktest.js";
import { ChartIndependent } from "@/components/ChartIndependent.jsx";
import { Play, BarChart3, Layers, Plus, Trash2, Shield, Globe, Cpu } from "lucide-react";

const API_BASE = import.meta.env.VITE_API_URL;

// --- SHARED STYLES ---
const inputClass = "w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:border-amber-500 transition-all text-xs outline-none";
const labelClass = "text-[10px] text-zinc-500 uppercase font-bold mb-1 block";

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
        <div className="min-h-screen bg-zinc-950 text-white font-sans">
            <header className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-sm sticky top-0 z-50 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg flex items-center justify-center">
                        <BarChart3 className="w-4 h-4 text-white" />
                    </div>
                    <div>
                        <h1 className="text-sm font-bold uppercase tracking-wider">Strategy Backtester</h1>
                        <p className="text-[10px] text-zinc-500 uppercase tracking-tighter font-mono">NEO-V7 Sovereign Engine</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-500">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                    LINK: {API_BASE ? "SECURE" : "LOCAL_ONLY"}
                </div>
            </header>

            <div className="max-w-[1800px] mx-auto p-6 grid grid-cols-12 gap-8">
                {/* CONFIGURATION SIDEBAR */}
                <div className="col-span-12 lg:col-span-4 xl:col-span-3 space-y-6">
                    <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-5 sticky top-24">
                        <div className="flex gap-1 p-1 bg-zinc-800/50 rounded-xl mb-6">
                            {['single', 'combo'].map(tab => (
                                <button key={tab} type="button" onClick={() => setActiveTab(tab)}
                                    className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-[10px] font-black uppercase transition-all ${activeTab === tab ? 'bg-zinc-700 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}>
                                    {tab === 'single' ? <BarChart3 className="w-3 h-3"/> : <Layers className="w-3 h-3"/>}
                                    {tab === 'single' ? 'Atomic' : 'Hybrid'}
                                </button>
                            ))}
                        </div>

                        <form onSubmit={handleRun} className="space-y-6 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
                            <AIConfig mlMode={data.mlMode} setMlMode={(m)=>setData({...data, mlMode:m})} params={data.params} onParamChange={onParamChange} />
                            
                            <div className="border-t border-zinc-800 pt-6">
                                <StrategySelector activeTab={activeTab} data={data} setData={setData} strategies={data.strategies} addStrategy={addStrategy} removeStrategy={removeStrategy} updateStrategy={updateStrategy} />
                            </div>

                            <div className="border-t border-zinc-800 pt-6">
                                <ExecutionParams params={data.params} onParamChange={onParamChange} />
                            </div>

                            <div className="border-t border-zinc-800 pt-6">
                                <MarketConfig data={data} setData={setData} params={data.params} onParamChange={onParamChange} />
                            </div>

                            <button type="submit" disabled={isSimulating} className="w-full flex items-center justify-center gap-2 py-4 bg-amber-500 hover:bg-amber-400 disabled:bg-zinc-800 disabled:text-zinc-600 text-zinc-950 font-black uppercase text-xs rounded-xl transition-all shadow-lg shadow-amber-500/10 active:scale-95">
                                {isSimulating ? <div className="w-3 h-3 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin" /> : <Play className="w-3 h-3 fill-current" />}
                                {isSimulating ? 'Processing...' : 'Run Simulation'}
                            </button>
                        </form>
                    </div>
                </div>

                {/* RESULTS VIEWPORT */}
                <div className="col-span-12 lg:col-span-8 xl:col-span-9 space-y-6">
                    {backtestResults ? (
                        <div className="animate-in fade-in slide-in-from-bottom-5 duration-700">
                            <MetricsPanel metrics={backtestResults.metrics || {}} />
                            <div className="bg-zinc-900/40 border border-zinc-800 rounded-3xl p-6">
                                <div className="h-[600px] w-full">
                                    <ChartIndependent results={backtestResults} symbol={data.symbol} />
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="h-[80vh] flex flex-col items-center justify-center border-2 border-dashed border-zinc-800 rounded-3xl bg-zinc-900/10">
                            {isSimulating ? <ProgressIndicator progress={progress} statusMsg={statusMsg} symbol={data.symbol} /> : <div className="text-center opacity-20"><BarChart3 className="w-16 h-16 mx-auto mb-4" /><h3 className="font-black uppercase tracking-widest text-sm">Sandbox Idle</h3></div>}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// --- SUB-COMPONENTS (INTEGRATED) ---

function AIConfig({ mlMode, setMlMode, params, onParamChange }) {
    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-2"><Cpu className="w-3 h-3 text-violet-400"/><h4 className="text-[10px] text-violet-400 font-black uppercase tracking-widest">Neural Filter</h4></div>
                <select value={mlMode} onChange={(e)=>setMlMode(e.target.value)} className="bg-zinc-800 text-[9px] rounded px-2 py-1 outline-none text-violet-300 border border-violet-500/20">
                    <option value="off">Bypass</option><option value="on">Active</option>
                </select>
            </div>
            {mlMode === "on" && (
                <div className="grid grid-cols-2 gap-3 animate-in slide-in-from-top-2">
                    <div className="col-span-2">
                        <label className={labelClass}>Architecture</label>
                        <select value={params.model_type} onChange={(e)=>onParamChange('model_type', e.target.value)} className={inputClass}>
                            <option value="stacking">Council Consensus</option>
                            <option value="XGBoost">XGBoost Engine</option>
                        </select>
                    </div>
                    <div><label className={labelClass}>Long Gate</label><input type="number" step="0.01" value={params.long_threshold} onChange={(e)=>onParamChange('long_threshold', parseFloat(e.target.value))} className={inputClass}/></div>
                    <div><label className={labelClass}>Short Gate</label><input type="number" step="0.01" value={params.short_threshold} onChange={(e)=>onParamChange('short_threshold', parseFloat(e.target.value))} className={inputClass}/></div>
                </div>
            )}
        </div>
    );
}

function StrategySelector({ activeTab, data, strategies, addStrategy, removeStrategy, updateStrategy }) {
    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-2"><Layers className="w-3 h-3 text-emerald-400"/><h4 className="text-[10px] text-emerald-400 font-black uppercase tracking-widest">Logic Layers</h4></div>
                {activeTab === 'combo' && <button type="button" onClick={addStrategy} className="p-1 hover:bg-emerald-500 hover:text-zinc-950 rounded-md transition-all border border-emerald-500/20"><Plus className="w-3 h-3"/></button>}
            </div>
            {activeTab === 'single' ? (
                <div className="space-y-3">
                    <select value={data.code} onChange={(e)=>setData({...data, code: e.target.value})} className={inputClass}>
                        {STRAT_POOL.map(s => <option key={s.code} value={s.code}>{s.name}</option>)}
                    </select>
                </div>
            ) : (
                <div className="space-y-3">
                    {strategies.map((s, i) => (
                        <div key={i} className="p-3 bg-zinc-800/30 rounded-xl border border-zinc-700/50 relative group">
                            <div className="flex justify-between mb-2">
                                <select value={s.code} onChange={(e)=>updateStrategy(i, {...s, code:e.target.value})} className="bg-transparent text-[10px] font-bold outline-none text-emerald-400">
                                    {STRAT_POOL.map(opt => <option key={opt.code} value={opt.code}>{opt.name}</option>)}
                                </select>
                                <button type="button" onClick={()=>removeStrategy(i)} className="text-zinc-600 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 className="w-3 h-3"/></button>
                            </div>
                        </div>
                    ))}
                    <select value={data.combinationRule} onChange={(e)=>setData({...data, combinationRule:e.target.value})} className={inputClass}>
                        <option value="OR">Rule: OR (Aggressive)</option><option value="AND">Rule: AND (Conservative)</option>
                    </select>
                </div>
            )}
        </div>
    );
}

function ExecutionParams({ params, onParamChange }) {
    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2"><Shield className="w-3 h-3 text-amber-400"/><h4 className="text-[10px] text-amber-400 font-black uppercase tracking-widest">Execution Shield</h4></div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-4">
                <div><label className={labelClass}>TSL Mult</label><input type="number" step="0.1" value={params.tslAtrMult} onChange={(e)=>onParamChange('tslAtrMult', parseFloat(e.target.value))} className={inputClass}/></div>
                <div><label className={labelClass}>ATR Period</label><input type="number" value={params.atrPeriod} onChange={(e)=>onParamChange('atrPeriod', parseInt(e.target.value))} className={inputClass}/></div>
                <div><label className={labelClass}>TP %</label><input type="number" step="0.001" value={params.take_profit} onChange={(e)=>onParamChange('take_profit', parseFloat(e.target.value))} className={inputClass}/></div>
                <div><label className={labelClass}>SL %</label><input type="number" step="0.001" value={params.stop_loss} onChange={(e)=>onParamChange('stop_loss', parseFloat(e.target.value))} className={inputClass}/></div>
                <div><label className={labelClass}>ADX Floor</label><input type="number" value={params.minAdxLevel} onChange={(e)=>onParamChange('minAdxLevel', parseInt(e.target.value))} className={inputClass}/></div>
                <div><label className={labelClass}>Vol Fuel</label><input type="number" step="0.01" value={params.vol_multiplier} onChange={(e)=>onParamChange('vol_multiplier', parseFloat(e.target.value))} className={inputClass}/></div>
            </div>
        </div>
    );
}

function MarketConfig({ data, setData, params, onParamChange }) {
    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2"><Globe className="w-3 h-3 text-cyan-400"/><h4 className="text-[10px] text-cyan-400 font-black uppercase tracking-widest">Environment</h4></div>
            <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2"><label className={labelClass}>Asset</label>
                    <select value={data.symbol} onChange={(e)=>setData({...data, symbol:e.target.value})} className={inputClass}>
                        <option value="SOL-USD">SOL-USD</option><option value="BTC-USD">BTC-USD</option><option value="ETH-USD">ETH-USD</option>
                    </select>
                </div>
                <div><label className={labelClass}>Cash</label><input type="number" value={data.initialBalance} onChange={(e)=>setData({...data, initialBalance: parseFloat(e.target.value)})} className={inputClass}/></div>
                <div><label className={labelClass}>Risk %</label><input type="number" step="0.1" value={data.risk_percentage} onChange={(e)=>setData({...data, risk_percentage: parseFloat(e.target.value)})} className={inputClass}/></div>
            </div>
        </div>
    );
}

function MetricsPanel({ metrics }) {
    const stats = [
        { l: "Net ROI", v: `${(metrics.roi || 0).toFixed(2)}%`, c: "text-emerald-400" },
        { l: "Win Rate", v: `${(metrics.winRate || 0).toFixed(1)}%`, c: "text-amber-400" },
        { l: "Drawdown", v: `${(metrics.maxDrawdown || 0).toFixed(2)}%`, c: "text-rose-500" },
        { l: "Profit Factor", v: (metrics.profitFactor || 0).toFixed(2), c: "text-cyan-400" }
    ];
    return (
        <div className="grid grid-cols-4 gap-4">
            {stats.map((s, i) => (
                <div key={i} className="bg-zinc-900/40 border border-zinc-800 p-4 rounded-2xl text-center">
                    <p className="text-[9px] uppercase font-black text-zinc-500 mb-1">{s.l}</p>
                    <p className={`text-xl font-mono font-bold ${s.c}`}>{s.v}</p>
                </div>
            ))}
        </div>
    );
}

function ProgressIndicator({ progress, statusMsg, symbol }) {
    return (
        <div className="w-full max-w-sm space-y-4">
            <div className="flex justify-between items-end">
                <span className="text-[10px] font-black uppercase text-amber-500">{symbol} Processing</span>
                <span className="text-2xl font-mono font-bold text-white">{progress}%</span>
            </div>
            <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                <div className="h-full bg-amber-500 transition-all duration-500" style={{ width: `${progress}%` }} />
            </div>
            <p className="text-[9px] font-mono text-zinc-500 text-center uppercase tracking-tighter">{statusMsg}</p>
        </div>
    );
}

const STRAT_POOL = [
    { name: "RSI Threshold", code: "rsi_threshold" },
    { name: "SMA Crossover", code: "sma_crossover" },
    { name: "ATR Breakout", code: "atr_breakout" }
];
