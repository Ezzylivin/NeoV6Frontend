import React, { useState, useEffect } from "react";
import axios from "axios";
import { useBacktest } from "../hooks/useBacktest.js";
import { ChartIndependent } from "../components/ChartIndependent.jsx";
import { PerformanceChart } from "../components/PerformanceChart.jsx";
import { ChartReplay } from "../components/ChartReplay.jsx";
import {
    Play, BarChart3, Layers, Plus, Trash2,
    Shield, Globe, Cpu, Filter, TrendingUp,
    Activity, Percent, DollarSign, AlertTriangle,
    Zap, Scale, Award, TrendingDown, LayoutGrid, Info
} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip as ChartTooltip, BarChart, Bar, XAxis, YAxis } from 'recharts';

const VITE_API = import.meta.env.VITE_API_URL || "https://neov6backend.onrender.com";
const API_BASE = VITE_API.endsWith('/api') ? VITE_API : `${VITE_API}/api`;

const inputClass = "w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:border-amber-500 transition-all text-xs outline-none";
const labelClass = "text-[10px] text-zinc-500 uppercase font-bold mb-1 block ml-1";

// --- CONFIGURATION POOLS ---
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

const DEFAULT_MODELS = [
    { id: "xgboost", name: "XGBoost (Gradient Boosting)" },
    { id: "random_forest", name: "Random Forest (Bagging)" },
    { id: "transformer", name: "Transformer (Attention)" },
    { id: "stacking", name: "Stacking Ensemble (Hybrid)" }
];

// --- TOOLTIP COMPONENT ---
const Tooltip = ({ text, children }) => {
    const [visible, setVisible] = useState(false);
    return (
        <div className="relative flex items-center" onMouseEnter={() => setVisible(true)} onMouseLeave={() => setVisible(false)}>
            {children}
            {visible && (
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-64 bg-zinc-800 text-zinc-200 text-[11px] leading-relaxed p-3 rounded-lg shadow-xl z-50 border border-zinc-700 pointer-events-none">
                    {text}
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-zinc-800"></div>
                </div>
            )}
        </div>
    );
};

