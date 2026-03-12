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
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip as ChartTooltip, BarChart, Bar, XAxis } from 'recharts';


const VITE_API = import.meta.env.VITE_API_URL || "https://neov6backend.onrender.com";
const API_BASE = VITE_API.endsWith('/api') ? VITE_API : `${VITE_API}/api`;

const inputClass = "w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:border-amber-500 transition-all text-xs outline-none";
const labelClass = "text-[10px] text-zinc-500 uppercase font-bold mb-1 block ml-1";

// --- CONFIGURATION ---
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

// 🟢 DEFAULT MODELS
const DEFAULT_MODELS = [
    { id: "xgboost", name: "XGBoost (Gradient Boosting)" },
    { id: "random_forest", name: "Random Forest (Bagging)" },
    { id: "gradient_boosting", name: "Gradient Boosting (Sklearn)" },
    { id: "lstm", name: "LSTM (Deep Recurrent)" },
    { id: "transformer", name: "Transformer (Attention)" },
    { id: "stacking", name: "Stacking Ensemble (Hybrid)" }
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

// 🟢 TOOLTIP COMPONENT (Enhanced for Readability)
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
    const [currentJobId, setCurrentJobId] = useState(null);
    const [availableModels, setAvailableModels] = useState(DEFAULT_MODELS);

  const [data, setData] = useState({
    // Market Identity
    symbol: "BTC-USD",
    timeframe: "1h",
    startDate: "2025-02-19",
    endDate: "2026-01-18",
    initialBalance: 250,
    risk_percentage: 1.0,

    // AI Neural Gate Settings (The missing link!)
    mlMode: "on",
    mlModel: "stacking", 
    mlThresholdLong: 0.8, 
    mlThresholdShort: 0.8, 

    // Ensemble Logic
    combinationRule: "OR",
    code: "rsi_threshold",
    strategies: [
        { code: "stoch", params: { ...DEFAULT_STRATEGY_PARAMS.stoch } }, 
        { code: "bb_fade", params: { ...DEFAULT_STRATEGY_PARAMS.bb_fade, bb_std: 2.568 } }
    ],

    // Sanity Filters (Prevents the 'trend_filter' crash)
    advanced_filters: { 
        trend_filter: "none", 
        vol_min: 0, 
        atr_filter: 0, 
        trade_window: "all" 
    },

    // Global Strategy Parameters
    params: {
        model_type: "stacking",
        take_profit: 0.13,
        stop_loss: 0.086,
        trailing_stop: 0.086,
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
            } catch (e) { console.warn("Could not fetch models from server, using defaults."); }
        };
        fetchModels();
    }, []);

    

    const calculateAdvancedMetrics = (results) => {
        const trades = results.trades || [];
        const metrics = response.data.combinedResult?.metrics || response.data.metrics;
        const curve = results.equityCurve || [];
        const initialBalance = results.initialBalance || 1000;
        const finalBalance = results.metrics?.final_balance || results.metrics?.finalBalance || initialBalance;

        const netProfit = finalBalance - initialBalance;

        const vetoes = results.vetoed_signals || [];
        const candles = results.candleData || [];
    

        let wins = 0;
        let losses = 0;
        let grossProfit = 0;
        let grossLoss = 0;
        let largestWin = 0;
        let largestLoss = 0;
        let previousBalance = initialBalance;
        let tradeReturns = [];

        let aiSaves = 0; // Blocked trades that would have lost money
        let aiMisses = 0; // Blocked trades that would have won money

        vetoes.forEach(veto => {
        // 1. Find the candle where the veto occurred
        const startIndex = candles.findIndex(c => c.time === veto.time || c.date === veto.time);
        if (startIndex === -1 || startIndex === candles.length - 1) return;

        const entryPrice = veto.price;
        // Determine targets based on signal direction
        const isLong = veto.signal === "Long";
        const tpPrice = isLong ? entryPrice * (1 + results.params.take_profit) : entryPrice * (1 - results.params.take_profit);
        const slPrice = isLong ? entryPrice * (1 - results.params.stop_loss) : entryPrice * (1 + results.params.stop_loss);

        // 2. Look forward in the data to see what hit first
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

    const aiAccuracy = (aiSaves + aiMisses) > 0 ? (aiSaves / (aiSaves + aiMisses)) * 100 : 0;

        trades.forEach(t => {
        if (t.balance && t.balance !== previousBalance) {
            const pnl = t.balance - previousBalance;
            tradeReturns.push(pnl);
            if (pnl > 0) {
                wins++;
                grossProfit += pnl;
                if (pnl > largestWin) largestWin = pnl;
            } else {
                losses++;
                grossLoss += Math.abs(pnl);
                if (pnl < largestLoss) largestLoss = pnl;
            }
            previousBalance = t.balance;
        }
    });

        const totalTrades = (wins + losses) || metrics.total_trades || metrics.totalTrades || 0;
        const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;
        const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : (grossProfit > 0 ? 100 : 0);
        const avgTrade = totalTrades > 0 ? netProfit / totalTrades : 0;
        const avgWin = wins > 0 ? grossProfit / wins : 0;
        const avgLoss = losses > 0 ? grossLoss / losses : 0;

        let peak = -Infinity;
        let maxDrawdown = 0;
        curve.forEach(pt => {
            const val = pt.balance || pt.value;
            if (val > peak) peak = val;
            const dd = (peak - val) / peak;
            if (dd > maxDrawdown) maxDrawdown = dd;
        });

        let returns = [];
        for (let i = 1; i < curve.length; i++) {
            const prev = curve[i-1].balance || curve[i-1].value;
            const curr = curve[i].balance || curve[i].value;
            if (prev > 0) returns.push((curr - prev) / prev);
        }

        let volatility = 0;
        let sharpe = 0;
        if (returns.length > 0) {
            const meanReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
            const variance = returns.reduce((a, b) => a + Math.pow(b - meanReturn, 2), 0) / returns.length;
            volatility = Math.sqrt(variance);
            sharpe = volatility > 0 ? (meanReturn / volatility) * Math.sqrt(365 * 24) : 0;
        }

        let sqn = 0;
        if (tradeReturns.length > 0) {
            const avgR = tradeReturns.reduce((a, b) => a + b, 0) / tradeReturns.length;
            const varR = tradeReturns.reduce((a, b) => a + Math.pow(b - avgR, 2), 0) / tradeReturns.length;
            const stdDevR = Math.sqrt(varR);
            if (stdDevR > 0) {
                sqn = (avgR / stdDevR) * Math.sqrt(tradeReturns.length);
            }
        }

        const days = (new Date(results.endDate) - new Date(results.startDate)) / (1000 * 60 * 60 * 24);
        const years = days / 365;
        const cagr = years > 0 ? (Math.pow(finalBalance / initialBalance, 1 / years) - 1) * 100 : 0;

        return {
            ...results.metrics,
            win_rate: winRate,
            profit_factor: profitFactor,
            max_drawdown: maxDrawdown * 100,
            final_balance: finalBalance,
            net_profit: netProfit,
            total_wins: wins,
            total_losses: losses,
            total_trades: totalTrades,
            avg_trade: avgTrade,
            avg_win: avgWin,
            avg_loss: avgLoss,
            largest_win: largestWin,
            largest_loss: largestLoss,
            sharpe_ratio: sharpe,
            volatility: volatility * 100,
            cagr: cagr,
            sqn: sqn,
            ai_accuracy: aiAccuracy,
            ai_saves: aiSaves,
            ai_misses: aiMisses
        };
    };

    const processResults = (responseData) => {
    if (!responseData) return;

    // 1. DATA EXTRACTION: Handle nested results from the Streamer
    // This looks for the result in both the new 'stream' format and old 'direct' format
    const payload = responseData.result || responseData;

    // 2. VETO ALIGNMENT: Find vetoes regardless of nesting
    const rawVetoes = payload.vetoed_signals || 
                      payload.combinedResult?.vetoed_signals || 
                      [];

    // 3. CANDLE ALIGNMENT: Support every possible naming variant
    let rawCandles = payload.candleData || 
                     payload.candle_data || 
                     payload.metrics?.candle_data || 
                     [];

    // 4. EQUITY CURVE ALIGNMENT
    const rawCurve = payload.equityCurve || payload.combinedResult?.equityCurve || [];
    
    // Sort and format for the Charting Engine
    const formattedCurve = rawCurve.map(pt => ({
        time: Math.floor(new Date(pt.time).getTime() / 1000),
        value: pt.balance
    })).sort((a, b) => a.time - b.time);

    // 5. METRICS RECONCILIATION
    // This ensures that calculateAdvancedMetrics always gets the keys it needs
    const enhancedMetrics = calculateAdvancedMetrics({
        ...payload,
        equityCurve: formattedCurve,
        vetoed_signals: rawVetoes,
        candleData: rawCandles,
        startDate: data.startDate, // Fallback to current UI state if missing
        endDate: data.endDate
    });

    // 🎯 THE FINAL COMMIT: This is what the UI components actually see
    setBacktestResults({
        ...payload,
        metrics: enhancedMetrics,
        equityCurve: formattedCurve,
        vetoed_signals: rawVetoes,
        candleData: rawCandles
    });

    setIsSimulating(false);
    setProgress(100);
    setStatusMsg("Analysis Complete");
};

    
    const handleRun = async (e) => {
    e.preventDefault();
    
    // 1. Reset UI States
    setProgress(0);
    setIsSimulating(true);
    setStatusMsg("Connecting to AI Council...");
    setBacktestResults(null); // Clear previous results

    const dynamicUserId = JSON.parse(localStorage.getItem('user'))?._id;
    const isCombo = activeTab === 'combo';
    
    // 2. Prepare Payload
    const finalPayload = isCombo ? {
        ...data,
        userId: dynamicUserId,
        code: 'hybrid_ensemble'
    } : {
        ...data,
        userId: dynamicUserId,
        params: { ...data.params, ...DEFAULT_STRATEGY_PARAMS[data.code] }
    };

    try {
        // 3. Initiate Stream (Standard Fetch)
        const endpoint = isCombo ? `${API_BASE}/backtest/combo` : `${API_BASE}/backtest/run`;
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(finalPayload)
        });

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        // 4. Process the Stream
        while (true) {
            const { value, done } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);
            const lines = chunk.split('\n').filter(line => line.trim());

            for (const line of lines) {
                try {
                    const update = JSON.parse(line);

                    if (update.status === "progress") {
                        // 🎯 HOOK: Updates your existing progress bar & status message
                        setProgress(update.percentage);
                        setStatusMsg(update.message);
                    } 
                    else if (update.status === "complete") {
                        // 🏁 FINISHED: Pass data to your existing processResults function
                        processResults(update.result);
                        return; // Exit loop
                    } 
                    else if (update.status === "error") {
                        throw new Error(update.message);
                    }
                } catch (jsonErr) {
                    console.warn("Partial JSON chunk received", jsonErr);
                }
            }
        }
    } catch (err) {
        console.error("Streaming failed:", err);
        setStatusMsg("Connection Error: " + err.message);
        setIsSimulating(false);
    }
};
    
    const handleAtomicCodeChange = (code) => {
        setData(p => ({ ...p, code, params: { ...p.params, ...DEFAULT_STRATEGY_PARAMS[code] } }));
    };

    const renderActiveView = () => {
        if (view === 'execution') return <ChartIndependent results={backtestResults} symbol={data.symbol} />;
        if (view === 'performance') return <PerformanceChart results={backtestResults} />;
        if (view === 'replay') return <ChartReplay results={backtestResults} symbol={data.symbol} />;
    };

    return (
        <div className="min-h-screen bg-zinc-950 text-white font-sans p-6">
            <header className="max-w-[1800px] mx-auto mb-8 flex items-center gap-12">
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
                                setMlMode={(m) => setData({ ...data, mlMode: m })} 
                                data={data} 
                                setData={setData} 
                                availableModels={availableModels} 
                            />
                            <div className="space-y-4 border-t border-zinc-800 pt-6">
                                <div className="flex justify-between items-center">
                                    <h4 className="text-[10px] text-emerald-400 font-black uppercase tracking-widest flex items-center gap-1">Logic Ensemble <Tooltip text="Combine multiple strategies to create a hybrid model."><Info size={10} className="text-zinc-500" /></Tooltip></h4>
                                    {activeTab === 'combo' && (
                                        <div className="flex gap-2">
                                            <select value={data.combinationRule} onChange={(e) => setData({ ...data, combinationRule: e.target.value })} className="bg-zinc-800 text-[9px] rounded-md px-2 py-1 text-emerald-400 border border-emerald-500/20 outline-none">
                                                <option value="OR">ANY (OR)</option>
                                                <option value="AND">ALL (AND)</option>
                                            </select>
                                            <button type="button" onClick={() => setData(p => ({ ...p, strategies: [...p.strategies, { code: "rsi_threshold", params: DEFAULT_STRATEGY_PARAMS.rsi_threshold }] }))} className="p-1 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-md"><Plus size={14} /></button>
                                        </div>
                                    )}
                                </div>
                                {activeTab === 'single' ? (
                                    <div className="space-y-3">
                                        <select value={data.code} onChange={(e) => handleAtomicCodeChange(e.target.value)} className={inputClass}>{STRAT_POOL.map(s => <option key={s.code} value={s.code}>{s.name}</option>)}</select>
                                        <StrategyParamInputs strategy={{ code: data.code, params: data.params }} onChange={(p) => setData(p_old => ({ ...p_old, params: { ...p_old.params, ...p } }))} />
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {data.strategies.map((s, i) => (
                                            <div key={i} className="p-3 bg-zinc-800/30 rounded-xl border border-zinc-700">
                                                <div className="flex justify-between mb-2">
                                                    <select value={s.code} onChange={(e) => { const n = [...data.strategies]; n[i] = { code: e.target.value, params: DEFAULT_STRATEGY_PARAMS[e.target.value] }; setData({ ...data, strategies: n }); }} className="bg-transparent text-[10px] font-bold text-amber-500 outline-none">{STRAT_POOL.map(o => <option key={o.code} value={o.code}>{o.name}</option>)}</select>
                                                    <button type="button" onClick={() => setData(p => ({ ...p, strategies: p.strategies.filter((_, idx) => idx !== i) }))} className="text-zinc-500 hover:text-rose-500"><Trash2 size={12} /></button>
                                                </div>
                                                <StrategyParamInputs strategy={s} onChange={(p) => { const n = [...data.strategies]; n[i].params = p; setData({ ...data, strategies: n }); }} />
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <AdvancedFilters filters={data.advanced_filters} onChange={(k, v) => setData(p => ({ ...p, advanced_filters: { ...p.advanced_filters, [k]: v } }))} />
                            <div className="space-y-4 border-t border-zinc-800 pt-6">
                                <div className="flex items-center gap-2"><Shield size={14} className="text-amber-500" /><h4 className="text-[10px] text-amber-500 font-black uppercase tracking-widest flex items-center gap-1">Execution Shield <Tooltip text="Protect your trades with Stop Loss, Take Profit, and Trailing Stops."><Info size={10} className="text-zinc-500" /></Tooltip></h4></div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div><label className={labelClass}>TP %</label><input type="number" step="0.001" value={data.params.take_profit} onChange={(e) => setData(p => ({ ...p, params: { ...p.params, take_profit: parseFloat(e.target.value) } }))} className={inputClass} /></div>
                                    <div><label className={labelClass}>SL %</label><input type="number" step="0.001" value={data.params.stop_loss} onChange={(e) => setData(p => ({ ...p, params: { ...p.params, stop_loss: parseFloat(e.target.value) } }))} className={inputClass} /></div>
                                    <div className="col-span-2"><label className={labelClass}>Trailing Stop %</label><input type="number" step="0.001" value={data.params.trailing_stop} onChange={(e) => setData(p => ({ ...p, params: { ...p.params, trailing_stop: parseFloat(e.target.value) } }))} className={inputClass} /></div>
                                </div>
                            </div>
                            <div className="space-y-4 border-t border-zinc-800 pt-6">
                                <div className="flex items-center gap-2"><Globe size={14} className="text-cyan-400" /><h4 className="text-[10px] text-cyan-400 font-black uppercase tracking-widest flex items-center gap-1">Market <Tooltip text="Define market conditions, timeframes, and initial capital."><Info size={10} className="text-zinc-500" /></Tooltip></h4></div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="col-span-2"><label className={labelClass}>Asset</label><select value={data.symbol} onChange={(e) => setData({ ...data, symbol: e.target.value })} className={inputClass}><option value="SOL-USD">SOL-USD</option><option value="BTC-USD">BTC-USD</option></select></div>
                                    <div><label className={labelClass}>Start</label><input type="date" value={data.startDate} onChange={(e) => setData({ ...data, startDate: e.target.value })} className={inputClass} /></div>
                                    <div><label className={labelClass}>End</label><input type="date" value={data.endDate} onChange={(e) => setData({ ...data, endDate: e.target.value })} className={inputClass} /></div>
                                    <div><label className={labelClass}>Cash</label><input type="number" value={data.initialBalance} onChange={(e) => setData({ ...data, initialBalance: parseFloat(e.target.value) })} className={inputClass} /></div>
                                    <div><label className={labelClass}>Risk %</label><input type="number" step="0.1" value={data.risk_percentage} onChange={(e) => setData({ ...data, risk_percentage: parseFloat(e.target.value) })} className={inputClass} /></div>
                                </div>
                            </div>
                            <button type="submit" disabled={isSimulating} className="w-full py-4 bg-amber-500 text-zinc-950 font-black uppercase text-xs rounded-2xl hover:bg-amber-400 shadow-xl transition-all">{isSimulating ? "Crunching..." : "Initiate Simulation"}</button>
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
                                <button onClick={() => setView('replay')} className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${view === 'replay' ? 'bg-zinc-700 text-white' : 'text-zinc-500'}`}>Replay</button>
                            </div>
                            <div className="h-[600px] p-8">
                                {renderActiveView()}
                            </div>
                        </div>
            
                        {/* 🟢 NEW: Integrated Trade Ledger with Color Coding */}
                        <div className="bg-zinc-900 border border-zinc-800 rounded-[32px] overflow-hidden shadow-2xl">
                            <div className="p-6 border-b border-zinc-800 flex justify-between items-center">
                                <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2">
                                    <Activity size={12} className="text-amber-500" /> Trade Ledger
                                </h3>
                            </div>
                            <div className="overflow-x-auto max-h-[400px] custom-scrollbar">
                                <table className="w-full text-left text-[10px]">
                                    <thead className="bg-zinc-800/50 sticky top-0 z-10">
                                        <tr>
                                            <th className="px-4 py-3 font-bold uppercase text-zinc-500">Time</th>
                                            <th className="px-4 py-3 font-bold uppercase text-zinc-500">Action/Reason</th>
                                            <th className="px-4 py-3 font-bold uppercase text-zinc-500">Execution Price</th>
                                            <th className="px-4 py-3 font-bold uppercase text-zinc-500">PnL %</th>
                                            <th className="px-4 py-3 font-bold uppercase text-zinc-500">Balance</th>
                                            <th className="px-4 py-3 font-bold uppercase text-zinc-500">AI Confidence</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-zinc-800">
                                        {backtestResults.trades.map((trade, index) => (
                                            <tr key={index} className="hover:bg-zinc-800/30 transition-colors group">
                                                <td className="px-4 py-3 text-zinc-400 font-mono">{trade.time}</td>
                                                
                                                {/* 🟢 YOUR COLOR CODING LOGIC INTEGRATED HERE */}
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-2">
                                                        <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-tighter ${
                                                            trade.reason === "Take Profit" 
                                                                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" 
                                                            : trade.reason === "Trailing Stop" 
                                                                ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                                                            : trade.type === "buy" || trade.type === "sell"
                                                                ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                                                            : "bg-zinc-800 text-zinc-400"
                                                        }`}>
                                                            {trade.reason || trade.type}
                                                        </span>
                                                    </div>
                                                </td>
            
                                                <td className="px-4 py-3 font-mono text-zinc-200">${trade.price.toLocaleString()}</td>
                                                <td className={`px-4 py-3 font-mono font-bold ${trade.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                    {trade.pnl ? `${trade.pnl > 0 ? '+' : ''}${trade.pnl}%` : '—'}
                                                </td>
                                                <td className="px-4 py-3 font-mono text-zinc-500">
                                                    {trade.balance ? `$${trade.balance.toLocaleString()}` : '—'}
                                                </td>
                                                <td className="px-4 py-3">
                                                    {trade.ai_score ? (
                                                        <div className="flex flex-col gap-1 w-20">
                                                            <div className="flex justify-between text-[8px] font-black uppercase tracking-tighter">
                                                                <span className="text-zinc-500">Score</span>
                                                                <span className={trade.ai_score > trade.gate_limit ? "text-emerald-400" : "text-amber-400"}>
                                                                    {(trade.ai_score * 100).toFixed(0)}%
                                                                </span>
                                                            </div>
                                                            <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                                                                <div 
                                                                    className="h-full bg-violet-500 transition-all" 
                                                                    style={{ width: `${trade.ai_score * 100}%` }} 
                                                                />
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <span className="text-zinc-700">—</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        <div className="bg-zinc-900 border border-zinc-800 rounded-[32px] overflow-hidden shadow-2xl mt-6">
                            <div className="p-6 border-b border-zinc-800 flex justify-between items-center">
                                <h3 className="text-[10px] font-black uppercase tracking-widest text-rose-400 flex items-center gap-2">
                                    <Shield size={12} className="text-rose-500" /> Neural Veto List
                                </h3>
                                <span className="text-[9px] bg-rose-500/10 text-rose-500 px-2 py-0.5 rounded-full font-bold border border-rose-500/20">
                                    {backtestResults.vetoed_signals?.length || 0} Attacks Deflected
                                </span>
                            </div>
                            <div className="overflow-x-auto max-h-[300px] custom-scrollbar opacity-70 hover:opacity-100 transition-opacity">
                                <table className="w-full text-left text-[10px]">
                                   <thead className="bg-zinc-800/50 sticky top-0 z-10">
                                        <tr>
                                            <th className="px-4 py-3 font-bold uppercase text-zinc-500">Time</th>
                                            <th className="px-4 py-3 font-bold uppercase text-zinc-500">Attempted Signal</th>
                                            <th className="px-4 py-3 font-bold uppercase text-zinc-500">AI Confidence</th>
                                            <th className="px-4 py-3 font-bold uppercase text-zinc-500">Gate Threshold</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-zinc-800">
                                        {backtestResults.vetoed_signals && backtestResults.vetoed_signals.length > 0 ? (
                                            backtestResults.vetoed_signals.map((veto, index) => (
                                                <tr key={index} className="hover:bg-rose-500/5 transition-colors group">
                                                    {/* 🕒 Timestamp of the blocked signal */}
                                                    <td className="px-4 py-3 text-zinc-500 font-mono">{veto.time}</td>
                                                    
                                                    {/* 🚦 Signal Type (Long/Short) */}
                                                    <td className="px-4 py-3">
                                                        <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-tighter ${
                                                            veto.signal === "Long" 
                                                                ? "bg-emerald-500/10 text-emerald-500/50 border border-emerald-500/10" 
                                                                : "bg-rose-500/10 text-rose-500/50 border border-rose-500/10"
                                                        }`}>
                                                            {veto.signal}
                                                        </span>
                                                    </td>
                                    
                                                    {/* 🧠 AI Score - Highlighted in Rose because it failed to meet the limit */}
                                                    <td className="px-4 py-3 font-mono text-rose-400/80 font-bold">
                                                        {(veto.conf_score * 100).toFixed(2)}%
                                                    </td>
                                    
                                                    {/* 🚪 The Required Limit */}
                                                    <td className="px-4 py-3 font-mono text-zinc-600">
                                                        {(veto.limit * 100).toFixed(0)}%
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan="4" className="px-4 py-10 text-center">
                                                    <div className="flex flex-col items-center gap-2 opacity-30">
                                                        <Shield size={24} className="text-zinc-500" />
                                                        <p className="text-[10px] uppercase font-black tracking-widest text-zinc-500">No signals were vetoed</p>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
    
                            {/* Chart 1: Veto Composition */}
                            <div className="bg-zinc-900 border border-zinc-800 rounded-[32px] overflow-hidden shadow-2xl p-6">
                                <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-6 flex items-center gap-2">
                                    <LayoutGrid size={12} className="text-violet-500" /> AI Vetoes (L/S)
                                </h3>
                                <div className="h-[200px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={[
                                                    { name: 'Longs Blocked', value: backtestResults.vetoed_signals?.filter(v => v.signal === 'Long').length || 0 },
                                                    { name: 'Shorts Blocked', value: backtestResults.vetoed_signals?.filter(v => v.signal === 'Short').length || 0 }
                                                ]}
                                                innerRadius={50}
                                                outerRadius={70}
                                                paddingAngle={5}
                                                dataKey="value"
                                            >
                                                <Cell fill="#10b981" fillOpacity={0.6} />
                                                <Cell fill="#f43f5e" fillOpacity={0.6} />
                                            </Pie>
                                            <ChartTooltip contentStyle={{ backgroundColor: '#18181b', border: 'none', fontSize: '10px' }} />
                                            <Legend wrapperStyle={{ fontSize: '9px', textTransform: 'uppercase' }} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        
                            {/* Chart 2: Win / Loss Distribution */}
                            <div className="bg-zinc-900 border border-zinc-800 rounded-[32px] overflow-hidden shadow-2xl p-6">
                                <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-6 flex items-center gap-2">
                                    <TrendingUp size={12} className="text-emerald-500" /> Win / Loss Ratio
                                </h3>
                                <div className="h-[200px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={[
                                                    { name: 'Wins', value: backtestResults.metrics?.total_wins || 0 },
                                                    { name: 'Losses', value: backtestResults.metrics?.total_losses || 0 }
                                                ]}
                                                innerRadius={50}
                                                outerRadius={70}
                                                paddingAngle={5}
                                                dataKey="value"
                                            >
                                                <Cell fill="#10b981" />
                                                <Cell fill="#f43f5e" />
                                            </Pie>
                                            <ChartTooltip contentStyle={{ backgroundColor: '#18181b', border: 'none', fontSize: '10px' }} />
                                            <Legend wrapperStyle={{ fontSize: '9px', textTransform: 'uppercase' }} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        
                            {/* Chart 3: Execution Sides (Long vs Short) */}
                            <div className="bg-zinc-900 border border-zinc-800 rounded-[32px] overflow-hidden shadow-2xl p-6">
                                <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-6 flex items-center gap-2">
                                    <Activity size={12} className="text-cyan-500" /> Actual Execution
                                </h3>
                                <div className="h-[200px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart
                                            data={[
                                                { name: 'Longs', count: backtestResults.trades?.filter(t => t.side === 'long' || t.type === 'buy').length || 0 },
                                                { name: 'Shorts', count: backtestResults.trades?.filter(t => t.side === 'short' || t.type === 'sell').length || 0 }
                                            ]}
                                        >
                                            <XAxis dataKey="name" stroke="#52525b" fontSize={10} axisLine={false} tickLine={false} />
                                            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                                                <Cell fill="#06b6d4" />
                                                <Cell fill="#8b5cf6" />
                                            </Bar>
                                            <ChartTooltip cursor={{fill: 'transparent'}} contentStyle={{ backgroundColor: '#18181b', border: 'none', fontSize: '10px' }} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                        <div className="h-[80vh] flex flex-col items-center justify-center border-2 border-dashed border-zinc-800 rounded-[48px] bg-zinc-900/10">
                            {isSimulating ? <ProgressIndicator progress={progress} statusMsg={statusMsg} /> : <div className="opacity-20 text-center"><BarChart3 size={64} className="mx-auto mb-4" /><p className="text-xs uppercase tracking-widest font-black">Awaiting Parameters</p></div>}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function AIConfig({ mlMode, setMlMode, data, setData, availableModels = [] }) {
    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <Cpu size={14} className="text-violet-400" />
                    <h4 className="text-[10px] text-violet-400 font-black uppercase tracking-widest flex items-center gap-1">
                        Neural Gate 
                        <Tooltip text="Use machine learning models to filter trade signals.">
                            <Info size={10} className="text-zinc-500" />
                        </Tooltip>
                    </h4>
                </div>
                <select 
                    value={mlMode} 
                    onChange={(e) => setMlMode(e.target.value)} 
                    className="bg-zinc-800 text-[9px] rounded-md px-2 py-1 outline-none focus:ring-1 focus:ring-violet-500/50"
                >
                    <option value="off">BYPASS</option>
                    <option value="on">ACTIVE</option>
                </select>
            </div>

            {mlMode === "on" && (
                <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                        <label className="text-[10px] text-zinc-500 uppercase font-bold ml-1">Architecture</label>
                        <select 
                            value={data.mlModel} 
                            onChange={(e) => setData({...data, mlModel: e.target.value})} 
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:border-violet-500 transition-all text-xs outline-none"
                        >
                            {availableModels.map(model => (
                                <option key={model.id} value={model.id}>{model.name}</option>
                            ))}
                        </select>
                    </div>
                    
                    {/* 🎯 PLACED HERE: Long Gate */}
                    <div>
                        <label className="text-[10px] text-zinc-500 uppercase font-bold ml-1">Long Gate</label>
                        <input 
                            type="number" 
                            step="0.01" 
                            value={data.mlThresholdLong} 
                            onChange={(e) => setData({...data, mlThresholdLong: parseFloat(e.target.value)})} 
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:border-violet-500 transition-all text-xs outline-none" 
                        />
                    </div>

                    {/* 🎯 PLACED HERE: Short Gate */}
                    <div>
                        <label className="text-[10px] text-zinc-500 uppercase font-bold ml-1">Short Gate</label>
                        <input 
                            type="number" 
                            step="0.01" 
                            value={data.mlThresholdShort} 
                            onChange={(e) => setData({...data, mlThresholdShort: parseFloat(e.target.value)})} 
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:border-violet-500 transition-all text-xs outline-none" 
                        />
                    </div>
                </div>
            )}
        </div>
    );
}

