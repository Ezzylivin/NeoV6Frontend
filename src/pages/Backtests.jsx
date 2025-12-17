// File: src/pages/Backtests.jsx
// 🚀 UPGRADE: v66.5 - "Institutional Master"
// 1. FIXED: handleWinnerSelect now correctly populates strategy IDs and codes.
// 2. FIXED: Hybrid Logic sync manually overrides async state lag.
// 3. RESTORED: Advanced Filters, Monthly Heatmap, Replay Mode, and CSV export.

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
  strategyId: "", code: "sma_crossover", symbol: "BTC-USD", timeframe: "1h", startDate: "2024-12-16", endDate: "2025-12-15",
  initialBalance: 1000, params: { ...defaultFilterParams },
  riskPercentage: 1, mlMode: "off", mlModel: "btc_1h_lightgbm_model", mlThreshold: 0.5
};

const initialComboData = {
  strategies: [ { strategyId: "", code: "sma_crossover", params: { tslAtrMult: 3.5 } } ],
  params: { ...defaultFilterParams }, 
  comboConfig: { strategyCodes: ["sma_crossover"], combinationRule: 'OR' },
  symbol: "BTC-USD", timeframe: "1h", startDate: "2024-12-16", endDate: "2025-12-15", initialBalance: 1000,
  riskPercentage: 1, mlMode: "off", mlModel: "btc_1h_lightgbm_model", mlThreshold: 0.5
};

