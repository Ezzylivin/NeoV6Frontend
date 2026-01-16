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

// --- 🟢 CONFIGURATION & MAPPINGS ---
const STRATEGY_POOL = [
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

// --- 🛠️ 1. CONTEXT-AWARE PARAMETER ENGINE ---
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
        <div className="grid grid-cols-2 gap-2 p-3 bg-black/20 rounded-xl border border-white/5 mt-2">
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

// --- 📊 2. METRICS & VISUALS ---
const MetricsGrid = ({ metrics }) => (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
        {[
            { l: "ROI", v: `${(metrics.roi || 0).toFixed(2)}%`, c: "text-emerald-400" },
            { l: "Win Rate", v: `${(metrics.winRate || 0).toFixed(2)}%`, c: "text-violet-400" },
            { l: "Drawdown", v: `${(metrics.maxDrawdown || 0).toFixed(2)}%`, c: "text-rose-400" },
            { l: "Trades", v: metrics.totalTrades || 0, c: "text-cyan-400" },
            { l: "Profit Factor", v: (metrics.profitFactor || 0).toFixed(2), c: "text-teal-400" },
            { l: "Sharpe", v: (metrics.sharpeRatio || 0).toFixed(2), c: "text-amber-400" }
        ].map((m, i) => (
            <div key={i} className="bot-card p-4 text-center bg-black/40 border border-white/5 rounded-2xl shadow-xl">
                <div className="text-neutral-500 text-[9px] uppercase font-black tracking-widest mb-1">{m.l}</div>
                <div className={`text-lg font-mono font-bold ${m.c}`}>{m.v}</div>
            </div>
        ))}
    </div>
);



// --- 🚀 3. MAIN COMPONENT ---
export default function Backtests() {
  const { state, runNewBacktest, runComboBacktest, fetchOptions } = useBacktest(); 
  const { options = {} } = state || {};

  const [activeTab, setActiveTab] = useState('single');
  const [displayMode, setDisplayMode] = useState('static');
  const [isSimulating, setIsSimulating] = useState(false);
  const [liveWinners, setLiveWinners] = useState([]);
  const [backtestResults, setBacktestResults] = useState(null);

  // Unified State
  const [data, setData] = useState({
    symbol: "BTC-USD", timeframe: "1h", startDate: "2025-01-01", endDate: "2026-01-01", 
    initialBalance: 1000, risk_percentage: 1, strategyId: "", code: "", combinationRule: "OR",
    mlMode: "off", mlModel: "btc_1h_xgboost", regime_mode: "adaptive",
    strategies: [{ strategyId: "", code: "", params: {} }],
    params: { tslAtrMult: 3.0, minAdxLevel: 25, trendFilterPeriod: 200, minAtrPct: 0.5, commission: 0.006, slippage: 0.001 }
  });

  const loadWinners = async () => {
    try {
        const res = await axios.get("https://neov6backend.onrender.com/api/bot/winners");
        setLiveWinners(res.data.winners || []);
    } catch (e) { console.error("Sync failed"); }
  };

  useEffect(() => { loadWinners(); }, []);

  const onParamChange = (name, val) => setData(p => ({ ...p, params: { ...p.params, [name]: val } }));

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
          
          {/* --- LEFT: CONTROLS --- */}
          <div className="col-span-12 lg:col-span-4 space-y-6">
            <div className="bot-card p-7 bg-black/60 border border-white/5 rounded-[32px] shadow-2xl backdrop-blur-xl">
              
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-white font-black text-xs tracking-widest uppercase">🧪 Strategy Sandbox</h2>
                <button type="button" onClick={loadWinners} className="text-emerald-400 text-[9px] font-bold bg-emerald-500/10 px-3 py-1 rounded-full">Sync Alpha</button>
              </div>

              {/* Winner Dropdown */}
              <select className={inputClass + " mb-6"} onChange={(e) => {/* Winner selection logic */}}>
                <option value="">-- Choose High-Alpha Winner --</option>
                {liveWinners.map(w => <option key={w.id} value={w.id}>{w.symbol} - {w.roi}%</option>)}
              </select>

              {/* Architecture Tabs */}
              <div className="flex gap-2 mb-8 bg-white/5 p-1.5 rounded-2xl"> 
                {['single', 'combo'].map(t => (
                  <button key={t} type="button" onClick={() => setActiveTab(t)}
                    className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase ${activeTab === t ? 'bg-emerald-500 text-black' : 'text-neutral-500'}`}>
                    {t === 'single' ? 'Atomic' : 'Hybrid'}
                  </button>
                ))}
              </div>

              <form onSubmit={handleRun} className="space-y-6">
                
                {/* Signal Engine Config */}
                {activeTab === 'single' ? (
                  <div className="space-y-4">
                    <select value={data.strategyId} onChange={(e) => setData({...data, strategyId: e.target.value, code: STRATEGY_POOL.find(s=>s.code===e.target.value)?.code})} className={inputClass}>
                        <option value="">-- Select Signal Engine --</option>
                        {STRAT_POOL.map(s => <option key={s.code} value={s.code}>{s.name}</option>)}
                    </select>
                    {data.code && <StrategyParamInputs strategy={data} onChange={(p) => setData({...data, params: {...data.params, ...p}})} />}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <select className={inputClass} value={data.combinationRule} onChange={(e) => setData({...data, combinationRule: e.target.value})}>
                        <option value="OR">OR (Aggressive)</option>
                        <option value="AND">AND (Conservative)</option>
                    </select>
                    {data.strategies.map((s, i) => (
                        <div key={i} className="p-4 bg-white/5 rounded-2xl border border-white/5 relative">
                            <button type="button" onClick={() => setData({...data, strategies: data.strategies.filter((_, idx)=>idx!==i)})} className="absolute top-2 right-3 text-rose-500 text-xs">✕</button>
                            <select className={inputClass + " mb-2"} value={s.code} onChange={(e) => {
                                const n = [...data.strategies]; n[i] = { code: e.target.value, params: {} };
                                setData({...data, strategies: n});
                            }}><option value="">-- Select Engine --</option>{STRAT_POOL.map(o=><option key={o.code} value={o.code}>{o.name}</option>)}</select>
                            {s.code && <StrategyParamInputs strategy={s} onChange={(p) => { const n = [...data.strategies]; n[i].params = p; setData({...data, strategies: n}); }} />}
                        </div>
                    ))}
                    <button type="button" onClick={() => setData({...data, strategies: [...data.strategies, {code: "", params: {}}]})} className="w-full py-3 border-dashed border-2 border-white/10 rounded-2xl text-[9px] text-emerald-400 uppercase font-black">+ Add Layer</button>
                  </div>
                )}

                {/* Data Inputs */}
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/5">
                    <div><label className="text-neutral-500 text-[9px] uppercase font-bold">Symbol</label><select value={data.symbol} onChange={(e)=>setData({...data, symbol: e.target.value})} className={inputClass}><option value="BTC-USD">BTC-USD</option><option value="ETH-USD">ETH-USD</option><option value="SOL-USD">SOL-USD</option></select></div>
                    <div><label className="text-neutral-500 text-[9px] uppercase font-bold">Timeframe</label><select value={data.timeframe} onChange={(e)=>setData({...data, timeframe: e.target.value})} className={inputClass}><option value="1h">1h</option><option value="15m">15m</option></select></div>
                    <div className="col-span-2 flex gap-4">
                        <input type="date" value={data.startDate} onChange={(e)=>setData({...data, startDate: e.target.value})} className={inputClass} />
                        <input type="date" value={data.endDate} onChange={(e)=>setData({...data, endDate: e.target.value})} className={inputClass} />
                    </div>
                </div>

                {/* Vault Risk & ML */}
                <div className="p-5 bg-black/40 border border-white/5 rounded-[24px] space-y-4">
                    <h4 className="text-emerald-400 font-black uppercase text-[9px]">Vault Risk & ML</h4>
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className="text-neutral-500 text-[8px] uppercase">Cash</label><input type="number" value={data.initialBalance} onChange={(e)=>setData({...data, initialBalance: e.target.value})} className={inputClass} /></div>
                        <div><label className="text-neutral-500 text-[8px] uppercase">Risk %</label><input type="number" step="0.1" value={data.risk_percentage} onChange={(e)=>setData({...data, risk_percentage: e.target.value})} className={inputClass} /></div>
                        <div className="col-span-2">
                            <label className="text-neutral-500 text-[8px] uppercase">ML Filter</label>
                            <select value={data.mlMode} onChange={(e)=>setData({...data, mlMode: e.target.value})} className={inputClass}>
                                <option value="off">Off</option><option value="predictions">Active</option>
                            </select>
                            {data.mlMode === 'predictions' && <select value={data.mlModel} onChange={(e)=>setData({...data, mlModel: e.target.value})} className={inputClass + " mt-2"}><option value="btc_1h_xgboost">XGBoost</option><option value="btc_1h_lightgbm">LightGBM</option></select>}
                        </div>
                    </div>
                </div>

                {/* Market State Intel */}
                <div className="p-5 bg-black/40 border border-white/5 rounded-[24px] space-y-4">
                    <h4 className="text-white font-black uppercase text-[9px]">Market State Intelligence</h4>
                    <select value={data.regime_mode} onChange={(e)=>setData({...data, regime_mode: e.target.value})} className={inputClass}>
                        {REGIME_OPTIONS.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                    </select>
                    <div className="grid grid-cols-2 gap-3">
                        <div><label className="text-neutral-500 text-[8px] uppercase">TSL Mult</label><input type="number" value={data.params.tslAtrMult} onChange={(e)=>onParamChange('tslAtrMult', e.target.value)} className={inputClass} /></div>
                        <div><label className="text-neutral-500 text-[8px] uppercase">Chop ADX</label><input type="number" value={data.params.minAdxLevel} onChange={(e)=>onParamChange('minAdxLevel', e.target.value)} className={inputClass} /></div>
                        <div><label className="text-neutral-500 text-[8px] uppercase">Trend SMA</label><input type="number" value={data.params.trendFilterPeriod} onChange={(e)=>onParamChange('trendFilterPeriod', e.target.value)} className={inputClass} /></div>
                        <div><label className="text-neutral-500 text-[8px] uppercase">Min ATR %</label><input type="number" step="0.1" value={data.params.minAtrPct} onChange={(e)=>onParamChange('minAtrPct', e.target.value)} className={inputClass} /></div>
                    </div>
                </div>

                {/* Fee Switcher */}
                <div className="grid grid-cols-3 gap-2">
                    {FEE_TIERS.map(t => (
                        <button key={t.label} type="button" onClick={() => { onParamChange('commission', t.val); onParamChange('slippage', t.slip); }}
                            className={`py-2 rounded-lg text-[8px] font-bold border transition-all ${data.params.commission === t.val ? 'bg-emerald-500 text-black border-emerald-500' : 'bg-transparent text-neutral-500 border-white/10'}`}>
                            {t.label}
                        </button>
                    ))}
                </div>

                <button type="submit" disabled={isSimulating} className="w-full py-5 font-black uppercase tracking-[0.2em] rounded-2xl bg-emerald-500 text-black shadow-[0_0_30px_-5px_rgba(16,185,129,0.4)]">
                    {isSimulating ? '🔬 CRUNCHING...' : '▶ Launch Backtest'}
                </button>
              </form>
            </div>
          </div>

          {/* --- RIGHT: RESULTS --- */}
          <div className="col-span-12 lg:col-span-8 space-y-6">
            {backtestResults ? (
                <div className="animate-in fade-in slide-in-from-bottom-5 duration-700">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-emerald-400 font-black uppercase tracking-widest text-[10px]">Verification: {data.symbol} - {data.timeframe}</h3>
                        <div className="flex bg-white/5 p-1 rounded-xl">
                            {['static', 'replay'].map(m => (
                                <button key={m} onClick={()=>setDisplayMode(m)} className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase ${displayMode === m ? 'bg-white/10 text-white' : 'text-neutral-500'}`}>{m}</button>
                            ))}
                        </div>
                    </div>
                    <MetricsGrid metrics={backtestResults.metrics || {}} />
                    <div className="bot-card p-5 h-[700px] bg-black/40 border border-white/5 rounded-[32px] overflow-hidden">
                        {displayMode === 'static' ? <ChartIndependent results={backtestResults} symbol={data.symbol} /> : <ChartReplay results={backtestResults} symbol={data.symbol} />}
                    </div>
                </div>
            ) : (
                <div className="h-[900px] flex flex-col items-center justify-center border-2 border-dashed border-white/5 bg-black/20 rounded-[48px] text-center p-10">
                    <div className="w-24 h-24 rounded-full flex items-center justify-center mb-8 text-4xl bg-emerald-500/5 border border-emerald-500/20 animate-pulse">🔬</div>
                    <h3 className="text-white text-xl font-black uppercase tracking-widest">Ready for Verification</h3>
                    <p className="text-neutral-500 max-w-sm text-xs mt-3 leading-relaxed">Config logic layers and launch simulation to verify risk-adjusted alpha performance.</p>
                </div>
            )}
          </div>
        </div>
    </div>
  );
}
