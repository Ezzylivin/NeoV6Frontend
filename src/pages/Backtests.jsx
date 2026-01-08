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
  "CCI": "cci_oversold", "Bollinger Bands": "bollinger_bands", "ATR": "atr_breakout"
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

// Zero-Safe Metrics Fallback
const computeMetricsFromTrades = (trades, initialBalance) => {
    if (!trades || trades.length === 0) return { totalReturn: 0, profitFactor: 0, maxDrawdown: 0, winRate: 0, totalTrades: 0, winningTrades: 0, losingTrades: 0, averageWin: 0, averageLoss: 0, finalBalance: initialBalance, expectancy: 0, sharpeRatio: 0, sortinoRatio: 0, maxLosingStreak: 0, avgHoldTime: 0 };
    let balance = initialBalance;
    let peak = initialBalance;
    let maxDrawdown = 0;
    let wins = 0;
    let totalWin = 0;
    let totalLoss = 0;
    let currentLosingStreak = 0;
    let maxLosingStreak = 0;
    let totalHoldTimeMs = 0;

    trades.forEach(t => {
        balance += t.profit;
        if (balance > peak) peak = balance;
        const dd = (peak - balance) / peak;
        if (dd > maxDrawdown) maxDrawdown = dd;
        if (t.profit > 0) { wins++; totalWin += t.profit; currentLosingStreak = 0; }
        else { totalLoss += Math.abs(t.profit); currentLosingStreak++; if (currentLosingStreak > maxLosingStreak) maxLosingStreak = currentLosingStreak; }
        const entry = new Date(t.entryTime).getTime();
        const exit = new Date(t.exitTime).getTime();
        if (!isNaN(entry) && !isNaN(exit)) totalHoldTimeMs += (exit - entry);
    });

    return {
        totalReturn: ((balance - initialBalance) / initialBalance) * 100,
        profitFactor: totalLoss === 0 ? totalWin : totalWin / totalLoss,
        maxDrawdown: maxDrawdown * 100,
        winRate: (wins / trades.length) * 100,
        totalTrades: trades.length,
        winningTrades: wins,
        losingTrades: trades.length - wins,
        averageWin: wins > 0 ? totalWin / wins : 0,
        averageLoss: (trades.length - wins) > 0 ? totalLoss / (trades.length - wins) : 0,
        finalBalance: balance,
        maxLosingStreak,
        avgHoldTime: totalHoldTimeMs / trades.length / (1000 * 60 * 60)
    };
};

const initialFormData = {
  strategyId: "", code: "", symbol: "", timeframe: "", startDate: getDefaultDates().startDate, endDate: getDefaultDates().endDate,
  initialBalance: 1000, params: { ...defaultFilterParams, maxPyramiding: 1 },
  riskManagementMode: 'static', riskPercentage: 1, growthCapitalTarget: 2000, 
  mlMode: "off", mlModel: "", mlThreshold: 0.5
};

const initialComboData = {
  strategies: [ { strategyId: "", code: "", params: { tslAtrMult: 3.5 } } ],
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

const CommonBacktestInputs = ({ data, onChange, options, activeTab }) => {
    const handleGlobalChange = (e) => onChange(e);
    const inputClass = "w-full bg-[#0a0a0a] border border-white/10 rounded-xl px-4 py-3 text-white focus:border-emerald-500 transition-colors";
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
      </>
    );
};

