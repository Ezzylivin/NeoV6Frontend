import React, { useState, useEffect, useMemo, useCallback } from "react";
import axios from "axios"; 
import { useBacktest } from "../hooks/useBacktest.js";
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartTooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from "recharts";
import { ChartIndependent } from "../components/ChartIndependent.jsx"; 
import { ChartReplay } from "../components/ChartReplay.jsx";
import "./Backtests.css"; 

// --- 🟢 CORE REGISTRY SYNC ---
const STRATEGY_TYPE_TO_CODE_MAP = {
  "SMA Crossover": "sma_crossover", 
  "MACD Crossover": "macd_crossover",
  "RSI Threshold": "rsi_threshold", 
  "RSI Divergence": "rsi_divergence", 
  "Bollinger Bands": "bollinger_bands", 
  "Stochastic Cross": "stochastic_cross",
  "ATR Breakout": "atr_breakout",
  "Ichimoku Cloud": "ichimoku_cloud", 
  "Parabolic SAR": "psar_signal", 
  "OBV Volume": "obv_trend"
};

const inputClass = "w-full bg-[#0a0a0a] border border-white/10 rounded-xl px-4 py-3 text-white focus:border-emerald-500 transition-all text-sm outline-none";

// --- 🛠️ DYNAMIC PARAMETER BLOCKS ---
const StrategyParamInputs = ({ strategy, onChange }) => {
    const { code, params = {} } = strategy;
    const update = (key, val) => onChange({ ...params, [key]: val });

    const field = (label, key, type = "number", step = "1") => (
        <div className="flex flex-col">
            <label className="text-[8px] text-neutral-500 uppercase font-bold mb-1">{label}</label>
            <input 
                type={type} step={step} value={params[key] || ""} 
                onChange={(e) => update(key, type === "number" ? parseFloat(e.target.value) : e.target.value)}
                className="bg-black/40 border border-white/10 rounded-lg px-2 py-1 text-[10px] text-emerald-400 outline-none focus:border-emerald-500"
            />
        </div>
    );

    return (
        <div className="grid grid-cols-2 gap-3 p-3 bg-black/20 rounded-xl border border-white/5 mt-2 animate-in fade-in slide-in-from-top-2">
            {code === "sma_crossover" && <>{field("Fast", "fast_sma")}{field("Slow", "slow_sma")}</>}
            {code === "macd_crossover" && <>{field("Fast", "fast")}{field("Slow", "slow")}{field("Signal", "signal")}</>}
            {code === "rsi_threshold" && <>{field("Length", "rsi_length")}{field("OS", "oversold_level")}{field("OB", "overbought_level")}</>}
            {code === "rsi_divergence" && <>{field("RSI Len", "rsi_length")}{field("Lookback", "lookback")}</>}
            {code === "bollinger_bands" && <>{field("Period", "length")}{field("Std Dev", "std_dev", "number", "0.1")}</>}
            {code === "stochastic_cross" && <>{field("%K", "k_period")}{field("%D", "d_period")}</>}
            {code === "atr_breakout" && <>{field("ATR Len", "atr_length")}{field("Mult", "atr_mult", "number", "0.1")}</>}
            {code === "ichimoku_cloud" && <>{field("Conversion", "tenkan")}{field("Base", "kijun")}{field("Span B", "senkou")}</>}
            {code === "psar_signal" && <>{field("Step", "step", "number", "0.01")}{field("Max", "max_step", "number", "0.01")}</>}
            {code === "obv_trend" && <>{field("MA Length", "ma_length")}</>}
        </div>
    );
};

// --- SUB-COMPONENTS ---
const MetricsGrid = ({ metrics }) => (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
            { l: "ROI", v: `${(metrics.roi || 0).toFixed(2)}%`, c: "text-emerald-400" },
            { l: "Win Rate", v: `${(metrics.winRate || 0).toFixed(2)}%`, c: "text-violet-400" },
            { l: "Profit Factor", v: (metrics.profitFactor || 0).toFixed(2), c: "text-teal-400" },
            { l: "Max Drawdown", v: `${(metrics.maxDrawdown || 0).toFixed(2)}%`, c: "text-rose-400" },
            { l: "Total Trades", v: metrics.totalTrades || 0, c: "text-cyan-400" },
            { l: "Avg Win", v: `$${(metrics.averageWin || 0).toFixed(2)}`, c: "text-emerald-500" }
        ].map((m, i) => (
            <div key={i} className="bot-card p-4 text-center bg-black/40 border border-white/5 rounded-2xl shadow-xl">
                <div className="text-neutral-500 text-[9px] uppercase font-black tracking-widest mb-1">{m.l}</div>
                <div className={`text-lg font-mono font-bold ${m.c}`}>{m.v}</div>
            </div>
        ))}
    </div>
);

