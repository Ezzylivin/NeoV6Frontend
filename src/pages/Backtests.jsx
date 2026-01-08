import React, { useState, useEffect, useMemo } from "react";
import axios from "axios"; 
import { useBacktest } from "../hooks/useBacktest.js";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
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
  "Ichimoku Cloud": "ichimoku_cloud", "ATR": "atr_breakout", "On-Balance Volume": "obv_signal", "Parabolic SAR": "psar_signal"
};

const DEFAULT_MODEL_OPTIONS = [
    { id: "btc_1h_xgboost", name: "BTC 1H XGBoost" },
    { id: "btc_1h_lightgbm", name: "BTC 1H LightGBM" },
    { id: "eth_1h_transformer", name: "ETH 1H Transformer" },
    { id: "sol_15m_lstm", name: "SOL 15m LSTM" }
];

const defaultFilterParams = { minAtrPct: 0, trendFilterPeriod: 200, minAdxLevel: 0, tslAtrMult: 3.5, regime_threshold: 25 };

// --- HELPER FUNCTIONS ---
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
    if (!trades || trades.length === 0) return alert("No trades to export.");
    const headers = ["Entry Time", "Exit Time", "Type", "Entry Price", "Exit Price", "Profit", "Reason"];
    const rows = trades.map(t => [t.entryTime, t.exitTime, t.position, t.price, t.exitPrice, t.profit.toFixed(2), t.type]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a"); link.setAttribute("href", encodedUri); link.setAttribute("download", "backtest_trades.csv");
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
};

// 🟢 METRICS CALCULATOR (Zero-Safe Fallback)
const computeMetricsFromTrades = (trades, initialBalance) => {
    if (!trades || trades.length === 0) {
        return {
            totalReturn: 0, profitFactor: 0, maxDrawdown: 0, winRate: 0,
            totalTrades: 0, winningTrades: 0, losingTrades: 0,
            averageWin: 0, averageLoss: 0, finalBalance: initialBalance,
            expectancy: 0, sharpeRatio: 0, sortinoRatio: 0,
            maxLosingStreak: 0, avgHoldTime: 0
        };
    }
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
        if (!isNaN(entry) && !isNaN(exit)) totalHoldTimeMs += (exit - entry);
        const ret = (balance - prevBalance) / prevBalance;
        dailyReturns.push(ret);
    });

    const totalTrades = trades.length;
    const avgWin = wins > 0 ? totalWin / wins : 0;
    const avgLoss = (totalTrades - wins) > 0 ? totalLoss / (totalTrades - wins) : 0;
    
    const avgReturn = dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length;
    const variance = dailyReturns.reduce((a, b) => a + Math.pow(b - avgReturn, 2), 0) / dailyReturns.length;
    const stdDev = Math.sqrt(variance);
    const downsideVariance = dailyReturns.filter(r => r < 0).reduce((a, b) => a + Math.pow(b, 2), 0) / dailyReturns.length;

    return {
        totalReturn: ((balance - initialBalance) / initialBalance) * 100,
        profitFactor: totalLoss === 0 ? totalWin : totalWin / totalLoss,
        maxDrawdown: maxDrawdown * 100,
        winRate: (wins / totalTrades) * 100,
        totalTrades,
        winningTrades: wins,
        losingTrades: totalTrades - wins,
        averageWin: avgWin,
        averageLoss: avgLoss,
        finalBalance: balance,
        expectancy: (wins/totalTrades * avgWin) - ((1-wins/totalTrades) * avgLoss),
        sharpeRatio: stdDev === 0 ? 0 : (avgReturn / stdDev) * Math.sqrt(totalTrades),
        sortinoRatio: Math.sqrt(downsideVariance) === 0 ? 0 : (avgReturn / Math.sqrt(downsideVariance)) * Math.sqrt(totalTrades),
        maxLosingStreak,
        avgHoldTime: totalHoldTimeMs / totalTrades / (1000 * 60 * 60)
    };
};

// 🟢 INITIAL STATES DEFINED (Fixes ReferenceError)
const initialFormData = {
  strategyId: "", code: "", symbol: "", timeframe: "", startDate: getDefaultDates().startDate, endDate: getDefaultDates().endDate,
  initialBalance: 1000, params: { ...defaultFilterParams, maxPyramiding: 1 },
  riskManagementMode: 'static', riskPercentage: 1, growthCapitalTarget: 2000, 
  mlMode: "off", mlModel: "", mlThreshold: 0.5
};

