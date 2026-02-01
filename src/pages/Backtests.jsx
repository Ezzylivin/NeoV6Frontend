import React, { useState, useEffect, useCallback } from "react";
import axios from "axios"; 
import { useBacktest } from "../hooks/useBacktest.js";
import { ChartIndependent } from "../components/ChartIndependent.jsx"; 
import "./Backtests.css"; 

// --- DYNAMIC API URL ---
const API_BASE = import.meta.env.VITE_API_URL || "http://74.208.28.77:8000";

// --- STYLING CONSTANTS ---
const inputClass = "w-full bg-[#0a0a0a] border border-white/10 rounded-xl px-4 py-3 text-white focus:border-emerald-500 transition-all text-sm outline-none";
const labelClass = "text-[8px] text-neutral-500 uppercase font-bold mb-1 block ml-1";

// --- SUB-COMPONENT: PROGRESS SHIELD ---
const ProgressShield = ({ progress, statusMsg, symbol }) => (
    <div className="w-full max-w-md space-y-4 animate-in fade-in zoom-in duration-500">
        <div className="flex justify-between items-end">
            <div className="flex flex-col text-left">
                <span className="text-[10px] text-emerald-500 font-black uppercase tracking-widest">Simulation Active</span>
                <span className="text-white text-lg font-black">{symbol}</span>
            </div>
            <span className="text-emerald-400 font-mono font-bold text-xl">{progress}%</span>
        </div>
        <div className="w-full h-3 bg-white/5 rounded-full border border-white/10 overflow-hidden p-[2px]">
            <div className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
        <div className="flex items-center gap-3 justify-center">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-ping" />
            <p className="text-emerald-400/80 text-[10px] font-mono uppercase">{statusMsg || "Awaiting Neural Sync..."}</p>
        </div>
    </div>
);

// --- HELPER: STRATEGY PARAMETERS ---
const StrategyParamInputs = ({ strategy, onChange }) => {
    const { code, params = {} } = strategy;
    const update = (key, val) => onChange({ ...params, [key]: val });
    const field = (label, key, step = "1") => (
        <div className="flex flex-col">
            <label className={labelClass}>{label}</label>
            <input type="number" step={step} value={params[key] ?? ""} 
                onChange={(e) => update(key, parseFloat(e.target.value))}
                className="bg-black/40 border border-white/10 rounded-lg px-2 py-1 text-[10px] text-emerald-400 outline-none" />
        </div>
    );
    return (
        <div className="grid grid-cols-2 gap-2 p-3 bg-black/20 rounded-xl border border-white/5 mt-2">
            {code === "sma_crossover" && <>{field("Fast SMA", "fast_sma")}{field("Slow SMA", "slow_sma")}</>}
            {code === "macd_crossover" && <>{field("Fast", "fast")}{field("Slow", "slow")}{field("Signal", "signal")}</>}
            {code === "rsi_threshold" && <>{field("Len", "rsi_length")}{field("OS", "oversold")}{field("OB", "overbought")}</>}
            {code === "rsi_divergence" && <>{field("RSI Len", "rsi_length")}{field("Lookback", "lookback")}</>}
            {code === "atr_breakout" && <>{field("ATR Len", "atr_length")}{field("Mult", "multiplier", "0.1")}</>}
        </div>
    );
};

// --- CONSTANTS ---
const STRAT_POOL = [
  { name: "SMA Crossover", code: "sma_crossover" },
  { name: "MACD Crossover", code: "macd_crossover" },
  { name: "RSI Threshold", code: "rsi_threshold" },
  { name: "RSI Divergence", code: "rsi_divergence" },
  { name: "ATR Breakout", code: "atr_breakout" }
];

const AI_ARCHITECTURES = [
  { id: "stacking", name: "Council Consensus (Stacking)" },
  { id: "XGBoost", name: "XGBoost (Gradient Boost)" },
  { id: "RandomForest", name: "RandomForest (Trees)" },
  { id: "Transformer", name: "Transformer (Attention)" }
];

const FEE_TIERS = [
  { label: "CB Adv (0.6%)", val: 0.006, slip: 0.001, desc: "Standard US Retail" },
  { label: "CB Pro (0.4%)", val: 0.004, slip: 0.0008, desc: "US Pro Tier" },
  { label: "Binance (0.1%)", val: 0.001, slip: 0.0005, desc: "Global Low Fee" }
];

