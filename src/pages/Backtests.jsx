// File: src/pages/Backtests.jsx
// 🚀 UPGRADE: v66.2 - "Debug & Trace Mode"
// 1. ADDED: Strategic console logs for payload tracking and state transitions.
// 2. THEME: Strictly Jet Black & Emerald (Teal accents).

import React, { useState, useEffect, useMemo, useRef } from "react";
import axios from "axios"; 
import { useBacktest } from "../hooks/useBacktest.js";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, AreaChart, Area
} from "recharts";
import { ChartIndependent } from "../components/ChartIndependent.jsx"; 
import { ChartReplay } from "../components/ChartReplay.jsx"; 
import api from "../api/apiClient"; 
import "./Backtests.css"; 

// 🎨 THEME: Emerald & Teal Palette
const COLORS = ["#10b981", "#ef4444", "#14b8a6", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4", "#22c55e"];
const REASON_COLORS = ["#10b981", "#f59e0b", "#06b6d4", "#ec4899", "#64748b"]; 

const STRATEGY_TYPE_TO_CODE_MAP = {
  "Moving Average Crossover": "sma_crossover", "RSI": "rsi_divergence", "MACD": "macd_crossover",
  "Stochastic Oscillator": "stochastic_crossover", "CCI": "cci_oversold", "Bollinger Bands": "bollinger_bands",
  "Ichimoku Cloud": "ichimoku_cloud", "ATR": "atr_breakout", "On-Balance Volume": "obv_signal", "Parabolic SAR": "psar_signal"
};

const defaultFilterParams = { minAtrPct: 0, trendFilterPeriod: 200, minAdxLevel: 0, tslAtrMult: 3.5, regime_threshold: 25 };

// --- HELPER FUNCTIONS ---
const safeNum = (v, def = 0) => {
    const n = Number(v);
    return isNaN(n) ? def : n;
};

const formatDate = dateString => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return isNaN(date.getTime()) ? '' : date.toISOString().split('T')[0];
};

const formatChartDate = timestamp => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return isNaN(date.getTime()) ? '' : `${date.getMonth()+1}/${date.getDate()}`;
};

const getDefaultDates = () => {
  const today = new Date();
  const start = new Date(today); start.setFullYear(today.getFullYear() - 1);
  const end = new Date(today); end.setDate(today.getDate() - 1);
  return { startDate: formatDate(start), endDate: formatDate(end) };
};

