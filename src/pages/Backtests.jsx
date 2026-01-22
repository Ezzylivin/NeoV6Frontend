import React, { useState, useEffect, useCallback } from "react";
import axios from "axios"; 
import { useBacktest } from "../hooks/useBacktest.js";
import { ChartIndependent } from "../components/ChartIndependent.jsx"; 
import "./Backtests.css"; 

const STRAT_POOL = [
  { name: "SMA Crossover", code: "sma_crossover" },
  { name: "MACD Crossover", code: "macd_crossover" },
  { name: "RSI Threshold", code: "rsi_threshold" },
  { name: "RSI Divergence", code: "rsi_divergence" },
  { name: "ATR Breakout", code: "atr_breakout" }
];

// 🟢 UPDATED ROSTER: Now matches the synced Python Council
const AI_ARCHITECTURES = [
  { id: "stacking", name: "Council Consensus (Stacking)" },
  { id: "XGBoost", name: "XGBoost (Gradient Boost)" },
  { id: "RandomForest", name: "RandomForest (Decision Trees)" },
  { id: "Transformer", name: "Transformer (Attention Layer)" }
];

const REGIME_OPTIONS = [
  { id: "static", name: "Static (Indicator Veto)" },
  { id: "adaptive", name: "Adaptive (State Classifier)" }
];

const FEE_TIERS = [
  { label: "CB Adv (0.6%)", val: 0.006, slip: 0.001 },
  { label: "CB Pro (0.4%)", val: 0.004, slip: 0.0008 },
  { label: "Binance (0.1%)", val: 0.001, slip: 0.0005 }
];

const inputClass = "w-full bg-[#0a0a0a] border border-white/10 rounded-xl px-4 py-3 text-white focus:border-emerald-500 transition-all text-sm outline-none";

// 🛠️ FIXED: Now accepts a consistent 'params' object and 'onChange' callback
const StrategyParamInputs = ({ params = {}, onChange }) => {
    const update = (key, val) => onChange({ ...params, [key]: val });
    
    const field = (label, key, type = "number", step = "1") => (
        <div className="flex flex-col">
            <label className="text-[8px] text-neutral-500 uppercase font-bold mb-1">{label}</label>
            <input 
                type={type} 
                step={step} 
                value={params[key] ?? ""} 
                onChange={(e) => update(key, type === "number" ? parseFloat(e.target.value) : e.target.value)}
                className="bg-black/40 border border-white/10 rounded-lg px-2 py-1 text-[10px] text-emerald-400 outline-none"
            />
        </div>
    );

    // Logic to detect which strategy fields to show based on code is handled by parent
    return (
        <div className="grid grid-cols-2 gap-2 p-3 bg-black/20 rounded-xl border border-white/5 mt-2">
            {params.code === "sma_crossover" && <>{field("Fast SMA", "fast_sma")}{field("Slow SMA", "slow_sma")}</>}
            {params.code === "macd_crossover" && <>{field("Fast", "fast")}{field("Slow", "slow")}{field("Signal", "signal")}</>}
            {params.code === "rsi_threshold" && <>{field("Len", "rsi_length")}{field("OS", "oversold_level")}{field("OB", "overbought_level")}</>}
        </div>
    );
};

const MetricsGrid = ({ metrics }) => (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
        {[
            { l: "ROI", v: `${(metrics.roi || 0).toFixed(2)}%`, c: "text-emerald-400" },
            { l: "Win Rate", v: `${(metrics.winRate || 0).toFixed(2)}%`, c: "text-violet-400" },
            { l: "Drawdown", v: `${(metrics.maxDrawdown || 0).toFixed(2)}%`, c: "text-rose-400" },
            { l: "Trades", v: metrics.totalTrades || 0, c: "text-cyan-400" },
            { l: "Profit Factor", v: (metrics.profitFactor || 0).toFixed(2), c: "text-teal-400" },
            { l: "Calmar", v: (metrics.calmarRatio || 0).toFixed(2), c: "text-amber-400" }
        ].map((m, i) => (
            <div key={i} className="bot-card p-4 text-center">
                <div className="text-neutral-500 text-[9px] uppercase font-black tracking-widest mb-1">{m.l}</div>
                <div className={`text-lg font-mono font-bold ${m.c}`}>{m.v}</div>
            </div>
        ))}
    </div>
);

