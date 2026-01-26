import React, { useState, useEffect, useCallback } from "react";
import axios from "axios"; 
import { useBacktest } from "../hooks/useBacktest.js";
import { ChartIndependent } from "../components/ChartIndependent.jsx"; 
import "./Backtests.css"; 

// --- STYLING CONSTANTS ---
const inputClass = "w-full bg-[#0a0a0a] border border-white/10 rounded-xl px-4 py-3 text-white focus:border-emerald-500 transition-all text-sm outline-none";

// --- HELPER COMPONENTS ---
const StrategyParamInputs = ({ strategy, onChange }) => {
    const { code, params = {} } = strategy;
    const update = (key, val) => onChange({ ...params, [key]: val });
    const field = (label, key, type = "number", step = "1") => (
        <div className="flex flex-col">
            <label className="text-[8px] text-neutral-500 uppercase font-bold mb-1">{label}</label>
            <input type={type} step={step} value={params[key] ?? ""} 
                onChange={(e) => update(key, type === "number" ? parseFloat(e.target.value) : e.target.value)}
                className="bg-black/40 border border-white/10 rounded-lg px-2 py-1 text-[10px] text-emerald-400 outline-none"
            />
        </div>
    );
    return (
        <div className="grid grid-cols-2 gap-2 p-3 bg-black/20 rounded-xl border border-white/5 mt-2">
            {code === "sma_crossover" && <>{field("Fast SMA", "fast_sma")}{field("Slow SMA", "slow_sma")}</>}
            {code === "macd_crossover" && <>{field("Fast", "fast")}{field("Slow", "slow")}{field("Signal", "signal")}</>}
            {code === "rsi_threshold" && <>{field("Len", "rsi_length")}{field("OS", "oversold_level")}{field("OB", "overbought_level")}</>}
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

const ProgressMonitor = ({ progress, status, timeRemaining }) => {
    const displayProgress = isNaN(progress) ? 0 : Math.min(100, progress);
    const displayTime = isNaN(timeRemaining) ? 0 : timeRemaining;

    return (
        <div className="mt-4 p-5 bg-emerald-500/5 border border-emerald-500/10 rounded-[20px] animate-in fade-in zoom-in duration-500">
            <div className="flex justify-between items-end mb-3">
                <div>
                    <h4 className="text-emerald-400 font-black text-[8px] uppercase tracking-widest mb-1">Backtest Engine</h4>
                    <p className="text-white text-[10px] font-mono italic">{status}...</p>
                </div>
                <div className="text-right">
                    <span className="text-emerald-500 font-black text-lg">{displayProgress.toFixed(1)}%</span>
                    <p className="text-[7px] text-neutral-500 uppercase">Est: {displayTime}s</p>
                </div>
            </div>
            <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden">
                <div className="bg-emerald-500 h-full transition-all duration-700 ease-out shadow-[0_0_10px_rgba(16,185,129,0.3)]"
                     style={{ width: `${displayProgress}%` }} />
            </div>
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

const REGIME_OPTIONS = [
  { id: "static", name: "Static (Indicator Veto)" },
  { id: "adaptive", name: "Adaptive (State Classifier)" }
];

export default function Backtests() {
  const { runNewBacktest, runComboBacktest } = useBacktest(); 
  const [activeTab, setActiveTab] = useState('single');
  const [isSimulating, setIsSimulating] = useState(false);
  const [backtestResults, setBacktestResults] = useState(null);
  const [availableModels, setAvailableModels] = useState([]);
  
  const [simProgress, setSimProgress] = useState(0);
  const [statusMsg, setStatusMsg] = useState("");
  const [estSeconds, setEstSeconds] = useState(0);

  const [data, setData] = useState({
    symbol: "BTC-USD", timeframe: "1h", 
    startDate: "2025-12-01", endDate: "2026-01-22", 
    initialBalance: 10000, risk_percentage: 1.0, 
    mlMode: "on", regime_mode: "adaptive", combinationRule: "OR",
    code: "sma_crossover", strategies: [{ code: "", params: {} }],
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
    } catch (e) {}
  }, []);

  useEffect(() => { loadModels(); }, [loadModels]);

  useEffect(() => {
    let pollInterval;
    if (isSimulating) {
      pollInterval = setInterval(async () => {
        try {
          const res = await axios.get(`${process.env.REACT_APP_API_URL}/api/backtest/status`);
          setSimProgress(res.data.progress);
          setStatusMsg(res.data.status);
          if (res.data.progress >= 100) clearInterval(pollInterval);
        } catch (err) {}
        setEstSeconds(prev => Math.max(0, prev - 1));
      }, 1500);
    }
    return () => clearInterval(pollInterval);
  }, [isSimulating]);

  const onParamChange = (name, val) => {
    setData(p => ({ ...p, params: { ...p.params, [name]: val } }));
  };

  const handleRun = async (e) => {
    e.preventDefault();
    setBacktestResults(null);
    setSimProgress(0);
    setEstSeconds(25);
    setStatusMsg("Waking up Engine...");
    setIsSimulating(true);

    try {
        const runner = activeTab === 'combo' ? runComboBacktest : runNewBacktest;
        const res = await runner(data);
        if (res) {
            setSimProgress(100);
            setStatusMsg("Results Certified.");
            setBacktestResults(res);
        }
    } catch (err) {
        setStatusMsg("Engine Error.");
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
                                <div><label className="text-[8px] text-neutral-500 uppercase font-bold">Long Gate</label><input type="number" step="0.01" value={data.params.long_threshold} onChange={(e) => onParamChange('long_threshold', parseFloat(e.target.value))} className={inputClass} /></div>
                                <div><label className="text-[8px] text-neutral-500 uppercase font-bold">Short Gate</label><input type="number" step="0.01" value={data.params.short_threshold} onChange={(e) => onParamChange('short_threshold', parseFloat(e.target.value))} className={inputClass} /></div>
                            </div>
                        </div>
                    )}
                </div>
                
                {/* Fixed Alpha Shield, Signal, Environment Inputs... */}
                <div className="p-5 bg-emerald-500/5 border border-emerald-500/10 rounded-[24px] space-y-4">
                    <h4 className="text-emerald-400 font-black text-[9px] tracking-widest uppercase border-b border-emerald-500/10 pb-2">Alpha Shield v100</h4>
                    <div className="grid grid-cols-2 gap-3">
                        <div><label className="text-[8px] text-neutral-500 uppercase font-bold">Squeeze</label><input type="number" step="0.001" value={data.params.squeeze_threshold} onChange={(e) => onParamChange('squeeze_threshold', parseFloat(e.target.value))} className={inputClass} /></div>
                        <div><label className="text-[8px] text-neutral-500 uppercase font-bold">Vol Fuel</label><input type="number" step="0.01" value={data.params.vol_multiplier} onChange={(e) => onParamChange('vol_multiplier', parseFloat(e.target.value))} className={inputClass} /></div>
                        <div><label className="text-[8px] text-neutral-500 uppercase font-bold">Start Hr</label><input type="number" value={data.params.session_start} onChange={(e) => onParamChange('session_start', parseInt(e.target.value))} className={inputClass} /></div>
                        <div><label className="text-[8px] text-neutral-500 uppercase font-bold">End Hr</label><input type="number" value={data.params.session_end} onChange={(e) => onParamChange('session_end', parseInt(e.target.value))} className={inputClass} /></div>
                    </div>
                </div>

                <button type="submit" disabled={isSimulating} className={`w-full py-5 font-black uppercase tracking-[0.2em] rounded-2xl bg-emerald-500 text-black ${isSimulating ? 'opacity-50' : 'hover:scale-[1.02] shadow-xl shadow-emerald-500/10'}`}>
                    {isSimulating ? '🔬 CRUNCHING...' : '▶ Launch Backtest'}
                </button>
                {isSimulating && <ProgressMonitor progress={simProgress} status={statusMsg} timeRemaining={estSeconds} />}
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
                    {isSimulating ? (
                        <div className="space-y-6 animate-pulse">
                            <div className="text-6xl text-emerald-500 mx-auto">⚛️</div>
                            <h3 className="text-white text-xl font-black uppercase tracking-[0.3em]">Processing {data.symbol}</h3>
                        </div>
                    ) : (
                        <><div className="text-4xl mb-4">🔬</div><h3 className="text-white text-xl font-black uppercase tracking-widest">Ensemble Sandbox Ready</h3></>
                    )}
                </div>
            )}
          </div>
        </div>
    </div>
  );
}