export default function Backtests() {
    const { runNewBacktest, runComboBacktest } = useBacktest();
    const [activeTab, setActiveTab] = useState('single');
    const [view, setView] = useState('execution');
    const [isSimulating, setIsSimulating] = useState(false);
    const [backtestResults, setBacktestResults] = useState(null);
    const [progress, setProgress] = useState(0);
    const [statusMsg, setStatusMsg] = useState("");
    const [availableModels, setAvailableModels] = useState(DEFAULT_MODELS);

    const [data, setData] = useState({
        symbol: "BTC-USD",
        timeframe: "1h",
        startDate: "2026-01-01",
        endDate: "2026-03-01",
        initialBalance: 1000,
        risk_percentage: 100,
        mlMode: "on",
        mlModel: "stacking", 
        mlThresholdLong: 0.9, 
        mlThresholdShort: 0.9, 
        combinationRule: "OR",
        code: "rsi_threshold",
        strategies: [
            { code: "stoch", params: { ...DEFAULT_STRATEGY_PARAMS.stoch } }, 
            { code: "bb_fade", params: { ...DEFAULT_STRATEGY_PARAMS.bb_fade, bb_std: 2.568 } }
        ],
        advanced_filters: { 
            trend_filter: "none", 
            vol_min: 0, 
            atr_filter: 0, 
            trade_window: "all" 
        },
        params: {
            model_type: "stacking",
            take_profit: 0.1,
            stop_loss: 0.05,
            trailing_stop: 0.05,
            ...DEFAULT_STRATEGY_PARAMS.rsi_threshold
        }
    });

    useEffect(() => {
        const fetchModels = async () => {
            try {
                const token = localStorage.getItem('token');
                const res = await axios.get(`${API_BASE}/ml/models`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.data && Array.isArray(res.data)) setAvailableModels(res.data);
            } catch (e) { console.warn("Using default models."); }
        };
        fetchModels();
    }, []);

    const calculateAdvancedMetrics = (results) => {
        const trades = results.trades || [];
        const curve = results.equityCurve || [];
        const initialBalance = Number(results.initialBalance) || 1000;
        const rawMetrics = results.metrics || {};
        const finalBalance = Number(rawMetrics.finalBalance || rawMetrics.final_balance || initialBalance);
        const netProfit = finalBalance - initialBalance;
        const vetoes = results.vetoed_signals || [];
        const candles = results.candleData || [];

        let wins = 0, losses = 0, grossProfit = 0, grossLoss = 0;
        let largestWin = 0, largestLoss = 0, previousBalance = initialBalance;
        let aiSaves = 0, aiMisses = 0;

        vetoes.forEach(veto => {
            const startIndex = candles.findIndex(c => c.time === veto.time || c.date === veto.time);
            if (startIndex === -1 || startIndex === candles.length - 1) return;
            const entryPrice = veto.price;
            const isLong = veto.signal === "Long";
            const tp = results.params?.take_profit || 0.1;
            const sl = results.params?.stop_loss || 0.05;
            const tpPrice = isLong ? veto.price * (1 + tp) : veto.price * (1 - tp);
            const slPrice = isLong ? veto.price * (1 - sl) : veto.price * (1 + sl);

            for (let j = startIndex + 1; j < candles.length; j++) {
                const nextCandle = candles[j];
                if (isLong) {
                    if (nextCandle.high >= tpPrice) { aiMisses++; break; }
                    if (nextCandle.low <= slPrice) { aiSaves++; break; }
                } else {
                    if (nextCandle.low <= tpPrice) { aiMisses++; break; }
                    if (nextCandle.high >= slPrice) { aiSaves++; break; }
                }
            }
        });

        trades.forEach(t => {
            const currentBal = Number(t.balance);
            if (currentBal && currentBal !== previousBalance) {
                const pnl = currentBal - previousBalance;
                if (pnl > 0) { wins++; grossProfit += pnl; if (pnl > largestWin) largestWin = pnl; }
                else { losses++; grossLoss += Math.abs(pnl); if (pnl < largestLoss) largestLoss = pnl; }
                previousBalance = currentBal;
            }
        });

        const totalTradesCalculated = (wins + losses) || Number(rawMetrics.totalTrades) || 0;
        return {
            ...rawMetrics,
            win_rate: totalTradesCalculated > 0 ? (wins / totalTradesCalculated) * 100 : 0,
            roi: ((finalBalance - initialBalance) / initialBalance) * 100,
            profit_factor: grossLoss > 0 ? grossProfit / grossLoss : (grossProfit > 0 ? 100 : 0),
            final_balance: finalBalance,
            net_profit: netProfit,
            total_wins: wins,
            total_losses: losses,
            total_trades: totalTradesCalculated,
            largest_win: largestWin,
            largest_loss: largestLoss,
            ai_accuracy: (aiSaves + aiMisses) > 0 ? (aiSaves / (aiSaves + aiMisses)) * 100 : 0,
            ai_saves: aiSaves,
            ai_misses: aiMisses
        };
    };

    const processResults = (responseData) => {
        try {
            if (!responseData) return;
            const base = responseData.result || responseData;
            const payload = base.combinedResult ? { ...base.combinedResult, ...base } : base;

            const formattedCurve = (payload.equityCurve || []).map(pt => ({
                time: Math.floor(new Date(pt.time || pt.timestamp).getTime() / 1000),
                value: Number(pt.balance || pt.value)
            })).sort((a, b) => a.time - b.time);

            const enhancedMetrics = calculateAdvancedMetrics({
                ...payload,
                equityCurve: formattedCurve,
                startDate: data.startDate,
                endDate: data.endDate,
                initialBalance: data.initialBalance
            });

            setBacktestResults({
                ...payload,
                metrics: enhancedMetrics,
                equityCurve: formattedCurve,
                candleData: payload.candleData || payload.candle_data || [],
                trades: payload.trades || []
            });
            setIsSimulating(false);
            setProgress(100);
            setStatusMsg("Analysis Complete");
        } catch (err) {
            console.error("Processor Error:", err);
            setIsSimulating(false);
        }
    };

    const handleRun = async (e) => {
        e.preventDefault();
        console.log("🚀 Initiating Stream...");
        setProgress(0);
        setIsSimulating(true);
        setStatusMsg("Initiating Handshake...");
        setBacktestResults(null);

        const dynamicUserId = JSON.parse(localStorage.getItem('user'))?._id;
        const finalPayload = {
            ...data,
            userId: dynamicUserId,
            code: activeTab === 'combo' ? 'hybrid_ensemble' : data.code,
            params: activeTab === 'single' ? { ...data.params, ...DEFAULT_STRATEGY_PARAMS[data.code] } : data.params
        };

        try {
            const endpoint = activeTab === 'combo' ? `${API_BASE}/backtest/combo` : `${API_BASE}/backtest/run`;
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json', 
                    'Authorization': `Bearer ${localStorage.getItem('token')}` 
                },
                body: JSON.stringify(finalPayload)
            });

            if (!response.ok) throw new Error(`Server Error: ${response.status}`);

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = ""; // 🛡️ Buffer to store partial JSON strings

            while (true) {
                const { value, done } = await reader.read();
                if (done) break;

                // 1. Accumulate the stream chunk into the buffer
                buffer += decoder.decode(value, { stream: true });

                // 2. Split by the newline character we added in Python
                const lines = buffer.split('\n');

                // 3. The last element might be an incomplete JSON string, 
                // so we put it back into the buffer for the next chunk.
                buffer = lines.pop();

                for (const line of lines) {
                    if (!line.trim()) continue;

                    try {
                        const update = JSON.parse(line);
                        
                        // 📈 Real-time Progress Updates
                        if (update.status === "progress") {
                            setProgress(update.percentage);
                            setStatusMsg(update.message);
                        } 
                        
                        // 🏁 The Final Result Handshake
                        else if (update.status === "success") {
                            console.log("✅ Final Data Received via Stream:", update.result);
                            
                            // We pass 'update.result' because the backend wrapped it
                            processResults(update.result); 
                            
                            setIsSimulating(false);
                            setProgress(100);
                            return; // Exit function
                        }
                        
                        else if (update.status === "error") {
                            throw new Error(update.message);
                        }
                    } catch (e) {
                        console.warn("Buffer still incomplete, waiting for more data...");
                        // If parsing fails, we add this line back to the buffer start
                        buffer = line + buffer;
                    }
                }
            }
        } catch (err) {
            console.error("🔥 Stream Failure:", err);
            setStatusMsg("Link Failure: " + err.message);
            setIsSimulating(false);
        }
    const renderActiveView = () => {
        if (!backtestResults) return null;
        if (view === 'execution') return <ChartIndependent results={backtestResults} symbol={data.symbol} />;
        if (view === 'performance') return <PerformanceChart results={backtestResults} />;
        if (view === 'replay') return <ChartReplay results={backtestResults} symbol={data.symbol} />;
    };

    return (
        <div className="min-h-screen bg-zinc-950 text-white font-sans p-6 overflow-x-hidden">
            <header className="max-w-[1800px] mx-auto mb-8 flex flex-col md:flex-row md:items-center gap-6 justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/20">
                        <BarChart3 className="text-black w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="text-sm font-black uppercase tracking-widest leading-none mb-1">
                            Sovereign <span className="text-amber-500">Quant</span>
                        </h1>
                        <p className="text-[8px] text-zinc-500 font-bold tracking-widest uppercase">Neo-V7 Neural Engine Active</p>
                    </div>
                </div>
                <div className="flex gap-2 p-1 bg-zinc-900/50 rounded-xl border border-zinc-800">
                    {['single', 'combo'].map(tab => (
                        <button key={tab} type="button" onClick={() => setActiveTab(tab)}
                            className={`px-8 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${activeTab === tab ? 'bg-zinc-800 text-white shadow-xl' : 'text-zinc-500 hover:text-zinc-300'}`}>
                            {tab === 'single' ? 'Atomic' : 'Hybrid'}
                        </button>
                    ))}
                </div>
            </header>

            <div className="max-w-[1800px] mx-auto grid grid-cols-12 gap-8">
                <div className="col-span-12 lg:col-span-3">
                    <div className="bg-zinc-900/40 border border-zinc-800 rounded-[32px] p-6 sticky top-6 max-h-[90vh] overflow-y-auto custom-scrollbar shadow-2xl backdrop-blur-md">
                        <form onSubmit={handleRun} className="space-y-8">
                            <AIConfig mlMode={data.mlMode} setMlMode={(m) => setData({ ...data, mlMode: m })} data={data} setData={setData} availableModels={availableModels} />
                            <div className="space-y-4 border-t border-zinc-800/50 pt-6">
                                <h4 className="text-[10px] text-emerald-400 font-black uppercase tracking-widest">Logic Ensemble</h4>
                                {activeTab === 'single' ? (
                                    <div className="space-y-3">
                                        <select value={data.code} onChange={(e) => setData({...data, code: e.target.value, params: {...data.params, ...DEFAULT_STRATEGY_PARAMS[e.target.value]}})} className={inputClass}>
                                            {STRAT_POOL.map(s => <option key={s.code} value={s.code}>{s.name}</option>)}
                                        </select>
                                        <StrategyParamInputs strategy={{ code: data.code, params: data.params }} onChange={(p) => setData(prev => ({ ...prev, params: { ...prev.params, ...p } }))} />
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {data.strategies.map((s, i) => (
                                            <div key={i} className="p-4 bg-zinc-800/30 rounded-2xl border border-zinc-700/50 relative">
                                                <div className="flex justify-between items-center mb-3">
                                                    <select value={s.code} onChange={(e) => { const n = [...data.strategies]; n[i] = { code: e.target.value, params: DEFAULT_STRATEGY_PARAMS[e.target.value] }; setData({ ...data, strategies: n }); }} className="bg-transparent text-[10px] font-black text-amber-500 outline-none">
                                                        {STRAT_POOL.map(o => <option key={o.code} value={o.code}>{o.name}</option>)}
                                                    </select>
                                                    <button type="button" onClick={() => setData(p => ({ ...p, strategies: p.strategies.filter((_, idx) => idx !== i) }))} className="text-zinc-500 hover:text-rose-500"><Trash2 size={12} /></button>
                                                </div>
                                                <StrategyParamInputs strategy={s} onChange={(p) => { const n = [...data.strategies]; n[i].params = p; setData({ ...data, strategies: n }); }} />
                                            </div>
                                        ))}
                                        <button type="button" onClick={() => setData(p => ({ ...p, strategies: [...p.strategies, { code: "rsi_threshold", params: DEFAULT_STRATEGY_PARAMS.rsi_threshold }] }))} className="w-full py-3 border-2 border-dashed border-zinc-800 rounded-2xl text-zinc-500 text-[9px] font-black uppercase hover:border-emerald-500">+ Add Logic Layer</button>
                                    </div>
                                )}
                            </div>
                            <AdvancedFilters filters={data.advanced_filters} onChange={(k, v) => setData(p => ({ ...p, advanced_filters: { ...p.advanced_filters, [k]: v } }))} />
                            <div className="space-y-4 border-t border-zinc-800/50 pt-6">
                                <h4 className="text-[10px] text-amber-500 font-black uppercase tracking-widest flex items-center gap-2"><Shield size={12}/> Execution Shield</h4>
                                <div className="grid grid-cols-2 gap-3">
                                    <div><label className={labelClass}>TP %</label><input type="number" step="0.001" value={data.params.take_profit} onChange={(e) => setData(p => ({ ...p, params: { ...p.params, take_profit: parseFloat(e.target.value) } }))} className={inputClass} /></div>
                                    <div><label className={labelClass}>SL %</label><input type="number" step="0.001" value={data.params.stop_loss} onChange={(e) => setData(p => ({ ...p, params: { ...p.params, stop_loss: parseFloat(e.target.value) } }))} className={inputClass} /></div>
                                </div>
                            </div>
                            <div className="space-y-4 border-t border-zinc-800/50 pt-6">
                                <h4 className="text-[10px] text-cyan-400 font-black uppercase tracking-widest flex items-center gap-2"><Globe size={12}/> Market Scope</h4>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="col-span-2"><select value={data.symbol} onChange={(e) => setData({ ...data, symbol: e.target.value })} className={inputClass}><option value="SOL-USD">SOL-USD</option><option value="BTC-USD">BTC-USD</option></select></div>
                                    <div><label className={labelClass}>Start</label><input type="date" value={data.startDate} onChange={(e) => setData({ ...data, startDate: e.target.value })} className={inputClass} /></div>
                                    <div><label className={labelClass}>End</label><input type="date" value={data.endDate} onChange={(e) => setData({ ...data, endDate: e.target.value })} className={inputClass} /></div>
                                </div>
                            </div>
                            <button type="submit" disabled={isSimulating} className="w-full py-4 bg-amber-500 text-zinc-950 font-black uppercase text-xs rounded-2xl hover:bg-amber-400 shadow-xl">{isSimulating ? "Crunching..." : "Initiate Simulation"}</button>
                        </form>
                    </div>
                </div>

                <div className="col-span-12 lg:col-span-9 space-y-6">
                    {backtestResults ? (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-5 duration-1000">
                            <MetricsPanel metrics={backtestResults.metrics} />
                            <div className="bg-zinc-900 border border-zinc-800 rounded-[32px] overflow-hidden shadow-2xl">
                                <div className="flex bg-zinc-800/50 p-2 border-b border-zinc-800">
                                    {['execution', 'performance', 'replay'].map(v => (
                                        <button key={v} onClick={() => setView(v)} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${view === v ? 'bg-zinc-700 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}>{v}</button>
                                    ))}
                                </div>
                                <div className="h-[600px] p-4">{renderActiveView()}</div>
                            </div>
                            <TradeLedger trades={backtestResults.trades} />
                            <VetoList vetoes={backtestResults.vetoed_signals} />
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <VetoComposition vetoes={backtestResults.vetoed_signals} />
                                <WinLossChart metrics={backtestResults.metrics} />
                                <ExecutionSides trades={backtestResults.trades} />
                            </div>
                        </div>
                    ) : (
                        <div className="h-[80vh] flex flex-col items-center justify-center border-2 border-dashed border-zinc-800 rounded-[48px] bg-zinc-900/10 backdrop-blur-sm">
                            {isSimulating ? <ProgressIndicator progress={progress} statusMsg={statusMsg} /> : <div className="opacity-10 text-center"><BarChart3 size={120} className="mx-auto mb-6" /><p className="text-xl uppercase tracking-[0.3em] font-black">Awaiting Parameters</p></div>}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// --- SUB-COMPONENTS ---

function MetricsPanel({ metrics = {} }) {
    const MetricCard = ({ label, value, subValue, icon: Icon, color = "text-white", tooltip }) => (
        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl shadow-xl flex items-center justify-between relative group hover:border-zinc-700 transition-all">
            <div>
                <p className="text-[9px] text-zinc-500 uppercase font-black mb-1 flex items-center gap-1.5">
                    {Icon && <Icon size={12} className="opacity-50" />}
                    {label}
                    {tooltip && <Tooltip text={tooltip}><Info size={10} className="text-zinc-600" /></Tooltip>}
                </p>
                <p className={`text-2xl font-mono tracking-tighter ${color}`}>{value}</p>
                {subValue && <p className="text-[10px] text-zinc-600 font-mono mt-1 font-bold">{subValue}</p>}
            </div>
        </div>
    );

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-zinc-900/40 p-5 rounded-[40px] border border-zinc-800/50">
                <h5 className="text-[10px] text-emerald-400 font-black uppercase tracking-[0.2em] mb-4 flex items-center gap-2 border-b border-zinc-800 pb-3"><DollarSign size={14} /> Financial Performance</h5>
                <div className="grid grid-cols-2 gap-4">
                    <MetricCard label="Net Profit" value={`$${(metrics.net_profit || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}`} color={metrics.net_profit >= 0 ? "text-emerald-400" : "text-rose-400"} subValue={`Final: $${(metrics.final_balance || 0).toLocaleString()}`} />
                    <MetricCard label="ROI" value={`${(metrics.roi || 0).toFixed(2)}%`} color={metrics.roi >= 0 ? "text-emerald-400" : "text-rose-400"} />
                    <MetricCard label="Win Rate" value={`${(metrics.win_rate || 0).toFixed(1)}%`} subValue={`W: ${metrics.total_wins} | L: ${metrics.total_losses}`} />
                    <MetricCard label="Profit Factor" value={(metrics.profit_factor || 0).toFixed(2)} color={metrics.profit_factor > 1.5 ? "text-emerald-400" : "text-amber-500"} />
                </div>
            </div>
            <div className="bg-zinc-900/40 p-5 rounded-[40px] border border-zinc-800/50">
                <h5 className="text-[10px] text-violet-400 font-black uppercase tracking-[0.2em] mb-4 flex items-center gap-2 border-b border-zinc-800 pb-3"><Activity size={14} /> Neural Shield Analytics</h5>
                <div className="grid grid-cols-2 gap-4">
                    <MetricCard label="AI Shield Accuracy" value={`${(metrics.ai_accuracy || 0).toFixed(1)}%`} subValue={`Saved: ${metrics.ai_saves} | Missed: ${metrics.ai_misses}`} color="text-violet-400" />
                    <MetricCard label="Total Trades" value={metrics.total_trades || 0} />
                    <MetricCard label="Avg Win" value={`$${(metrics.avg_win || 0).toFixed(2)}`} color="text-emerald-500" />
                    <MetricCard label="Avg Loss" value={`$${(metrics.avg_loss || 0).toFixed(2)}`} color="text-rose-500" />
                </div>
            </div>
        </div>
    );
}

function TradeLedger({ trades = [] }) {
    return (
        <div className="bg-zinc-900 border border-zinc-800 rounded-[32px] overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-zinc-800 flex justify-between items-center bg-zinc-800/20">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2"><Activity size={12} className="text-amber-500" /> Execution Ledger</h3>
                <span className="text-[9px] font-black text-zinc-600 uppercase">{trades.length} Actions</span>
            </div>
            <div className="overflow-x-auto max-h-[400px] custom-scrollbar">
                <table className="w-full text-left text-[10px]">
                    <thead className="bg-zinc-900/80 backdrop-blur-md sticky top-0 z-10">
                        <tr>
                            <th className="px-6 py-4 font-black uppercase text-zinc-500 tracking-tighter">Timestamp</th>
                            <th className="px-6 py-4 font-black uppercase text-zinc-500 tracking-tighter">Action Type</th>
                            <th className="px-6 py-4 font-black uppercase text-zinc-500 tracking-tighter text-right">Price</th>
                            <th className="px-6 py-4 font-black uppercase text-zinc-500 tracking-tighter text-right">PnL %</th>
                            <th className="px-6 py-4 font-black uppercase text-zinc-500 tracking-tighter text-right">Balance</th>
                            <th className="px-6 py-4 font-black uppercase text-zinc-500 tracking-tighter">Neural Conf</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800">
                        {trades.map((trade, index) => (
                            <tr key={index} className="hover:bg-zinc-800/30 transition-colors group">
                                <td className="px-6 py-4 text-zinc-500 font-mono">{trade.time}</td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase border ${
                                        trade.reason?.includes("Profit") ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                                        trade.reason?.includes("Stop") ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
                                        "bg-blue-500/10 text-blue-400 border-blue-500/20"
                                    }`}>
                                        {trade.reason || trade.type}
                                    </span>
                                </td>
                                <td className="px-6 py-4 font-mono text-zinc-200 text-right font-bold">${Number(trade.price).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                                <td className={`px-6 py-4 font-mono font-black text-right ${trade.pnl > 0 ? 'text-emerald-400' : trade.pnl < 0 ? 'text-rose-400' : 'text-zinc-600'}`}>
                                    {trade.pnl ? `${trade.pnl > 0 ? '+' : ''}${trade.pnl}%` : '0.00%'}
                                </td>
                                <td className="px-6 py-4 font-mono text-zinc-400 text-right">${Number(trade.balance).toLocaleString()}</td>
                                <td className="px-6 py-4">
                                    {trade.ai_score ? (
                                        <div className="flex items-center gap-2">
                                            <div className="h-1 flex-1 bg-zinc-800 rounded-full overflow-hidden min-w-[60px]">
                                                <div className="h-full bg-violet-500 shadow-[0_0_8px_rgba(139,92,246,0.5)]" style={{ width: `${trade.ai_score * 100}%` }} />
                                            </div>
                                            <span className="text-[8px] font-black text-violet-400">{(trade.ai_score * 100).toFixed(0)}%</span>
                                        </div>
                                    ) : '—'}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function VetoList({ vetoes = [] }) {
    return (
        <div className="bg-zinc-900 border border-zinc-800 rounded-[32px] overflow-hidden shadow-2xl mt-6">
            <div className="p-6 border-b border-zinc-800 flex justify-between items-center bg-rose-500/5">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-rose-400 flex items-center gap-2"><Shield size={12} className="text-rose-500" /> Neural Veto List</h3>
                <span className="text-[9px] bg-rose-500/20 text-rose-400 px-3 py-1 rounded-full font-black border border-rose-500/30">{vetoes.length} Attacks Deflected</span>
            </div>
            <div className="overflow-x-auto max-h-[300px] custom-scrollbar">
                <table className="w-full text-left text-[10px]">
                    <thead className="bg-zinc-900 sticky top-0 z-10">
                        <tr>
                            <th className="px-6 py-4 font-black uppercase text-zinc-500 tracking-tighter">Time</th>
                            <th className="px-6 py-4 font-black uppercase text-zinc-500 tracking-tighter">Attempted Side</th>
                            <th className="px-6 py-4 font-black uppercase text-zinc-500 tracking-tighter text-right">AI Score</th>
                            <th className="px-6 py-4 font-black uppercase text-zinc-500 tracking-tighter text-right">Gate Limit</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800">
                        {vetoes.map((veto, index) => (
                            <tr key={index} className="hover:bg-rose-500/5 transition-colors">
                                <td className="px-6 py-4 text-zinc-500 font-mono">{veto.time}</td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${veto.signal === 'Long' ? 'text-emerald-500/60' : 'text-rose-500/60'}`}>{veto.signal}</span>
                                </td>
                                <td className="px-6 py-4 text-right font-black text-rose-400">{(veto.conf_score * 100).toFixed(2)}%</td>
                                <td className="px-6 py-4 text-right font-mono text-zinc-600">{(veto.limit * 100).toFixed(0)}%</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function ProgressIndicator({ progress, statusMsg }) {
    return (
        <div className="w-80 space-y-6 text-center">
            <div className="relative h-2 w-full bg-zinc-900 rounded-full overflow-hidden border border-zinc-800 p-[1px]">
                <div className="h-full bg-gradient-to-r from-amber-600 to-amber-400 transition-all duration-700 ease-out shadow-[0_0_15px_rgba(245,158,11,0.3)]" style={{ width: `${progress}%` }} />
            </div>
            <div>
                <p className="text-[10px] text-zinc-400 uppercase tracking-[0.4em] font-black animate-pulse mb-2">{statusMsg}</p>
                <p className="text-3xl font-mono font-black text-zinc-700">{progress}%</p>
            </div>
        </div>
    );
}

function AIConfig({ mlMode, setMlMode, data, setData, availableModels }) {
    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center bg-zinc-800/20 p-2 rounded-xl border border-zinc-800/40">
                <div className="flex items-center gap-2">
                    <Cpu size={14} className="text-violet-400" />
                    <h4 className="text-[10px] text-violet-400 font-black uppercase tracking-widest">Neural Gate</h4>
                </div>
                <select value={mlMode} onChange={(e) => setMlMode(e.target.value)} className="bg-zinc-800 text-[9px] rounded-lg px-3 py-1 outline-none font-black text-white cursor-pointer">
                    <option value="off">BYPASS</option>
                    <option value="on">ACTIVE</option>
                </select>
            </div>
            {mlMode === "on" && (
                <div className="grid grid-cols-2 gap-3 p-1">
                    <div className="col-span-2">
                        <label className={labelClass}>Architecture</label>
                        <select value={data.mlModel} onChange={(e) => setData({...data, mlModel: e.target.value})} className={inputClass}>
                            {availableModels.map(model => <option key={model.id} value={model.id}>{model.name}</option>)}
                        </select>
                    </div>
                    <div><label className={labelClass}>Long Gate</label><input type="number" step="0.01" value={data.mlThresholdLong} onChange={(e) => setData({...data, mlThresholdLong: parseFloat(e.target.value)})} className={inputClass} /></div>
                    <div><label className={labelClass}>Short Gate</label><input type="number" step="0.01" value={data.mlThresholdShort} onChange={(e) => setData({...data, mlThresholdShort: parseFloat(e.target.value)})} className={inputClass} /></div>
                </div>
            )}
        </div>
    );
}

function StrategyParamInputs({ strategy, onChange }) {
    const { code, params = {} } = strategy;
    const f = (l, k, s = "1") => (
        <div className="flex flex-col">
            <label className={labelClass}>{l}</label>
            <input type="number" step={s} value={params[k] === undefined || isNaN(params[k]) ? "" : params[k]} 
                   onChange={(e) => onChange({...params, [k]: parseFloat(e.target.value) || 0})} 
                   className="bg-zinc-950 border border-zinc-700 rounded-lg px-2 py-1.5 text-[10px] text-amber-500 outline-none font-mono" />
        </div>
    );
    return (
        <div className="grid grid-cols-2 gap-3 mt-2">
            {code === "rsi_threshold" && <>{f("RSI Length", "rsi_length")}{f("Oversold", "oversold")}{f("Overbought", "overbought")}</>}
            {code === "sma_crossover" && <>{f("Fast EMA", "fast_sma")}{f("Slow EMA", "slow_sma")}</>}
            {code === "stoch" && <>{f("K-Period", "k_period")}{f("D-Period", "d_period")}{f("Slowing", "slowing")}</>}
            {code === "bb_fade" && <>{f("Period", "bb_period")}{f("Std Dev", "bb_std", "0.1")}</>}
            {code === "macd_crossover" && <>{f("Fast", "fast")}{f("Slow", "slow")}{f("Signal", "signal")}</>}
            {code === "atr_breakout" && <>{f("ATR Len", "atr_length")}{f("Mult", "multiplier", "0.1")}</>}
            {code === "supertrend" && <>{f("ATR", "st_atr")}{f("Factor", "st_factor", "0.1")}</>}
        </div>
    );
}

function AdvancedFilters({ filters, onChange }) {
    return (
        <div className="space-y-4 border-t border-zinc-800/50 pt-6">
            <h4 className="text-[10px] text-indigo-400 font-black uppercase tracking-widest flex items-center gap-2"><Filter size={12}/> Adaptive Filters</h4>
            <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2"><label className={labelClass}>Trend Logic</label><select value={filters.trend_filter} onChange={(e)=>onChange('trend_filter', e.target.value)} className={inputClass}><option value="none">Market Neutral</option><option value="ema_200">200-EMA Directional</option></select></div>
                <div><label className={labelClass}>Min Vol MA</label><input type="number" value={filters.vol_min} onChange={(e)=>onChange('vol_min', parseFloat(e.target.value))} className={inputClass}/></div>
                <div><label className={labelClass}>ATR Filter</label><input type="number" step="0.1" value={filters.atr_filter} onChange={(e)=>onChange('atr_filter', parseFloat(e.target.value))} className={inputClass}/></div>
            </div>
        </div>
    );
}

function VetoComposition({ vetoes = [] }) {
    const data = [
        { name: 'Blocked Longs', value: vetoes.filter(v => v.signal === 'Long').length },
        { name: 'Blocked Shorts', value: vetoes.filter(v => v.signal === 'Short').length }
    ];
    return (
        <div className="bg-zinc-900 border border-zinc-800 rounded-[32px] p-6 shadow-2xl">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-6 flex items-center gap-2"><LayoutGrid size={12} className="text-violet-500" /> Block Composition</h3>
            <div className="h-[200px] w-full">
                <ResponsiveContainer><PieChart><Pie data={data} innerRadius={55} outerRadius={75} paddingAngle={8} dataKey="value" stroke="none"><Cell fill="#10b981" fillOpacity={0.4} /><Cell fill="#f43f5e" fillOpacity={0.4} /></Pie><ChartTooltip contentStyle={{ backgroundColor: '#18181b', border: 'none', fontSize: '10px' }} /><Legend iconType="circle" wrapperStyle={{ fontSize: '8px', paddingTop: '20px' }} /></PieChart></ResponsiveContainer>
            </div>
        </div>
    );
}

function WinLossChart({ metrics = {} }) {
    const data = [{ name: 'Profit', value: metrics.total_wins || 0 }, { name: 'Loss', value: metrics.total_losses || 0 }];
    return (
        <div className="bg-zinc-900 border border-zinc-800 rounded-[32px] p-6 shadow-2xl">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-6 flex items-center gap-2"><TrendingUp size={12} className="text-emerald-500" /> Precision Ratio</h3>
            <div className="h-[200px] w-full">
                <ResponsiveContainer><PieChart><Pie data={data} innerRadius={55} outerRadius={75} paddingAngle={8} dataKey="value" stroke="none"><Cell fill="#10b981" /><Cell fill="#f43f5e" /></Pie><ChartTooltip contentStyle={{ backgroundColor: '#18181b', border: 'none', fontSize: '10px' }} /><Legend iconType="circle" wrapperStyle={{ fontSize: '8px', paddingTop: '20px' }} /></PieChart></ResponsiveContainer>
            </div>
        </div>
    );
}

function ExecutionSides({ trades = [] }) {
    const data = [
        { name: 'Long', count: trades.filter(t => t.type === 'buy').length },
        { name: 'Short', count: trades.filter(t => t.type === 'sell').length }
    ];
    return (
        <div className="bg-zinc-900 border border-zinc-800 rounded-[32px] p-6 shadow-2xl">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-6 flex items-center gap-2"><Zap size={12} className="text-cyan-500" /> Active Exposure</h3>
            <div className="h-[200px] w-full">
                <ResponsiveContainer><BarChart data={data} barSize={40}><XAxis dataKey="name" stroke="#3f3f46" fontSize={10} axisLine={false} tickLine={false} /><YAxis hide /><Bar dataKey="count" radius={[10, 10, 10, 10]}><Cell fill="#06b6d4" fillOpacity={0.8} /><Cell fill="#8b5cf6" fillOpacity={0.8} /></Bar><ChartTooltip cursor={{fill: 'transparent'}} contentStyle={{ backgroundColor: '#18181b', border: 'none', fontSize: '10px' }} /></BarChart></ResponsiveContainer>
            </div>
        </div>
    );
}
