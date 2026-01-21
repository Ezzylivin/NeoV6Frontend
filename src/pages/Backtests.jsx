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

// --- 🟢 1. UNIFIED GLOBAL CONSTANTS ---

const STRAT_POOL = [
  { name: "SMA Crossover", code: "sma_crossover" },
  { name: "MACD Crossover", code: "macd_crossover" },
  { name: "RSI Threshold", code: "rsi_threshold" },
  { name: "RSI Divergence", code: "rsi_divergence" },
  { name: "Bollinger Bands", code: "bollinger_bands" },
  { name: "Stochastic Cross", code: "stochastic_cross" },
  { name: "ATR Breakout", code: "atr_breakout" },
  { name: "Ichimoku Cloud", code: "ichimoku_cloud" },
  { name: "Parabolic SAR", code: "psar_signal" },
  { name: "OBV Volume", code: "obv_trend" }
];

const AI_ARCHITECTURES = [
  { id: "stacking", name: "Council Consensus (Stacking)" },
  { id: "XGBoost", name: "XGBoost (Tabular Gradient)" },
  { id: "RandomForest", name: "Random Forest (Robust Bagging)" },
  { id: "LSTM", name: "LSTM (Sequential Memory)" },
  { id: "TabPFN", name: "TabPFN (Bayesian Foundation)" },
  { id: "Transformer", name: "TFT (Temporal Attention)" }
];

const REGIME_OPTIONS = [
  { id: "static", name: "Static (Indicator Veto)" },
  { id: "adaptive", name: "Adaptive (State Classifier)" },
  { id: "aggressive", name: "Aggressive (Trend Sizing)" }
];

const FEE_TIERS = [
  { label: "CB Adv (0.6%)", val: 0.006, slip: 0.001 },
  { label: "CB Pro (0.4%)", val: 0.004, slip: 0.0008 },
  { label: "Binance (0.1%)", val: 0.001, slip: 0.0005 }
];

const inputClass = "w-full bg-[#0a0a0a] border border-white/10 rounded-xl px-4 py-3 text-white focus:border-emerald-500 transition-all text-sm outline-none";

// --- 🛠️ 2. DYNAMIC STRATEGY PARAMETER COMPONENT ---

const StrategyParamInputs = ({ strategy, onChange }) => {
    const { code, params = {} } = strategy;
    const update = (key, val) => onChange({ ...params, [key]: val });

    const field = (label, key, type = "number", step = "1") => (
        <div className="flex flex-col">
            <label className="text-[8px] text-neutral-500 uppercase font-bold mb-1">{label}</label>
            <input 
                type={type} step={step} value={params[key] || ""} 
                onChange={(e) => update(key, type === "number" ? parseFloat(e.target.value) : e.target.value)}
                className="bg-black/40 border border-white/10 rounded-lg px-2 py-1 text-[10px] text-emerald-400 outline-none"
            />
        </div>
    );

    return (
        <div className="grid grid-cols-2 gap-2 p-3 bg-black/20 rounded-xl border border-white/5 mt-2 animate-in fade-in slide-in-from-top-2">
            {code === "sma_crossover" && <>{field("Fast SMA", "fast_sma")}{field("Slow SMA", "slow_sma")}</>}
            {code === "macd_crossover" && <>{field("Fast", "fast")}{field("Slow", "slow")}{field("Signal", "signal")}</>}
            {code === "rsi_threshold" && <>{field("Len", "rsi_length")}{field("OS", "oversold_level")}{field("OB", "overbought_level")}</>}
            {code === "rsi_divergence" && <>{field("RSI Len", "rsi_length")}{field("Lookback", "lookback")}</>}
            {code === "bollinger_bands" && <>{field("Period", "length")}{field("Std Dev", "std_dev", "number", "0.1")}</>}
            {code === "stochastic_cross" && <>{field("%K", "k_period")}{field("%D", "d_period")}</>}
            {code === "atr_breakout" && <>{field("ATR Len", "atr_length")}{field("Mult", "atr_mult", "number", "0.1")}</>}
            {code === "ichimoku_cloud" && <>{field("Tenkan", "tenkan")}{field("Kijun", "kijun")}{field("Senkou B", "senkou")}</>}
            {code === "psar_signal" && <>{field("Step", "step", "number", "0.01")}{field("Max", "max", "number", "0.01")}</>}
            {code === "obv_trend" && <>{field("MA Len", "ma_length")}</>}
        </div>
    );
};