export default function Backtests() {
  const { runNewBacktest, runComboBacktest } = useBacktest(); 
  const [activeTab, setActiveTab] = useState('single');
  const [isSimulating, setIsSimulating] = useState(false);
  const [backtestResults, setBacktestResults] = useState(null);
  const [availableModels, setAvailableModels] = useState([]);

  const [data, setData] = useState({
    symbol: "BTC-USD", timeframe: "1h", 
    startDate: "2025-12-01", endDate: "2026-01-22", 
    initialBalance: 10000, risk_percentage: 1.0, 
    mlMode: "on", regime_mode: "adaptive", combinationRule: "OR",
    code: "sma_crossover", 
    strategies: [{ code: "sma_crossover", params: { fast_sma: 50, slow_sma: 200 } }],
    params: { 
        model_type: "stacking", long_threshold: 0.65, short_threshold: 0.35,
        tslAtrMult: 3.0, minAdxLevel: 25, trendFilterPeriod: 200, minAtrPct: 0.5,
        commission: 0.006, slippage: 0.001,
        squeeze_threshold: 0.003, vol_multiplier: 1.02,
        session_start: 0, session_end: 23
    }
  });

  const loadModels = useCallback(async () => {
    try {
        const res = await axios.get(`${process.env.REACT_APP_API_URL}/api/ml/available-models`);
        setAvailableModels(res.data.models || []);
    } catch (e) { console.warn("Model sync offline."); }
  }, []);

  useEffect(() => { loadModels(); }, [loadModels]);

  const onParamChange = (name, val) => {
    setData(p => ({ ...p, params: { ...p.params, [name]: val } }));
  };

  const handleRun = async (e) => {
    e.preventDefault();
    setBacktestResults(null);
    setIsSimulating(true); 
    
    // 🧬 Clean Payload Construction
    const payload = { ...data, mode: activeTab };
    const runner = activeTab === 'combo' ? runComboBacktest : runNewBacktest;
    
    try {
        const res = await runner(payload);
        if (res) setBacktestResults(res);
    } catch (err) {
        console.error("Backtest execution crashed:", err);
    } finally {
        setIsSimulating(false);
    }
  };

  return (
    <div className="backtest-container p-6 bg-[#030303] text-white min-h-screen">
        <div className="grid grid-cols-12 gap-10 max-w-[1800px] mx-auto">
          
          <div className="col-span-12 lg:col-span-4 space-y-6">
            <div className="bot-card p-7 sticky top-10">
              <h2 className="text-white font-black text-xs tracking-widest uppercase mb-6">🧪 Strategy Sandbox</h2>

              <div className="flex gap-2 mb-8 bg-white/5 p-1.5 rounded-2xl"> 
                {['single', 'combo'].map(t => (
                  <button key={t} type="button" onClick={() => setActiveTab(t)}
                    className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${activeTab === t ? 'bg-emerald-500 text-black' : 'text-neutral-500'}`}>
                    {t === 'single' ? 'Atomic' : 'Hybrid'}
                  </button>
                ))}
              </div>

              <form onSubmit={handleRun} className="space-y-6 h-[75vh] overflow-y-auto pr-2 custom-scrollbar">
                
                {/* 🟣 SECTION: AI HUB */}
                <div className="ai-intelligence-panel space-y-4">
                    <div className="flex justify-between items-center border-b border-violet-500/10 pb-2">
                        <h4 className="text-violet-400 font-black text-[9px] tracking-widest uppercase">Ensemble Logic</h4>
                        <select value={data.mlMode} onChange={(e)=>setData({...data, mlMode: e.target.value})} className="bg-violet-500/10 text-[8px] rounded px-2 outline-none">
                            <option value="off">Bypass AI</option><option value="on">AI Filter</option>
                        </select>
                    </div>
                    {data.mlMode === "on" && (
                        <div className="space-y-3">
                            <select value={data.params.model_type} onChange={(e)=>onParamChange('model_type', e.target.value)} className={inputClass}>
                                {AI_ARCHITECTURES.map(arch => <option key={arch.id} value={arch.id}>{arch.name}</option>)}
                                {availableModels.map(m => <option key={m.id} value={m.id}>Disk: {m.id}</option>)}
                            </select>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[8px] text-neutral-500 uppercase font-bold">Long Gate</label>
                                    <input type="number" step="0.01" value={data.params.long_threshold} onChange={(e) => onParamChange('long_threshold', parseFloat(e.target.value))} className={inputClass} />
                                </div>
                                <div>
                                    <label className="text-[8px] text-neutral-500 uppercase font-bold">Short Gate</label>
                                    <input type="number" step="0.01" value={data.params.short_threshold} onChange={(e) => onParamChange('short_threshold', parseFloat(e.target.value))} className={inputClass} />
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* ⚪ SECTION: STRATEGY LAYERS */}
                <div className="space-y-4">
                    <label className="text-neutral-500 text-[10px] uppercase font-black block tracking-widest">Signal Engine</label>
                    {activeTab === 'single' ? (
                        <div className="space-y-3">
                            <select value={data.code} onChange={(e) => setData({...data, code: e.target.value})} className={inputClass}>
                                <option value="">-- Select Engine --</option>
                                {STRAT_POOL.map(s => <option key={s.code} value={s.code}>{s.name}</option>)}
                            </select>
                            {data.code && (
                                <StrategyParamInputs 
                                    params={{ ...data.params, code: data.code }} 
                                    onChange={(newParams) => setData(prev => ({ ...prev, params: { ...prev.params, ...newParams } }))} 
                                />
                            )}
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <select className={inputClass} value={data.combinationRule} onChange={(e) => setData({...data, combinationRule: e.target.value})}>
                                <option value="OR">OR Logic (Aggressive)</option><option value="AND">AND Logic (Safe)</option>
                            </select>
                            {data.strategies.map((s, i) => (
                                <div key={i} className="p-4 bg-white/5 rounded-2xl border border-white/5 relative">
                                    <button type="button" onClick={() => setData(prev => ({ ...prev, strategies: prev.strategies.filter((_, idx)=>idx!==i)}))} className="absolute top-2 right-3 text-rose-500">✕</button>
                                    <select className={inputClass + " mb-2"} value={s.code} onChange={(e) => {
                                        const n = [...data.strategies]; n[i] = { code: e.target.value, params: {} };
                                        setData(prev => ({ ...prev, strategies: n }));
                                    }}>
                                        <option value="">-- Layer {i+1} --</option>
                                        {STRAT_POOL.map(o=><option key={o.code} value={o.code}>{o.name}</option>)}
                                    </select>
                                    {s.code && (
                                        <StrategyParamInputs 
                                            params={{ ...s.params, code: s.code }} 
                                            onChange={(newP) => {
                                                const n = [...data.strategies];
                                                n[i].params = newP;
                                                setData(prev => ({ ...prev, strategies: n }));
                                            }} 
                                        />
                                    )}
                                </div>
                            ))}
                            <button type="button" onClick={() => setData(prev => ({ ...prev, strategies: [...prev.strategies, {code: "", params: {}}] }))} className="w-full py-3 border-dashed border-2 border-white/10 rounded-2xl text-[9px] text-emerald-400 uppercase font-black">+ Add Layer</button>
                        </div>
                    )}
                </div>

                {/* 🔵 SECTION: DATA & ENVIRONMENT */}
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/5">
                    <div><label className="text-[8px] uppercase text-neutral-500 font-bold">Asset</label><select value={data.symbol} onChange={(e)=>setData({...data, symbol: e.target.value})} className={inputClass}><option value="BTC-USD">BTC-USD</option><option value="ETH-USD">ETH-USD</option><option value="PEPE-USD">PEPE-USD</option></select></div>
                    <div><label className="text-[8px] uppercase text-neutral-500 font-bold">Initial Cash</label><input type="number" value={data.initialBalance} onChange={(e)=>setData({...data, initialBalance: parseFloat(e.target.value)})} className={inputClass} /></div>
                    <div><label className="text-[8px] uppercase text-neutral-500 font-bold">Sim From</label><input type="date" value={data.startDate} onChange={(e)=>setData({...data, startDate: e.target.value})} className={inputClass} /></div>
                    <div><label className="text-[8px] uppercase text-neutral-500 font-bold">Sim To</label><input type="date" value={data.endDate} onChange={(e)=>setData({...data, endDate: e.target.value})} className={inputClass} /></div>
                </div>

                <button type="submit" disabled={isSimulating} className={`w-full py-5 font-black uppercase tracking-[0.2em] rounded-2xl bg-emerald-500 text-black ${isSimulating ? 'opacity-50 animate-pulse' : 'hover:scale-[1.02] shadow-xl shadow-emerald-500/10'}`}>
                    {isSimulating ? '🔬 CRUNCHING...' : '▶ Launch Backtest'}
                </button>
              </form>
            </div>
          </div>

          <div className="col-span-12 lg:col-span-8 space-y-6">
            {backtestResults ? (
                <div className="animate-in fade-in slide-in-from-bottom-5 duration-700">
                    <MetricsGrid metrics={backtestResults.metrics || {}} />
                    <div className="bot-card p-5 h-[720px] bg-black/40 border border-white/5 rounded-[40px] relative">
                        <ChartIndependent results={backtestResults} symbol={data.symbol} />
                    </div>
                </div>
            ) : (
                <div className="h-[90vh] flex flex-col items-center justify-center border-2 border-dashed border-white/5 bg-black/20 rounded-[48px] text-center p-10">
                    <div className="text-4xl mb-4">🔬</div>
                    <h3 className="text-white text-xl font-black uppercase tracking-widest">Ensemble Sandbox Ready</h3>
                    <p className="text-neutral-500 text-sm mt-2 max-w-xs">Configure your council and strategy engine on the left to begin simulation.</p>
                </div>
            )}
          </div>
        </div>
    </div>
  );
}
