import React, { useState, useEffect } from "react";
import axios from "axios";
import { useBacktest } from "../hooks/useBacktest.js";
import { ChartIndependent } from "../components/ChartIndependent.jsx";
import { PerformanceChart } from "../components/PerformanceChart.jsx";
import { 
    Play, BarChart3, Layers, Plus, Trash2, 
    Shield, Globe, Cpu, Zap, Activity, Percent, Calendar, Filter, TrendingUp
} from "lucide-react";

const VITE_API = import.meta.env.VITE_API_URL || "https://neov6backend.onrender.com";
const API_BASE = VITE_API.endsWith('/api') ? VITE_API : `${VITE_API}/api`;

const inputClass = "w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:border-amber-500 transition-all text-xs outline-none";
const labelClass = "text-[10px] text-zinc-500 uppercase font-bold mb-1 block ml-1";

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

export default function Backtests() {
    const { runNewBacktest, runComboBacktest } = useBacktest();
    const [activeTab, setActiveTab] = useState('single');
    const [view, setView] = useState('execution'); // 'execution' or 'performance'
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
        strategies: [{ code: "rsi_threshold", params: {} }],
        advanced_filters: { trend_filter: "ema_200", vol_min: 0, atr_filter: 1.5 },
        params: { model_type: "stacking", long_threshold: 0.81, short_threshold: 0.95, take_profit: 0.052, stop_loss: 0.019, commission: 0.004, slippage: 0.0008 }
    });

    // --- 📡 FIXED POLLER ---
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
                        setStatusMsg(res.data.status || "Analyzing Market...");
                        
                        if (res.data.status === "COMPLETED") {
                            clearInterval(poller);
                            const finalRes = await axios.get(`${API_BASE}/backtest/results/${currentJobId}`, {
                                headers: { 'Authorization': `Bearer ${token}` }
                            });
                            
                            // Process and set final data
                            const formattedCurve = finalRes.data.equityCurve.map(pt => ({
                                time: Math.floor(new Date(pt.time).getTime() / 1000),
                                value: pt.balance
                            }));
                            setBacktestResults({ ...finalRes.data, equityCurve: formattedCurve });
                            setIsSimulating(false);
                        }
                    }
                } catch (e) { console.error("Poller Error:", e); }
            }, 1500);
        }
        return () => clearInterval(poller);
    }, [isSimulating, currentJobId]);

    const handleRun = async (e) => {
        e.preventDefault();
        setBacktestResults(null);
        setProgress(1);
        setStatusMsg("Initializing Engine...");
        
        const payload = { ...data, userId: JSON.parse(localStorage.getItem('user'))?._id };
        const runner = activeTab === 'combo' ? runComboBacktest : runNewBacktest;
        
        try {
            const res = await runner(payload);
            if (res?.jobId) { setCurrentJobId(res.jobId); setIsSimulating(true); }
        } catch (err) { setIsSimulating(false); }
    };

    return (
        <div className="min-h-screen bg-zinc-950 text-white font-sans p-6">
            <div className="max-w-[1800px] mx-auto grid grid-cols-12 gap-8">
                {/* SIDEBAR CONFIG */}
                <div className="col-span-12 lg:col-span-3">
                   <div className="bg-zinc-900/40 border border-zinc-800 rounded-3xl p-6 sticky top-6">
                       <form onSubmit={handleRun} className="space-y-6">
                           <h2 className="text-xs font-black uppercase text-amber-500 tracking-widest">Engine Config</h2>
                           <select value={data.code} onChange={(e)=>setData({...data, code: e.target.value})} className={inputClass}>
                               {STRAT_POOL.map(s => <option key={s.code} value={s.code}>{s.name}</option>)}
                           </select>
                           {/* Add more inputs as needed based on previous versions */}
                           <button type="submit" disabled={isSimulating} className="w-full py-4 bg-amber-500 text-black font-black uppercase text-xs rounded-xl">
                               {isSimulating ? "Running..." : "Start Backtest"}
                           </button>
                       </form>
                   </div>
                </div>

                {/* RESULTS MAIN PANEL */}
                <div className="col-span-12 lg:col-span-9 space-y-6">
                    {backtestResults ? (
                        <div className="space-y-6">
                            <MetricsPanel metrics={backtestResults.metrics} />
                            
                            <div className="bg-zinc-900 border border-zinc-800 rounded-[32px] overflow-hidden">
                                <div className="flex bg-zinc-800/50 border-b border-zinc-800 p-2">
                                    <button onClick={() => setView('execution')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${view === 'execution' ? 'bg-zinc-700 text-white' : 'text-zinc-500'}`}>Execution</button>
                                    <button onClick={() => setView('performance')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${view === 'performance' ? 'bg-zinc-700 text-white' : 'text-zinc-500'}`}>Performance</button>
                                </div>
                                <div className="p-8 h-[600px]">
                                    {view === 'execution' ? (
                                        <ChartIndependent results={backtestResults} symbol={data.symbol} />
                                    ) : (
                                        <PerformanceChart results={backtestResults} />
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="h-[70vh] flex flex-col items-center justify-center border-2 border-dashed border-zinc-800 rounded-[48px]">
                            {isSimulating ? <ProgressIndicator progress={progress} statusMsg={statusMsg} /> : <BarChart3 className="w-12 h-12 text-zinc-800" />}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function MetricsPanel({ metrics }) {
    return (
        <div className="grid grid-cols-4 gap-4">
            {Object.entries(metrics || {}).map(([k, v]) => (
                <div key={k} className="bg-zinc-900 border border-zinc-800 p-4 rounded-2xl">
                    <p className="text-[10px] text-zinc-500 uppercase font-bold">{k}</p>
                    <p className="text-xl font-mono text-white">{typeof v === 'number' ? v.toFixed(2) : v}</p>
                </div>
            ))}
        </div>
    );
}

function ProgressIndicator({ progress, statusMsg }) {
    return (
        <div className="w-64 space-y-4">
            <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                <div className="h-full bg-amber-500 transition-all" style={{ width: `${progress}%` }} />
            </div>
            <p className="text-[10px] text-zinc-500 uppercase text-center font-mono">{statusMsg}</p>
        </div>
    );
}