// --- 📊 3. UNIFIED METRICS GRID ---

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

// --- 🚀 4. MAIN MASTER COMPONENT ---

export default function Backtests() {
  const { state, runNewBacktest, runComboBacktest, fetchOptions } = useBacktest(); 
  const [selectedWinnerId, setSelectedWinnerId] = useState("");
  const [activeTab, setActiveTab] = useState('single');
  const [displayMode, setDisplayMode] = useState('static');
  const [isSimulating, setIsSimulating] = useState(false);
  const [liveWinners, setLiveWinners] = useState([]);
  const [availableModels, setAvailableModels] = useState([]);
  const [backtestResults, setBacktestResults] = useState(null);

  // 🔴 CONSOLIDATED DATA STATE: Ensures zero field loss
  const [data, setData] = useState({
    symbol: "BTC-USD", timeframe: "1h", 
    startDate: "2025-01-01", endDate: "2026-01-01", 
    initialBalance: 1000, risk_percentage: 1.0, 
    code: "", combinationRule: "OR", mlMode: "off", regime_mode: "adaptive",
    strategies: [{ strategyId: "", code: "", params: {} }],
    params: { 
        model_type: "stacking",  
        long_threshold: 0.65, short_threshold: 0.35, exit_threshold: 0.50,
        lookback: 50, tslAtrMult: 3.0, minAdxLevel: 25, trendFilterPeriod: 200, minAtrPct: 0.5,
        commission: 0.0006, slippage: 0.0001,
        squeeze_threshold: 0.003, vol_multiplier: 1.02,
        session_start: 12, session_end: 21
    }
  });

  const loadWinners = useCallback(async () => {
    try {
        const res = await axios.get(`${process.env.REACT_APP_API_URL}/api/bot/winners`);
        setLiveWinners(res.data.winners || []);
    } catch (e) { console.error("Alpha Sync failed."); }
  }, []);

  const loadModels = useCallback(async () => {
      try {
          const res = await axios.get(`${process.env.REACT_APP_API_URL}/api/ml/available-models`);
          setAvailableModels(res.data.models || []);
      } catch (e) { console.warn("ML Discovery offline."); }
  }, []);

  useEffect(() => { loadWinners(); loadModels(); }, [loadWinners, loadModels]);

  const onParamChange = (name, val) => {
    setData(p => ({ ...p, params: { ...p.params, [name]: val } }));
  };

  const handleRun = async (e) => {
    e.preventDefault();
    setBacktestResults(null);
    setIsSimulating(true); 
    const runner = activeTab === 'combo' ? runComboBacktest : runNewBacktest;
    const res = await runner(data);
    if (res) setBacktestResults(res);
    setIsSimulating(false);
  };

  return (
    <div className="backtest-container p-6 lg:p-10 bg-[#030303] text-white min-h-screen">
        <div className="grid grid-cols-12 gap-10 max-w-[1800px] mx-auto">
          
          {/* --- LEFT: CONTROL PANEL (THE VAULT) --- */}
          <div className="col-span-12 lg:col-span-4 space-y-6">
            <div className="bot-card p-7 sticky top-10">
              
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-white font-black text-xs tracking-widest uppercase">🧪 Strategy Sandbox</h2>
                <button type="button" onClick={loadWinners} className="text-emerald-400 text-[9px] font-bold bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20 hover:bg-emerald-500/20 transition-all">Sync Alpha</button>
              </div>

              {/* 1. Global Winner Selection */}
              <select className={inputClass + " mb-6"} value={selectedWinnerId} onChange={(e) => setSelectedWinnerId(e.target.value)}>
                <option value="">-- Choose High-Alpha Winner --</option>
                {liveWinners.map(w => <option key={w.botId} value={w.botId}>{w.symbol} (ROI: {w.roi}%)</option>)}
              </select>

              {/* 2. Architecture Tabs */}
              <div className="flex gap-2 mb-8 bg-white/5 p-1.5 rounded-2xl"> 
                {['single', 'combo'].map(t => (
                  <button key={t} type="button" onClick={() => setActiveTab(t)}
                    className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${activeTab === t ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20' : 'text-neutral-500 hover:text-white'}`}>
                    {t === 'single' ? 'Atomic' : 'Hybrid'}
                  </button>
                ))}
              </div>

              <form onSubmit={handleRun} className="space-y-6 h-[75vh] overflow-y-auto pr-2 custom-scrollbar">
                
                {/* 🟣 SECTION A: ENSEMBLE INTELLIGENCE (COUNCIL HUB) */}
                <div className="ai-intelligence-panel space-y-4">
                    <div className="flex justify-between items-center border-b border-violet-500/10 pb-2">
                        <h4 className="font-black uppercase tracking-widest text-violet-400 text-[9px]">Ensemble Intelligence</h4>
                        <select value={data.mlMode} onChange={(e)=>setData({...data, mlMode: e.target.value})} className="bg-violet-500/10 border-none text-[8px] rounded px-2 py-1 text-violet-300 outline-none">
                            <option value="off">Bypass AI</option><option value="on">AI Filter</option>
                        </select>
                    </div>
                    {data.mlMode === "on" && (
                        <div className="space-y-3 animate-in fade-in zoom-in-95">
                            <div>
                                <label className="text-neutral-500 text-[8px] uppercase font-bold mb-1 block">Architecture Selector</label>
                                <select value={data.params.model_type} onChange={(e)=>onParamChange('model_type', e.target.value)} className={inputClass}>
                                    {AI_ARCHITECTURES.map(arch => <option key={arch.id} value={arch.id}>{arch.name}</option>)}
                                    {availableModels.map(m => <option key={m.id} value={m.id}>Disk: {m.id}</option>)}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-neutral-500 text-[8px] uppercase font-bold mb-1 block">Long Gate (Min Conf)</label>
                                    <input type="number" step="0.01" value={data.params.long_threshold} onChange={(e) => onParamChange('long_threshold', parseFloat(e.target.value))} className={inputClass + " gate-input"} />
                                </div>
                                <div>
                                    <label className="text-neutral-500 text-[8px] uppercase font-bold mb-1 block">Short Gate (Max Conf)</label>
                                    <input type="number" step="0.01" value={data.params.short_threshold} onChange={(e) => onParamChange('short_threshold', parseFloat(e.target.value))} className={inputClass + " gate-input"} />
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* 🟢 SECTION B: ALPHA SHIELD (v100.0) */}
                <div className="p-5 bg-emerald-500/5 border border-emerald-500/10 rounded-[24px] space-y-4">
                    <h4 className="text-emerald-400 font-black uppercase text-[9px] tracking-widest border-b border-emerald-500/10 pb-2">Alpha Shield v100</h4>
                    <div className="grid grid-cols-2 gap-3">
                        <div><label className="text-[8px] uppercase font-bold text-neutral-500">Squeeze Sens</label><input type="number" step="0.001" value={data.params.squeeze_threshold} onChange={(e) => onParamChange('squeeze_threshold', parseFloat(e.target.value))} className={inputClass} /></div>
                        <div><label className="text-[8px] uppercase font-bold text-neutral-500">Vol Fuel</label><input type="number" step="0.01" value={data.params.vol_multiplier} onChange={(e) => onParamChange('vol_multiplier', parseFloat(e.target.value))} className={inputClass} /></div>
                        <div><label className="text-[8px] uppercase font-bold text-neutral-500">Session Start</label><input type="number" value={data.params.session_start} onChange={(e) => onParamChange('session_start', parseInt(e.target.value))} className={inputClass} /></div>
                        <div><label className="text-[8px] uppercase font-bold text-neutral-500">Session End</label><input type="number" value={data.params.session_end} onChange={(e) => onParamChange('session_end', parseInt(e.target.value))} className={inputClass} /></div>
                    </div>
                </div>

                {/* ⚪ SECTION C: STRATEGY LAYERS (SIGNAL ENGINES) */}
                <div className="space-y-4">
                    <label className="text-neutral-500 text-[10px] uppercase font-black block tracking-widest">Signal Layers</label>
                    {activeTab === 'single' ? (
                        <>
                        <select value={data.code} onChange={(e) => setData({...data, code: e.target.value})} className={inputClass}>
                            <option value="">-- Select Signal Engine --</option>
                            {STRAT_POOL.map(s => <option key={s.code} value={s.code}>{s.name}</option>)}
                        </select>
                        {data.code && <StrategyParamInputs strategy={data} onChange={(p) => setData({...data, params: {...data.params, ...p}})} />}
                        </>
                    ) : (
                        <div className="space-y-4">
                            <div className="p-4 bg-white/5 rounded-2xl border border-white/5 mb-4">
                                <label className="text-neutral-500 text-[9px] font-black uppercase mb-2 block">Aggregator Logic</label>
                                <select className={inputClass} value={data.combinationRule} onChange={(e) => setData({...data, combinationRule: e.target.value})}>
                                    <option value="OR">OR (Aggressive)</option><option value="AND">AND (Conservative)</option>
                                </select>
                            </div>
                            {data.strategies.map((s, i) => (
                                <div key={i} className="p-4 bg-white/5 rounded-2xl border border-white/5 relative group">
                                    <button type="button" onClick={() => setData({...data, strategies: data.strategies.filter((_, idx)=>idx!==i)})} className="absolute top-2 right-3 text-rose-500 text-xs">✕</button>
                                    <select className={inputClass + " mb-2"} value={s.code} onChange={(e) => {
                                        const n = [...data.strategies]; n[i] = { code: e.target.value, params: {} };
                                        setData({...data, strategies: n});
                                    }}>
                                        <option value="">-- Select Layer --</option>
                                        {STRAT_POOL.map(o=><option key={o.code} value={o.code}>{o.name}</option>)}
                                    </select>
                                    {s.code && <StrategyParamInputs strategy={s} onChange={(p) => { const n = [...data.strategies]; n[i].params = p; setData({...data, strategies: n}); }} />}
                                </div>
                            ))}
                            <button type="button" onClick={() => setData({...data, strategies: [...data.strategies, {code: "", params: {}}]})} className="w-full py-3 border-dashed border-2 border-white/10 rounded-2xl text-[9px] text-emerald-400 font-black uppercase">+ Add Layer</button>
                        </div>
                    )}
                </div>

                {/* 🔵 SECTION D: DATA & ENVIRONMENT (DATES/SYMBOLS) */}
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/5">
                    <div><label className="text-neutral-500 text-[8px] uppercase font-bold mb-2 block">Asset</label><select value={data.symbol} onChange={(e)=>setData({...data, symbol: e.target.value})} className={inputClass}><option value="BTC-USD">BTC-USD</option><option value="ETH-USD">ETH-USD</option><option value="SOL-USD">SOL-USD</option></select></div>
                    <div><label className="text-neutral-500 text-[8px] uppercase font-bold mb-2 block">Timeframe</label><select value={data.timeframe} onChange={(e)=>setData({...data, timeframe: e.target.value})} className={inputClass}><option value="1h">1h</option><option value="15m">15m</option></select></div>
                    <div><label className="text-neutral-500 text-[8px] uppercase font-bold mb-2 block">Simulation From</label><input type="date" value={data.startDate} onChange={(e)=>setData({...data, startDate: e.target.value})} className={inputClass} /></div>
                    <div><label className="text-neutral-500 text-[8px] uppercase font-bold mb-2 block">Simulation To</label><input type="date" value={data.endDate} onChange={(e)=>setData({...data, endDate: e.target.value})} className={inputClass} /></div>
                </div>

                {/* 🟠 SECTION E: VAULT RISK & MARKET STATE INTELLIGENCE */}
                <div className="p-5 bg-black/40 border border-white/5 rounded-[24px] space-y-4">
                    <h4 className="text-white font-black uppercase text-[9px] border-b border-white/5 pb-2 tracking-widest">Vault & Market State</h4>
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className="text-neutral-500 text-[8px] uppercase font-bold mb-1">Cash Input</label><input type="number" value={data.initialBalance} onChange={(e)=>setData({...data, initialBalance: e.target.value})} className={inputClass} /></div>
                        <div><label className="text-neutral-500 text-[8px] uppercase font-bold mb-1">Risk %</label><input type="number" step="0.1" value={data.risk_percentage} onChange={(e)=>setData({...data, risk_percentage: e.target.value})} className={inputClass} /></div>
                    </div>
                    <select value={data.regime_mode} onChange={(e)=>setData({...data, regime_mode: e.target.value})} className={inputClass}>
                        {REGIME_OPTIONS.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                    </select>
                    <div className="grid grid-cols-2 gap-3">
                        <div><label className="text-neutral-500 text-[8px] uppercase">TSL ATR</label><input type="number" step="0.1" value={data.params.tslAtrMult} onChange={(e)=>onParamChange('tslAtrMult', parseFloat(e.target.value))} className={inputClass} /></div>
                        <div><label className="text-neutral-500 text-[8px] uppercase">Chop ADX</label><input type="number" value={data.params.minAdxLevel} onChange={(e)=>onParamChange('minAdxLevel', parseInt(e.target.value))} className={inputClass} /></div>
                        <div><label className="text-neutral-500 text-[8px] uppercase">Trend SMA</label><input type="number" value={data.params.trendFilterPeriod} onChange={(e)=>onParamChange('trendFilterPeriod', parseInt(e.target.value))} className={inputClass} /></div>
                        <div><label className="text-neutral-500 text-[8px] uppercase">Min ATR %</label><input type="number" step="0.1" value={data.params.minAtrPct} onChange={(e)=>onParamChange('minAtrPct', parseFloat(e.target.value))} className={inputClass} /></div>
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                    {FEE_TIERS.map(t => (
                        <button key={t.label} type="button" onClick={() => { onParamChange('commission', t.val); onParamChange('slippage', t.slip); }}
                            className={`py-2 rounded-lg text-[8px] font-bold border transition-all ${data.params.commission === t.val ? 'bg-emerald-500 text-black border-emerald-500' : 'bg-transparent text-neutral-500 border-white/10 hover:border-white/30'}`}>
                            {t.label}
                        </button>
                    ))}
                </div>

                <button type="submit" disabled={isSimulating} className={`w-full py-5 font-black uppercase tracking-[0.2em] rounded-2xl bg-emerald-500 text-black ${isSimulating ? 'opacity-50 animate-pulse' : 'hover:scale-[1.02] active:scale-95 shadow-xl shadow-emerald-500/10'}`}>
                    {isSimulating ? '🔬 CRUNCHING ALPHA...' : '▶ Launch Backtest'}
                </button>
              </form>
            </div>
          </div>

          {/* --- RIGHT: RESULTS PANEL --- */}
          <div className="col-span-12 lg:col-span-8">
            {backtestResults ? (
                <div className="animate-in fade-in slide-in-from-bottom-5 duration-700">
                    <MetricsGrid metrics={backtestResults.metrics || {}} />
                    <div className="bot-card p-5 h-[720px] bg-black/40 border border-white/5 rounded-[40px] relative">
                        <div className="flex absolute top-4 right-10 z-10 bg-black/40 p-1 rounded-xl border border-white/5">
                            {['static', 'replay'].map(m => (
                                <button key={m} onClick={()=>setDisplayMode(m)} className={`px-4 py-1 rounded-lg text-[9px] font-black uppercase transition-all ${displayMode === m ? 'bg-white/10 text-white' : 'text-neutral-500 hover:text-white'}`}>{m}</button>
                            ))}
                        </div>
                        {displayMode === 'static' ? (
                            <ChartIndependent results={backtestResults} symbol={data.symbol} />
                        ) : (
                            <ChartReplay results={backtestResults} symbol={data.symbol} />
                        )}
                    </div>
                </div>
            ) : (
                <div className="h-[90vh] flex flex-col items-center justify-center border-2 border-dashed border-white/5 bg-black/20 rounded-[48px] text-center p-10">
                    <div className="w-24 h-24 rounded-full flex items-center justify-center mb-8 text-4xl bg-emerald-500/5 border border-emerald-500/10 animate-pulse">🔬</div>
                    <h3 className="text-white text-xl font-black uppercase tracking-widest">Sovereign Sandbox Ready</h3>
                    <p className="text-neutral-500 max-w-sm text-xs mt-3 leading-relaxed">Configure ensemble intelligence, alpha shield filters, and signal layers to begin the verification cycle.</p>
                </div>
            )}
          </div>
        </div>
    </div>
  );
}