const initialComboData = {
  strategies: [ { strategyId: "", code: "", params: { tslAtrMult: 3.5 } }, { strategyId: "", code: "", params: { tslAtrMult: 3.5 } } ],
  params: { ...defaultFilterParams, maxPyramiding: 1 }, 
  comboConfig: { strategyCodes: [], combinationRule: 'AND' },
  symbol: "", timeframe: "", startDate: getDefaultDates().startDate, endDate: getDefaultDates().endDate, initialBalance: 1000,
  riskManagementMode: 'static', riskPercentage: 1, growthCapitalTarget: 2000, 
  mlMode: "off", mlModel: "", mlThreshold: 0.5
};

// --- SUB-COMPONENTS ---
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
      {items.map((m, idx) => (
        <div key={idx} className="metric-item hover:shadow-lg transition-all group">
          <span className="metric-label">{m.label}</span>
          <div className={`metric-value ${m.color}`}>
            {m.format === 'currency' ? `$${m.value?.toFixed(2)}` : m.format === 'percent' ? `${m.value?.toFixed(2)}%` : m.value?.toFixed(2)}
          </div>
        </div>
      ))}
    </div>
  );
};

const AdvancedMetricsDisplay = ({ metrics }) => {
    if (!metrics) return null;
    const safeNum = (val) => (val !== undefined && val !== null && !isNaN(val)) ? val.toFixed(2) : "0.00";
    const items = [
        { label: "Sharpe Ratio", value: safeNum(metrics.sharpeRatio), desc: "Risk-Adjusted Return", color: 'text-white' },
        { label: "Sortino Ratio", value: safeNum(metrics.sortinoRatio), desc: "Downside Risk Only", color: 'text-white' },
        { label: "Expectancy", value: `$${safeNum(metrics.expectancy)}`, desc: "Avg Value Per Trade", color: 'text-white' },
        { label: "Avg Hold Time", value: `${safeNum(metrics.avgHoldTime)}h`, desc: "Duration in Market", color: 'text-white' },
        { label: "Max Lose Streak", value: metrics.maxLosingStreak || 0, desc: "Consecutive Losses", color: "text-rose-400" }
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
    const handleGlobalChange = (e) => onChange(e);
    const inputClass = "w-full bg-[#0a0a0a] border border-white/10 rounded-xl px-4 py-3 text-white focus:border-emerald-500 transition-colors";
    const safeModels = (options.modelOptions && Array.isArray(options.modelOptions) && options.modelOptions.length > 0) ? options.modelOptions : DEFAULT_MODEL_OPTIONS;

    return (
      <>
        <div className="form-grid mb-6">
          <div className="setup-selector">
            <label className="text-neutral-400">Symbol</label>
            <select name="symbol" value={data.symbol || ""} onChange={handleGlobalChange} className={inputClass}>
              <option value="">-- Select Symbol --</option>
              {options.symbolOptions?.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="setup-selector">
            <label className="text-neutral-400">Timeframe</label>
            <select name="timeframe" value={data.timeframe || ""} onChange={handleGlobalChange} className={inputClass}>
              <option value="">-- Select Timeframe --</option>
              {options.timeframeOptions?.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="setup-selector">
            <label className="text-neutral-400">Initial Balance</label>
            <input type="number" name="initialBalance" value={data.initialBalance ?? ''} onChange={handleGlobalChange} className={inputClass} />
          </div>
        </div>
        <div className="form-grid mb-6" style={{gridTemplateColumns: '1fr 1fr'}}>
          <div className="setup-selector">
            <label className="text-neutral-400">Start Date</label>
            <input type="date" name="startDate" value={data.startDate || ""} onChange={handleGlobalChange} className={inputClass} />
          </div>
          <div className="setup-selector">
            <label className="text-neutral-400">End Date</label>
            <input type="date" name="endDate" value={data.endDate || ""} onChange={handleGlobalChange} className={inputClass} />
          </div>
        </div>
        
        {/* Security / Password section (Fixed Accessibility Errors) */}
        <div className="bot-card mb-6" style={{background: 'rgba(239, 68, 68, 0.05)', borderColor: 'rgba(239, 68, 68, 0.2)'}}>
           <label className="text-rose-400 text-xs font-bold block mb-2">Security Verification</label>
           {/* Hidden username field helps browsers handle password-only forms for accessibility */}
           <input type="text" name="username" style={{display:'none'}} autoComplete="username" readOnly />
           <input 
                name="password" 
                type="password" 
                autoComplete="current-password"
                placeholder="Enter Terminal Key" 
                className={inputClass} 
           />
        </div>

        <div className="bot-card mb-6" style={{background: 'rgba(16, 185, 129, 0.05)', borderColor: 'rgba(16, 185, 129, 0.2)'}}>
          <div className="panel-header mb-4 pb-3 border-b border-emerald-500/20"><h4 className="text-emerald-400 font-bold">Risk & ML Configuration</h4></div>
          <div className="form-grid">
            <div className="setup-selector">
              <label className="text-neutral-400">Risk Mode</label>
              <select name="riskManagementMode" value={data.riskManagementMode || 'static'} onChange={handleGlobalChange} className={inputClass}>
                <option value="static">Standard (Static %)</option>
                <option value="dynamic">Dynamic (Growth Target)</option>
              </select>
            </div>
            <div className="setup-selector">
              <label className="text-neutral-400">Risk Percentage</label>
              <input type="number" name="riskPercentage" value={data.riskPercentage ?? ''} onChange={handleGlobalChange} step="0.1" className={inputClass} />
            </div>
            <div className="setup-selector">
              <label className="text-neutral-400">ML Mode</label>
              <select name="mlMode" value={data.mlMode || "off"} onChange={handleGlobalChange} className={inputClass}>
                <option value="off">Off (Pure TA)</option>
                <option value="predictions">Hybrid (TA+ML)</option>
                <option value="on">Pure ML</option>
              </select>
            </div>
            {data.mlMode !== 'off' && (
              <>
                <div className="setup-selector">
                  <label className="text-neutral-400">ML Model</label>
                  <select name="mlModel" value={data.mlModel || ""} onChange={handleGlobalChange} className={inputClass}>
                    <option value="">-- Select Model --</option>
                    {safeModels.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </div>
                <div className="setup-selector">
                  <label className="text-neutral-400">ML Threshold</label>
                  <input type="number" name="mlThreshold" value={data.mlThreshold ?? ''} step="0.05" onChange={handleGlobalChange} className={inputClass} />
                </div>
              </>
            )}
          </div>
        </div>
      </>
    );
};

const ComboStrategyCard = ({ idx, config, strategies = [], onChange, onRemove, disableRemove }) => {
  const handleChange = (e) => onChange(e, idx);
  const inputClass = "w-full bg-[#0a0a0a] border border-white/10 rounded-xl px-4 py-3 text-white focus:border-emerald-500 transition-colors text-sm";
  return (
    <div className="bot-card p-4 hover:border-emerald-500/40 transition-all mb-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2"><div className="w-8 h-8 bg-gradient-to-br from-emerald-500/20 to-teal-500/20 rounded-lg flex items-center justify-center"><span className="text-emerald-400 font-bold">{idx + 1}</span></div><span className="text-white font-bold">Layer #{idx + 1}</span></div>
        {!disableRemove && <button type="button" onClick={() => onRemove(idx)} className="text-rose-400 hover:text-rose-300 font-bold text-lg">✕</button>}
      </div>
      <select name="strategyId" value={config.strategyId || ""} onChange={handleChange} disabled={!strategies.length} className={inputClass}>
        <option value="">-- Select Strategy --</option>
        {strategies.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
      </select>
    </div>
  );
};

// --- MAIN PAGE COMPONENT ---
export default function Backtests() {
  const { state, runNewBacktest, runComboBacktest, resetBacktest, fetchOptions } = useBacktest(); 
  const { loading = 'idle', options = {} } = state || {};
  const inputClass = "w-full bg-[#0a0a0a] border border-white/10 rounded-xl px-4 py-3 text-white focus:border-emerald-500 transition-colors";

  const [selectedWinnerId, setSelectedWinnerId] = useState("");
  const [activeTab, setActiveTab] = useState('single');
  const [formData, setFormData] = useState(initialFormData);
  const [comboData, setComboData] = useState(initialComboData);
  const [backtestResults, setBacktestResults] = useState(null);
  const [liveWinners, setLiveWinners] = useState([]);
  const [scanningWinners, setScanningWinners] = useState(false);
  const [availableModels, setAvailableModels] = useState([]);
  const [isSimulating, setIsSimulating] = useState(false); 

  // Debug Logs
  useEffect(() => { console.log("📝 [DEBUG] Single Form State:", formData); }, [formData]);
  useEffect(() => { console.log("📝 [DEBUG] Combo Form State:", comboData); }, [comboData]);

  // Initial Data Fetching
  useEffect(() => {
    if ((!options?.symbols || options.symbols.length === 0) && typeof fetchOptions === 'function') {
      fetchOptions();
    }
  }, [options, fetchOptions]);

  const fetchWinners = async () => {
      setScanningWinners(true);
      try {
        const token = localStorage.getItem("token");
        const headers = { Authorization: `Bearer ${token}` };
        const [resWinners, resModels] = await Promise.all([
            axios.get("https://neov6backend.onrender.com/api/bot/winners", { headers }),
            axios.get("https://neov6backend.onrender.com/api/ml/available-models", { headers })
        ]);
        setLiveWinners(Array.isArray(resWinners.data) ? resWinners.data : (resWinners.data.winners || []));
        setAvailableModels(resModels.data || []);
      } catch (err) { console.error("Fetch Error:", err); } finally { setScanningWinners(false); }
  };
  useEffect(() => { fetchWinners(); }, []);

  // Strategy Mapping
  const strategyOptions = useMemo(() => {
    const dbStrats = options?.strategies || [];
    const baseStrats = Object.entries(STRATEGY_TYPE_TO_CODE_MAP).map(([name, code], idx) => ({ _id: `base-${code}-${idx}`, name, code }));
    return [...baseStrats, ...dbStrats];
  }, [options]);

  const symbolOptions = useMemo(() => options?.symbols || [], [options]);
  const timeframeOptions = useMemo(() => options?.timeframes || [], [options]);

  // Auto-population
  useEffect(() => {
    if (symbolOptions.length > 0 && (!formData.symbol || formData.symbol === "00-USD")) {
      const best = symbolOptions.find(s => s.includes("BTC")) || symbolOptions[0];
      setFormData(prev => ({ ...prev, symbol: best }));
      setComboData(prev => ({ ...prev, symbol: best }));
    }
    if (timeframeOptions.length > 0 && !formData.timeframe) {
      setFormData(prev => ({ ...prev, timeframe: timeframeOptions.find(t => t === "1h") || timeframeOptions[0] }));
      setComboData(prev => ({ ...prev, timeframe: timeframeOptions.find(t => t === "1h") || timeframeOptions[0] }));
    }
  }, [symbolOptions, timeframeOptions]);

  // 🟢 FORM HANDLERS
  const handleFormChange = (e) => {
    const { name, value, type } = e.target;
    let val = type === 'number' ? (isNaN(parseFloat(value)) ? '' : parseFloat(value)) : value;
    if (name === 'strategyId') { 
        const strat = strategyOptions.find(s => s._id === val);
        if (strat) setFormData(prev => ({ ...prev, strategyId: val, code: strat.code })); 
    } else if (name.startsWith("param_")) {
        setFormData(prev => ({ ...prev, params: { ...prev.params, [name.substring(6)]: val } }));
    } else { setFormData(prev => ({ ...prev, [name]: val })); }
  };

  const handleComboChange = (e) => {
    const { name, value, type } = e.target;
    let val = type === 'number' ? (isNaN(parseFloat(value)) ? '' : parseFloat(value)) : value;
    if (name.startsWith("param_")) {
        setComboData(prev => ({ ...prev, params: { ...prev.params, [name.substring(6)]: val } }));
    } else {
        setComboData(prev => ({ ...prev, [name]: val }));
    }
  };

  const handleStrategyConfigChange = (e, index) => {
    const { name, value } = e.target;
    const updatedStrategies = [...comboData.strategies];
    if (name === 'strategyId') { 
      const selected = strategyOptions.find(s => s._id === value);
      if (selected) updatedStrategies[index] = { ...updatedStrategies[index], strategyId: value, code: selected.code };
    } else {
        updatedStrategies[index] = { ...updatedStrategies[index], [name]: value };
    }
    setComboData(prev => ({ ...prev, strategies: updatedStrategies }));
  };

  const addStrategyCard = () => {
    const def = strategyOptions[0] || {};
    setComboData(p => ({ ...p, strategies: [...p.strategies, { strategyId: def._id || "", code: def.code || "", params: {} }] }));
  };

  const removeStrategyCard = (index) => {
    if (comboData.strategies.length <= 1) return;
    setComboData(p => ({ ...p, strategies: p.strategies.filter((_, i) => i !== index) }));
  };

  const handleWinnerSelect = (e) => {
        const filename = e.target.value; 
        setSelectedWinnerId(filename);
        const win = liveWinners.find(w => (w.botId || w.id) === filename);
        if (!selectedWinner) return;
        const config = win.config || win;
        const symbol = (config.symbol || "BTC-USD").replace('/', '-');
        const timeframe = config.timeframe || "1h";
        const strategies = (config.strategies || []).map(s => {
            const code = typeof s === 'string' ? s : (s.code || "unknown");
            const opt = strategyOptions.find(o => o.code === code);
            return { strategyId: opt?._id || "", code, params: s.params || {} };
        });
        setActiveTab(strategies.length > 1 ? 'combo' : 'single');
        const update = { symbol, timeframe, mlMode: config.mlMode || "predictions", mlModel: config.mlModel, mlThreshold: config.mlThreshold || 0.5, params: { ...defaultFilterParams, ...config.params } };
        setFormData(p => ({ ...p, ...update, strategyId: strategies[0]?.strategyId, code: strategies[0]?.code }));
        setComboData(p => ({ ...p, ...update, strategies: strategies, comboConfig: config.comboConfig || { combinationRule: 'OR' } }));
  };

  const handleRun = async (e) => {
    e.preventDefault();
    setBacktestResults(null);
    setIsSimulating(true); 
    const isCombo = activeTab === 'combo';
    console.log("🚀 [DEBUG] Running Backtest with payload:", isCombo ? comboData : formData);
    try {
      const res = isCombo ? await runComboBacktest(comboData) : await runNewBacktest(formData);
      if (res) setBacktestResults(res.combinedResult || res);
    } catch (err) { console.error("Backtest Failed:", err); } finally { setIsSimulating(false); }
  };

  // Processing Memo
  const processed = useMemo(() => {
    if (!backtestResults?.metrics) return null;
    const trades = (backtestResults.tradeBreakdown || backtestResults.trades || []).map(t => ({ ...t, entryTime: t.entry_time || t.entryTime, exitTime: t.exit_time || t.exitTime, profit: t.profit || 0 }));
    const curve = (backtestResults.equityCurve || []).map(p => ({ timestamp: new Date(p.timestamp || p.time).getTime(), balance: p.balance }));
    const initial = activeTab === 'single' ? formData.initialBalance : comboData.initialBalance;
    const local = computeMetricsFromTrades(trades, initial);
    const metrics = { ...backtestResults.metrics, ...local, totalReturn: backtestResults.metrics.roi || local.totalReturn };
    return { curve, metrics, trades };
  }, [backtestResults, activeTab, formData, comboData]);

  return (
    <div className="backtest-container">
      <div className="container mx-auto p-4">
        <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl shadow-lg"> <span className="text-2xl">📈</span> </div>
              <div><h1 className="header" style={{fontSize:'2rem', margin:0}}>Strategy Backtester</h1><p className="text-neutral-400 text-sm">Advanced Performance Testing Platform</p></div>
            </div>
            <div className="px-4 py-2 bg-black/50 rounded-xl border border-white/10 flex items-center gap-2"><span className="text-neutral-400 text-sm">API Connected</span><span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span></div>
        </div>

        <div className="grid grid-cols-12 gap-8">
          <div className="col-span-12 lg:col-span-5">
            <div className="bot-card sticky top-6 p-6">
              <div className="panel-header flex items-center gap-3 mb-6"> <span className="text-emerald-400 text-lg">⚙️</span> <h2 className="card-title">Configuration</h2> </div>
              
              <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-500/30 rounded-xl p-4 mb-6">
                <label className="text-emerald-400 font-semibold text-sm block mb-2">🏆 Load Alpha Strategy</label>
                <div className="flex gap-2">
                    <select value={selectedWinnerId} onChange={handleWinnerSelect} className={inputClass}>
                      <option value="">-- Select Golden Strategy --</option>
                      {liveWinners.map(w => {
                          const id = w.botId || w.id;
                          const roi = w.roi || w.metrics?.totalReturn || 0;
                          return <option key={id} value={id}>{`${w.symbol || "Strategy"} (ROI: ${(roi * 1).toFixed(0)}%)`}</option>;
                      })}
                    </select>
                    <button onClick={fetchWinners} disabled={scanningWinners} className="px-4 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30 hover:bg-emerald-500/30"> {scanningWinners ? '...' : '🔄'} </button>
                </div>
              </div>

              <div className="tabs flex gap-2 mb-6"> 
                <button className={`flex-1 py-3 rounded-xl transition-all ${activeTab === 'single' ? 'bg-emerald-500 text-black font-bold' : 'bg-white/5 text-neutral-400 hover:bg-white/10'}`} onClick={() => setActiveTab('single')}>Single Layer</button> 
                <button className={`flex-1 py-3 rounded-xl transition-all ${activeTab === 'combo' ? 'bg-emerald-500 text-black font-bold' : 'bg-white/5 text-neutral-400 hover:bg-white/10'}`} onClick={() => setActiveTab('combo')}>Combo Layers</button> 
              </div>

              <form onSubmit={handleRun}>
                {activeTab === 'single' ? (
                  <>
                    <div className="setup-selector mb-4"> 
                      <label className="text-neutral-400 text-xs block mb-2">⚡ Signal Core</label> 
                      <select name="strategyId" value={formData.strategyId} onChange={handleFormChange} className={inputClass}> 
                        <option value="">-- Select TA Engine --</option> 
                        {strategyOptions.map(s => <option key={s._id} value={s._id}>{s.name}</option>)} 
                      </select> 
                    </div>
                    <CommonBacktestInputs data={formData} onChange={handleFormChange} options={{ symbolOptions, timeframeOptions, modelOptions: availableModels }} />
                  </>
                ) : (
                  <>
                    <CommonBacktestInputs data={comboData} onChange={handleComboChange} options={{ symbolOptions, timeframeOptions, modelOptions: availableModels }} />
                    <div className="space-y-4 mb-6"> 
                        <label className="text-emerald-400 text-xs font-bold uppercase tracking-widest">Logic Layers</label> 
                        {comboData.strategies.map((c, i) => ( 
                            <ComboStrategyCard key={i} idx={i} config={c} strategies={strategyOptions} onChange={handleStrategyConfigChange} onRemove={removeStrategyCard} disableRemove={comboData.strategies.length <= 1} /> 
                        ))} 
                        <button type="button" onClick={addStrategyCard} className="w-full py-3 bg-black/40 border border-white/10 rounded-xl text-emerald-400 text-xs font-bold uppercase hover:bg-emerald-500/10 transition-all">+ Add Layer</button> 
                    </div>
                  </>
                )}
                <button type="submit" disabled={isSimulating} className="w-full py-4 bg-emerald-500 text-black font-bold rounded-xl shadow-lg shadow-emerald-500/20 hover:scale-[1.02] transition-all"> {isSimulating ? 'Processing Sequence...' : '▶ Run Simulation'} </button>
              </form>
            </div>
          </div>

          <div className="col-span-12 lg:col-span-7 space-y-6">
            {processed ? (
              <>
                <MetricsDisplay metrics={processed.metrics} />
                <AdvancedMetricsDisplay metrics={processed.metrics} />
                <div className="bot-card p-6">
                    <div style={{height: '500px'}}>
                        <ChartIndependent results={processed} symbol={activeTab === 'single' ? formData.symbol : comboData.symbol} />
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-6">
                    <div className="bot-card p-6 h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={[{name: 'Wins', value: processed.metrics.winningTrades}, {name: 'Losses', value: processed.metrics.losingTrades}]} innerRadius={60} outerRadius={80} dataKey="value">
                                    <Cell fill="#10b981" /><Cell fill="#ef4444" />
                                </Pie>
                                <Tooltip contentStyle={{backgroundColor: '#0a0a0a', borderColor: '#333'}} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="bot-card p-6 flex flex-col items-center justify-center">
                        <div className="text-neutral-400 text-sm mb-2">Net Result</div>
                        <div className={`text-4xl font-mono font-bold ${processed.metrics.totalReturn >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {processed.metrics.totalReturn >= 0 ? '+' : ''}{processed.metrics.totalReturn.toFixed(2)}%
                        </div>
                    </div>
                </div>
              </>
            ) : (
              <div className="bot-card p-20 flex flex-col items-center justify-center min-h-[600px] border-dashed border-2 border-white/5 bg-transparent"> 
                <div className="w-20 h-20 bg-emerald-500/10 rounded-3xl flex items-center justify-center mb-6 text-4xl">🧪</div> 
                <h3 className="text-white text-xl mb-2 font-bold">Strategy Sandbox</h3> 
                <p className="text-neutral-400 text-center max-w-sm">Select a pre-tuned alpha strategy or define a custom multi-layer logic to start the simulation.</p> 
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
