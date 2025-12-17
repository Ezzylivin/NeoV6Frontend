// File: src/pages/Backtests.jsx
// 🚀 UPGRADE: v66.8 - "The Scoped & Synced Engine"
// 1. FIXED: ReferenceError by moving labelClass/inputClass to global scope.
// 2. FIXED: handleWinnerSelect logic for strategy mapping and rule synchronization.
// 3. INTEGRATED: Full institutional metrics engine and monthly performance heatmap.

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

// --- 🌍 GLOBAL SCOPE CONSTANTS ---
const COLORS = ["#10b981", "#ef4444", "#14b8a6", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4", "#22c55e"];
const REASON_COLORS = ["#10b981", "#f59e0b", "#06b6d4", "#ec4899", "#64748b"]; 

// 🛠 FIXED: Moved these out of sub-components to be accessible everywhere
const inputClass = "w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white focus:border-emerald-500 transition-colors text-sm";
const labelClass = "text-neutral-500 text-[10px] uppercase font-black mb-2 block tracking-widest";

const STRATEGY_TYPE_TO_CODE_MAP = {
  "Moving Average Crossover": "sma_crossover", "RSI": "rsi_divergence", "MACD": "macd_crossover",
  "Stochastic Oscillator": "stochastic_crossover", "CCI": "cci_oversold", "Bollinger Bands": "bollinger_bands",
  "ATR Breakout": "atr_breakout", "Ichimoku Cloud": "ichimoku_cloud"
};

const defaultFilterParams = { 
  minAtrPct: 0.1, 
  trendFilterPeriod: 200, 
  minAdxLevel: 10, 
  tslAtrMult: 3.5, 
  regime_threshold: 25, 
  hybridMode: "OR" 
};

// --- INSTITUTIONAL ANALYTICS ENGINE ---
const computeMetricsFromTrades = (trades, initialBalance) => {
    if (!trades || trades.length === 0) return null;
    
    let balance = initialBalance;
    let peak = initialBalance;
    let maxDrawdown = 0;
    let wins = 0;
    let totalWinVal = 0;
    let totalLossVal = 0;
    let currentLosingStreak = 0;
    let maxLosingStreak = 0;
    let totalHoldTimeMs = 0;
    let tradeReturns = [];

    trades.forEach(t => {
        const profit = t.profit;
        const prevBalance = balance;
        balance += profit;
        
        if (balance > peak) peak = balance;
        const dd = (peak - balance) / peak;
        if (dd > maxDrawdown) maxDrawdown = dd;

        if (profit > 0) {
            wins++;
            totalWinVal += profit;
            currentLosingStreak = 0;
        } else {
            totalLossVal += Math.abs(profit);
            currentLosingStreak++;
            if (currentLosingStreak > maxLosingStreak) maxLosingStreak = currentLosingStreak;
        }
        tradeReturns.push(profit / prevBalance);
        const entry = new Date(t.entryTime).getTime();
        const exit = new Date(t.exitTime).getTime();
        if (!isNaN(entry) && !isNaN(exit)) totalHoldTimeMs += (exit - entry);
    });

    const totalTrades = trades.length;
    const avgReturn = tradeReturns.reduce((a, b) => a + b, 0) / totalTrades;
    const stdDev = Math.sqrt(tradeReturns.reduce((a, b) => a + Math.pow(b - avgReturn, 2), 0) / totalTrades);
    const downsideStdDev = Math.sqrt(tradeReturns.filter(r => r < 0).reduce((a, b) => a + Math.pow(b, 2), 0) / (tradeReturns.filter(r => r < 0).length || 1));

    return {
        totalReturn: ((balance - initialBalance) / initialBalance) * 100,
        finalBalance: balance,
        totalTrades,
        winRate: (wins / totalTrades) * 100,
        profitFactor: totalLossVal === 0 ? totalWinVal : totalWinVal / totalLossVal,
        maxDrawdown: maxDrawdown * 100,
        calmarRatio: (maxDrawdown === 0) ? 0 : (((balance - initialBalance) / initialBalance) / maxDrawdown),
        sharpeRatio: stdDev === 0 ? 0 : (avgReturn / stdDev) * Math.sqrt(252),
        sortinoRatio: downsideStdDev === 0 ? 0 : (avgReturn / downsideStdDev) * Math.sqrt(252),
        expectancy: (wins/totalTrades * (totalWinVal/(wins || 1))) - ((1 - wins/totalTrades) * (totalLossVal/(totalTrades-wins || 1))),
        avgWin: totalWinVal / (wins || 1),
        avgLoss: totalLossVal / (totalTrades - wins || 1),
        maxLosingStreak,
        avgHoldTime: totalHoldTimeMs / totalTrades / (1000 * 60 * 60)
    };
};

// --- UI SUB-COMPONENTS ---
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
            <h3 className="text-xs font-black uppercase text-neutral-500 mb-6 tracking-widest">Performance Heatmap</h3>
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
    const safeVal = (v) => (v === null || v === undefined || isNaN(v)) ? '' : v;
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div><label className={labelClass}>Asset Symbol</label><select name="symbol" value={data.symbol} onChange={onChange} className={inputClass}>{options.symbolOptions?.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
          <div><label className={labelClass}>Timeframe</label><select name="timeframe" value={data.timeframe} onChange={onChange} className={inputClass}>{options.timeframeOptions?.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
        </div>
        <div className="bot-card bg-emerald-500/5 border-emerald-500/10 p-5 rounded-2xl">
          <h4 className="text-emerald-400 font-bold text-xs uppercase mb-4 tracking-tighter">⚡ Risk & AI</h4>
          <div className="grid grid-cols-2 gap-4">
            <div><label className={labelClass}>Risk %</label><input type="number" name="riskPercentage" value={safeVal(data.riskPercentage)} onChange={onChange} step="0.1" className={inputClass} /></div>
            <div><label className={labelClass}>Rule (OR/AND)</label><select name="param_hybridMode" value={data.params?.hybridMode || "OR"} onChange={onChange} className={inputClass}><option value="AND">Strict</option><option value="OR">Loose</option></select></div>
            <div className="col-span-2 grid grid-cols-2 gap-4">
                <div><label className={labelClass}>ML Model</label><select name="mlModel" value={data.mlModel} onChange={onChange} className={inputClass}>{options.modelOptions?.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</select></div>
                <div><label className={labelClass}>Threshold</label><input type="number" name="mlThreshold" value={safeVal(data.mlThreshold)} onChange={onChange} step="0.05" className={inputClass} /></div>
            </div>
          </div>
        </div>
        <div className="bot-card bg-neutral-900/50 border-white/5 p-5 rounded-2xl">
          <h4 className="text-white/60 font-bold text-xs uppercase mb-4 tracking-tighter">⚙️ Filters</h4>
          <div className="grid grid-cols-2 gap-x-4 gap-y-6">
            <div><label className={labelClass}>Min ATR %</label><input type="number" name="param_minAtrPct" value={safeVal(data.params?.minAtrPct)} onChange={onChange} className={inputClass} /></div>
            <div><label className={labelClass}>Min ADX</label><input type="number" name="param_minAdxLevel" value={safeVal(data.params?.minAdxLevel)} onChange={onChange} className={inputClass} /></div>
            <div><label className={labelClass}>TSL Mult</label><input type="number" name="param_tslAtrMult" value={safeVal(data.params?.tslAtrMult)} onChange={onChange} className={inputClass} /></div>
            <div><label className={labelClass}>Trend SMA</label><input type="number" name="param_trendFilterPeriod" value={safeVal(data.params?.trendFilterPeriod)} onChange={onChange} className={inputClass} /></div>
          </div>
        </div>
      </div>
    );
};

// --- MASTER COMPONENT ---
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
      setActiveTab('combo');
      setComboData(prev => ({
          ...prev, symbol: data.symbol || "BTC-USD", timeframe: data.timeframe || "1h", strategies: strategies,
          mlMode: data.mlMode || "predictions", params: { ...prev.params, ...data.params },
          comboConfig: { strategyCodes: strategies.map(s => s.code), combinationRule: data.params?.hybridMode || "OR" }
      }));
  };

  const handleRun = async (e) => {
    e.preventDefault();
    setIsSimulating(true);
    setBacktestResults({ main: null });
    const source = activeTab === 'single' ? formData : comboData;
    const payload = {
        ...source,
        comboConfig: {
            strategyCodes: activeTab === 'single' ? [source.code] : source.strategies.map(s => s.code),
            combinationRule: source.params?.hybridMode || 'OR'
        }
    };
    try {
      const runFn = activeTab === 'single' ? runNewBacktest : runComboBacktest;
      const res = await runFn?.(payload);
      if (res) {
          const mainRes = res.combinedResult || res;
          mainRes.metrics = computeMetricsFromTrades(mainRes.tradeBreakdown || [], source.initialBalance);
          setBacktestResults({ main: mainRes });
      }
    } catch (err) { console.error(err); } finally { setIsSimulating(false); }
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
    <div className="min-h-screen bg-black text-white p-6 font-sans">
      <div className="max-w-[1700px] mx-auto">
        <div className="grid grid-cols-12 gap-8">
          <div className="col-span-12 lg:col-span-4 space-y-6">
            <div className="bot-card bg-[#080808] border border-white/5 p-8 rounded-[3rem]">
              <div className="flex bg-black p-1 rounded-2xl mb-8 border border-white/5">
                <button onClick={() => setActiveTab('single')} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase ${activeTab === 'single' ? 'bg-emerald-500 text-black' : 'text-white/40'}`}>Single</button>
                <button onClick={() => setActiveTab('combo')} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase ${activeTab === 'combo' ? 'bg-emerald-500 text-black' : 'text-white/40'}`}>Combo</button>
              </div>
              <div className="mb-8 p-5 bg-emerald-500/5 rounded-3xl border border-emerald-500/10">
                <label className={labelClass}>🏆 Strategy Vault</label>
                <select value={selectedWinnerId} onChange={handleWinnerSelect} className="w-full bg-black border border-white/10 rounded-xl p-3 text-white">
                  <option value="">-- Choose Winner --</option>
                  {liveWinners.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>
              </div>
              <form onSubmit={handleRun} className="space-y-6">
                {activeTab === 'single' && (
                   <div><label className={labelClass}>Signal Logic</label><select name="code" value={formData.code} onChange={handleFormChange} className="w-full bg-black border border-white/10 rounded-xl p-4 text-white">{Object.entries(STRATEGY_TYPE_TO_CODE_MAP).map(([name, code]) => <option key={code} value={code}>{name}</option>)}</select></div>
                )}
                <CommonBacktestInputs data={activeTab === 'single' ? formData : comboData} onChange={handleFormChange} options={{ symbolOptions: options.symbols, timeframeOptions: options.timeframes, modelOptions: options.models }} />
                <button type="submit" disabled={isSimulating} className="w-full py-6 bg-emerald-500 text-black font-black uppercase rounded-[1.5rem] hover:bg-emerald-400">
                  {isSimulating ? 'SIMULATING...' : '▶ RUN BACKTEST'}
                </button>
              </form>
            </div>
          </div>
          <div className="col-span-12 lg:col-span-8">
            {backtestResults.main ? (
               <div className="space-y-6 animate-in fade-in duration-1000">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                     <div className="p-6 bg-neutral-900/40 rounded-[2rem] border border-white/5 text-center"><span className={labelClass}>Return</span><span className={`text-3xl font-black ${backtestResults.main.metrics?.totalReturn >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>{backtestResults.main.metrics?.totalReturn.toFixed(2)}%</span></div>
                     <div className="p-6 bg-neutral-900/40 rounded-[2rem] border border-white/5 text-center"><span className={labelClass}>Profit Factor</span><span className="text-3xl font-black text-teal-400">{backtestResults.main.metrics?.profitFactor.toFixed(2)}</span></div>
                     <div className="p-6 bg-neutral-900/40 rounded-[2rem] border border-white/5 text-center"><span className={labelClass}>Max DD</span><span className="text-3xl font-black text-rose-500">{backtestResults.main.metrics?.maxDrawdown.toFixed(2)}%</span></div>
                     <div className="p-6 bg-neutral-900/40 rounded-[2rem] border border-white/5 text-center"><span className={labelClass}>Expectancy</span><span className="text-3xl font-black text-white">${backtestResults.main.metrics?.expectancy.toFixed(2)}</span></div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-4 bg-neutral-900/20 rounded-2xl border border-white/5 text-center"><span className="text-[9px] text-neutral-600 font-bold block">Sharpe</span><span className="text-xl font-bold">{backtestResults.main.metrics.sharpeRatio.toFixed(2)}</span></div>
                    <div className="p-4 bg-neutral-900/20 rounded-2xl border border-white/5 text-center"><span className="text-[9px] text-neutral-600 font-bold block">Sortino</span><span className="text-xl font-bold">{backtestResults.main.metrics.sortinoRatio.toFixed(2)}</span></div>
                    <div className="p-4 bg-neutral-900/20 rounded-2xl border border-white/5 text-center"><span className="text-[9px] text-neutral-600 font-bold block">Calmar</span><span className="text-xl font-bold">{backtestResults.main.metrics.calmarRatio.toFixed(2)}</span></div>
                  </div>
                  <div className="bot-card bg-neutral-900/20 rounded-[3rem] border border-white/5 p-8">
                      <div className="flex justify-between items-center mb-8">
                          <h3 className="text-xs font-black uppercase text-neutral-500 tracking-widest">Logic Trace Chart</h3>
                          <div className="flex bg-black p-1 rounded-xl border border-white/5">
                              <button onClick={() => setChartMode('standard')} className={`px-4 py-2 rounded-lg text-[9px] font-black ${chartMode === 'standard' ? 'bg-white/10 text-white' : 'text-white/30'}`}>STATIC</button>
                              <button onClick={() => setChartMode('replay')} className={`px-4 py-2 rounded-lg text-[9px] font-black ${chartMode === 'replay' ? 'bg-white/10 text-white' : 'text-white/30'}`}>REPLAY</button>
                          </div>
                      </div>
                      <div className="h-[600px] w-full">
                        {chartMode === 'standard' ? <ChartIndependent results={backtestResults.main} symbol={(activeTab === 'single' ? formData : comboData).symbol} /> : <ChartReplay results={backtestResults.main} symbol={(activeTab === 'single' ? formData : comboData).symbol} />}
                      </div>
                  </div>
                  <MonthlyHeatmap equityCurve={backtestResults.main.equityCurve} />
               </div>
            ) : (
                <div className="h-full border-2 border-dashed border-white/5 rounded-[3rem] flex flex-col items-center justify-center p-20 text-center">
                   <div className="w-32 h-32 bg-emerald-500/5 border border-emerald-500/10 rounded-full flex items-center justify-center text-5xl mb-8 animate-pulse">📊</div>
                   <h3 className="text-3xl font-black text-white uppercase tracking-tighter">System Idle</h3>
                   <p className="text-neutral-500 text-sm mt-4 font-medium max-w-sm">Load Institutional Presets or configure logic to simulate historical performance.</p>
                </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