function MetricsPanel({ metrics }) {
    const MetricCard = ({ label, value, subValue, icon: Icon, color = "text-white", tooltip }) => (
        <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl shadow-xl flex items-center justify-between relative group">
            <div>
                <p className="text-[10px] text-zinc-500 uppercase font-black mb-1 flex items-center gap-1">
                    {Icon && <Icon size={12} className="opacity-50" />}
                    {label}
                    {tooltip && <Tooltip text={tooltip}><Info size={10} className="text-zinc-600 ml-1" /></Tooltip>}
                </p>
                <p className={`text-2xl font-mono ${color}`}>{value}</p>
                {subValue && <p className="text-[10px] text-zinc-600 font-mono mt-1">{subValue}</p>}
            </div>
        </div>
    );

    const netProfit = metrics.net_profit || 0;
    const roi = metrics.roi || 0;
    const winRate = metrics.win_rate || 0;
    const pf = metrics.profit_factor || 0;
    const dd = metrics.max_drawdown || 0;
    const sharpe = metrics.sharpe_ratio || 0;
    const vol = metrics.volatility || 0;
    const cagr = metrics.cagr || 0;
    const sqn = metrics.sqn || 0;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-zinc-900/40 p-4 rounded-3xl border border-zinc-800/50">
                <h5 className="text-[10px] text-emerald-400 font-black uppercase tracking-widest mb-4 flex items-center gap-2 border-b border-zinc-800 pb-2"><DollarSign size={14} /> Financial Performance</h5>
                <div className="grid grid-cols-2 gap-3">
                    <MetricCard label="Net Profit" icon={DollarSign} value={`$${netProfit.toFixed(2)}`} color={netProfit >= 0 ? "text-emerald-400" : "text-rose-400"} subValue={`Final: $${(metrics.final_balance || 0).toFixed(2)}`} tooltip="Total profit or loss generated by the strategy." />
                    <MetricCard label="ROI" icon={TrendingUp} value={`${roi.toFixed(2)}%`} color={roi >= 0 ? "text-emerald-400" : "text-rose-400"} tooltip="Return on Investment percentage." />
                    <MetricCard label="Win Rate" icon={Percent} value={`${winRate.toFixed(1)}%`} color={winRate > 50 ? "text-emerald-400" : "text-amber-400"} subValue={`W: ${metrics.total_wins} / L: ${metrics.total_losses}`} tooltip="Percentage of trades that were profitable." />
                    <MetricCard label="Profit Factor" icon={Activity} value={pf.toFixed(2)} color={pf > 1.5 ? "text-emerald-400" : pf > 1 ? "text-amber-400" : "text-rose-400"} tooltip="Gross Profit divided by Gross Loss." />
                    <MetricCard label="Total Trades" icon={Layers} value={metrics.total_trades || 0} tooltip="Total number of trades executed." />
                    <MetricCard label="Avg Trade" icon={DollarSign} value={`$${(metrics.avg_trade || 0).toFixed(2)}`} color={metrics.avg_trade >= 0 ? "text-emerald-400" : "text-rose-400"} tooltip="Average profit/loss per trade." />
                    <MetricCard label="Avg Win" icon={TrendingUp} value={`$${(metrics.avg_win || 0).toFixed(2)}`} color="text-emerald-400" tooltip="Average profit of winning trades." />
                    <MetricCard label="Avg Loss" icon={TrendingDown} value={`$${(metrics.avg_loss || 0).toFixed(2)}`} color="text-rose-400" tooltip="Average loss of losing trades." />
                </div>
            </div>

            <div className="bg-zinc-900/40 p-4 rounded-3xl border border-zinc-800/50">
                <h5 className="text-[10px] text-violet-400 font-black uppercase tracking-widest mb-4 flex items-center gap-2 border-b border-zinc-800 pb-2"><Activity size={14} /> Risk & Advanced Analytics</h5>
                <div className="grid grid-cols-2 gap-3">
                    <MetricCard label="Max Drawdown" icon={AlertTriangle} value={`-${dd.toFixed(2)}%`} color={dd < 20 ? "text-zinc-300" : "text-rose-400"} tooltip="Maximum drawdown (MDD) is the largest single drop from peak to bottom in the value of a portfolio (before a new peak is achieved). It is an indicator of downside risk over a specified time period." />
                    <MetricCard label="Sharpe Ratio" icon={Award} value={sharpe.toFixed(2)} color={sharpe > 1 ? "text-emerald-400" : "text-zinc-400"} tooltip="Sharpe ratio is used to help investors understand the return of an investment compared to its risk. The ratio is the average return earned in excess of the risk-free rate per unit of volatility or total risk." />
                    <MetricCard label="Volatility" icon={Zap} value={`${vol.toFixed(2)}%`} color="text-zinc-300" tooltip="Volatility is a statistical measure of the dispersion of returns for a given security or market index. In most cases, the higher the volatility, the riskier the security." />
                    <MetricCard label="CAGR" icon={Scale} value={`${cagr.toFixed(2)}%`} color={cagr > 0 ? "text-emerald-400" : "text-zinc-400"} tooltip="Compound annual growth rate (CAGR) is the rate of return that would be required for an investment to grow from its beginning balance to its ending balance, assuming the profits were reinvested at the end of each year of the investment's lifespan." />
                    <MetricCard label="Largest Win" icon={Award} value={`$${(metrics.largest_win || 0).toFixed(2)}`} color="text-emerald-400" tooltip="The single largest profit made from one trade in the given period." />
                    <MetricCard label="Largest Loss" icon={AlertTriangle} value={`$${(metrics.largest_loss || 0).toFixed(2)}`} color="text-rose-400" tooltip="The single largest loss taken from one trade in the given period." />
                    <MetricCard
                        label="SQN Score"
                        icon={LayoutGrid}
                        value={sqn.toFixed(2)}
                        color={sqn > 2.5 ? "text-emerald-400" : sqn > 1.5 ? "text-amber-400" : "text-zinc-400"}
                        subValue="System Quality"
                        tooltip="System Quality Number (SQN) measures the relationship between your trading edge and the consistency of that edge. It is calculated by taking the square root of the number of trades and multiplying it by the average profit divided by the standard deviation of profit/loss."
                    />
                    
                    <MetricCard
                        label="AI Save Accuracy"
                        icon={Shield}
                        value={`${(metrics.ai_accuracy || 0).toFixed(1)}%`}
                        color={metrics.ai_accuracy > 70 ? "text-emerald-400" : metrics.ai_accuracy > 50 ? "text-amber-400" : "text-rose-400"}
                        subValue={`Saved: ${metrics.ai_saves} | Missed: ${metrics.ai_misses}`}
                        tooltip="The percentage of vetoed trades that would have resulted in a loss. A high score means the AI is successfully filtering out bad signals."
                    />
                    
                    <div className="flex items-center justify-center opacity-30">
                        <span className="text-[9px] font-black uppercase text-zinc-700 tracking-widest">Sovereign Quant</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

function StrategyParamInputs({ strategy, onChange }) {
    const { code, params = {} } = strategy;
    const handleNumChange = (k, valStr) => {
        if (valStr === "" || valStr === "-") onChange({ ...params, [k]: "" });
        else onChange({ ...params, [k]: isNaN(parseFloat(valStr)) ? "" : parseFloat(valStr) });
    };
    const f = (l, k, s = "1", tip) => (
        <div className="flex flex-col">
            <div className="flex items-center justify-between mb-1">
                <label className={labelClass}>{l}</label>
                {tip && <Tooltip text={tip}><Info size={10} className="text-zinc-600" /></Tooltip>}
            </div>
            <input type="number" step={s} value={params[k] === undefined || isNaN(params[k]) ? "" : params[k]} onChange={(e) => handleNumChange(k, e.target.value)} className="bg-zinc-950 border border-zinc-700 rounded-lg px-2 py-1 text-[10px] text-amber-500 outline-none" />
        </div>
    );
    return (
        <div className="grid grid-cols-2 gap-2 mt-2">
            {code === "rsi_threshold" && <>{f("RSI Len", "rsi_length", "1", "RSI Length is the number of previous trading sessions used to calculate the Relative Strength Index (RSI).")}{f("OB", "overbought", "1", "The overbought level is a threshold on the RSI indicator, typically set at 70, which suggests that an asset may be overvalued and due for a price correction.")}{f("OS", "oversold", "1", "The oversold level is a threshold on the RSI indicator, typically set at 30, which suggests that an asset may be undervalued and due for a price bounce.")}</>}
            {code === "sma_crossover" && <>{f("Fast", "fast_sma", "1", "The Fast Simple Moving Average (SMA) calculates the average price over a shorter number of periods, reacting more quickly to price changes.")}{f("Slow", "slow_sma", "1", "The Slow Simple Moving Average (SMA) calculates the average price over a longer number of periods, smoothing out price noise to show the broader trend.")}</>}
            {code === "supertrend" && <>{f("ATR", "st_atr", "1", "The ATR Period for SuperTrend determines the lookback window for calculating volatility, which influences the distance of the stop-loss line from the price.")}{f("Factor", "st_factor", "0.1", "The SuperTrend Factor is a multiplier applied to the ATR value to set the distance of the trend line from the price; a higher factor keeps the line further away.")}</>}
            {code === "macd_crossover" && <>{f("Fast", "fast", "1", "Fast EMA Period is the shorter time period used to calculate the first Exponential Moving Average in the MACD formula.")}{f("Slow", "slow", "1", "Slow EMA Period is the longer time period used to calculate the second Exponential Moving Average in the MACD formula.")}{f("Signal", "signal", "1", "Signal Line Period is the time period for the EMA of the MACD line itself, used to generate buy and sell signals.")}</>}
            {code === "atr_breakout" && <>{f("ATR Len", "atr_length", "1", "ATR Length determines the number of periods used to calculate the Average True Range, measuring market volatility.")}{f("Mult", "multiplier", "0.1", "ATR Multiplier scales the ATR value to set dynamic stop-loss or breakout levels based on current volatility.")}</>}
            {code === "bb_fade" && <>{f("Period", "bb_period", "1", "Bollinger Band Period is the number of candles used to calculate the Simple Moving Average (SMA) which serves as the middle band.")}{f("Std", "bb_std", "0.1", "Standard Deviation Multiplier determines the width of the Bollinger Bands; typically set to 2, representing two standard deviations from the moving average.")}</>}
            {code === "stoch" && <>{f("K", "k_period", "1", "%K Period is the number of periods used to calculate the main line of the Stochastic Oscillator.")}{f("D", "d_period", "1", "%D Period is the number of periods used to calculate the moving average of the %K line, creating the signal line.")}{f("Slow", "slowing", "1", "Slowing is a smoothing factor applied to the %K line to reduce noise and false signals in the Stochastic Oscillator.")}</>}
            {code === "ema_cloud" && <>{f("Fast EMA", "fast_ema", "1", "Fast EMA in an EMA Cloud represents the shorter-term moving average that typically forms the upper boundary in an uptrend.")}{f("Slow EMA", "slow_ema", "1", "Slow EMA in an EMA Cloud represents the longer-term moving average that typically forms the lower boundary in an uptrend.")}</>}
            {code === "pa_breakout" && <>{f("Lookback", "lookback", "1", "Lookback Period defines how many past candles are analyzed to identify significant support or resistance levels.")}{f("Buffer", "buffer", "0.001", "Buffer is a small additional value added to a breakout level to filter out false breakouts and confirm price momentum.")}</>}
            {code === "vol_profile" && <>{f("Vol MA", "vol_ma", "1", "Volume Moving Average Period calculates the average trading volume over a set number of bars to establish a baseline for volume activity.")}{f("Thresh", "threshold", "0.1", "Volume Threshold is a multiplier or value that current volume must exceed relative to the average to trigger a signal.")}</>}
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
