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

// Metrics Calculator Logic
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

// --- MAIN INPUTS COMPONENT ---
const CommonBacktestInputs = ({ data, onChange, options, isCombo = false }) => {
    const handleGlobalChange = (e) => onChange(e);
    const handleParamChange = (e) => {
      const { name, value, type } = e.target;
      let val = type === 'number' ? (isNaN(parseFloat(value)) ? '' : parseFloat(value)) : value;
      onChange({ target: { name: `param_${name}`, value: val, type } });
    };
    const params = data.params || {};
    const inputClass = "w-full bg-[#0a0a0a] border border-white/10 rounded-xl px-4 py-3 text-white focus:border-emerald-500 transition-colors";
    const safeVal = (v) => (v === null || v === undefined || isNaN(v)) ? '' : v;
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
                    {safeModels.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
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
        {/* Advanced Filters Card omitted for brevity but logic remains same */}
      </>
    );
};

const ComboStrategyCard = ({ idx, config, strategies = [], onChange, onRemove, disableRemove }) => {
  const handleChange = (e) => onChange(e, idx);
  const inputClass = "w-full bg-[#0a0a0a] border border-white/10 rounded-xl px-4 py-3 text-white focus:border-emerald-500 transition-colors text-sm";
  return (
    <div className="bot-card p-4 hover:border-emerald-500/40 transition-all mb-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2"><div className="w-8 h-8 bg-gradient-to-br from-emerald-500/20 to-teal-500/20 rounded-lg flex items-center justify-center"><span className="text-emerald-400 font-bold">{idx + 1}</span></div><span className="text-white font-bold">Strategy #{idx + 1}</span></div>
        {!disableRemove && <button type="button" onClick={() => onRemove(idx)} className="text-rose-400 hover:text-rose-300 font-bold text-lg">✕</button>}
      </div>
      <select name="strategyId" value={config.strategyId || ""} onChange={handleChange} disabled={!strategies.length} className={inputClass}>
        <option value="">-- Select Strategy --</option>
        {strategies.length ? strategies.map(s => <option key={s._id} value={s._id}>{s.name}</option>) : <option disabled>Loading...</option>}
      </select>
    </div>
  );
};

