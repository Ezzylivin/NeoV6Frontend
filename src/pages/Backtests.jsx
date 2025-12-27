// File: src/pages/Backtests.jsx
// 🚀 UPGRADE: v69.3 - Fixed Strategy Dropdown Population
// 🛠 Fix: Maps file 'codes' to UI 'strategyIds' so dropdowns show the correct names.

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

const computeMetricsFromTrades = (trades, initialBalance) => {
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
        if (!isNaN(entry) && !isNaN(exit)) totalHoldTimeMs += (exit - entry);

        const ret = (balance - prevBalance) / prevBalance;
        dailyReturns.push(ret);
    });

    const totalTrades = trades.length;
    const winRate = (wins / totalTrades) * 100;
    const profitFactor = totalLoss === 0 ? totalWin : totalWin / totalLoss;
    const totalReturn = ((balance - initialBalance) / initialBalance) * 100;
    const avgWin = wins > 0 ? totalWin / wins : 0;
    const avgLoss = (totalTrades - wins) > 0 ? totalLoss / (totalTrades - wins) : 0;
    
    const avgReturn = dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length;
    const variance = dailyReturns.reduce((a, b) => a + Math.pow(b - avgReturn, 2), 0) / dailyReturns.length;
    const stdDev = Math.sqrt(variance);
    const downsideVariance = dailyReturns.filter(r => r < 0).reduce((a, b) => a + Math.pow(b, 2), 0) / dailyReturns.length;
    const downsideStdDev = Math.sqrt(downsideVariance);

    const sharpe = stdDev === 0 ? 0 : (avgReturn / stdDev) * Math.sqrt(totalTrades); 
    const sortino = downsideStdDev === 0 ? 0 : (avgReturn / downsideStdDev) * Math.sqrt(totalTrades);
    const avgHoldTimeHours = totalHoldTimeMs / totalTrades / (1000 * 60 * 60);

    return {
        totalReturn, profitFactor, maxDrawdown: maxDrawdown * 100, winRate, totalTrades,
        winningTrades: wins, losingTrades: totalTrades - wins, averageWin: avgWin, averageLoss: avgLoss,
        finalBalance: balance, expectancy: (wins/totalTrades * avgWin) - ((1-wins/totalTrades) * avgLoss),
        sharpeRatio: sharpe, sortinoRatio: sortino, maxLosingStreak, avgHoldTime: avgHoldTimeHours
    };
};

