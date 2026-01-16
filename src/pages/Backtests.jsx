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

const STRATEGY_TYPE_TO_CODE_MAP = {
  "SMA Crossover": "sma_crossover", "MACD Crossover": "macd_crossover",
  "RSI Threshold": "rsi_threshold", "RSI Divergence": "rsi_divergence", 
  "Bollinger Bands": "bollinger_bands", "Stochastic Cross": "stochastic_cross",
  "ATR Breakout": "atr_breakout", "Ichimoku Cloud": "ichimoku_cloud", 
  "Parabolic SAR": "psar_signal", "OBV Volume": "obv_trend"
};

const inputClass = "w-full bg-[#0a0a0a] border border-white/10 rounded-xl px-4 py-3 text-white focus:border-emerald-500 transition-all text-sm outline-none";

// --- 🛠️ 10-STRATEGY PARAMETER BLOCKS ---
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
            {code === "sma_crossover" && <>{field("Fast SMA", "fast_sma")}{field("Slow SMA", "slow_sma")}</>}
            {code === "macd_crossover" && <>{field("Fast", "fast")}{field("Slow", "slow")}{field("Signal", "signal")}</>}
            {code === "rsi_threshold" && <>{field("Length", "rsi_length")}{field("OS Level", "oversold_level")}{field("OB Level", "overbought_level")}</>}
            {code === "rsi_divergence" && <>{field("RSI Len", "rsi_length")}{field("Lookback", "lookback")}</>}
            {code === "bollinger_bands" && <>{field("Period", "length")}{field("Std Dev", "std_dev", "number", "0.1")}</>}
            {code === "stochastic_cross" && <>{field("%K", "k_period")}{field("%D", "d_period")}</>}
            {code === "atr_breakout" && <>{field("ATR Len", "atr_length")}{field("Mult", "atr_mult", "number", "0.1")}</>}
            {code === "ichimoku_cloud" && <>{field("Tenkan", "tenkan")}{field("Kijun", "kijun")}{field("Senkou B", "senkou")}</>}
            {code === "psar_signal" && <>{field("Step", "step", "number", "0.01")}{field("Max", "max_step", "number", "0.01")}</>}
            {code === "obv_trend" && <>{field("MA Length", "ma_length")}</>}
        </div>
    );
};

// --- 🟢 FEE TIER SYSTEM ---
const FEE_TIERS = [
    { label: "Coinbase Adv (0.6%)", val: 0.006, slip: 0.001 },
    { label: "Coinbase Pro (0.4%)", val: 0.004, slip: 0.0008 },
    { label: "Binance/VIP (0.1%)", val: 0.001, slip: 0.0005 }
];