export default function Backtests() {
  const { state, runNewBacktest, runComboBacktest, fetchOptions } = useBacktest(); 
  const { options = {} } = state || {};

  const [selectedWinnerId, setSelectedWinnerId] = useState("");
  const [activeTab, setActiveTab] = useState('single');
  const [displayMode, setDisplayMode] = useState('static');
  const [isSimulating, setIsSimulating] = useState(false);
  const [liveWinners, setLiveWinners] = useState([]);
  const [backtestResults, setBacktestResults] = useState(null);

  const [formData, setFormData] = useState({ 
    symbol: "BTC-USD", timeframe: "1h", startDate: "2025-01-01", endDate: "2026-01-01", 
    initialBalance: 1000, strategyId: "", code: "", risk_mode: 'static', risk_percentage: 1, 
    regime_mode: "adaptive", params: { tslAtrMult: 3.0, minAdxLevel: 25, commission: 0.006, slippage: 0.001 }, mlMode: "off" 
  });

  const [comboData, setComboData] = useState({ 
    symbol: "BTC-USD", timeframe: "1h", startDate: "2025-01-01", endDate: "2026-01-01", 
    initialBalance: 1000, strategies: [{strategyId: "", code: "", params: {}}], combinationRule: "OR", 
    risk_mode: 'static', risk_percentage: 1, regime_mode: "adaptive", params: { tslAtrMult: 3.0, minAdxLevel: 25, commission: 0.006, slippage: 0.001 }, mlMode: "off"
  });

  useEffect(() => { if (typeof fetchOptions === 'function') fetchOptions(); }, [fetchOptions]);

  const strategyOptions = useMemo(() => {
    const baseStrats = Object.entries(STRATEGY_TYPE_TO_CODE_MAP).map(([name, code]) => ({ _id: `base-${code}`, name, code }));
    return [...baseStrats, ...(options?.strategies || [])];
  }, [options]);

  const handleRun = async (e) => {
    e.preventDefault();
    setBacktestResults(null);
    setIsSimulating(true); 

    const activeData = activeTab === 'combo' ? { ...comboData } : { ...formData };
    
    // Final Payload Preparation
    const payload = {
        ...activeData,
        initialBalance: Number(activeData.initialBalance),
        risk_percentage: Number(activeData.risk_percentage),
        // Sync combinationRule into params for backend aggregator
        params: { ...activeData.params, combinationRule: activeData.combinationRule || "OR" }
    };

    if (!payload.code && payload.strategyId) {
        payload.code = strategyOptions.find(o => o._id === payload.strategyId)?.code || "";
    }

    const runner = activeTab === 'combo' ? runComboBacktest : runNewBacktest;
    const res = await runner(payload);
    if (res) setBacktestResults(res);
    setIsSimulating(false);
  };

  return (
    <div className="backtest-container p-6 md:p-10 space-y-10 max-w-[1800px] mx-auto bg-[#030303]">
        <div className="grid grid-cols-12 gap-10">
          
          {/* --- LEFT CONTROL PANEL --- */}
          <div className="col-span-12 lg:col-span-4">
            <div className="bot-card p-7 bg-black/60 border border-white/5 rounded-[32px] sticky top-10 shadow-2xl backdrop-blur-xl">
              
              <div className="tabs flex gap-2 mb-8 bg-white/5 p-1.5 rounded-2xl"> 
                <button type="button" className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${activeTab === 'single' ? 'bg-emerald-500 text-black shadow-lg' : 'text-neutral-500'}`} onClick={() => setActiveTab('single')}>Atomic</button> 
                <button type="button" className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${activeTab === 'combo' ? 'bg-emerald-500 text-black shadow-lg' : 'text-neutral-500'}`} onClick={() => setActiveTab('combo')}>Hybrid</button> 
              </div>

              <form onSubmit={handleRun} className="space-y-8">
                {activeTab === 'single' ? (
                   <div>
                    <label className="text-neutral-500 text-[10px] uppercase font-black mb-3 block">Signal Engine</label>
                    <select value={formData.strategyId} onChange={(e) => {
                        const opt = strategyOptions.find(o => o._id === e.target.value);
                        setFormData({...formData, strategyId: e.target.value, code: opt?.code || ""});
                    }} className={inputClass}>
                        <option value="">-- Select Strategy --</option>
                        {strategyOptions.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                    </select>
                    {formData.code && <StrategyParamInputs strategy={formData} onChange={(p) => setFormData({...formData, params: {...formData.params, ...p}})} />}
                   </div>
                ) : (
                    <div className="space-y-4">
                        <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl mb-4">
                            <label className="text-emerald-400 text-[9px] font-black uppercase mb-2 block">Decision Logic (AND/OR)</label>
                            <select className={inputClass} value={comboData.combinationRule} onChange={(e) => setComboData({...comboData, combinationRule: e.target.value})}>
                                <option value="OR">OR (Aggressive)</option>
                                <option value="AND">AND (Conservative)</option>
                            </select>
                        </div>
                        {comboData.strategies.map((s, i) => (
                            <div key={i} className="bot-card p-4 border border-white/5 bg-white/5 rounded-2xl space-y-2">
                                <div className="flex justify-between items-center">
                                    <span className="text-[9px] text-neutral-500 font-bold uppercase">Layer {i+1}</span>
                                    <button type="button" onClick={()=>setComboData({...comboData, strategies: comboData.strategies.filter((_, idx)=>idx!==i)})} className="text-rose-500">✕</button>
                                </div>
                                <select className={inputClass} value={s.strategyId} onChange={(e) => {
                                    const opt = strategyOptions.find(o => o._id === e.target.value);
                                    const n = [...comboData.strategies]; n[i] = {strategyId: e.target.value, code: opt?.code || "", params: {}};
                                    setComboData({...comboData, strategies: n});
                                }}><option value="">-- Engine --</option>{strategyOptions.map(o=><option key={o._id} value={o._id}>{o.name}</option>)}</select>
                                {s.code && <StrategyParamInputs strategy={s} onChange={(p) => {
                                    const n = [...comboData.strategies]; n[i].params = p;
                                    setComboData({...comboData, strategies: n});
                                }} />}
                            </div>
                        ))}
                        <button type="button" onClick={()=>setComboData({...comboData, strategies: [...comboData.strategies, {strategyId: "", code: "", params: {}}]})} className="w-full py-3 border-dashed border-2 border-white/10 rounded-2xl text-[9px] text-emerald-400 uppercase font-black">+ Add Layer</button>
                    </div>
                )}

                {/* Common Params Block */}
                <div className="space-y-4 pt-4 border-t border-white/5">
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className="text-neutral-500 text-[9px] uppercase">TSL Mult</label>
                        <input type="number" step="0.1" value={(activeTab === 'single' ? formData : comboData).params.tslAtrMult} onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            if (activeTab === 'single') setFormData({...formData, params: {...formData.params, tslAtrMult: val}});
                            else setComboData({...comboData, params: {...comboData.params, tslAtrMult: val}});
                        }} className={inputClass}/></div>
                        <div><label className="text-neutral-500 text-[9px] uppercase">ADX Gate</label>
                        <input type="number" value={(activeTab === 'single' ? formData : comboData).params.minAdxLevel} onChange={(e) => {
                            const val = parseInt(e.target.value);
                            if (activeTab === 'single') setFormData({...formData, params: {...formData.params, minAdxLevel: val}});
                            else setComboData({...comboData, params: {...comboData.params, minAdxLevel: val}});
                        }} className={inputClass}/></div>
                    </div>
                </div>
                
                <button type="submit" disabled={isSimulating} className={`w-full py-5 font-black uppercase tracking-[0.2em] rounded-2xl shadow-xl transition-all ${isSimulating ? 'bg-neutral-800 text-neutral-500 animate-pulse' : 'bg-emerald-500 text-black hover:scale-[1.02] active:scale-95'}`}>
                    {isSimulating ? '🔬 CRUNCHING HISTORY...' : '▶ Launch Backtest'}
                </button>
              </form>
            </div>
          </div>

          {/* --- RIGHT RESULTS PANEL --- */}
          <div className="col-span-12 lg:col-span-8 space-y-8">
            {backtestResults ? (
                <div className="animate-in fade-in slide-in-from-bottom-10 duration-700">
                    <MetricsGrid metrics={backtestResults.metrics || {}} />
                    <div className="bot-card p-5 h-[680px] border border-white/5 bg-black/40 rounded-[32px] overflow-hidden shadow-2xl">
                        {displayMode === 'static' ? <ChartIndependent results={backtestResults} symbol={formData.symbol} /> : <ChartReplay results={backtestResults} symbol={formData.symbol} />}
                    </div>
                </div>
            ) : (
                <div className="bot-card p-24 flex flex-col items-center justify-center min-h-[900px] border-2 border-dashed border-white/5 bg-black/20 rounded-[48px]">
                    <div className="w-28 h-28 rounded-full flex items-center justify-center mb-10 text-5xl bg-emerald-500/5 border border-emerald-500/20 animate-pulse">🔬</div>
                    <h3 className="text-white text-2xl mb-5 font-black uppercase tracking-[0.2em]">Ready for Verification</h3>
                </div>
            )}
          </div>
        </div>
    </div>
  );
}