// --- MAIN COMPONENT ---
export default function Backtests() {
  const { state, runNewBacktest, runComboBacktest, resetBacktest, fetchOptions } = useBacktest(); 
  const { loading = 'idle', options = {} } = state || {};
  const inputClass = "w-full bg-[#0a0a0a] border border-white/10 rounded-xl px-4 py-3 text-white focus:border-emerald-500 transition-colors";

  const [selectedWinnerId, setSelectedWinnerId] = useState("");
  const [formData, setFormData] = useState(initialFormData);
  const [comboData, setComboData] = useState(initialComboData);
  const [backtestResults, setBacktestResults] = useState({ main: null });
  const [activeTab, setActiveTab] = useState('single');
  const [liveWinners, setLiveWinners] = useState([]);
  const [scanningWinners, setScanningWinners] = useState(false);
  const [availableModels, setAvailableModels] = useState([]);
  const [chartMode, setChartMode] = useState('standard'); 
  const [isSimulating, setIsSimulating] = useState(false); 

  useEffect(() => { if (resetBacktest) resetBacktest(); setBacktestResults({ main: null }); }, []);

  // 🟢 LOGS FOR DEBUGGING
  useEffect(() => { console.log("📝 [DEBUG] Single Form State:", formData); }, [formData]);
  useEffect(() => { console.log("📝 [DEBUG] Combo Form State:", comboData); }, [comboData]);

  // 🟢 AUTO-POPULATE SYMBOLS (Clean Logic)
  useEffect(() => {
    if (options?.symbols?.length > 0 && (!formData.symbol || formData.symbol === "00-USD")) {
      const best = options.symbols.find(s => s.includes("BTC")) || options.symbols[0];
      setFormData(prev => ({ ...prev, symbol: best }));
      setComboData(prev => ({ ...prev, symbol: best }));
    }
    if (options?.timeframes?.length > 0 && !formData.timeframe) {
      const bestTF = options.timeframes.find(t => t === "1h") || options.timeframes[0];
      setFormData(prev => ({ ...prev, timeframe: bestTF }));
      setComboData(prev => ({ ...prev, timeframe: bestTF }));
    }
  }, [options]);

  const strategyOptions = useMemo(() => {
    const dbStrats = options?.strategies || [];
    const baseStrats = Object.entries(STRATEGY_TYPE_TO_CODE_MAP).map(([name, code], idx) => ({ _id: `base-${code}-${idx}`, name, code }));
    return [...baseStrats, ...dbStrats];
  }, [options]);

  const symbolOptions = useMemo(() => options?.symbols || [], [options]);
  const timeframeOptions = useMemo(() => options?.timeframes || [], [options]);

  const fetchWinners = async () => {
      setScanningWinners(true);
      try {
        const token = localStorage.getItem("token");
        const headers = { Authorization: `Bearer ${token}` };
        const [resWinners, resModels] = await Promise.all([
            axios.get("https://neov6backend.onrender.com/api/bot/winners", { headers }),
            axios.get("https://neov6backend.onrender.com/api/ml/available-models", { headers })
        ]);
        const winnersArray = Array.isArray(resWinners.data) ? resWinners.data : (resWinners.data.winners || []);
        setLiveWinners(winnersArray);
        setAvailableModels(resModels.data || []);
      } catch (err) { console.error("Fetch Error:", err); } finally { setScanningWinners(false); }
  };
  useEffect(() => { fetchWinners(); }, []);

  // 🛠 FIX: ROBUST STRATEGY MATCHING & AUTO-POPULATION
  const handleWinnerSelect = (e) => {
        const filename = e.target.value; 
        setSelectedWinnerId(filename);
        const selectedWinner = liveWinners.find(w => (w.botId || w.id) === filename);
        if (!selectedWinner) return;

        const data = selectedWinner.config || selectedWinner;
        // 🟢 FIX: Handle Symbol & Timeframe Formatting
        const symbol = (data.symbol || "BTC-USD").replace('/', '-');
        const timeframe = data.timeframe || "1h";

        const rawStrategies = data.strategies || [];
        const strategies = rawStrategies.map(s => {
            const code = (typeof s === 'string' ? s : (s.code || "unknown"));
            const matchingOption = strategyOptions.find(opt => opt.code === code);
            return { strategyId: matchingOption?._id || "", code, params: s.params || {} };
        });

        const isCombo = strategies.length > 1;
        setActiveTab(isCombo ? 'combo' : 'single');

        const updatePayload = {
            symbol,
            timeframe,
            mlMode: data.mlMode || "predictions",
            mlModel: data.mlModel || "btc_1h_lightgbm_model",
            mlThreshold: parseFloat(data.mlThreshold) || 0.5,
            params: { ...defaultFilterParams, ...data.params },
            riskManagementMode: data.riskManagementMode || 'static',
            riskPercentage: Number(data.riskPercentage) || 1
        };

        // 🟢 FORCE UPDATE BOTH FORMS
        setFormData(prev => ({ ...prev, ...updatePayload, strategyId: strategies[0]?.strategyId, code: strategies[0]?.code }));
        setComboData(prev => ({ ...prev, ...updatePayload, strategies, comboConfig: data.comboConfig || { combinationRule: 'OR' } }));
  };

  const handleRun = async (e, isCombo) => {
    e.preventDefault();
    setBacktestResults({ main: null });
    setIsSimulating(true); 
    const payload = isCombo ? comboData : formData;
    console.log("🚀 [DEBUG] Final Payload Sent to API:", payload);
    try {
      const res = isCombo ? await runComboBacktest?.(comboData) : await runNewBacktest?.(formData);
      if (res) setBacktestResults(res.combinedResult ? res : { main: res });
    } catch (err) { console.error("Backtest Failed:", err); } finally { setIsSimulating(false); }
  };

  const { processedData, combinedMetrics, mainResult } = useMemo(() => {
    const rootData = backtestResults.main || backtestResults.combinedResult || backtestResults;
    const res = rootData.combinedResult || rootData; 
    if (!res || !res.metrics) return { processedData: [], combinedMetrics: null, mainResult: null };

    const normalizedTrades = (res.tradeBreakdown || res.trades || []).map(t => ({ ...t, entryTime: t.entry_time || t.entryTime, exitTime: t.exit_time || t.exitTime, profit: t.profit || 0 }));
    const curve = (res.equityCurve || []).map((p) => ({ timestamp: new Date(p.timestamp || p.time).getTime(), balance: p.balance, buyHold: 1000 }));
    const startBal = activeTab === 'single' ? formData.initialBalance : comboData.initialBalance;
    const localMetrics = computeMetricsFromTrades(normalizedTrades, startBal);

    const finalMetrics = {
        totalReturn: res.metrics.roi || res.metrics.totalReturn || localMetrics.totalReturn,
        maxDrawdown: res.metrics.maxDrawdown || res.metrics.max_drawdown || localMetrics.maxDrawdown,
        winRate: res.metrics.winRate || res.metrics.win_rate || localMetrics.winRate,
        totalTrades: res.metrics.totalTrades || res.metrics.total_trades || localMetrics.totalTrades,
        finalBalance: res.metrics.finalBalance || localMetrics.finalBalance,
        profitFactor: (res.metrics.profitFactor > 0) ? res.metrics.profitFactor : localMetrics.profitFactor,
        sharpeRatio: (res.metrics.sharpeRatio > 0) ? res.metrics.sharpeRatio : localMetrics.sharpeRatio,
        sortinoRatio: (res.metrics.sortinoRatio > 0) ? res.metrics.sortinoRatio : localMetrics.sortinoRatio,
        averageWin: (res.metrics.averageWin && res.metrics.averageWin !== 0) ? res.metrics.averageWin : localMetrics.averageWin,
        averageLoss: (res.metrics.averageLoss && res.metrics.averageLoss !== 0) ? res.metrics.averageLoss : localMetrics.averageLoss,
        expectancy: (res.metrics.expectancy && res.metrics.expectancy !== 0) ? res.metrics.expectancy : localMetrics.expectancy,
        maxLosingStreak: (res.metrics.maxLosingStreak > 0) ? res.metrics.maxLosingStreak : localMetrics.maxLosingStreak,
        avgHoldTime: (res.metrics.avgHoldTime > 0) ? res.metrics.avgHoldTime : localMetrics.avgHoldTime,
        winningTrades: localMetrics.winningTrades,
        losingTrades: localMetrics.losingTrades
    };

    return { processedData: curve, combinedMetrics: finalMetrics, mainResult: { ...res, tradeBreakdown: normalizedTrades, metrics: finalMetrics } };
  }, [backtestResults, activeTab, formData, comboData]);
    
  const pieData = useMemo(() => !combinedMetrics ? [] : [{ name: "Wins", value: combinedMetrics.winningTrades }, { name: "Losses", value: combinedMetrics.losingTrades }], [combinedMetrics]);

  return (
    <div className="backtest-container">
      <div className="container mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl shadow-lg"> <span className="text-2xl">📈</span> </div>
              <div><h1 className="header" style={{fontSize:'2rem', margin:0}}>Strategy Backtester</h1><p className="text-neutral-400 text-sm">Advanced Performance Testing Platform</p></div>
            </div>
            <div className="px-4 py-2 bg-black/50 rounded-xl border border-white/10"><span className="text-neutral-400 text-sm">API Connected</span><span className="ml-2 w-2 h-2 bg-emerald-500 rounded-full inline-block animate-pulse"></span></div>
          </div>
      </div>

      <div className="container mx-auto">
        <div className="grid grid-cols-12 gap-8">
          <div className="col-span-12 lg:col-span-5">
            <div className="bot-card sticky top-6">
              <div className="panel-header flex items-center gap-3"> <span className="text-emerald-400 text-lg">⚙️</span> <h2 className="card-title">Configuration</h2> </div>
              <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-500/30 rounded-xl p-4 mb-6">
                <div className="flex items-center justify-between mb-3"> <label className="text-emerald-400 font-semibold text-sm"> 🏆 Load Alpha Strategy </label> <button onClick={fetchWinners} disabled={scanningWinners} className="text-emerald-400 disabled:opacity-50"> {scanningWinners ? '...' : '🔄'} </button> </div>
                <select value={selectedWinnerId} onChange={handleWinnerSelect} className={inputClass}>
                  <option value="">-- Select Golden Strategy --</option>
                  {liveWinners.map(w => {
                      const id = w.botId || w.id;
                      // 🟢 FIXED: Check totalReturn if ROI is 0
                      const roiValue = w.roi || w.metrics?.totalReturn || w.metrics?.roi || 0;
                      return <option key={id} value={id}>{`${w.symbol || "Strategy"} (ROI: ${(roiValue * 100).toFixed(0)}%)`}</option>;
                  })}
                </select>
              </div>
              <div className="tabs"> <button className={activeTab === 'single' ? 'active' : ''} onClick={() => setActiveTab('single')}>Single Strategy</button> <button className={activeTab === 'combo' ? 'active' : ''} onClick={() => setActiveTab('combo')}>Combo Strategy</button> </div>
              <form onSubmit={(e) => handleRun(e, activeTab === 'combo')}>
                {activeTab === 'single' ? (
                  <>
                    <div className="form-grid mb-6"> <div className="setup-selector"> <label className="text-neutral-400">⚡ Strategy Type</label> <select name="strategyId" value={formData.strategyId} onChange={(e) => handleFormChange(e, setFormData)} className={inputClass}> <option value="">-- Select TA Strategy --</option> {strategyOptions.map(s => <option key={s._id} value={s._id}>{s.name}</option>)} </select> </div> </div>
                    <CommonBacktestInputs data={formData} onChange={(e) => handleFormChange(e, setFormData)} options={{ symbolOptions, timeframeOptions, modelOptions: availableModels }} />
                  </>
                ) : (
                  <>
                    <CommonBacktestInputs data={comboData} onChange={handleComboChange} options={{ symbolOptions, timeframeOptions, modelOptions: availableModels }} isCombo={true} />
                    <div className="space-y-4 mb-6"> <label className="metric-label">Strategy Layers</label> {comboData.strategies.map((config, idx) => ( <ComboStrategyCard key={idx} idx={idx} config={config} strategies={strategyOptions} onChange={handleStrategyConfigChange} onRemove={removeStrategyCard} disableRemove={comboData.strategies.length <= 1} /> ))} <button type="button" onClick={addStrategyCard} className="w-full py-3 bg-black/40 border border-white/10 rounded-xl text-emerald-400 text-sm font-bold uppercase tracking-wider">+ Add Strategy Layer</button> </div>
                  </>
                )}
                <button type="submit" disabled={loading !== 'idle'} className="button-start"> {loading !== 'idle' ? 'Processing...' : '▶ Run Simulation'} </button>
              </form>
            </div>
          </div>
          <div className="col-span-12 lg:col-span-7 space-y-6">
            {combinedMetrics ? (
              <>
                <MetricsDisplay metrics={combinedMetrics} />
                <AdvancedMetricsDisplay metrics={combinedMetrics} />
                {mainResult && mainResult.equityCurve && (
                  <div className="bot-card">
                    <div style={{height: '850px'}}>
                      <ChartIndependent results={mainResult} symbol={activeTab === 'single' ? formData.symbol : comboData.symbol} />
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="bot-card p-12 flex flex-col items-center justify-center min-h-[600px]"> <div className="w-20 h-20 bg-gradient-to-br from-emerald-500/20 to-teal-600/20 rounded-2xl flex items-center justify-center mb-6 text-4xl">🏆</div> <h3 className="text-white text-xl mb-2 font-bold">Ready to Test Your Strategy</h3> <p className="text-neutral-400 text-center max-w-md">Select an alpha strategy or build your own to see performance metrics.</p> </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