const CommonInputs = ({ data, onChange, options, onParamChange }) => {
    const params = data.params || {};
    
    return (
        <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
                <div><label className="text-neutral-400 text-[10px] uppercase font-bold mb-2 block">Symbol</label>
                <select name="symbol" value={data.symbol} onChange={onChange} className={inputClass}>
                    <option value="BTC-USD">BTC-USD</option><option value="ETH-USD">ETH-USD</option>
                </select></div>
                <div><label className="text-neutral-400 text-[10px] uppercase font-bold mb-2 block">Timeframe</label>
                <select name="timeframe" value={data.timeframe} onChange={onChange} className={inputClass}>
                    <option value="1h">1h</option><option value="15m">15m</option>
                </select></div>
            </div>

            <div className="bot-card p-5 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl">
                <h4 className="text-emerald-400 font-black uppercase text-[10px] mb-4">Coinbase Fee Hardening</h4>
                <div className="space-y-4">
                    <div>
                        <label className="text-neutral-500 text-[10px] uppercase block mb-2">Exchange Tier</label>
                        <div className="grid grid-cols-3 gap-2">
                            {FEE_TIERS.map(tier => (
                                <button 
                                    key={tier.label}
                                    type="button"
                                    onClick={() => {
                                        onParamChange('commission', tier.val);
                                        onParamChange('slippage', tier.slip);
                                    }}
                                    className={`py-2 rounded-lg text-[9px] font-bold border transition-all ${params.commission === tier.val ? 'bg-emerald-500 text-black border-emerald-500' : 'bg-transparent text-neutral-500 border-white/10 hover:border-white/20'}`}
                                >
                                    {tier.label}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className="text-neutral-500 text-[9px] uppercase">Active Fee</label>
                        <div className="text-white font-mono text-sm py-2 px-3 bg-black/40 rounded-lg border border-white/5">{(params.commission * 100).toFixed(2)}%</div></div>
                        <div><label className="text-neutral-500 text-[9px] uppercase">Spread/Slip</label>
                        <div className="text-white font-mono text-sm py-2 px-3 bg-black/40 rounded-lg border border-white/5">{(params.slippage * 100).toFixed(2)}%</div></div>
                    </div>
                </div>
            </div>

            <div className="bot-card p-5 border border-white/5 bg-white/5 rounded-2xl">
                <h4 className="text-white font-black uppercase text-[10px] mb-4">Regime Intelligence</h4>
                <div className="grid grid-cols-2 gap-4">
                    <div><label className="text-neutral-500 text-[10px] uppercase block">TSL Mult</label>
                    <input type="number" step="0.1" value={params.tslAtrMult} onChange={(e)=>onParamChange('tslAtrMult', parseFloat(e.target.value))} className={inputClass}/></div>
                    <div><label className="text-neutral-500 text-[10px] uppercase block">Min ADX</label>
                    <input type="number" value={params.minAdxLevel} onChange={(e)=>onParamChange('minAdxLevel', parseInt(e.target.value))} className={inputClass}/></div>
                </div>
            </div>
        </div>
    );
};

export default function Backtests() {
  const { state, runNewBacktest, runComboBacktest, fetchOptions } = useBacktest(); 
  const { options = {} } = state || {};

  const [activeTab, setActiveTab] = useState('single');
  const [isSimulating, setIsSimulating] = useState(false);
  const [backtestResults, setBacktestResults] = useState(null);

  const [formData, setFormData] = useState({ 
    symbol: "BTC-USD", timeframe: "1h", startDate: "2025-01-01", endDate: "2026-01-01", 
    initialBalance: 1000, strategyId: "", code: "", risk_mode: 'static', risk_percentage: 1, 
    params: { tslAtrMult: 3.0, minAdxLevel: 25, commission: 0.006, slippage: 0.001 } 
  });

  const [comboData, setComboData] = useState({ 
    symbol: "BTC-USD", timeframe: "1h", startDate: "2025-01-01", endDate: "2026-01-01", 
    initialBalance: 1000, strategies: [{strategyId: "", code: "", params: {}}], combinationRule: "OR", 
    params: { tslAtrMult: 3.0, minAdxLevel: 25, commission: 0.006, slippage: 0.001 }
  });

  const strategyOptions = useMemo(() => {
    const baseStrats = Object.entries(STRATEGY_TYPE_TO_CODE_MAP).map(([name, code]) => ({ _id: `base-${code}`, name, code }));
    return [...baseStrats, ...(options?.strategies || [])];
  }, [options]);

  const handleRun = async (e) => {
    e.preventDefault();
    setIsSimulating(true); 
    const activeData = activeTab === 'combo' ? { ...comboData } : { ...formData };
    
    const payload = {
        ...activeData,
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
          <div className="col-span-12 lg:col-span-4">
            <div className="bot-card p-7 bg-black/60 border border-white/5 rounded-[32px] sticky top-10">
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
                        <div className="p-4 bg-white/5 rounded-2xl mb-4">
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
                    </div>
                )}

                <CommonInputs 
                    data={activeTab === 'single' ? formData : comboData} 
                    onChange={(e) => {
                        const val = e.target.type === 'number' ? Number(e.target.value) : e.target.value;
                        const name = e.target.name;
                        if (activeTab === 'single') setFormData(prev => ({...prev, [name]: val}));
                        else setComboData(prev => ({...prev, [name]: val}));
                    }}
                    onParamChange={(name, val) => {
                        if (activeTab === 'single') setFormData(prev => ({...prev, params: {...prev.params, [name]: val}}));
                        else setComboData(prev => ({...prev, params: {...prev.params, [name]: val}}));
                    }}
                />
                <button type="submit" disabled={isSimulating} className="w-full py-5 font-black uppercase tracking-[0.2em] rounded-2xl bg-emerald-500 text-black">
                    {isSimulating ? '🔬 CRUNCHING...' : '▶ Launch Backtest'}
                </button>
              </form>
            </div>
          </div>
          <div className="col-span-12 lg:col-span-8">
            {backtestResults && (
                <div className="animate-in fade-in duration-700">
                    <MetricsGrid metrics={backtestResults.metrics || {}} />
                    <div className="bot-card p-5 h-[680px] border border-white/5 bg-black/40 rounded-[32px]">
                        <ChartIndependent results={backtestResults} symbol={formData.symbol} />
                    </div>
                </div>
            )}
          </div>
        </div>
    </div>
  );
}
