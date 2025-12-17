// File: src/pages/Backtests.jsx
// 🚀 UPGRADE: v66.3.2 - "The Full Institutional Interface"
// 1. RESTORED: All Advanced Filter inputs (ATR, ADX, TSL, Trend Filter).
// 2. FIXED: "Bulletproof" payload synchronization for Hybrid Logic (OR vs AND).
// 3. THEME: Strictly Jet Black & Emerald with high-visibility debug logs.

import React, { useState, useEffect, useMemo } from "react";
import { useBacktest } from "../hooks/useBacktest.js";
import { ChartIndependent } from "../components/ChartIndependent.jsx"; 
import api from "../api/apiClient"; 
import "./Backtests.css"; 

const STRATEGY_TYPE_TO_CODE_MAP = {
  "Moving Average Crossover": "sma_crossover", "RSI": "rsi_divergence", "MACD": "macd_crossover",
  "Stochastic Oscillator": "stochastic_crossover", "CCI": "cci_oversold", "Bollinger Bands": "bollinger_bands"
};

const defaultFilterParams = { 
    minAtrPct: 0.1, 
    trendFilterPeriod: 200, 
    minAdxLevel: 10, 
    tslAtrMult: 3.5, 
    regime_threshold: 25, 
    hybridMode: "OR" 
};