// --- HELPER COMPONENTS ---
const MonthlyHeatmap = ({ equityCurve }) => {
    if (!equityCurve || equityCurve.length === 0) return null;
    const monthlyReturns = {};
    equityCurve.forEach((point) => {
        const date = new Date(point.timestamp);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        if (!monthlyReturns[monthKey]) monthlyReturns[monthKey] = { start: point.balance, end: point.balance };
        monthlyReturns[monthKey].end = point.balance;
    });
    
    return (
        <div className="bot-card bg-neutral-900/40 p-6 rounded-3xl border border-white/5 mt-8">
            <h3 className="text-xs font-black uppercase text-neutral-500 mb-6 tracking-widest">Monthly Performance Heatmap</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {Object.keys(monthlyReturns).sort().map(month => {
                    const data = monthlyReturns[month];
                    const ret = ((data.end - data.start) / data.start) * 100;
                    return (
                        <div key={month} className={`p-4 rounded-2xl border ${ret >= 0 ? 'bg-emerald-500/5 border-emerald-500/10' : 'bg-rose-500/5 border-rose-500/10'} text-center`}>
                            <div className="text-[9px] text-neutral-500 mb-1">{month}</div>
                            <div className={`font-black ${ret >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>{ret.toFixed(2)}%</div>
                        </div>
                    )
                })}
            </div>
        </div>
    );
};

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
          <h4 className="text-emerald-400 font-bold text-xs uppercase mb-4 tracking-tighter">⚡ Execution & ML Filtering</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Risk % Per Trade</label>
              <input type="number" name="riskPercentage" value={safeVal(data.riskPercentage)} onChange={onChange} step="0.1" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Hybrid Logic (OR/AND)</label>
              <select name="param_hybridMode" value={data.params?.hybridMode || "OR"} onChange={onChange} className={`${inputClass} border-emerald-500/20`}>
                <option value="AND">Strict (AND)</option>
                <option value="OR">Loose (OR)</option>
              </select>
            </div>
            <div className="col-span-2 grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>ML Model</label>
                  <select name="mlModel" value={data.mlModel} onChange={onChange} className={inputClass}>
                    {options.modelOptions?.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>ML Threshold</label>
                  <input type="number" name="mlThreshold" value={safeVal(data.mlThreshold)} onChange={onChange} step="0.05" className={inputClass} />
                </div>
            </div>
          </div>
        </div>

        <div className="bot-card bg-neutral-900/50 border-white/5 p-5 rounded-2xl">
          <h4 className="text-white/60 font-bold text-xs uppercase mb-4 tracking-tighter">⚙️ Technical Filters</h4>
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

// --- MAIN PAGE ---
export default function Backtests() {
  const { state, runComboBacktest, runNewBacktest } = useBacktest(); 
  const { options = {} } = state || {};
  
  const [formData, setFormData] = useState(initialFormData);
  const [comboData, setComboData] = useState(initialComboData);
  const [activeTab, setActiveTab] = useState('single');
  const [liveWinners, setLiveWinners] = useState([]);
  const [selectedWinnerId, setSelectedWinnerId] = useState("");
  const [backtestResults, setBacktestResults] = useState({ main: null });
  const [isSimulating, setIsSimulating] = useState(false); 
  const [chartMode, setChartMode] = useState('standard');

  const strategyOptions = useMemo(() => {
    const base = Object.entries(STRATEGY_TYPE_TO_CODE_MAP).map(([name, code], idx) => ({ _id: `base-${code}-${idx}`, name, code }));
    return [...base, ...(options.strategies || [])];
  }, [options]);

  useEffect(() => {
    api.get("/bot/winners").then(res => setLiveWinners(res.data || [])).catch(e => console.error(e));
  }, []);

  const handleWinnerSelect = (e) => {
      const filename = e.target.value;
      if (!filename) return;
      setSelectedWinnerId(filename);
      const winner = liveWinners.find(w => w.id === filename);
      if (!winner) return;

      const data = winner.config || winner;
      const strategies = (Array.isArray(data.strategies) ? data.strategies : []).map(s => {
          const matched = strategyOptions.find(opt => opt.code === s.code);
          return { strategyId: matched?._id || "", code: s.code, params: s.params || {} };
      });

      console.log("🏆 Loaded Alpha Strategy:", filename);
      setActiveTab('combo');
      setComboData(prev => ({
          ...prev,
          symbol: data.symbol || "BTC-USD",
          timeframe: data.timeframe || "1h",
          strategies: strategies,
          mlMode: data.mlMode || "predictions",
          params: { ...prev.params, ...data.params }
      }));
  };

  const handleRun = async (e) => {
    e.preventDefault();
    setIsSimulating(true);
    setBacktestResults({ main: null });

    const source = activeTab === 'single' ? formData : comboData;
    const rule = source.params?.hybridMode || 'OR';

    // 🚀 BULLETPROOF SYNC: Map state precisely to Python payload requirements
    const payload = {
        ...source,
        comboConfig: {
            strategyCodes: activeTab === 'single' ? [source.code] : source.strategies.map(s => s.code),
            combinationRule: rule
        }
    };

    console.log("📤 Sending Payload to Engine:", payload.comboConfig.combinationRule);

    try {
      const res = activeTab === 'single' ? await runNewBacktest?.(payload) : await runComboBacktest?.(payload);
      if (res) setBacktestResults({ main: res.combinedResult || res });
    } catch (err) { console.error("❌ BACKTEST FAILED", err); } 
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

  const downloadCSV = () => {
      const trades = backtestResults.main?.tradeBreakdown;
      if (!trades) return;
      const headers = "EntryTime,ExitTime,Profit,Side,Type\n";
      const rows = trades.map(t => `${t.entryTime},${t.exitTime},${t.profit},${t.side},${t.type}`).join("\n");
      const blob = new Blob([headers + rows], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = 'backtest_trades.csv'; a.click();
  };

  return (
    <div className="min-h-screen bg-black text-white p-6 font-sans">
      <div className="max-w-[1600px] mx-auto">
        <div className="grid grid-cols-12 gap-8">
          <div className="col-span-12 lg:col-span-4 space-y-6">
            <div className="bot-card bg-[#080808] border border-white/5 p-8 rounded-[2.5rem] shadow-2xl">
              <div className="flex bg-black p-1 rounded-2xl mb-8 border border-white/5">
                <button onClick={() => setActiveTab('single')} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest ${activeTab === 'single' ? 'bg-emerald-500 text-black' : 'text-white/40'}`}>Single Logic</button>
                <button onClick={() => setActiveTab('combo')} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest ${activeTab === 'combo' ? 'bg-emerald-500 text-black' : 'text-white/40'}`}>Strategy Combo</button>
              </div>

              <div className="mb-8 p-5 bg-emerald-500/5 rounded-3xl border border-emerald-500/10">
                <label className="text-[10px] uppercase font-black text-emerald-500 mb-3 block">🏆 Load Alpha Preset</label>
                <select value={selectedWinnerId} onChange={handleWinnerSelect} className="w-full bg-black border border-white/10 rounded-xl p-3 text-white focus:border-emerald-500 outline-none">
                  <option value="">-- Choose Winner --</option>
                  {liveWinners.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>
              </div>

              <form onSubmit={handleRun} className="space-y-6">
                {activeTab === 'single' && (
                   <div>
                     <label className="text-neutral-500 text-[10px] uppercase font-black mb-2 block tracking-widest">Base Signal Engine</label>
                     <select name="code" value={formData.code} onChange={handleFormChange} className="w-full bg-black border border-white/10 rounded-xl p-4 text-white focus:border-emerald-500">
                        {Object.entries(STRATEGY_TYPE_TO_CODE_MAP).map(([name, code]) => <option key={code} value={code}>{name}</option>)}
                     </select>
                   </div>
                )}
                <CommonBacktestInputs data={activeTab === 'single' ? formData : comboData} onChange={handleFormChange} options={{ symbolOptions: options.symbols, timeframeOptions: options.timeframes, modelOptions: options.models }} />
                <button type="submit" disabled={isSimulating} className="w-full py-6 bg-emerald-500 text-black font-black uppercase rounded-[1.5rem] hover:bg-emerald-400 disabled:opacity-50 transition-all shadow-[0_0_40px_rgba(16,185,129,0.2)]">
                  {isSimulating ? 'TRACING SIGNALS...' : '▶ EXECUTE DEPLOYMENT'}
                </button>
              </form>
            </div>
          </div>

          <div className="col-span-12 lg:col-span-8">
            {backtestResults.main ? (
               <div className="space-y-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                     <div className="p-6 bg-neutral-900/40 rounded-3xl border border-white/5 text-center">
                        <span className="text-[10px] text-neutral-500 uppercase font-black block mb-1">Return</span>
                        <span className="text-3xl font-black text-emerald-500">{backtestResults.main.metrics?.totalReturn.toFixed(2)}%</span>
                     </div>
                     <div className="p-6 bg-neutral-900/40 rounded-3xl border border-white/5 text-center">
                        <span className="text-[10px] text-neutral-500 uppercase font-black block mb-1">Total Trades</span>
                        <span className="text-3xl font-black text-white">{backtestResults.main.metrics?.totalTrades}</span>
                     </div>
                     <div className="p-6 bg-neutral-900/40 rounded-3xl border border-white/5 text-center">
                        <span className="text-[10px] text-neutral-500 uppercase font-black block mb-1">Win Rate</span>
                        <span className="text-3xl font-black text-teal-400">{backtestResults.main.metrics?.winRate?.toFixed(1)}%</span>
                     </div>
                     <button onClick={downloadCSV} className="p-6 bg-emerald-500/10 rounded-3xl border border-emerald-500/20 text-center hover:bg-emerald-500/20 transition-all">
                        <span className="text-[10px] text-emerald-500 uppercase font-black block mb-1">Export</span>
                        <span className="text-xl font-black text-white">DOWNLOAD CSV</span>
                     </button>
                  </div>

                  <div className="bot-card bg-neutral-900/20 rounded-[2.5rem] border border-white/5 p-8">
                      <div className="flex justify-between items-center mb-8">
                          <h3 className="text-xs font-black uppercase text-neutral-500 tracking-widest">Signal Propagation Chart</h3>
                          <div className="flex bg-black p-1 rounded-xl border border-white/5">
                              <button onClick={() => setChartMode('standard')} className={`px-4 py-2 rounded-lg text-[9px] font-black ${chartMode === 'standard' ? 'bg-white/10 text-white' : 'text-white/30'}`}>STATIC</button>
                              <button onClick={() => setChartMode('replay')} className={`px-4 py-2 rounded-lg text-[9px] font-black ${chartMode === 'replay' ? 'bg-white/10 text-white' : 'text-white/30'}`}>REPLAY</button>
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
                  <MonthlyHeatmap equityCurve={backtestResults.main.equityCurve} />
               </div>
            ) : (
                <div className="h-full border-2 border-dashed border-white/5 rounded-[3rem] flex flex-col items-center justify-center p-20 text-center">
                   <div className="w-32 h-32 bg-emerald-500/5 border border-emerald-500/10 rounded-full flex items-center justify-center text-5xl mb-8 animate-pulse">📡</div>
                   <h3 className="text-2xl font-black text-white uppercase tracking-tighter italic">Engine Ready For Tracing</h3>
                   <p className="text-neutral-500 text-sm max-w-sm mt-4 font-medium leading-relaxed">Select institutional Alpha presets or configure custom signal logic to simulate historical performance.</p>
                </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
