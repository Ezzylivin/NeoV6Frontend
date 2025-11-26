// File: src/pages/Backtests.jsx
// 🚀 UPGRADE: Fixed Parameter Population. Maps Python keys (min_adx) to React keys (minAdxLevel).

import React, { useState, useEffect, useMemo, useContext, useRef } from "react";
import { useBacktest } from "../hooks/useBacktest.js";
import { StrategyContext } from "../context/StrategyContext.jsx";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from "recharts";
import { ChartReplay } from "../components/ChartReplay.jsx";
import "../components/ChartReplay.css";
import "./Backtests.css";

const COLORS = ["#22c55e", "#ef4444", "#3b82f6", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4", "#10b981"];
const ESTIMATED_DURATION = 60; 

// --- 1. PARAMETER MAPPING (The Rossetta Stone) ---
// Maps Python Optimizer keys -> React UI keys
const PARAM_MAPPING = {
    // Global Filters
    'min_adx': 'minAdxLevel',
    'tsl_mult': 'tslAtrMult',
    'regime_threshold': 'regime_threshold',
    // Strategy Params
    'atr_p': 'atr_period',
    'atr_m': 'atr_multiplier',
    'rsi_len': 'rsi_length',
    'rsi_os': 'oversold_level',
    'rsi_ob': 'overbought_level',
    'bb_len': 'bb_length',
    'bb_std': 'bb_std',
    'cci_len': 'cci_length',
    'cci_os': 'cci_oversold',
    'cci_ob': 'cci_overbought',
    'k_period': 'k_period',
    'd_period': 'd_period',
    'sma_1': 'sma_fast_period',
    'sma_2': 'sma_slow_period',
    'macd_f': 'macd_fast_period',
    'macd_s': 'macd_slow_period',
    'macd_sig': 'macd_signal_period'
};

// --- Helper Functions ---
const normalizeParams = (rawParams) => {
    if (!rawParams) return {};
    const normalized = {};
    Object.entries(rawParams).forEach(([key, val]) => {
        const uiKey = PARAM_MAPPING[key] || key;
        normalized[uiKey] = val;
    });
    return normalized;
};

const formatDate = dateString => {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};
const formatChartDate = timestamp => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return '';
    return `${String(date.getMonth() + 1).padStart(2, "0")}/${String(date.getDate()).padStart(2, "0")}`;
};
const getDefaultDates = () => {
  const today = new Date();
  const start = new Date(today); start.setFullYear(today.getFullYear() - 1);
  const end = new Date(today); end.setDate(today.getDate() - 1);
  return { startDate: formatDate(start), endDate: formatDate(end) };
};

// --- Default Parameters ---
const defaultFilterParams = {
    minAtrPct: 0, 
    trendFilterPeriod: 200, 
    minAdxLevel: 0,
    tslAtrMult: 3.5,
    regime_threshold: 25 
};

const initialFormData = {
  strategyId: "", 
  code: "", 
  symbol: "",
  timeframe: "",
  startDate: getDefaultDates().startDate,
  endDate: getDefaultDates().endDate,
  initialBalance: 1000,
  params: { ...defaultFilterParams },
  riskManagementMode: 'standard',
  riskPercentage: 1,
  growthCapitalTarget: 2000,
  mlMode: "off", 
  mlModel: "", 
  mlThreshold: 0.5,
  mlHorizon: 1
};

const initialComboData = {
  strategies: [ 
    { strategyId: "", code: "", params: { tslAtrMult: 3.5 } },
    { strategyId: "", code: "", params: { tslAtrMult: 3.5 } }
  ],
  params: { 
    minAtrPct: 0,
    trendFilterPeriod: 200,
    hybridMode: 'AND',
    minAdxLevel: 0,
    tslAtrMult: 0,
    regime_threshold: 25,
  },
  symbol: "",
  timeframe: "", 
  startDate: getDefaultDates().startDate,
  endDate: getDefaultDates().endDate,
  initialBalance: 1000,
  riskManagementMode: 'standard',
  riskPercentage: 1,
  growthCapitalTarget: 2000,
  mlMode: "off",
  mlModel: "",
  mlThreshold: 0.5,
  mlHorizon: 1
};