// --- MAIN PAGE COMPONENT ---
export default function Backtests() {
  const { state, runNewBacktest, runComboBacktest, fetchOptions } = useBacktest(); 
  const { options = {} } = state || {};
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

  useEffect(() => { if (typeof fetchOptions === 'function') fetchOptions(); }, []);

  const fetchWinners = async () => {
      setScanningWinners(true);
      try {
        const token = localStorage.getItem("token");
        const [resWinners, resModels] = await Promise.all([
            axios.get("https://neov6backend.onrender.com/api/bot/winners", { headers: { Authorization: `Bearer ${token}` } }),
            axios.get("https://neov6backend.onrender.com/api/ml/available-models", { headers: { Authorization: `Bearer ${token}` } })
        ]);
        setLiveWinners(Array.isArray(resWinners.data) ? resWinners.data : (resWinners.data.winners || []));
        setAvailableModels(resModels.data || []);
      } catch (err) { console.error("Fetch Error:", err); } finally { setScanningWinners(false); }
  };
  useEffect(() => { fetchWinners(); }, []);

  const symbolOptions = useMemo(() => options?.symbols || [], [options]);
  const timeframeOptions = useMemo(() => options?.timeframes || [], [options]);
  const strategyOptions = useMemo(() => {
    const dbStrats = options?.strategies || [];
    const baseStrats = Object.entries(STRATEGY_TYPE_TO_CODE_MAP).map(([name, code], idx) => ({ _id: `base-${code}-${idx}`, name, code }));
    return [...baseStrats, ...dbStrats];
  }, [options]);

  // 🟢 FIX: FORCED AUTO-POPULATION ON ALPHA STRATEGY SELECTION
  const handleWinnerSelect = (e) => {
    const id = e.target.value;
    setSelectedWinnerId(id);
    const win = liveWinners.find(w => (w.botId || w.id) === id);
    if (!win) return;

    const config = win.config || win;
    const formattedSymbol = (config.symbol || "BTC-USD").replace('/', '-');
    const selectedTimeframe = config.timeframe || "1h";
    
    // Determine strategies and map to available strategy IDs
    const strats = (config.strategies || []).map(s => {
        const code = typeof s === 'string' ? s : (s.code || "unknown");
        const opt = strategyOptions.find(o => o.code === code);
        return { strategyId: opt?._id || "", code, params: s.params || {} };
    });

    // Auto-switch Tab based on strategy count
    setActiveTab(strats.length > 1 ? 'combo' : 'single');

    // Forced Global Update for Metadata
    const metaUpdate = {
        symbol: formattedSymbol,
        timeframe: selectedTimeframe,
        mlMode: config.mlMode || "predictions",
        mlModel: config.mlModel || "btc_1h_lightgbm_model",
        mlThreshold: config.mlThreshold || 0.5,
        params: { ...defaultFilterParams, ...config.params }
    };

    // Update Single Form State
    setFormData(prev => ({ 
        ...prev, 
        ...metaUpdate, 
        strategyId: strats[0]?.strategyId || "", 
        code: strats[0]?.code || "" 
    }));

    // Update Combo Form State
    setComboData(prev => ({ 
        ...prev, 
        ...metaUpdate, 
        strategies: strats, 
        comboConfig: config.comboConfig || { combinationRule: 'OR' } 
    }));
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleComboChange = (e) => {
    const { name, value } = e.target;
    setComboData(prev => ({ ...prev, [name]: value }));
  };

  const handleRun = async (e) => {
    e.preventDefault();
    setBacktestResults(null);
    setIsSimulating(true); 
    const res = activeTab === 'combo' ? await runComboBacktest(comboData) : await runNewBacktest(formData);
    if (res) setBacktestResults(res.combinedResult || res);
    setIsSimulating(false);
  };

  const processed = useMemo(() => {
    if (!backtestResults?.metrics) return null;
    const trades = (backtestResults.tradeBreakdown || backtestResults.trades || []).map(t => ({ ...t, entryTime: t.entry_time || t.entryTime, exitTime: t.exit_time || t.exitTime, profit: t.profit || 0 }));
    const curve = (backtestResults.equityCurve || []).map(p => ({ timestamp: new Date(p.timestamp || p.time).getTime(), balance: p.balance }));
    const initial = activeTab === 'single' ? formData.initialBalance : comboData.initialBalance;
    const local = computeMetricsFromTrades(trades, initial);
    return { curve, metrics: { ...backtestResults.metrics, ...local, totalReturn: backtestResults.metrics.roi || local.totalReturn } };
  }, [backtestResults]);

  return (
    <div className="backtest-container">
      <div className="container mx-auto p-4">
        <div className="grid grid-cols-12 gap-8">
          <div className="col-span-12 lg:col-span-5">
            <div className="bot-card p-6">
              <div className="panel-header mb-6 flex items-center gap-3"> <span className="text-emerald-400 text-lg">⚙️</span> <h2 className="card-title">Configuration</h2> </div>
              <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-500/30 rounded-xl p-4 mb-6">
                <label className="text-emerald-400 font-semibold text-sm block mb-2">🏆 Load Alpha Strategy</label>
                <div className="flex gap-2">
                    <select value={selectedWinnerId} onChange={handleWinnerSelect} className={inputClass}>
                      <option value="">-- Select Golden Strategy --</option>
                      {liveWinners.map(w => <option key={w.botId || w.id} value={w.botId || w.id}>{`${w.symbol || "Strategy"} (ROI: ${(w.roi || w.metrics?.totalReturn || 0).toFixed(0)}%)`}</option>)}
                    </select>
                </div>
              </div>
              <div className="tabs flex gap-2 mb-6"> 
                <button type="button" className={`flex-1 py-3 rounded-xl transition-all ${activeTab === 'single' ? 'bg-emerald-500 text-black font-bold' : 'bg-white/5 text-neutral-400'}`} onClick={() => setActiveTab('single')}>Single Layer</button> 
                <button type="button" className={`flex-1 py-3 rounded-xl transition-all ${activeTab === 'combo' ? 'bg-emerald-500 text-black font-bold' : 'bg-white/5 text-neutral-400'}`} onClick={() => setActiveTab('combo')}>Combo Layers</button> 
              </div>
              <form onSubmit={handleRun}>
                <CommonBacktestInputs data={activeTab === 'single' ? formData : comboData} onChange={activeTab === 'single' ? handleFormChange : handleComboChange} options={{ symbolOptions, timeframeOptions }} activeTab={activeTab} />
                <button type="submit" disabled={isSimulating} className="w-full py-4 bg-emerald-500 text-black font-bold rounded-xl shadow-lg transition-all"> {isSimulating ? 'Processing...' : '▶ Run Simulation'} </button>
              </form>
            </div>
          </div>
          <div className="col-span-12 lg:col-span-7 space-y-6">
            {processed ? (
              <>
                <MetricsDisplay metrics={processed.metrics} />
                <div className="bot-card p-6 h-[500px]"> <ChartIndependent results={processed} symbol={activeTab === 'single' ? formData.symbol : comboData.symbol} /> </div>
              </>
            ) : (
              <div className="bot-card p-12 flex flex-col items-center justify-center min-h-[600px] border-dashed border-2 border-white/5 bg-transparent"> 
                <div className="w-20 h-20 bg-emerald-500/10 rounded-3xl flex items-center justify-center mb-6 text-4xl">🧪</div> 
                <h3 className="text-white text-xl mb-2 font-bold">Strategy Sandbox</h3> 
                <p className="text-neutral-400 text-center max-w-sm">Load an alpha strategy to begin simulation.</p> 
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