const downloadCSV = (trades) => {
    console.log("💾 Exporting trades to CSV...", trades);
    if (!trades || trades.length === 0) return alert("No trades to export.");
    const headers = ["Entry Time", "Exit Time", "Type", "Entry Price", "Exit Price", "Profit", "Reason"];
    const rows = trades.map(t => [t.entryTime, t.exitTime, t.position, t.price, t.exitPrice, t.profit.toFixed(2), t.type]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a"); link.setAttribute("href", encodedUri); link.setAttribute("download", "backtest_trades.csv");
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
};

// 🚀 METRICS CALCULATION
const computeMetricsFromTrades = (trades, initialBalance) => {
    console.log("🧮 Computing metrics for trades:", trades.length);
    if (!trades || trades.length === 0) return null;
    
    let balance = initialBalance;
    let peak = initialBalance;
    let maxDrawdown = 0;
    let wins = 0;
    let totalWin = 0;
    let totalLoss = 0;
    let currentLosingStreak = 0;
    let maxLosingStreak = 0;
    let totalHoldTimeMs = 0;

    let dailyReturns = [];

    trades.forEach(t => {
        const prevBalance = balance;
        balance += t.profit;
        
        if (balance > peak) peak = balance;
        const dd = (peak - balance) / peak;
        if (dd > maxDrawdown) maxDrawdown = dd;

        if (t.profit > 0) {
            wins++;
            totalWin += t.profit;
            currentLosingStreak = 0;
        } else {
            totalLoss += Math.abs(t.profit);
            currentLosingStreak++;
            if (currentLosingStreak > maxLosingStreak) maxLosingStreak = currentLosingStreak;
        }

        const entry = new Date(t.entryTime).getTime();
        const exit = new Date(t.exitTime).getTime();
        if (!isNaN(entry) && !isNaN(exit)) {
            totalHoldTimeMs += (exit - entry);
        }

        const ret = (balance - prevBalance) / prevBalance;
        dailyReturns.push(ret);
    });

    const totalTrades = trades.length;
    const winRate = (wins / totalTrades) * 100;
    const profitFactor = totalLoss === 0 ? totalWin : totalWin / totalLoss;
    const totalReturn = ((balance - initialBalance) / initialBalance) * 100;
    
    const avgWin = wins > 0 ? totalWin / wins : 0;
    const avgLoss = (totalTrades - wins) > 0 ? totalLoss / (totalTrades - wins) : 0;
    const sharpe = 0; // Simplified
    const avgHoldTimeHours = totalHoldTimeMs / totalTrades / (1000 * 60 * 60);

    const results = {
        totalReturn,
        profitFactor,
        maxDrawdown: maxDrawdown * 100,
        winRate,
        totalTrades,
        winningTrades: wins,
        losingTrades: totalTrades - wins,
        averageWin: avgWin,
        averageLoss: avgLoss,
        finalBalance: balance,
        expectancy: (wins/totalTrades * avgWin) - ((1 - wins/totalTrades) * avgLoss),
        sharpeRatio: sharpe,
        maxLosingStreak,
        avgHoldTime: avgHoldTimeHours
    };
    console.log("📈 Final Metrics Computed:", results);
    return results;
};


// --- INITIAL STATES ---
const initialFormData = {
  strategyId: "", code: "", symbol: "", timeframe: "", startDate: getDefaultDates().startDate, endDate: getDefaultDates().endDate,
  initialBalance: 1000, params: { ...defaultFilterParams, maxPyramiding: 1 },
  riskManagementMode: 'static', riskPercentage: 1, growthCapitalTarget: 2000, 
  mlMode: "off", mlModel: "", mlThreshold: 0.5, mlHorizon: 1
};

const initialComboData = {
  strategies: [ { strategyId: "", code: "", params: { tslAtrMult: 3.5 } }, { strategyId: "", code: "" } ],
  params: { ...defaultFilterParams, maxPyramiding: 1 }, 
  comboConfig: { strategyCodes: [], combinationRule: 'AND' },
  symbol: "", timeframe: "", startDate: getDefaultDates().startDate, endDate: getDefaultDates().endDate, initialBalance: 1000,
  riskManagementMode: 'static', riskPercentage: 1, growthCapitalTarget: 2000, 
  mlMode: "off", mlModel: "", mlThreshold: 0.5, mlHorizon: 1
};

// --- SUB-COMPONENTS ---
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
        <div className="bot-card" style={{marginTop:'24px'}}>
            <div className="panel-header flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-emerald-500/20 to-teal-500/20 rounded-xl flex items-center justify-center text-xl">📅</div>
                <h3 className="card-title">Monthly Heatmap</h3>
            </div>
            <div className="metrics-grid" style={{gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))'}}>
                {Object.keys(monthlyReturns).sort().map(month => {
                    const data = monthlyReturns[month];
                    const ret = ((data.end - data.start) / data.start) * 100;
                    const bg = ret >= 0 ? `rgba(16, 185, 129, 0.1)` : `rgba(239, 68, 68, 0.1)`;
                    const borderColor = ret >= 0 ? 'border-emerald-500/30' : 'border-rose-500/30';
                    return (
                        <div key={month} className={`border ${borderColor} rounded-xl p-4 text-center hover:scale-105 transition-all`} style={{backgroundColor: bg}}>
                            <div className="text-neutral-400 text-xs mb-2">{month}</div>
                            <div className={`font-mono ${ret > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {ret > 0 ? '+' : ''}{ret.toFixed(2)}%
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    );
};

const MetricsDisplay = ({ metrics }) => {
  if (!metrics) return null;
  const items = [
    { label: "Total Return", value: metrics.totalReturn, format: 'percent', color: 'text-emerald-400' },
    { label: "Profit Factor", value: metrics.profitFactor, format: 'number', color: 'text-teal-400' },
    { label: "Max Drawdown", value: metrics.maxDrawdown, format: 'percent', color: 'text-amber-400' },
    { label: "Win Rate", value: metrics.winRate, format: 'percent', color: 'text-violet-400' },
    { label: "Total Trades", value: metrics.totalTrades, format: null, color: 'text-cyan-400' },
    { label: "Avg. Win", value: metrics.averageWin, format: 'currency', color: 'text-emerald-400' },
    { label: "Avg. Loss", value: metrics.averageLoss, format: 'currency', color: 'text-rose-400' },
    { label: "Final Balance", value: metrics.finalBalance, format: 'currency', color: 'text-emerald-400' }
  ];
  return (
    <div className="metrics-grid mb-6">
      {items.map((m, idx) => {
        const displayValue = m.format === 'currency' ? `$${m.value?.toFixed(2)}` : m.format === 'percent' ? `${m.value?.toFixed(2)}%` : m.value?.toFixed(2);
        return (
          <div key={idx} className="metric-item hover:shadow-lg transition-all group">
            <span className="metric-label">{m.label}</span>
            <div className={`metric-value ${m.color}`}>{displayValue}</div>
          </div>
        );
      })}
    </div>
  );
};

const AdvancedMetricsDisplay = ({ metrics }) => {
    if (!metrics) return null;
    const items = [
        { label: "Sharpe Ratio", value: metrics.sharpeRatio?.toFixed(2), desc: "Risk-Adjusted Return", color: 'text-white' },
        { label: "Expectancy", value: `$${metrics.expectancy?.toFixed(2)}`, desc: "Avg Value Per Trade", color: 'text-white' },
        { label: "Avg Hold Time", value: `${metrics.avgHoldTime?.toFixed(1)}h`, desc: "Duration in Market", color: 'text-white' },
        { label: "Max Lose Streak", value: metrics.maxLosingStreak, desc: "Consecutive Losses", color: "text-rose-400" }
    ];
    return (
        <div className="metrics-grid mb-6" style={{gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))'}}>
            {items.map((m, idx) => (
                <div key={idx} className="metric-item flex flex-col items-center justify-center text-center">
                    <span className="metric-label mb-1">{m.label}</span>
                    <div className={`text-xl font-mono font-bold ${m.color}`}>{m.value}</div>
                    <span className="text-neutral-500 text-[10px] mt-1">{m.desc}</span>
                </div>
            ))}
        </div>
    );
};

const CommonBacktestInputs = ({ data, onChange, options }) => {
    const inputClass = "w-full bg-[#0a0a0a] border border-white/10 rounded-xl px-4 py-3 text-white focus:border-emerald-500 transition-colors";
    const safeVal = (v) => (v === null || v === undefined || isNaN(v)) ? '' : v;

    return (
      <>
        <div className="form-grid mb-6">
          <div className="setup-selector">
            <label className="text-neutral-400">Symbol</label>
            <select name="symbol" value={data.symbol || ""} onChange={onChange} className={inputClass}>
              <option value="">-- Select Symbol --</option>
              {options.symbolOptions.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="setup-selector">
            <label className="text-neutral-400">Timeframe</label>
            <select name="timeframe" value={data.timeframe || ""} onChange={onChange} className={inputClass}>
              <option value="">-- Select Timeframe --</option>
              {options.timeframeOptions.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="setup-selector">
            <label className="text-neutral-400">Initial Balance</label>
            <input type="number" name="initialBalance" value={safeVal(data.initialBalance)} onChange={onChange} className={inputClass} />
          </div>
        </div>
        
        <div className="form-grid mb-6" style={{gridTemplateColumns: '1fr 1fr'}}>
          <div className="setup-selector">
            <label className="text-neutral-400">Start Date</label>
            <input type="date" name="startDate" value={data.startDate || ""} onChange={onChange} className={inputClass} />
          </div>
          <div className="setup-selector">
            <label className="text-neutral-400">End Date</label>
            <input type="date" name="endDate" value={data.endDate || ""} onChange={onChange} className={inputClass} />
          </div>
        </div>
        
        <div className="bot-card mb-6" style={{background: 'rgba(16, 185, 129, 0.05)', borderColor: 'rgba(16, 185, 129, 0.2)'}}>
          <div className="panel-header mb-4 pb-3 border-b border-emerald-500/20">
            <h4 className="text-emerald-400 font-bold">Risk & ML Configuration</h4>
          </div>
          <div className="form-grid">
            <div className="setup-selector">
              <label className="text-neutral-400">Risk Mode</label>
              <select name="riskManagementMode" value={data.riskManagementMode || 'static'} onChange={onChange} className={inputClass}>
                <option value="static">Standard (Static %)</option>
                <option value="dynamic">Dynamic (Growth Target)</option>
              </select>
            </div>
            <div className="setup-selector">
              <label className="text-neutral-400">Risk Percentage</label>
              <input type="number" name="riskPercentage" value={safeVal(data.riskPercentage)} onChange={onChange} step="0.1" className={inputClass} />
            </div>
            <div className="setup-selector">
              <label className="text-neutral-400">ML Mode</label>
              <select name="mlMode" value={data.mlMode || "off"} onChange={onChange} className={inputClass}>
                <option value="off">Off (Pure TA)</option>
                <option value="predictions">Hybrid (TA+ML)</option>
                <option value="on">Pure ML</option>
              </select>
            </div>
            {data.mlMode !== 'off' && (
              <>
                <div className="setup-selector">
                  <label className="text-neutral-400">ML Model</label>
                  <select name="mlModel" value={data.mlModel || ""} onChange={onChange} className={inputClass}>
                    <option value="">-- Select Model --</option>
                    {options.modelOptions.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </div>
                <div className="setup-selector">
                  <label className="text-neutral-400">ML Threshold</label>
                  <input type="number" name="mlThreshold" value={safeVal(data.mlThreshold)} step="0.05" onChange={onChange} className={inputClass} />
                </div>
              </>
            )}
          </div>
        </div>
      </>
    );
};

// --- MAIN PAGE COMPONENT ---
export default function Backtests() {
  const { state, runNewBacktest, runComboBacktest, resetBacktest } = useBacktest(); 
  const { loading = 'idle', error = null, options = {}, winners = [] } = state || {};

  const [selectedWinnerId, setSelectedWinnerId] = useState("");
  const [formData, setFormData] = useState(initialFormData);
  const [comboData, setComboData] = useState(initialComboData);
  const [backtestResults, setBacktestResults] = useState({ main: null });
  const [activeTab, setActiveTab] = useState('single');
  const [liveWinners, setLiveWinners] = useState([]);
  const [scanningWinners, setScanningWinners] = useState(false);
  const [chartMode, setChartMode] = useState('standard'); 
  const [isSimulating, setIsSimulating] = useState(false); 

  const strategyOptions = useMemo(() => {
    const dbStrats = options?.strategies || [];
    const baseStrats = Object.entries(STRATEGY_TYPE_TO_CODE_MAP).map(([name, code], idx) => ({ _id: `base-${code}-${idx}`, name, code, params: {} }));
    return [...baseStrats, ...dbStrats.map(s => ({...s, code: STRATEGY_TYPE_TO_CODE_MAP[s.params?.strategyType] || "unknown"}))];
  }, [options]);
  
  const symbolOptions = useMemo(() => options?.symbols || [], [options]);
  const timeframeOptions = useMemo(() => options?.timeframes || [], [options]);
  const modelOptions = useMemo(() => options?.models || [], [options]);

  const fetchWinners = async () => {
      console.log("🔍 Scanning for Alpha strategies...");
      setScanningWinners(true);
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get("https://neov6backend.onrender.com/api/bot/winners", { headers: { Authorization: `Bearer ${token}` } });
        if (res.data) {
            console.log("🏆 Winners Found:", res.data.length);
            setLiveWinners(res.data);
        }
      } catch (err) { console.error("❌ Error fetching winners:", err); } 
      finally { setScanningWinners(false); }
  };
  useEffect(() => { fetchWinners(); }, []);

  const handleWinnerSelect = (e) => {
      const filename = e.target.value;
      console.log("🎯 Winner Selected:", filename);
      if (!filename) return;

      setSelectedWinnerId(filename);
      const selectedWinner = liveWinners.find(w => w.id === filename);
      if (!selectedWinner) return;

      // Reset charts immediately on load
      setBacktestResults({ main: null });

      const data = selectedWinner.config || selectedWinner;
      const rootParams = data.params || {};

      let symbol = data.symbol || "BTC-USD";
      let timeframe = data.timeframe || "1h";
      
      const strategies = (Array.isArray(data.strategies) ? data.strategies : []).map(s => {
          const code = s.code || "unknown";
          const matchedOption = strategyOptions.find(opt => opt.code === code);
          return { strategyId: matchedOption ? matchedOption._id : "", code, params: s.params || {} };
      });

      console.log("📝 Populating inputs for:", filename);
      setActiveTab('combo');
      setComboData(prev => ({
          ...prev, symbol, timeframe, isCombo: true, strategies,
          mlMode: data.mlMode || rootParams.mlMode || "predictions",
          mlModel: data.mlModel || rootParams.mlModel || "btc_1h_lightgbm_model",
          mlThreshold: safeNum(data.mlThreshold || rootParams.mlThreshold, 0.5),
          params: { ...rootParams, riskPercentage: safeNum(data.riskPercentage, 1), maxPyramiding: safeNum(rootParams.maxPyramiding, 1) }
      }));
  };

  const handleRun = async (e, isCombo) => {
    e.preventDefault();
    const payload = isCombo ? comboData : formData;
    
    console.log("🚀 STARTING BACKTEST SIMULATION");
    console.log("📤 Payload being sent:", JSON.stringify(payload, null, 2));

    setBacktestResults({ main: null });
    setIsSimulating(true); 
    
    try {
      const res = isCombo ? await runComboBacktest?.(payload) : await runNewBacktest?.(payload);
      console.log("📥 Raw Server Response:", res);

      if (res) {
          const finalResult = res.combinedResult ? res.combinedResult : res;
          console.log("✅ Simulation Complete. Strategy Results:", finalResult.metrics);
          setBacktestResults({ main: finalResult });
      } else {
          console.warn("⚠ Server returned empty response.");
      }
    } catch (err) { 
        console.error("❌ Backtest Execution Error:", err); 
    } finally {
        setIsSimulating(false); 
    }
  };

  const handleFormChange = (e, setFunc) => {
    const { name, value, type } = e.target;
    let val = type === 'number' ? (isNaN(parseFloat(value)) ? '' : parseFloat(value)) : value;
    
    console.log(`Input Changed: ${name} ->`, val);

    if (name === 'strategyId') { 
        const strat = strategyOptions.find(s => s._id === val);
        if (strat) setFunc(prev => ({ ...prev, strategyId: val, code: strat.code, params: { ...prev.params, ...strat.params } })); 
    } else if (name.startsWith("param_")) {
        setFunc(prev => ({ ...prev, params: { ...prev.params, [name.substring(6)]: val } }));
    } else {
        setFunc(prev => ({ ...prev, [name]: val }));
    }
  };

  const { processedData, combinedMetrics, mainResult, actualStartDate, actualEndDate } = useMemo(() => {
    const res = backtestResults.main;
    if (!res || !res.metrics) return { processedData: [], combinedMetrics: null, mainResult: null };

    console.log("🛠 Processing chart data for main result...");
    const curve = (res.equityCurve || []).map((p) => {
          const startPrice = res.candleData?.[0]?.close || 1; 
          const currentPrice = res.candleData?.find(c => new Date(c.time || c.timestamp).getTime() === new Date(p.timestamp).getTime())?.close || startPrice;
          return { timestamp: new Date(p.timestamp).getTime(), balance: p.balance, buyHold: (currentPrice / startPrice) * (activeTab === 'single' ? formData.initialBalance : comboData.initialBalance) };
    });

    const recomputedMetrics = computeMetricsFromTrades(res.tradeBreakdown || [], activeTab === 'single' ? formData.initialBalance : comboData.initialBalance);

    const reasons = (res.tradeBreakdown || []).reduce((acc, t) => {
        acc[t.type || "Signal"] = (acc[t.type || "Signal"] || 0) + 1;
        return acc;
    }, {});
    
    return { 
        processedData: curve, 
        combinedMetrics: recomputedMetrics, 
        mainResult: { ...res, metrics: recomputedMetrics }, 
        exitReasonData: Object.entries(reasons).map(([name, value]) => ({ name, value })),
        actualStartDate: res.equityCurve?.[0]?.timestamp || (activeTab === 'single' ? formData.startDate : comboData.startDate),
        actualEndDate: res.equityCurve?.[res.equityCurve.length - 1]?.timestamp || (activeTab === 'single' ? formData.endDate : comboData.endDate)
    };
  }, [backtestResults]);

  const pieData = useMemo(() => combinedMetrics ? [{ name: "Wins", value: combinedMetrics.winningTrades }, { name: "Losses", value: combinedMetrics.losingTrades }] : [], [combinedMetrics]);

  return (
    <div className="backtest-container">
      <div className="container mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl shadow-lg shadow-emerald-500/20"><span className="text-2xl">📈</span></div>
              <div><h1 className="header mb-0" style={{fontSize:'2rem'}}>Strategy Backtester</h1><p className="text-neutral-400 text-sm">Advanced Performance Testing Platform</p></div>
            </div>
            <div className="px-4 py-2 bg-black/50 rounded-xl border border-white/10"><span className="text-neutral-400 text-sm">API Connected</span><span className="ml-2 w-2 h-2 bg-emerald-500 rounded-full inline-block animate-pulse"></span></div>
          </div>

          <div className="grid grid-cols-12 gap-8">
            {/* Left Column */}
            <div className="col-span-12 lg:col-span-5">
              <div className="bot-card sticky top-6">
                <div className="panel-header flex items-center gap-3"><span className="text-emerald-400 text-lg">⚙️</span><h2 className="card-title">Configuration</h2></div>
                
                <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-500/30 rounded-xl p-4 mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-emerald-400 font-semibold text-sm">🏆 Load Alpha Strategy</label>
                    <button onClick={fetchWinners} disabled={scanningWinners} className="text-emerald-400 disabled:opacity-50">{scanningWinners ? '...' : '🔄'}</button>
                  </div>
                  <select value={selectedWinnerId} onChange={handleWinnerSelect} className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl px-4 py-3 text-white focus:border-emerald-500">
                    <option value="">-- Select Golden Strategy --</option>
                    {liveWinners.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                  </select>
                </div>

                <div className="tabs">
                  <button className={activeTab === 'single' ? 'active' : ''} onClick={() => setActiveTab('single')}>Single Strategy</button>
                  <button className={activeTab === 'combo' ? 'active' : ''} onClick={() => setActiveTab('combo')}>Combo Strategy</button>
                </div>

                <form onSubmit={(e) => handleRun(e, activeTab === 'combo')}>
                  <CommonBacktestInputs data={activeTab === 'single' ? formData : comboData} onChange={(e) => handleFormChange(e, activeTab === 'single' ? setFormData : setComboData)} options={{ symbolOptions, timeframeOptions, modelOptions }} />
                  <button type="submit" disabled={isSimulating} className="button-start">{isSimulating ? 'Simulating...' : '▶ Run Simulation'}</button>
                </form>
              </div>
            </div>

            {/* Right Column */}
            <div className="col-span-12 lg:col-span-7 space-y-6">
              {isSimulating ? (
                <div className="bot-card p-12 flex flex-col items-center justify-center min-h-[400px]">
                  <div className="w-20 h-20 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mb-6"></div>
                  <h3 className="text-white text-xl font-bold">Executing Strategy...</h3>
                  <p className="text-neutral-400">Please check the browser console for live logs.</p>
                </div>
              ) : combinedMetrics ? (
                <>
                  <MetricsDisplay metrics={combinedMetrics} />
                  <AdvancedMetricsDisplay metrics={combinedMetrics} />
                  {mainResult && (
                    <div className="bot-card">
                      <div className="panel-header"><h3 className="card-title">Strategy Signal Chart</h3></div>
                      <div style={{height: '600px'}}>
                        <ChartIndependent results={mainResult} symbol={activeTab === 'single' ? formData.symbol : comboData.symbol} startDate={actualStartDate} endDate={actualEndDate} />
                      </div>
                    </div>
                  )}
                  <MonthlyHeatmap equityCurve={processedData} />
                </>
              ) : (
                <div className="bot-card p-12 flex flex-col items-center justify-center min-h-[600px]">
                  <div className="w-20 h-20 bg-emerald-500/10 rounded-2xl flex items-center justify-center mb-6 text-4xl">🏆</div>
                  <h3 className="text-white text-xl font-bold">Ready to Start</h3>
                  <p className="text-neutral-400 text-center max-w-md">Configure parameters or load a Winner, then click Run.</p>
                </div>
              )}
            </div>
          </div>
      </div>
    </div>
  );
}