export default function Backtests() {
  const { runNewBacktest, runComboBacktest } = useBacktest(); 
  const [activeTab, setActiveTab] = useState('single');
  const [isSimulating, setIsSimulating] = useState(false);
  const [backtestResults, setBacktestResults] = useState(null);
  const [progress, setProgress] = useState(0);
  const [statusMsg, setStatusMsg] = useState("");

  const [data, setData] = useState({
    symbol: "SOL-USD", timeframe: "1h", 
    startDate: "2025-06-01", endDate: "2026-01-31", 
    initialBalance: 1000, risk_percentage: 1.0, 
    mlMode: "on", combinationRule: "OR",
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

  // --- STRATEGY ARRAY HANDLERS ---
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
        } catch (e) { console.error("Heartbeat Lost"); }
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
    } catch (err) { setStatusMsg("Backtest Engine Timeout."); setIsSimulating(false); }
  };

  return (
    <div className="p-6 bg-[#030303] text-white min-h-screen">
        <div className="grid grid-cols-12 gap-10 max-w-[1800px] mx-auto">
          
          <div className="col-span-12 lg:col-span-4 space-y-6 text-left">
            <div className="bot-card p-7 bg-[#0a0a0a] rounded-3xl border border-white/10 sticky top-10">
              <h2 className="text-white font-black text-xs uppercase mb-6 italic tracking-widest flex items-center gap-2">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" /> 
                Strategy Sandbox v7.5
              </h2>

              <div className="flex gap-2 mb-8 bg-white/5 p-1.5 rounded-2xl"> 
                {['single', 'combo'].map(t => (
                  <button key={t} type="button" onClick={() => setActiveTab(t)}
                    className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${activeTab === t ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20' : 'text-neutral-500 hover:text-neutral-300'}`}>
                    {t === 'single' ? 'Atomic' : 'Hybrid Ensemble'}
                  </button>
                ))}
              </div>
              
              <form onSubmit={handleRun} className="space-y-6 h-[75vh] overflow-y-auto pr-2 custom-scrollbar">
                
                {/* 🟣 AI ENSEMBLE HUB */}
                <div className="ai-intelligence-panel space-y-4">
                    <div className="flex justify-between items-center border-b border-violet-500/10 pb-2">
                        <h4 className="text-violet-400 font-black text-[9px] uppercase">Neural Filter</h4>
                        <select value={data.mlMode} onChange={(e)=>setData({...data, mlMode: e.target.value})} className="bg-violet-500/10 text-[8px] rounded px-2 py-1 text-violet-300 outline-none">
                            <option value="off">Bypass AI</option><option value="on">Active AI</option>
                        </select>
                    </div>
                    {data.mlMode === "on" && (
                        <div className="space-y-3 animate-in slide-in-from-top-2">
                            <select value={data.params.model_type} onChange={(e)=>onParamChange('model_type', e.target.value)} className={inputClass}>
                                {AI_ARCHITECTURES.map(arch => <option key={arch.id} value={arch.id}>{arch.name}</option>)}
                            </select>
                            <div className="grid grid-cols-2 gap-3">
                                <div><label className={labelClass}>Long Gate</label><input type="number" step="0.01" value={data.params.long_threshold} onChange={(e)=>onParamChange('long_threshold', parseFloat(e.target.value))} className={inputClass}/></div>
                                <div><label className={labelClass}>Short Gate</label><input type="number" step="0.01" value={data.params.short_threshold} onChange={(e)=>onParamChange('short_threshold', parseFloat(e.target.value))} className={inputClass}/></div>
                            </div>
                        </div>
                    )}
                </div>

                {/* ⚪ STRATEGY LAYERS (DYNAMIC) */}
                <div className="space-y-4 pt-4 border-t border-white/5">
                    <div className="flex justify-between items-center mb-2">
                        <label className="text-neutral-500 text-[10px] uppercase font-black tracking-widest">
                            {activeTab === 'single' ? 'Signal Engine' : 'Ensemble Layers'}
                        </label>
                        {activeTab === 'combo' && (
                            <button type="button" onClick={addStrategy} className="text-[9px] bg-emerald-500/10 text-emerald-500 px-3 py-1 rounded-lg border border-emerald-500/20 hover:bg-emerald-500 hover:text-black transition-all font-bold uppercase">
                                + Add Layer
                            </button>
                        )}
                    </div>

                    {activeTab === 'single' ? (
                        <div className="space-y-4">
                            <select value={data.code} onChange={(e) => setData({...data, code: e.target.value})} className={inputClass}>
                                {STRAT_POOL.map(s => <option key={s.code} value={s.code}>{s.name}</option>)}
                            </select>
                            <StrategyParamInputs strategy={data} onChange={(newParams) => setData({...data, params: {...data.params, ...newParams}})} />
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {data.strategies.map((strat, idx) => (
                                <div key={idx} className="p-4 bg-white/5 rounded-2xl border border-white/5 relative group animate-in zoom-in-95">
                                    <div className="flex gap-3 mb-2">
                                        <select value={strat.code} onChange={(e) => updateStrategy(idx, { ...strat, code: e.target.value })} className={`${inputClass} !py-2 !text-[11px]`}>
                                            {STRAT_POOL.map(s => <option key={s.code} value={s.code}>{s.name}</option>)}
                                        </select>
                                        {data.strategies.length > 1 && (
                                            <button type="button" onClick={() => removeStrategy(idx)} className="text-rose-500 hover:bg-rose-500/20 rounded-lg px-3">✕</button>
                                        )}
                                    </div>
                                    <StrategyParamInputs strategy={strat} onChange={(newP) => updateStrategy(idx, { ...strat, params: newP })} />
                                </div>
                            ))}
                            <select value={data.combinationRule} onChange={(e) => setData({...data, combinationRule: e.target.value})} className={inputClass}>
                                <option value="OR">OR (Aggressive)</option><option value="AND">AND (Conservative)</option>
                            </select>
                        </div>
                    )}
                </div>

                {/* 🟢 EXECUTION SHIELD */}
                <div className="p-5 bg-emerald-500/5 border border-emerald-500/10 rounded-3xl space-y-4">
                    <h4 className="text-emerald-400 font-black text-[9px] uppercase border-b border-emerald-500/10 pb-2">Execution Shield</h4>
                    <div className="grid grid-cols-2 gap-3">
                        <div><label className={labelClass}>TSL ATR Mult</label><input type="number" step="0.1" value={data.params.tslAtrMult} onChange={(e)=>onParamChange('tslAtrMult', parseFloat(e.target.value))} className={inputClass}/></div>
                        <div><label className={labelClass}>ATR Period</label><input type="number" value={data.params.atrPeriod} onChange={(e)=>onParamChange('atrPeriod', parseInt(e.target.value))} className={inputClass}/></div>
                        <div><label className={labelClass}>TP %</label><input type="number" step="0.001" value={data.params.take_profit} onChange={(e)=>onParamChange('take_profit', parseFloat(e.target.value))} className={inputClass}/></div>
                        <div><label className={labelClass}>SL %</label><input type="number" step="0.001" value={data.params.stop_loss} onChange={(e)=>onParamChange('stop_loss', parseFloat(e.target.value))} className={inputClass}/></div>
                        <div><label className={labelClass}>Min ADX</label><input type="number" value={data.params.minAdxLevel} onChange={(e)=>onParamChange('minAdxLevel', parseInt(e.target.value))} className={inputClass}/></div>
                        <div><label className={labelClass}>Vol Fuel</label><input type="number" step="0.01" value={data.params.vol_multiplier} onChange={(e)=>onParamChange('vol_multiplier', parseFloat(e.target.value))} className={inputClass}/></div>
                    </div>
                </div>

                {/* 🔵 DATA & ENVIRONMENT */}
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/5">
                    <div className="col-span-2">
                        <label className={labelClass}>Asset Pair</label>
                        <select value={data.symbol} onChange={(e)=>setData({...data, symbol: e.target.value})} className={inputClass}>
                            <option value="BTC-USD">BTC-USD</option><option value="ETH-USD">ETH-USD</option><option value="SOL-USD">SOL-USD</option><option value="XRP-USD">XRP-USD</option><option value="PEPE-USD">PEPE-USD</option>
                        </select>
                    </div>
                    <div><label className={labelClass}>Cash</label><input type="number" value={data.initialBalance} onChange={(e)=>setData({...data, initialBalance: parseFloat(e.target.value)})} className={inputClass}/></div>
                    <div><label className={labelClass}>Risk %</label><input type="number" step="0.1" value={data.risk_percentage} onChange={(e)=>setData({...data, risk_percentage: parseFloat(e.target.value)})} className={inputClass}/></div>
                    <div><label className={labelClass}>Start Hr</label><input type="number" value={data.params.session_start} onChange={(e)=>onParamChange('session_start', parseInt(e.target.value))} className={inputClass}/></div>
                    <div><label className={labelClass}>End Hr</label><input type="number" value={data.params.session_end} onChange={(e)=>onParamChange('session_end', parseInt(e.target.value))} className={inputClass}/></div>
                </div>

                <button type="submit" disabled={isSimulating} className="w-full py-5 font-black uppercase tracking-[0.2em] rounded-2xl bg-emerald-500 text-black hover:scale-[1.02] shadow-[0_0_30px_rgba(16,185,129,0.2)] transition-all active:scale-95 disabled:opacity-50">
                    {isSimulating ? '🔬 CRUNCHING...' : '▶ Launch Simulation'}
                </button>
              </form>
            </div>
          </div>

          <div className="col-span-12 lg:col-span-8">
            {backtestResults ? (
                <div className="animate-in fade-in slide-in-from-bottom-5 duration-700">
                    <MetricsGrid metrics={backtestResults.metrics || {}} />
                    <div className="bot-card p-5 h-[700px] bg-black/40 border border-white/5 rounded-[40px] relative overflow-hidden">
                        <ChartIndependent results={backtestResults} symbol={data.symbol} />
                    </div>
                </div>
            ) : (
                <div className="h-[80vh] flex flex-col items-center justify-center border-2 border-dashed border-white/10 rounded-[48px] text-center p-10 bg-black/10">
                    {isSimulating ? <ProgressShield progress={progress} statusMsg={statusMsg} symbol={data.symbol} /> : <div className="space-y-4 opacity-30"><div className="text-6xl">📡</div><h3 className="text-white text-xl font-black uppercase tracking-widest">Ensemble Sandbox Idle</h3></div>}
                </div>
            )}
          </div>
        </div>
    </div>
  );
}