// --- INITIAL STATES ---
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
                <div className="w-10 h-10 bg-gradient-to-br from-violet-500/20 to-pink-500/20 rounded-xl flex items-center justify-center text-xl">📅</div>
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
                            <div className={`font-mono ${ret > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{ret > 0 ? '+' : ''}{ret.toFixed(2)}%</div>
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
        { label: "Sortino Ratio", value: metrics.sortinoRatio?.toFixed(2), desc: "Downside Risk Only", color: 'text-white' },
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

// --- INPUTS COMPONENT ---
const CommonBacktestInputs = ({ data, onChange, options, isCombo = false }) => {
    const handleGlobalChange = (e) => onChange(e);
    
    const handleParamChange = (e) => {
      const { name, value, type } = e.target;
      let val = value;
      if (type === 'number') {
        const parsed = parseFloat(value);
        val = isNaN(parsed) ? '' : parsed; 
      }
      onChange({ target: { name: `param_${name}`, value: val, type } });
    };
    
    const params = data.params || {};
    const inputClass = "w-full bg-[#0a0a0a] border border-white/10 rounded-xl px-4 py-3 text-white focus:border-emerald-500 transition-colors";
    const safeVal = (v) => (v === null || v === undefined || isNaN(v)) ? '' : v;

    const safeModels = (options.modelOptions && Array.isArray(options.modelOptions) && options.modelOptions.length > 0) 
        ? options.modelOptions 
        : DEFAULT_MODEL_OPTIONS;

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
            <input type="number" name="initialBalance" value={safeVal(data.initialBalance)} onChange={handleGlobalChange} className={inputClass} />
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
        
        <div className="bot-card mb-6" style={{background: 'rgba(16, 185, 129, 0.05)', borderColor: 'rgba(16, 185, 129, 0.2)'}}>
          <div className="panel-header mb-4 pb-3 border-b border-emerald-500/20">
            <h4 className="text-emerald-400 font-bold">Risk & ML Configuration</h4>
          </div>
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
              <input type="number" name="riskPercentage" value={safeVal(data.riskPercentage)} onChange={handleGlobalChange} step="0.1" className={inputClass} />
            </div>
            {data.riskManagementMode === 'dynamic' && (
               <div className="setup-selector">
                  <label className="text-neutral-400">Growth Target ($)</label>
                  <input type="number" name="growthCapitalTarget" value={safeVal(data.growthCapitalTarget)} onChange={handleGlobalChange} className={inputClass} />
               </div>
            )}
            <div className="setup-selector">
              <label className="text-neutral-400">Max Pyramiding</label>
              <input type="number" name="maxPyramiding" value={safeVal(params.maxPyramiding)} onChange={handleParamChange} min="1" max="10" className={inputClass} />
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
                    {safeModels.map(m => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </div>
                <div className="setup-selector">
                  <label className="text-neutral-400">ML Threshold</label>
                  <input type="number" name="mlThreshold" value={safeVal(data.mlThreshold)} step="0.05" onChange={handleGlobalChange} className={inputClass} />
                </div>
              </>
            )}
          </div>
        </div>
  
        <div className="bot-card">
          <div className="panel-header mb-4 pb-3 border-b border-emerald-500/20">
            <h4 className="text-emerald-400 font-bold">Advanced Filters</h4>
          </div>
          <div className="form-grid" style={{gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))'}}>
            <div className="setup-selector">
              <label className="text-neutral-400">Min ATR %</label>
              <input type="number" name="minAtrPct" value={safeVal(params.minAtrPct)} onChange={handleParamChange} step="0.05" className={inputClass} />
            </div>
            <div className="setup-selector">
              <label className="text-neutral-400">Min ADX</label>
              <input type="number" name="minAdxLevel" value={safeVal(params.minAdxLevel)} onChange={handleParamChange} step="1" className={inputClass} />
            </div>
            <div className="setup-selector">
              <label className="text-neutral-400">TSL ATR Multiplier</label>
              <input type="number" name="tslAtrMult" value={safeVal(params.tslAtrMult)} onChange={handleParamChange} step="0.1" className={inputClass} />
            </div>
            <div className="setup-selector">
              <label className="text-neutral-400">Trend Filter SMA</label>
              <input type="number" name="trendFilterPeriod" value={safeVal(params.trendFilterPeriod)} onChange={handleParamChange} step="1" className={inputClass} />
            </div>
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
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-emerald-500/20 to-teal-500/20 rounded-lg flex items-center justify-center">
            <span className="text-emerald-400 font-bold">{idx + 1}</span>
          </div>
          <span className="text-white font-bold">Strategy #{idx + 1}</span>
        </div>
        {!disableRemove && (
          <button type="button" onClick={() => onRemove(idx)} className="text-rose-400 hover:text-rose-300 transition-colors font-bold text-lg">✕</button>
        )}
      </div>
      <select name="strategyId" value={config.strategyId || ""} onChange={handleChange} disabled={!strategies.length} className={inputClass}>
        <option value="">-- Select Strategy --</option>
        {strategies.length ? strategies.map(s => <option key={s._id} value={s._id}>{s.name}</option>) : <option disabled>Loading...</option>}
      </select>
    </div>
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
  
  // New State for Models
  const [availableModels, setAvailableModels] = useState([]);
  
  const [chartMode, setChartMode] = useState('standard'); 
  const [isSimulating, setIsSimulating] = useState(false); 

  useEffect(() => {
    if (resetBacktest) resetBacktest();
    setBacktestResults({ main: null });
  }, []);

  const strategyOptions = useMemo(() => {
    const dbStrats = options?.strategies || [];
    const baseStrats = Object.entries(STRATEGY_TYPE_TO_CODE_MAP).map(([name, code], idx) => ({ _id: `base-${code}-${idx}`, name, code, params: {} }));
    return [...baseStrats, ...dbStrats.map(s => ({...s, code: STRATEGY_TYPE_TO_CODE_MAP[s.params?.strategyType] || "unknown"}))];
  }, [options]);
  
  const symbolOptions = useMemo(() => options?.symbols || [], [options]);
  const timeframeOptions = useMemo(() => options?.timeframes || [], [options]);

 // 🚀 FETCH DATA (Winners + Models)
  const fetchWinners = async () => {
      setScanningWinners(true);
      try {
        const token = localStorage.getItem("token");
        const headers = { Authorization: `Bearer ${token}` };
        
        const [resWinners, resModels] = await Promise.all([
            axios.get("https://neov6backend.onrender.com/api/bot/winners", { headers }),
            axios.get("https://neov6backend.onrender.com/api/ml/available-models", { headers })
        ]);

        // Fix: Handle nested data structures (e.g. { data: [...] } vs [...])
        const winnersArray = Array.isArray(resWinners.data) 
            ? resWinners.data 
            : (resWinners.data.winners || resWinners.data.data || []);

        setLiveWinners(winnersArray);
        
        // Fix: Handle Models
        const modelsData = resModels.data.models || resModels.data || [];
        const formattedModels = modelsData.map(m => 
            typeof m === 'string' ? { id: m, name: m.replace(/_/g, ' ').toUpperCase() } : m
        );
        setAvailableModels(formattedModels);

      } catch (err) { 
          console.error("Fetch Error:", err); 
      } finally { 
          setScanningWinners(false); 
      }
  };
  // 🛠 FIX: ROBUST STRATEGY MATCHING
  const handleWinnerSelect = (e) => {
        const filename = e.target.value; 
        setSelectedWinnerId(filename);
        
        const selectedWinner = liveWinners.find(w => (w.botId || w.id) === filename);
        if (!selectedWinner) return;

        const data = selectedWinner.config || selectedWinner;

        // Metadata
        let symbol = data.symbol || selectedWinner.symbol || "BTC-USD"; 
        let timeframe = data.timeframe || "1h";
        
        if((!data.symbol || data.symbol === "Unknown") && filename.includes('_')) { 
            const parts = filename.split('_'); 
            if(parts[1] && parts[1].includes('-')) symbol = parts[1]; 
            if(parts[2] && parts[2].match(/\d+[mhdw]/)) timeframe = parts[2]; 
        }

        // 🟢 FIX: Match Strategy Code to Option ID
        const rawStrategies = data.strategies || [];
        const strategies = rawStrategies.map(s => {
            const code = (typeof s === 'string' ? s : (s.code || "unknown"));
            const params = (typeof s === 'string' ? {} : (s.params || s));
            
            // Look for matching Base Strategy in Options
            const matchingOption = strategyOptions.find(opt => opt.code === code);
            const strategyId = matchingOption ? matchingOption._id : ""; // Fallback empty if not found

            return { strategyId, code, params };
        });

        // ML & Config
        let mlMode = data.mlMode || "off"; 
        let rawMlModel = data.mlModel || data.params?.mlModel || "";
        
        // Smart Model Match
        let mlModel = "";
        const existsRaw = availableModels.find(m => m.id === rawMlModel);
        if (existsRaw) mlModel = rawMlModel;
        else {
            const stripped = rawMlModel.replace(/_model$/, '');
            const existsStripped = availableModels.find(m => m.id === stripped);
            mlModel = existsStripped ? stripped : rawMlModel;
        }

        if (mlModel && mlMode === "off") mlMode = "predictions"; 
        if (!mlModel && mlMode !== "off") mlModel = 'btc_1h_xgboost'; 

        const comboConfigSource = data.comboConfig || data.params || {};
        const comboConfig = {
            strategyCodes: strategies.map(s => s.code),
            combinationRule: comboConfigSource.hybridMode || comboConfigSource.combinationRule || 'OR',
            ...comboConfigSource
        };

        const globalParams = { ...data.params }; 
        if (data.riskPercentage) globalParams.riskPercentage = Number(data.riskPercentage); 
        if (data.maxPyramiding) globalParams.maxPyramiding = Number(data.maxPyramiding);

        // Update State
        setActiveTab('combo');
        setComboData(prev => ({
            ...prev, 
            symbol, 
            timeframe, 
            strategies, // Now has IDs!
            comboConfig,
            mlMode, 
            mlModel, 
            mlThreshold: Number(data.mlThreshold) || 0.5, 
            params: globalParams,
            riskManagementMode: data.riskManagementMode || 'static', 
            riskPercentage: Number(data.riskPercentage) || 1, 
            growthCapitalTarget: Number(data.growthCapitalTarget) || 2000,
            maxDailyLoss: Number(data.maxDailyLoss) || 5,
            maxDrawdown: Number(data.maxDrawdown) || 10
        }));
        
        setFormData(prev => ({ ...prev, symbol, timeframe, params: globalParams }));
  };

  const handleSaveStrategy = async () => {
    const name = prompt("Enter a name for this strategy setup:");
    if (!name) return;

    const config = activeTab === 'single' ? formData : comboData;
    const payload = {
        name,
        symbol: config.symbol,
        timeframe: config.timeframe,
        initialBalance: config.initialBalance,
        strategies: activeTab === 'single' 
            ? [{ code: config.code, params: config.params }] 
            : config.strategies.map(s => ({ code: s.code, params: s.params })),
        comboConfig: activeTab === 'combo' ? config.comboConfig : null,
        params: config.params,
        mlMode: config.mlMode,
        mlModel: config.mlModel,
        mlThreshold: config.mlThreshold,
        isCombo: activeTab === 'combo'
    };

    try {
        await api.post('/bot/strategies', payload);
        alert("✅ Strategy saved successfully!");
    } catch (e) {
        alert("❌ Error saving: " + (e.response?.data?.message || e.message));
    }
  };

  const handleFormChange = (e, setFunc) => {
    const { name, value, type } = e.target;
    let val = value;
    if (type === 'number') {
        const parsed = parseFloat(value);
        val = isNaN(parsed) ? '' : parsed;
    }
    
    if (name === 'strategyId') { 
        const strat = strategyOptions.find(s => s._id === val);
        if (strat) setFunc(prev => ({ ...prev, strategyId: val, code: strat.code, params: { ...prev.params, ...strat.params } })); 
    } else if (name.startsWith("param_")) {
        setFunc(prev => ({ ...prev, params: { ...prev.params, [name.substring(6)]: val } }));
    } else {
        setFunc(prev => ({ ...prev, [name]: val }));
    }
  };

  const handleComboChange = (e) => {
    const { name, value, type } = e.target;
    let val = value;
    if (type === 'number') {
        const parsed = parseFloat(value);
        val = isNaN(parsed) ? '' : parsed;
    }

    if (name.startsWith("param_")) {
      setComboData(prev => ({ ...prev, params: { ...prev.params, [name.substring(6)]: val } }));
    } else {
      setComboData(prev => ({ ...prev, [name]: val }));
    }
  };

  const handleStrategyConfigChange = (e, index) => {
    const { name, value } = e.target;
    const updatedStrategies = [...comboData.strategies];
    const currentConfig = { ...updatedStrategies[index] };
    if (name === 'strategyId') { 
      const selectedStrategy = strategyOptions.find(s => s._id === value);
      if (selectedStrategy) {
          currentConfig.strategyId = value;
          currentConfig.code = selectedStrategy.code;
          currentConfig.params = { ...(selectedStrategy.params || {}), ...currentConfig.params };
      }
    }
    updatedStrategies[index] = currentConfig;
    setComboData(prev => ({ ...prev, strategies: updatedStrategies }));
  };

  const addStrategyCard = () => {
    const defaultStrategy = strategyOptions[0] || {};
    setComboData(prev => ({ ...prev, strategies: [...prev.strategies, { strategyId: defaultStrategy._id || "", code: defaultStrategy.code || "", params: {} }] }));
  };

  const removeStrategyCard = (index) => {
    if (comboData.strategies.length <= 1) return;
    setComboData(prev => ({ ...prev, strategies: prev.strategies.filter((_, i) => i !== index) }));
  };

  const handleRun = async (e, isCombo) => {
    e.preventDefault();
    setBacktestResults({ main: null });
    setIsSimulating(true); 
    
    try {
      const res = isCombo ? await runComboBacktest?.(comboData) : await runNewBacktest?.(formData);
      if (res) setBacktestResults(res.combinedResult ? res : { main: res });
    } catch (err) { 
        console.error(err); 
    } finally {
        setIsSimulating(false); 
    }
  };

  const { processedData, combinedMetrics, mainResult, warmupRemovedCount, exitReasons, exitReasonData, actualStartDate, actualEndDate } = useMemo(() => {
    // 1. Extract the payload properly
    const rootData = backtestResults.main || backtestResults.combinedResult || backtestResults;
    const res = rootData.combinedResult || rootData; 

    // 2. Safety Check: If no metrics, return empty
    if (!res || !res.metrics) return { processedData: [], combinedMetrics: null, mainResult: null };

    // 3. Prepare Chart Data
    // We need to map the Equity Curve (Balance) to the Price Data (Buy & Hold benchmark)
    const curve = (res.equityCurve || []).map((p) => {
        const pTime = new Date(p.timestamp).getTime();

        // 🟢 FIX 1: Handle the "time" key correctly
        // The backend sends 'time', but your old code looked for 'timestamp' inside candleData
        const candle = res.candleData?.find(c => {
            const cStr = c.time || c.timestamp || c.datetime; // Check ALL possible keys
            return new Date(cStr).getTime() === pTime;
        });

        const initialBalance = activeTab === 'single' ? formData.initialBalance : comboData.initialBalance;
        
        // 🟢 FIX 2: Better Fallback for Start Price
        // If candleData[0] is missing, default to 1 to prevent division by zero
        const startPrice = res.candleData?.[0]?.close || 1; 
        
        // If we found a matching candle, use its close. Otherwise use startPrice.
        const currentPrice = candle ? candle.close : startPrice;
        
        // Calculate Buy & Hold benchmark
        const buyHold = (currentPrice / startPrice) * initialBalance;

        return { 
            timestamp: pTime, 
            balance: p.balance, 
            buyHold: buyHold 
        };
    });

    // 4. Filter Trades (Keep your existing logic)
    const firstPoint = res.equityCurve?.[0]?.timestamp;
    const dataStartTime = firstPoint ? new Date(firstPoint).getTime() : 0;
    
    const filteredTrades = (res.tradeBreakdown || []).filter(t => new Date(t.entryTime).getTime() >= dataStartTime);
    
    // 🟢 FIX 3: Use the robust metrics calculator we fixed earlier
    const recomputedMetrics = computeMetricsFromTrades(filteredTrades, activeTab === 'single' ? formData.initialBalance : comboData.initialBalance);

    const reasons = filteredTrades.reduce((acc, t) => {
        const reason = t.reason || t.type || "Signal"; // Support 'reason' key from Python
        acc[reason] = (acc[reason] || 0) + 1;
        return acc;
    }, {});
    
    const exitReasonData = Object.entries(reasons).map(([name, value]) => ({ name, value }));
    const filteredResult = { ...res, tradeBreakdown: filteredTrades, metrics: recomputedMetrics };

    return { 
        processedData: curve, 
        combinedMetrics: recomputedMetrics, 
        mainResult: filteredResult, 
        warmupRemovedCount: 0, 
        exitReasons: Object.entries(reasons).map(([name, value]) => ({ name, value })),
        exitReasonData,
        actualStartDate: firstPoint ? formatDate(firstPoint) : (activeTab === 'single' ? formData.startDate : comboData.startDate),
        actualEndDate: res.equityCurve?.[res.equityCurve.length - 1]?.timestamp ? formatDate(res.equityCurve[res.equityCurve.length - 1].timestamp) : ""
    };
  }, [backtestResults, activeTab, formData, comboData]);
    const filteredTrades = (res.tradeBreakdown || []).filter(t => new Date(t.entryTime).getTime() >= dataStartTime);
    const recomputedMetrics = computeMetricsFromTrades(filteredTrades, activeTab === 'single' ? formData.initialBalance : comboData.initialBalance);

    const reasons = filteredTrades.reduce((acc, t) => {
        const reason = t.type || "Signal"; 
        acc[reason] = (acc[reason] || 0) + 1;
        return acc;
    }, {});
    
    const exitReasonData = Object.entries(reasons).map(([name, value]) => ({ name, value }));
    const filteredResult = { ...res, tradeBreakdown: filteredTrades, metrics: recomputedMetrics };

    return { 
        processedData: curve, combinedMetrics: recomputedMetrics, mainResult: filteredResult, warmupRemovedCount: 0, 
        exitReasons: Object.entries(reasons).map(([name, value]) => ({ name, value })),
        exitReasonData,
        actualStartDate: firstPoint ? formatDate(firstPoint) : (activeTab === 'single' ? formData.startDate : comboData.startDate),
        actualEndDate: lastPoint ? formatDate(lastPoint) : (activeTab === 'single' ? formData.endDate : comboData.endDate)
    };
  }, [backtestResults, activeTab, formData, comboData]);

  const pieData = useMemo(() => {
    if (!combinedMetrics) return [];
    return [{ name: "Wins", value: combinedMetrics.winningTrades }, { name: "Losses", value: combinedMetrics.losingTrades }];
  }, [combinedMetrics]);

  const inputClass = "w-full bg-[#0a0a0a] border border-white/10 rounded-xl px-4 py-3 text-white focus:border-emerald-500 transition-colors";

  return (
    <div className="backtest-container">
      {/* ... Header ... */}
      <div className="container mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl shadow-lg shadow-emerald-500/20">
                <span className="text-2xl">📈</span>
              </div>
              <div>
                <h1 className="header mb-0" style={{marginBottom:0, fontSize:'2rem'}}>Strategy Backtester</h1>
                <p className="text-neutral-400 text-sm">Advanced Performance Testing Platform</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="px-4 py-2 bg-black/50 rounded-xl border border-white/10">
                <span className="text-neutral-400 text-sm">API Connected</span>
                <span className="ml-2 w-2 h-2 bg-emerald-500 rounded-full inline-block animate-pulse"></span>
              </div>
            </div>
          </div>
      </div>

      <div className="container mx-auto">
        <div className="grid grid-cols-12 gap-8">
          <div className="col-span-12 lg:col-span-5">
            <div className="bot-card sticky top-6">
              <div className="panel-header flex items-center gap-3">
                <span className="text-emerald-400 text-lg">⚙️</span>
                <h2 className="card-title">Configuration</h2>
              </div>
              
              {/* 🟢 OPTIMIZER DROPDOWN */}
              <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-500/30 rounded-xl p-4 mb-6">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-emerald-400 flex items-center gap-2 font-semibold text-sm">
                    🏆 Load Alpha Strategy
                  </label>
                  <button onClick={fetchWinners} disabled={scanningWinners} className="text-emerald-400 hover:text-emerald-300 transition-colors disabled:opacity-50">
                    {scanningWinners ? '...' : '🔄'}
                  </button>
                </div>
                <select value={selectedWinnerId} onChange={handleWinnerSelect} className={inputClass}>
                  <option value="">-- Select Golden Strategy --</option>
                  {liveWinners.map(w => {
                      const id = w.botId || w.id;
                      const roi = w.roi ? (w.roi * 100).toFixed(0) : "0";
                      const label = `${w.symbol} (ROI: ${roi}%)`; 
                      return <option key={id} value={id}>{label}</option>;
                  })}
                </select>
              </div>

              <div className="tabs">
                <button className={activeTab === 'single' ? 'active' : ''} onClick={() => setActiveTab('single')}>Single Strategy</button>
                <button className={activeTab === 'combo' ? 'active' : ''} onClick={() => setActiveTab('combo')}>Combo Strategy</button>
              </div>

              <form onSubmit={(e) => handleRun(e, activeTab === 'combo')}>
                {activeTab === 'single' ? (
                  <>
                    <div className="form-grid mb-6">
                      <div className="setup-selector">
                        <label className="text-neutral-400">⚡ Strategy Type</label>
                        <select name="strategyId" value={formData.strategyId} onChange={(e) => handleFormChange(e, setFormData)} className={inputClass}>
                            <option value="">-- Select TA Strategy --</option>
                            {strategyOptions.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                        </select>
                      </div>
                    </div>
                    {/* ✅ Pass availableModels */}
                    <CommonBacktestInputs data={formData} onChange={(e) => handleFormChange(e, setFormData)} options={{ symbolOptions, timeframeOptions, modelOptions: availableModels }} />
                  </>
                ) : (
                  <>
                    {/* ✅ Pass availableModels */}
                    <CommonBacktestInputs data={comboData} onChange={handleComboChange} options={{ symbolOptions, timeframeOptions, modelOptions: availableModels }} isCombo={true} />
                    <div className="space-y-4 mb-6">
                      <label className="metric-label">Strategy Layers</label>
                      {comboData.strategies.map((config, idx) => (
                        <ComboStrategyCard key={idx} idx={idx} config={config} strategies={strategyOptions} onChange={handleStrategyConfigChange} onRemove={removeStrategyCard} disableRemove={comboData.strategies.length <= 1} />
                      ))}
                      <button type="button" onClick={addStrategyCard} className="w-full py-3 bg-black/40 border border-white/10 rounded-xl text-emerald-400 hover:bg-black/60 hover:border-emerald-500/50 transition-all text-sm font-bold uppercase tracking-wider">+ Add Strategy Layer</button>
                    </div>
                  </>
                )}
                <button type="submit" disabled={loading !== 'idle'} className="button-start">
                  {loading !== 'idle' ? 'Processing...' : '▶ Run Simulation'}
                </button>
              </form>
            </div>
          </div>
          {/* ... Right Column (Results) ... */}
          <div className="col-span-12 lg:col-span-7 space-y-6">
            {(loading !== 'idle' || combinedMetrics || error) ? (
              <>
                {loading !== 'idle' && (
                  <div className="bot-card p-12 flex flex-col items-center justify-center min-h-[400px]">
                    <div className="w-20 h-20 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mb-6"></div>
                    <h3 className="text-white text-xl mb-2 font-bold">{isSimulating ? "Running Backtest..." : "Loading..."}</h3>
                  </div>
                )}
                {loading === 'idle' && combinedMetrics && !error && (
                  <>
                    <div className="flex items-center justify-between mb-6">
                      <div className="px-4 py-2 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-xs text-yellow-400 font-mono font-bold">⚠ Warmup Period: {warmupRemovedCount} bars excluded</div>
                      <div className="flex gap-3">
                        <button onClick={handleSaveStrategy} className="px-4 py-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-lg font-bold text-sm uppercase">💾 Save</button>
                        <button onClick={() => downloadCSV(mainResult.tradeBreakdown)} className="px-4 py-2 bg-teal-500/10 border border-teal-500/30 text-teal-400 rounded-lg font-bold text-sm uppercase">⬇ CSV</button>
                      </div>
                    </div>
                    <MetricsDisplay metrics={combinedMetrics} />
                    <AdvancedMetricsDisplay metrics={combinedMetrics} />
                    
                    {mainResult && mainResult.candleData?.length > 0 && (
                      <div className="bot-card">
                        <div className="panel-header flex items-center justify-between">
                            <div className="flex items-center gap-3"><span className="text-emerald-400 text-lg">📈</span><h3 className="card-title">Price Action & Signals</h3></div>
                            <div className="tabs" style={{margin:0, padding:4}}>
                                <button onClick={() => setChartMode('standard')} className={chartMode === 'standard' ? 'active' : ''} style={{padding: '6px 16px', fontSize: '0.8rem'}}>Standard</button>
                                <button onClick={() => setChartMode('replay')} className={chartMode === 'replay' ? 'active' : ''} style={{padding: '6px 16px', fontSize: '0.8rem'}}>Replay</button>
                            </div>
                        </div>
                        <div style={{height: '850px'}}>
                          {chartMode === 'standard' ? 
                              <ChartIndependent results={mainResult} symbol={activeTab === 'single' ? formData.symbol : comboData.symbol} startDate={actualStartDate} endDate={actualEndDate} /> : 
                              <ChartReplay results={mainResult} symbol={activeTab === 'single' ? formData.symbol : comboData.symbol} startDate={actualStartDate} endDate={actualEndDate} />
                          }
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className="bot-card">
                        <div className="panel-header flex items-center gap-3"><h3 className="card-title">Equity vs Buy & Hold</h3></div>
                        <ResponsiveContainer width="100%" height={300}>
                          <AreaChart data={processedData}>
                            <defs>
                              <linearGradient id="colorEquity" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/><stop offset="95%" stopColor="#10b981" stopOpacity={0}/></linearGradient>
                              <linearGradient id="colorBuyHold" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2}/><stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/></linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#333" opacity={0.5} vertical={false} />
                            <XAxis dataKey="timestamp" tickFormatter={formatChartDate} stroke="#525252" tick={{ fill: '#737373', fontSize: 12 }} />
                            <YAxis domain={['auto', 'auto']} stroke="#525252" tick={{ fill: '#737373', fontSize: 12 }} />
                            <Tooltip contentStyle={{ backgroundColor: '#0a0a0a', border: '1px solid #333', borderRadius: '8px', color: '#fff' }} />
                            <Legend wrapperStyle={{paddingTop: '20px'}}/>
                            <Area type="monotone" dataKey="balance" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorEquity)" name="Strategy" />
                            <Area type="monotone" dataKey="buyHold" stroke="#f59e0b" strokeWidth={2} strokeDasharray="5 5" fillOpacity={1} fill="url(#colorBuyHold)" name="Buy & Hold" />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="bot-card">
                        <div className="panel-header flex items-center gap-3"><h3 className="card-title">Trade Outcomes</h3></div>
                        <div className="grid grid-cols-2 gap-4 h-[300px]">
                            <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={5} stroke="none">{pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}</Pie><Tooltip contentStyle={{ backgroundColor: '#0a0a0a', borderColor: '#333' }} /><Legend wrapperStyle={{ color: '#a3a3a3', fontSize: '11px', bottom: 0 }} /></PieChart></ResponsiveContainer>
                            <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={exitReasonData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={5} stroke="none">{exitReasonData.map((entry, index) => <Cell key={`reason-${index}`} fill={REASON_COLORS[index % REASON_COLORS.length]} />)}</Pie><Tooltip contentStyle={{ backgroundColor: '#0a0a0a', borderColor: '#333' }} /><Legend wrapperStyle={{ color: '#a3a3a3', fontSize: '11px', bottom: 0 }} /></PieChart></ResponsiveContainer>
                        </div>
                      </div>
                    </div>
                    <MonthlyHeatmap equityCurve={processedData} />
                  </>
                )}
                {error && (<div className="bot-card border-red-500/30 bg-red-900/10 text-center"><h3 className="text-red-400 text-lg mb-2 font-bold">Simulation Failed</h3><p className="text-neutral-400">{typeof error === 'object' ? (error.message || JSON.stringify(error)) : String(error)}</p></div>)}
              </>
            ) : (
              <div className="bot-card p-12 flex flex-col items-center justify-center min-h-[600px]">
                <div className="w-20 h-20 bg-gradient-to-br from-emerald-500/20 to-teal-600/20 rounded-2xl flex items-center justify-center mb-6 text-4xl">🏆</div>
                <h3 className="text-white text-xl mb-2 font-bold">Ready to Test Your Strategy</h3>
                <p className="text-neutral-400 text-center max-w-md">Configure your strategy parameters and run a backtest to see detailed performance metrics.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