const initialFormData = {
  strategyId: "", code: "", symbol: "BTC-USD", timeframe: "1h", startDate: "2024-12-16", endDate: "2025-12-15",
  initialBalance: 1000, params: { ...defaultFilterParams },
  riskManagementMode: 'static', riskPercentage: 1, mlMode: "off", mlModel: "", mlThreshold: 0.5
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
              {options.symbolOptions.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>Timeframe</label>
            <select name="timeframe" value={data.timeframe} onChange={onChange} className={inputClass}>
              {options.timeframeOptions.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>

        <div className="bot-card bg-emerald-500/5 border-emerald-500/10 p-5 rounded-2xl">
          <h4 className="text-emerald-400 font-bold text-xs uppercase mb-4 tracking-tighter">⚡ Execution & Risk</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Risk % Per Trade</label>
              <input type="number" name="riskPercentage" value={safeVal(data.riskPercentage)} onChange={onChange} step="0.1" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Hybrid Combination</label>
              <select name="param_hybridMode" value={data.params?.hybridMode || "OR"} onChange={onChange} className={`${inputClass} border-emerald-500/30`}>
                <option value="AND">Strict (AND)</option>
                <option value="OR">Loose (OR)</option>
              </select>
            </div>
          </div>
        </div>

        {/* 🚀 RESTORED: ADVANCED FILTERS SECTION */}
        <div className="bot-card bg-neutral-900/50 border-white/5 p-5 rounded-2xl">
          <h4 className="text-white/60 font-bold text-xs uppercase mb-4 tracking-tighter">⚙️ Advanced Filters</h4>
          <div className="grid grid-cols-2 gap-x-4 gap-y-6">
            <div>
              <label className={labelClass}>Min ATR %</label>
              <input type="number" name="param_minAtrPct" value={safeVal(data.params.minAtrPct)} onChange={onChange} step="0.01" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Min ADX Level</label>
              <input type="number" name="param_minAdxLevel" value={safeVal(data.params.minAdxLevel)} onChange={onChange} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>TSL ATR Mult</label>
              <input type="number" name="param_tslAtrMult" value={safeVal(data.params.tslAtrMult)} onChange={onChange} step="0.1" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Trend Filter SMA</label>
              <input type="number" name="param_trendFilterPeriod" value={safeVal(data.params.trendFilterPeriod)} onChange={onChange} className={inputClass} />
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
  const [backtestResults, setBacktestResults] = useState({ main: null });
  const [isSimulating, setIsSimulating] = useState(false); 

  const handleRun = async (e) => {
    e.preventDefault();
    setIsSimulating(true);

    // 🚀 BULLETPROOF SYNC: Forced re-mapping of payload keys
    const payload = {
        ...formData,
        comboConfig: {
            strategyCodes: [formData.code],
            combinationRule: formData.params.hybridMode || 'OR' // Explicit sync
        }
    };

    console.log("🚀 BACKTEST START", { rule: payload.comboConfig.combinationRule });

    try {
      const res = await runNewBacktest?.(payload);
      if (res) setBacktestResults({ main: res.combinedResult || res });
    } catch (err) { console.error("❌ ERROR", err); } 
    finally { setIsSimulating(false); }
  };

  const handleFormChange = (e) => {
    const { name, value, type } = e.target;
    let val = type === 'number' ? (isNaN(parseFloat(value)) ? '' : parseFloat(value)) : value;
    
    if (name.startsWith("param_")) {
        const key = name.substring(6);
        setFormData(prev => ({ ...prev, params: { ...prev.params, [key]: val } }));
    } else {
        setFormData(prev => ({ ...prev, [name]: val }));
    }
  };

  return (
    <div className="min-h-screen bg-black text-white p-8 font-sans">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-12 gap-10">
          <div className="col-span-12 lg:col-span-5 space-y-8">
            <div className="bot-card bg-[#050505] border border-white/5 p-8 rounded-[2rem] shadow-2xl">
              <h2 className="text-2xl font-black uppercase italic tracking-tighter mb-8 text-emerald-500">Engine Configuration</h2>
              <form onSubmit={handleRun} className="space-y-6">
                <div className="mb-6">
                    <label className="text-neutral-500 text-[10px] uppercase font-black mb-2 block tracking-widest">Base Strategy</label>
                    <select name="code" value={formData.code} onChange={handleFormChange} className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white focus:border-emerald-500">
                        <option value="">-- Select Signal Logic --</option>
                        {Object.entries(STRATEGY_TYPE_TO_CODE_MAP).map(([name, code]) => <option key={code} value={code}>{name}</option>)}
                    </select>
                </div>
                <CommonBacktestInputs 
                    data={formData} 
                    onChange={handleFormChange} 
                    options={{ 
                        symbolOptions: options.symbols || ["BTC-USD", "ETH-USD"], 
                        timeframeOptions: options.timeframes || ["1h", "4h", "1d"] 
                    }} 
                />
                <button type="submit" disabled={isSimulating} className="w-full py-5 bg-emerald-500 text-black font-black uppercase rounded-2xl hover:bg-emerald-400 disabled:opacity-50 transition-all">
                  {isSimulating ? 'Processing...' : '▶ Run Simulation'}
                </button>
              </form>
            </div>
          </div>

          <div className="col-span-12 lg:col-span-7">
            {backtestResults.main ? (
               <div className="bot-card h-full bg-neutral-900/20 rounded-[2rem] border border-white/5 p-8">
                  <div className="grid grid-cols-2 gap-4 mb-8">
                     <div className="p-6 bg-black rounded-2xl border border-white/5 text-center">
                        <span className="text-[10px] text-neutral-500 uppercase font-bold block mb-1">Return</span>
                        <span className="text-3xl font-black text-emerald-500">{backtestResults.main.metrics?.totalReturn.toFixed(2)}%</span>
                     </div>
                     <div className="p-6 bg-black rounded-2xl border border-white/5 text-center">
                        <span className="text-[10px] text-neutral-500 uppercase font-bold block mb-1">Trades</span>
                        <span className="text-3xl font-black text-white">{backtestResults.main.metrics?.totalTrades}</span>
                     </div>
                  </div>
                  <div className="h-[500px]">
                    <ChartIndependent results={backtestResults.main} symbol={formData.symbol} />
                  </div>
               </div>
            ) : (
                <div className="h-full border-2 border-dashed border-white/5 rounded-[2rem] flex flex-col items-center justify-center p-12 text-center">
                   <div className="w-20 h-20 bg-emerald-500/10 rounded-3xl flex items-center justify-center text-4xl mb-6">⚙️</div>
                   <h3 className="text-xl font-bold text-white/50 uppercase tracking-tight">Ready for Deployment</h3>
                   <p className="text-neutral-600 text-sm max-w-xs mt-2">Adjust your institutional parameters and click run to generate signal history.</p>
                </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
