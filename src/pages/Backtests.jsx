import React, { useState, useEffect, useMemo } from "react";
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
        combinationRule: "OR",
        code: "rsi_threshold",
        strategies: [{ code: "rsi_threshold", params: { rsi_length: 14, oversold: 30, overbought: 70 } }],
        advanced_filters: { trend_filter: "ema_200", vol_min: 0, atr_filter: 1.5 },
        params: {
            model_type: "stacking", long_threshold: 0.81, short_threshold: 0.95,
            take_profit: 0.052, stop_loss: 0.019, trailing_stop: 0.015,
            rsi_length: 14, oversold: 30, overbought: 70
        }
    });

    // --- 📡 POLLING ENGINE WITH LOGS ---
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
                        setStatusMsg(res.data.status || "Processing...");

                        if (res.data.status === "COMPLETED") {
                            console.group("✅ BACKTEST COMPLETED");
                            console.log("Job ID:", currentJobId);
                            clearInterval(poller);
                            
                            const finalRes = await axios.get(`${API_BASE}/backtest/results/${currentJobId}`, {
                                headers: { 'Authorization': `Bearer ${token}` }
                            });
                            
                            console.log("📥 Final Result Payload:", finalRes.data);
                            
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
        
        const dynamicUserId = JSON.parse(localStorage.getItem('user'))?._id;
        let payload = { ...data, userId: dynamicUserId };

        // 🧪 Payload Sanitization Log
        if (activeTab === 'single') {
            const { strategies, combinationRule, ...rest } = payload;
            payload = rest;
            console.log("Mode: SINGLE (Atomic)");
        } else {
            const { code, ...rest } = payload;
            payload = { ...rest, code: 'hybrid_ensemble' };
            console.log("Mode: HYBRID (Combo)");
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
        } catch (err) { setIsSimulating(false); }
    };

    return (
        <div className="min-h-screen bg-zinc-950 text-white font-sans p-6">
            {/* Top Navigation */}
            <header className="max-w-[1800px] mx-auto mb-8 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center"><BarChart3 className="text-black w-6 h-6" /></div>
                    <h1 className="text-sm font-black uppercase tracking-widest">Sovereign <span className="text-amber-500">Quant</span></h1>
                </div>
                <div className="flex gap-2 p-1 bg-zinc-900 rounded-xl border border-zinc-800">
                    {['single', 'combo'].map(tab => (
                        <button key={tab} onClick={() => setActiveTab(tab)}
                            className={`px-6 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${activeTab === tab ? 'bg-zinc-800 text-white' : 'text-zinc-500'}`}>{tab === 'single' ? 'Atomic' : 'Hybrid'}</button>
                    ))}
                </div>
            </header>

            <div className="max-w-[1800px] mx-auto grid grid-cols-12 gap-8">
                {/* Sidebar Controls */}
                <div className="col-span-12 lg:col-span-3">
                    <div className="bg-zinc-900/40 border border-zinc-800 rounded-3xl p-6 sticky top-6 max-h-[90vh] overflow-y-auto custom-scrollbar">
                        <form onSubmit={handleRun} className="space-y-8">
                            
                            <AIConfig mlMode={data.mlMode} setMlMode={(m)=>setData({...data, mlMode: m})} params={data.params} onParamChange={(k,v)=>setData(p=>({...p, params:{...p.params,[k]:v}}))} />

                            {/* Restored: Market Env */}
                            <div className="space-y-4 border-t border-zinc-800 pt-6">
                                <div className="flex items-center gap-2"><Globe size={14} className="text-cyan-400"/><h4 className="text-[10px] text-cyan-400 font-black uppercase tracking-widest">Market Environment</h4></div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="col-span-2"><label className={labelClass}>Asset</label><select value={data.symbol} onChange={(e)=>setData({...data, symbol:e.target.value})} className={inputClass}><option value="SOL-USD">SOL-USD</option><option value="BTC-USD">BTC-USD</option></select></div>
                                    <div><label className={labelClass}>Start</label><input type="date" value={data.startDate} onChange={(e)=>setData({...data, startDate: e.target.value})} className={inputClass}/></div>
                                    <div><label className={labelClass}>End</label><input type="date" value={data.endDate} onChange={(e)=>setData({...data, endDate: e.target.value})} className={inputClass}/></div>
                                    <div><label className={labelClass}>Initial Cash</label><input type="number" value={data.initialBalance} onChange={(e)=>setData({...data, initialBalance: parseFloat(e.target.value)})} className={inputClass}/></div>
                                    <div><label className={labelClass}>Risk %</label><input type="number" step="0.1" value={data.risk_percentage} onChange={(e)=>setData({...data, risk_percentage: parseFloat(e.target.value)})} className={inputClass}/></div>
                                </div>
                            </div>

                            <div className="space-y-4 border-t border-zinc-800 pt-6">
                                <div className="flex justify-between items-center">
                                    <h4 className="text-[10px] text-emerald-400 font-black uppercase tracking-widest">Logic Ensemble</h4>
                                    {activeTab === 'combo' && <button type="button" onClick={() => setData(p => ({ ...p, strategies: [...p.strategies, { code: "rsi_threshold", params: {} }] }))} className="p-1 bg-emerald-500 text-black rounded"><Plus size={14} /></button>}
                                </div>
                                {activeTab === 'single' ? (
                                    <select value={data.code} onChange={(e) => handleAtomicCodeChange(e.target.value)} className={inputClass}>
                                        {STRAT_POOL.map(s => <option key={s.code} value={s.code}>{s.name}</option>)}
                                    </select>
                                ) : (
                                    /* Hybrid Logic list here */
                                    <div className="text-[9px] text-zinc-500 italic">Hybrid configuration active. Add strategies above.</div>
                                )}
                            </div>

                            {/* Execution Shield */}
                            <div className="space-y-4 border-t border-zinc-800 pt-6">
                                <div className="flex items-center gap-2"><Shield size={14} className="text-amber-500"/><h4 className="text-[10px] text-amber-500 font-black uppercase tracking-widest">Execution Shield</h4></div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div><label className={labelClass}>Take Profit %</label><input type="number" step="0.001" value={data.params.take_profit} onChange={(e)=>onParamChange('take_profit', parseFloat(e.target.value))} className={inputClass}/></div>
                                    <div><label className={labelClass}>Stop Loss %</label><input type="number" step="0.001" value={data.params.stop_loss} onChange={(e)=>onParamChange('stop_loss', parseFloat(e.target.value))} className={inputClass}/></div>
                                    <div className="col-span-2"><label className={labelClass}>Trailing Stop %</label><input type="number" step="0.001" value={data.params.trailing_stop} onChange={(e)=>onParamChange('trailing_stop', parseFloat(e.target.value))} className={inputClass}/></div>
                                </div>
                            </div>

                            <button type="submit" disabled={isSimulating} className="w-full py-4 bg-amber-500 text-zinc-950 font-black uppercase text-xs rounded-2xl shadow-xl transition-all">
                                {isSimulating ? "Running..." : "Initiate Simulation"}
                            </button>
                        </form>
                    </div>
                </div>

                {/* Main View Area */}
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
                            {isSimulating ? <ProgressIndicator progress={progress} statusMsg={statusMsg} /> : <div className="opacity-20 text-center"><BarChart3 size={64} className="mx-auto mb-4"/><p className="text-xs uppercase tracking-widest font-black">Awaiting Quantitative Parameters</p></div>}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// Sub-components as defined in previous messages (AIConfig, AdvancedFilters, etc.)
function AIConfig({ mlMode, setMlMode, params, onParamChange }) {
    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-2"><Cpu size={14} className="text-violet-400"/><h4 className="text-[10px] text-violet-400 font-black uppercase tracking-widest">Neural Gate</h4></div>
                <select value={mlMode} onChange={(e)=>setMlMode(e.target.value)} className="bg-zinc-800 text-[9px] rounded-md px-2 py-1"><option value="off">BYPASS</option><option value="on">ACTIVE</option></select>
            </div>
            {mlMode === "on" && (
                <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2"><label className={labelClass}>Architecture</label><select value={params.model_type} onChange={(e)=>onParamChange('model_type', e.target.value)} className={inputClass}><option value="stacking">Stacking</option></select></div>
                    <div><label className={labelClass}>Long Gate</label><input type="number" step="0.01" value={params.long_threshold} onChange={(e)=>onParamChange('long_threshold', parseFloat(e.target.value))} className={inputClass}/></div>
                    <div><label className={labelClass}>Short Gate</label><input type="number" step="0.01" value={params.short_threshold} onChange={(e)=>onParamChange('short_threshold', parseFloat(e.target.value))} className={inputClass}/></div>
                </div>
            )}
        </div>
    );
}

function MetricsPanel({ metrics }) {
    return (
        <div className="grid grid-cols-4 gap-4">
            {Object.entries(metrics || {}).map(([k, v]) => (
                <div key={k} className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl">
                    <p className="text-[10px] text-zinc-500 uppercase font-black tracking-widest mb-1">{k}</p>
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
