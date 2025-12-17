// File: src/pages/Backtests.jsx
// 🚀 UPGRADE: v66.4 - "The Complete Engine"
// 1. INTEGRATED: Alpha Strategy Loader & Golden Winner select.
// 2. RESTORED: Advanced Filter inputs, ML Config, and Risk Sizing.
// 3. FEATURE: Manual Run Mode with Replay & Standard chart toggles.
// 4. THEME: Jet Black, Emerald, & Teal accents.

import React, { useState, useEffect, useMemo } from "react";
import axios from "axios"; 
import { useBacktest } from "../hooks/useBacktest.js";
import {
  PieChart, Pie, Cell, Legend, AreaChart, Area, 
  XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer
} from "recharts";
import { ChartIndependent } from "../components/ChartIndependent.jsx"; 
import { ChartReplay } from "../components/ChartReplay.jsx"; 
import api from "../api/apiClient"; 
import "./Backtests.css"; 

const COLORS = ["#10b981", "#ef4444", "#14b8a6", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4", "#22c55e"];
const REASON_COLORS = ["#10b981", "#f59e0b", "#06b6d4", "#ec4899", "#64748b"]; 

const STRATEGY_TYPE_TO_CODE_MAP = {
  "Moving Average Crossover": "sma_crossover", "RSI": "rsi_divergence", "MACD": "macd_crossover",
  "Stochastic Oscillator": "stochastic_crossover", "CCI": "cci_oversold", "Bollinger Bands": "bollinger_bands",
  "ATR Breakout": "atr_breakout", "Ichimoku Cloud": "ichimoku_cloud"
};

const defaultFilterParams = { minAtrPct: 0.1, trendFilterPeriod: 200, minAdxLevel: 10, tslAtrMult: 3.5, regime_threshold: 25, hybridMode: "OR" };

const initialFormData = {
  strategyId: "", code: "", symbol: "BTC-USD", timeframe: "1h", startDate: "2024-12-16", endDate: "2025-12-15",
  initialBalance: 1000, params: { ...defaultFilterParams },
  riskManagementMode: 'static', riskPercentage: 1, mlMode: "off", mlModel: "", mlThreshold: 0.5
};

const initialComboData = {
  strategies: [ { strategyId: "", code: "", params: { tslAtrMult: 3.5 } } ],
  params: { ...defaultFilterParams }, 
  comboConfig: { strategyCodes: [], combinationRule: 'OR' },
  symbol: "BTC-USD", timeframe: "1h", startDate: "2024-12-16", endDate: "2025-12-15", initialBalance: 1000,
  riskPercentage: 1, mlMode: "off", mlModel: "", mlThreshold: 0.5
};

// --- UI COMPONENTS ---
const CommonBacktestInputs = ({ data, onChange, options }) => {
    const inputClass = "w-full bg-[#0a0a0a] border border-white/10 rounded-xl px-4 py-3 text-white focus:border-emerald-500 transition-colors text-sm";
    const labelClass = "text-neutral-500 text-[10px] uppercase font-black mb-2 block tracking-widest";
    const safeVal = (v) => (v === null || v === undefined || isNaN(v)) ? '' : v;

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Asset Symbol</label>
            <select name="symbol" value={data.symbol} onChange={onChange} className={inputClass}>
              {options.symbolOptions?.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>Timeframe</label>
            <select name="timeframe" value={data.timeframe} onChange={onChange} className={inputClass}>
              {options.timeframeOptions?.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>

        <div className="bot-card bg-emerald-500/5 border-emerald-500/10 p-5 rounded-2xl">
          <h4 className="text-emerald-400 font-bold text-xs uppercase mb-4 tracking-tighter">⚡ Risk & ML Config</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Risk % Per Trade</label>
              <input type="number" name="riskPercentage" value={safeVal(data.riskPercentage)} onChange={onChange} step="0.1" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Combination Logic</label>
              <select name="param_hybridMode" value={data.params?.hybridMode || "OR"} onChange={onChange} className={inputClass}>
                <option value="AND">Strict (AND)</option>
                <option value="OR">Loose (OR)</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>ML Model Filter</label>
              <select name="mlModel" value={data.mlModel} onChange={onChange} className={inputClass}>
                <option value="">-- No Model --</option>
                {options.modelOptions?.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>ML Threshold</label>
              <input type="number" name="mlThreshold" value={safeVal(data.mlThreshold)} onChange={onChange} step="0.05" className={inputClass} />
            </div>
          </div>
        </div>

        <div className="bot-card bg-neutral-900/50 border-white/5 p-5 rounded-2xl">
          <h4 className="text-white/60 font-bold text-xs uppercase mb-4 tracking-tighter">⚙️ Advanced Filters</h4>
          <div className="grid grid-cols-2 gap-x-4 gap-y-6">
            <div>
              <label className={labelClass}>Min ATR %</label>
              <input type="number" name="param_minAtrPct" value={safeVal(data.params?.minAtrPct)} onChange={onChange} step="0.01" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Min ADX</label>
              <input type="number" name="param_minAdxLevel" value={safeVal(data.params?.minAdxLevel)} onChange={onChange} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>TSL ATR Mult</label>
              <input type="number" name="param_tslAtrMult" value={safeVal(data.params?.tslAtrMult)} onChange={onChange} step="0.1" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Trend Filter SMA</label>
              <input type="number" name="param_trendFilterPeriod" value={safeVal(data.params?.trendFilterPeriod)} onChange={onChange} className={inputClass} />
            </div>
          </div>
        </div>
      </div>
    );
};

export default function Backtests() {
  const { state, runComboBacktest, runNewBacktest } = useBacktest(); 
  const { options = {} } = state || {};
  
  const [formData, setFormData] = useState(initialFormData);
  const [comboData, setComboData] = useState(initialComboData);
  const [activeTab, setActiveTab] = useState('single');
  const [selectedWinnerId, setSelectedWinnerId] = useState("");
  const [liveWinners, setLiveWinners] = useState([]);
  const [backtestResults, setBacktestResults] = useState({ main: null });
  const [isSimulating, setIsSimulating] = useState(false); 
  const [chartMode, setChartMode] = useState('standard');

  const fetchWinners = async () => {
    try {
      const res = await api.get("/bot/winners");
      if (res.data) setLiveWinners(res.data);
    } catch (err) { console.error("Winner Scan Failed", err); }
  };
  useEffect(() => { fetchWinners(); }, []);

  const handleRun = async (e) => {
    e.preventDefault();
    setIsSimulating(true);
    setBacktestResults({ main: null });

    const source = activeTab === 'single' ? formData : comboData;
    const rule = source.params?.hybridMode || 'OR';

    const payload = {
        ...source,
        comboConfig: {
            strategyCodes: activeTab === 'single' ? [source.code] : source.strategies.map(s => s.code),
            combinationRule: rule
        }
    };

    console.log("🚀 PAYLOAD SYNC -> Rule:", payload.comboConfig.combinationRule);

    try {
      const runFn = activeTab === 'single' ? runNewBacktest : runComboBacktest;
      const res = await runFn?.(payload);
      if (res) setBacktestResults({ main: res.combinedResult || res });
    } catch (err) { console.error("❌ BACKTEST ERROR", err); } 
    finally { setIsSimulating(false); }
  };

  const handleFormChange = (e) => {
    const { name, value, type } = e.target;
    let val = type === 'number' ? (isNaN(parseFloat(value)) ? '' : parseFloat(value)) : value;
    const setFunc = activeTab === 'single' ? setFormData : setComboData;
    
    if (name.startsWith("param_")) {
        const key = name.substring(6);
        setFunc(prev => ({ ...prev, params: { ...prev.params, [key]: val } }));
    } else {
        setFunc(prev => ({ ...prev, [name]: val }));
    }
  };

  return (
    <div className="min-h-screen bg-black text-white p-8 font-sans">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-10">
            <h1 className="text-4xl font-black italic tracking-tighter uppercase emerald-glow">Institutional Backtester</h1>
            <div className="flex gap-4">
                <button onClick={fetchWinners} className="px-4 py-2 border border-white/10 rounded-xl text-xs font-bold hover:bg-white/5 transition-all">🔄 SCAN VAULT</button>
                <div className="px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs font-bold text-emerald-500 animate-pulse">SYSTEM LIVE</div>
            </div>
        </div>

        <div className="grid grid-cols-12 gap-10">
          <div className="col-span-12 lg:col-span-5 space-y-8">
            <div className="bot-card bg-[#050505] border border-white/5 p-8 rounded-[2rem] shadow-2xl">
              <div className="tabs flex bg-black p-1 rounded-2xl mb-8 border border-white/5">
                <button onClick={() => setActiveTab('single')} className={`flex-1 py-3 rounded-xl text-xs font-black uppercase ${activeTab === 'single' ? 'bg-emerald-500 text-black' : 'text-white/40'}`}>Single Logic</button>
                <button onClick={() => setActiveTab('combo')} className={`flex-1 py-3 rounded-xl text-xs font-black uppercase ${activeTab === 'combo' ? 'bg-emerald-500 text-black' : 'text-white/40'}`}>Strategy Combo</button>
              </div>

              <div className="mb-8 p-4 bg-emerald-500/5 rounded-2xl border border-emerald-500/10">
                <label className="text-[10px] uppercase font-black text-emerald-500 mb-2 block">🏆 Load Alpha Strategy</label>
                <select value={selectedWinnerId} onChange={(e) => setSelectedWinnerId(e.target.value)} className="w-full bg-black border border-white/10 rounded-xl p-3 text-white">
                  <option value="">-- Select Winner --</option>
                  {liveWinners.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>
              </div>

              <form onSubmit={handleRun} className="space-y-6">
                {activeTab === 'single' && (
                   <div className="mb-6">
                     <label className="text-neutral-500 text-[10px] uppercase font-black mb-2 block">Base Signal</label>
                     <select name="code" value={formData.code} onChange={handleFormChange} className="w-full bg-black border border-white/10 rounded-xl p-4 text-white focus:border-emerald-500">
                        {Object.entries(STRATEGY_TYPE_TO_CODE_MAP).map(([name, code]) => <option key={code} value={code}>{name}</option>)}
                     </select>
                   </div>
                )}
                
                <CommonBacktestInputs 
                    data={activeTab === 'single' ? formData : comboData} 
                    onChange={handleFormChange} 
                    options={{ 
                        symbolOptions: options.symbols, 
                        timeframeOptions: options.timeframes,
                        modelOptions: options.models
                    }} 
                />
                
                <button type="submit" disabled={isSimulating} className="w-full py-6 bg-emerald-500 text-black font-black uppercase rounded-3xl hover:bg-emerald-400 disabled:opacity-50 transition-all shadow-[0_0_30px_rgba(16,185,129,0.2)]">
                  {isSimulating ? 'Processing History...' : '▶ Start Institutional Simulation'}
                </button>
              </form>
            </div>
          </div>

          <div className="col-span-12 lg:col-span-7">
            {backtestResults.main ? (
               <div className="bot-card bg-neutral-900/10 rounded-[2.5rem] border border-white/5 p-8 relative overflow-hidden">
                  <div className="flex justify-between items-center mb-8">
                      <div className="flex gap-4">
                          <div className="p-4 bg-black rounded-2xl border border-white/5">
                              <span className="text-[9px] text-neutral-500 uppercase font-bold block">Return</span>
                              <span className="text-2xl font-black text-emerald-500">{backtestResults.main.metrics?.totalReturn.toFixed(2)}%</span>
                          </div>
                          <div className="p-4 bg-black rounded-2xl border border-white/5">
                              <span className="text-[9px] text-neutral-500 uppercase font-bold block">Trades</span>
                              <span className="text-2xl font-black text-white">{backtestResults.main.metrics?.totalTrades}</span>
                          </div>
                      </div>
                      <div className="tabs flex bg-black p-1 rounded-xl border border-white/5">
                          <button onClick={() => setChartMode('standard')} className={`px-4 py-2 rounded-lg text-[10px] font-bold ${chartMode === 'standard' ? 'bg-white/10 text-white' : 'text-white/30'}`}>STANDARD</button>
                          <button onClick={() => setChartMode('replay')} className={`px-4 py-2 rounded-lg text-[10px] font-bold ${chartMode === 'replay' ? 'bg-white/10 text-white' : 'text-white/30'}`}>REPLAY</button>
                      </div>
                  </div>
                  <div className="h-[600px] w-full">
                    {chartMode === 'standard' ? (
                        <ChartIndependent results={backtestResults.main} symbol={(activeTab === 'single' ? formData : comboData).symbol} />
                    ) : (
                        <ChartReplay results={backtestResults.main} symbol={(activeTab === 'single' ? formData : comboData).symbol} />
                    )}
                  </div>
               </div>
            ) : (
                <div className="h-full border border-white/5 bg-neutral-900/5 rounded-[2.5rem] flex flex-col items-center justify-center p-12">
                   <div className="w-24 h-24 bg-emerald-500/5 border border-emerald-500/10 rounded-full flex items-center justify-center text-4xl mb-6">📊</div>
                   <h3 className="text-2xl font-black text-white uppercase tracking-tighter">No Simulation Active</h3>
                   <p className="text-neutral-500 text-sm max-w-xs text-center mt-4 font-medium">Select your configuration and deploy the engine to generate signal history.</p>
                </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