const STRATEGY_TYPE_TO_CODE_MAP = {
  "Moving Average Crossover": "sma_crossover",
  "RSI": "rsi_divergence",
  "MACD": "macd_crossover",
  "Stochastic Oscillator": "stochastic_crossover",
  "CCI": "cci_oversold",
  "Bollinger Bands": "bollinger_bands",
  "Ichimoku Cloud": "ichimoku_cloud",
  "ATR": "atr_breakout", 
  "On-Balance Volume": "obv_signal",
  "Parabolic SAR": "psar_signal"
};

// Child components...
// Equity curve chart component
const EquityCurveChart = ({ curve, height = 260 }) => {
  const minPv = Math.min(...curve.map(p => p.portfolioValue));
  const maxPv = Math.max(...curve.map(p => p.portfolioValue));

  return (
    <div className="equity-curve-container">
      <h3>Equity Curve</h3>
      {curve.length === 0 ? (
        <p>No equity curve to display</p>
      ) : (
        <ResponsiveContainer width="100%" height={height}>
          <LineChart data={curve}>
            <CartesianGrid stroke="#333" strokeDasharray="3 3" />
            <XAxis dataKey="timestamp" tickFormatter={formatChartDate} />
            <YAxis
              tickFormatter={(v) => v.toLocaleString()}
              domain={[minPv, maxPv]}
            />
            <Tooltip
              labelFormatter={(label) => {
                const date = new Date(label);
                return isNaN(date.getTime()) ? label : date.toLocaleDateString();
              }}
              formatter={(value, name) => {
                if (typeof value === "number") return [value.toLocaleString(), name];
                return [value, name];
              }}
            />
            <Line
              type="monotone"
              dataKey="portfolioValue"
              stroke="#4ade80"
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
};

const WinLossPieChart = ({ data }) => (
  <div className="mt-6">
    <h3 className="text-lg font-semibold text-green-400">Win/Loss Breakdown</h3>
    <div className="w-full flex justify-center">
      <ResponsiveContainer width="60%" height={260}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            outerRadius={90}
            fill="#8884d8"
            dataKey="value"
            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(1)}%`}
          >
            {data.map((_, index) => (
              <Cell key={`slice-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  </div>
);

const MetricsDisplay = ({ metrics }) => {
  const formatNumber = (num, decimals = 2) => {
    if (num === null || num === undefined || Number.isNaN(num)) return "-";
    return Number(num).toFixed(decimals);
  };
  return (
    <div className="mt-6">
      <h3 className="text-lg font-semibold text-green-400">Performance Metrics</h3>
      <div className="metrics-grid">
        <div className="metric-box">Return %: {formatNumber(metrics.returnPct)}</div>
        <div className="metric-box">Win Rate: {formatNumber(metrics.winRate)}%</div>
        <div className="metric-box">Max Drawdown: {formatNumber(metrics.maxDrawdown)}%</div>
        <div className="metric-box">Sharpe Ratio: {formatNumber(metrics.sharpe)}</div>
        <div className="metric-box">Profit Factor: {formatNumber(metrics.profitFactor)}</div>
        <div className="metric-box">Total Trades: {metrics.totalTrades ?? "-"}</div>
      </div>
    </div>
  );
};

// MAIN PAGE ----------------------------------------------------------
export default function Backtests() {

  const {
    backtestOptions, loading, winners, backtestResults, error, metadata,
    historyPage, totalHistoryPages,
    fetchHistory, getAvailableModels, runBacktest, loadWinner,
  } = useBacktest();

  const { strategyOptions } = useContext(StrategyContext);

  const [activeTab, setActiveTab] = useState('single');
  const [formData, setFormData] = useState(initialFormData);
  const [comboData, setComboData] = useState(initialComboData);
  const [localWinners, setLocalWinners] = useState([]);
  const [selectedWinnerId, setSelectedWinnerId] = useState("");
  const [statusMessage, setStatusMessage] = useState("");

  // progress estimation
  const progressRef = useRef(0);
  const lastUpdateRef = useRef(Date.now());

  useEffect(() => {
    if (loading !== "idle") {
      setStatusMessage(getStatusMessage());
      const interval = setInterval(() => {
        const now = Date.now();
        if (now - lastUpdateRef.current >= 1500) {
          setStatusMessage(getStatusMessage());
          lastUpdateRef.current = now;
        }
      }, 1500);
      return () => clearInterval(interval);
    }
  }, [loading]);

  const getStatusMessage = () => {
    if (loading === "processing") {
      const elapsedSecs = (Date.now() - lastUpdateRef.current) / 1000;
      let progress = progressRef.current + elapsedSecs / ESTIMATED_DURATION;
      if (progress > 1) progress = 1;
      progressRef.current = progress;
      const pct = Math.round(progress * 100);
      if (pct < 20) return "Crunching data...";
      if (pct < 50) return "Optimizing strategy...";
      if (pct < 75) return "Running simulation...";
      if (pct < 99) return "Finalizing results...";
      return "Almost done...";
    }
    if (loading === "fetching_options") return "Loading strategy options...";
    if (loading === "fetching_history") return "Loading backtest history...";
    if (loading === "fetching_winners") return "Loading stored winners...";
    return "";
  };

  // Load winners from backend
  useEffect(() => {
    if (winners?.length) setLocalWinners(winners);
  }, [winners]);

  useEffect(() => {
    getAvailableModels();
  }, [getAvailableModels]);

  // Handle form input
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  // Handle winner selection
  const handleWinnerSelect = (winnerId) => {
    setSelectedWinnerId(winnerId);
    const winner = localWinners.find(w => w.id === winnerId);
    if (winner) {
      loadWinner(winner);
      setStatusMessage(`Loaded winner: ${winner.name}`);
    }
  };

  // Normalize backtest results
  const normalizedResults = backtestResults?.map(r => ({
    ...r,
    portfolioValue: Number(r.portfolioValue),
    timestamp: new Date(r.timestamp),
  })) || [];

  const winLossData = [
    { name: "Wins", value: backtestResults?.filter(r => r.profit > 0).length || 0 },
    { name: "Losses", value: backtestResults?.filter(r => r.profit <= 0).length || 0 },
  ];

  const performanceMetrics = backtestResults?.length
    ? {
        returnPct: ((normalizedResults.at(-1).portfolioValue / normalizedResults[0].portfolioValue - 1) * 100),
        winRate: (winLossData[0].value / (winLossData[0].value + winLossData[1].value)) * 100,
        maxDrawdown: calculateMaxDrawdown(normalizedResults),
        sharpe: calculateSharpeRatio(normalizedResults),
        profitFactor: calculateProfitFactor(normalizedResults),
        totalTrades: normalizedResults.length,
      }
    : {};

  return (
    <div className="backtests-page p-4">
      <h1 className="text-2xl font-bold mb-4">Backtesting</h1>

      {/* Tabs */}
      <div className="tabs mb-6">
        <button
          className={`tab ${activeTab === 'single' ? 'active' : ''}`}
          onClick={() => setActiveTab('single')}
        >
          Single Backtest
        </button>
        <button
          className={`tab ${activeTab === 'combo' ? 'active' : ''}`}
          onClick={() => setActiveTab('combo')}
        >
          Combo Backtest
        </button>
      </div>

      {/* Status */}
      {loading !== "idle" && (
        <div className="status-bar mb-4">{statusMessage}</div>
      )}

      {/* Winner Selection */}
      {localWinners.length > 0 && (
        <div className="winner-selection mb-6">
          <h3>Select a Winner</h3>
          <select
            value={selectedWinnerId}
            onChange={(e) => handleWinnerSelect(e.target.value)}
          >
            <option value="">-- Select --</option>
            {localWinners.map(w => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Backtest Results */}
      {normalizedResults.length > 0 ? (
        <div className="results-section">
          <MetricsDisplay metrics={performanceMetrics} />
          <EquityCurveChart curve={normalizedResults} />
          <WinLossPieChart data={winLossData} />
        </div>
      ) : (
        <p>No backtest results available.</p>
      )}
    </div>
  );
}
