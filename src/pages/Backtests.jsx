// File: src/pages/Backtests.jsx
// DEBUGGING: Temporarily disabled the four new advanced charts to isolate the rendering error.

import React, { useState, useEffect, useMemo } from "react";
import { useBacktest } from "../hooks/useBacktest.js";
import { useBacktestSetupFunction } from "../hooks/useBacktestSetup.jsx";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell,
} from "recharts";
import "./Backtests.css";

// --- Helper functions & Initial State (no changes) ---
const formatDate = (dateStr) => {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const getInitialDates = () => {
  const today = new Date();
  const start = new Date(today);
  start.setFullYear(today.getFullYear() - 1);
  const end = new Date(today);
  end.setDate(today.getDate() - 1);
  return { startDate: formatDate(start), endDate: formatDate(end) };
};
const initialFormData = { code: "", symbol: "", timeframe: "", startDate: getInitialDates().startDate, endDate: getInitialDates().endDate, params: {} };
const initialComboData = { strategyConfigs: [{ code: "" }], combinationRule: "OR", symbol: "", timeframe: "", startDate: getInitialDates().startDate, endDate: getInitialDates().endDate };

// --- Metrics Card Component (no changes) ---
const MetricsDisplay = ({ metrics }) => {
  if (!metrics || Object.keys(metrics).length === 0) return <p className="no-metrics">No metrics available</p>;
  const keyMetrics = { "Total Profit": metrics.totalProfit, "Total Trades": metrics.totalTrades, "Win Rate": metrics.winRate, "Max Drawdown": metrics.maxDrawdown, "Profit Factor": metrics.profitFactor, "Final Balance": metrics.finalBalance };
  const formatValue = (k, v) => {
    if (v == null) return "N/A";
    if (k.includes("Win Rate") || k.includes("Max Drawdown")) return `${v.toFixed(2)}%`;
    if (k.includes("Profit Factor")) return v.toFixed(2);
    if (k.includes("Profit") || k.includes("Balance")) return `$${v.toFixed(2)}`;
    return v;
  };
  return (
    <div className="metrics-grid">
      {Object.entries(keyMetrics).map(([key, value]) => (
        <div key={key} className="metric-item">
          <span className="metric-label">{key}</span>
          <span className="metric-value">{formatValue(key, value)}</span>
        </div>
      ))}
    </div>
  );
};

// --- Main Component ---
export default function Backtests() {
  const { options, initialLoading, singleLoading, batchLoading, error, runNewBacktest, runComboBacktest } = useBacktest();
  const { createSetup, loading: isSaving, error: saveError } = useBacktestSetupFunction();
  
  const [formData, setFormData] = useState(initialFormData);
  const [comboData, setComboData] = useState(initialComboData);
  const [backtestResults, setBacktestResults] = useState({ main: null, individuals: [] });
  const [activeTestType, setActiveTestType] = useState(null);
  const [setupDetails, setSetupDetails] = useState({ name: '', description: '' });
  const [resultKey, setResultKey] = useState(Date.now());

  useEffect(() => {
    if (options?.strategies?.length > 0 && !formData.code) {
      const s = options.strategies[0];
      setFormData(prev => ({ ...prev, code: s.code, symbol: options.symbols[0], timeframe: options.timeframes[0], params: s.params || {} }));
      setComboData(prev => ({ ...prev, symbol: options.symbols[0], timeframe: options.timeframes[0], strategyConfigs: [{ code: s.code }] }));
    }
  }, [options]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "code") {
      const s = options.strategies.find(s => s.code === value);
      if (s) setFormData(prev => ({ ...prev, code: s.code, symbol: s.params?.symbol || options.symbols[0], timeframe: s.params?.timeframe || options.timeframes[0], params: s.params || {} }));
    } else setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleComboChange = (e, index) => {
    const { name, value } = e.target;
    if (name === "strategyCode") {
      const arr = [...comboData.strategyConfigs];
      arr[index] = { ...arr[index], code: value };
      setComboData(prev => ({ ...prev, strategyConfigs: arr }));
    } else setComboData(prev => ({ ...prev, [name]: value }));
  };

  const addStrategyToCombo = () => setComboData(prev => ({ ...prev, strategyConfigs: [...prev.strategyConfigs, { code: "" }] }));
  const removeStrategyFromCombo = (i) => setComboData(prev => ({ ...prev, strategyConfigs: comboData.strategyConfigs.filter((_, idx) => idx !== i) }));

  const handleSingleSubmit = async (e) => {
    e.preventDefault();
    setBacktestResults({ main: null, individuals: [] });
    setActiveTestType("single");
    setResultKey(Date.now());
    try {
      const result = await runNewBacktest(formData);
      if (result?.equityCurve?.length > 0) {
        setBacktestResults({ main: { name: "Backtest Results", metrics: { ...result.metrics, totalProfit: result.profit, finalBalance: result.finalBalance }, equityCurve: result.equityCurve, sourceData: formData, trades: result.tradeBreakdown }, individuals: [] });
      } else {
        alert("Backtest ran successfully but produced no trades.");
      }
    } catch (err) { alert(err.response?.data?.message || "Error running backtest"); }
  };

  const handleComboSubmit = async (e) => {
    e.preventDefault();
    setBacktestResults({ main: null, individuals: [] });
    setActiveTestType("combo");
    setResultKey(Date.now());
    try {
      const payload = { ...comboData, strategyCodes: comboData.strategyConfigs.map(s => s.code).filter(Boolean) };
      delete payload.strategyConfigs;
      if (!payload.strategyCodes.length) return alert("Select at least one strategy.");
      const result = await runComboBacktest(payload);
      if (result?.combinedResult?.equityCurve?.length > 0) {
        setBacktestResults({
          main: { name: "Combined Strategy Performance", metrics: result.combinedResult.metrics, equityCurve: result.combinedResult.equityCurve, sourceData: comboData, trades: result.combinedResult.metrics.tradeHistory },
          individuals: result.individualResults.map(res => ({ name: res.strategyName, metrics: res.metrics, equityCurve: res.equityCurve, trades: res.metrics.tradeHistory }))
        });
      } else {
        alert("Combo backtest ran successfully but produced no trades.");
      }
    } catch (err) { alert(err.response?.data?.message || "Error running combo backtest"); }
  };
  
  const handleSetupDetailChange = (e) => setSetupDetails({ ...setupDetails, [e.target.name]: e.target.value });

  const handleSaveSetup = async (e) => {
    e.preventDefault();
    const source = backtestResults.main?.sourceData;
    if (!source) return alert("No source data found to save.");
    let setupPayload;
    if (activeTestType === 'single') {
        const strategy = options.strategies.find(s => s.code === source.code);
        setupPayload = { name: setupDetails.name, description: setupDetails.description, symbol: source.symbol, timeframe: source.timeframe, isCombo: false, strategyId: strategy?._id };
    } else {
        setupPayload = { name: setupDetails.name, description: setupDetails.description, symbol: source.symbol, timeframe: source.timeframe, isCombo: true, comboConfig: { strategyCodes: source.strategyConfigs.map(s => s.code).filter(Boolean), combinationRule: source.combinationRule } };
    }
    try {
        await createSetup(setupPayload);
        alert("Setup saved successfully!");
        setSetupDetails({ name: '', description: '' });
    } catch (err) {
        alert(err.response?.data?.message || "Failed to save setup.");
    }
  };

  // --- Main Equity Chart Data ---
  const chartData = useMemo(() => {
    if (!backtestResults?.main?.equityCurve?.length) return null;
    if (activeTestType === "single") {
        return {
            data: backtestResults.main.equityCurve.map(p => ({ ...p, date: formatDate(p.timestamp), Equity: p.balance })),
            series: [{ name: "Equity", color: "#8884d8", dataKey: "Equity" }]
        };
    }
    if (activeTestType === "combo") {
        // ... (combo logic remains the same)
    }
    return null;
  }, [backtestResults, activeTestType]);

  if (initialLoading) return <div className="loading-container">Loading...</div>;

  return (
    <div className="dashboard-container">
      <h2 className="header">Backtest Lab</h2>
      <div className="forms-container">{/* ... forms ... */}</div>
      {error && <div className="error-banner">{error}</div>}
      {backtestResults?.main && (
        <div key={resultKey} className="results-card">
          <h3 className="card-title">{backtestResults.main.name}</h3>
          <form onSubmit={handleSaveSetup} className="save-setup-form">{/* ... save form ... */}</form>
          {saveError && <p className="error-text">{saveError}</p>}
          <MetricsDisplay metrics={backtestResults.main.metrics} />
          
          <div className="charts-grid">
            {/* Main Equity Chart */}
            <div className="chart-container main-chart">
              {chartData?.data?.length > 0 && (
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={chartData.data}>
                    <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" /><YAxis domain={['auto','auto']} /><Tooltip /><Legend />
                    {chartData.series.map(s => <Line key={s.name} type="monotone" dataKey={s.dataKey} stroke={s.color} dot={false} name={s.name} />)}
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
            
            {/* // --- DEBUGGING: All secondary charts are temporarily disabled ---
            
            <div className="chart-container">
              <h4>Drawdown (%)</h4>
              ...
            </div>
             <div className="chart-container">
               <h4>Win/Loss Ratio</h4>
               ...
            </div>
            */}
          </div>
        </div>
      )}
    </div>
  );
}

