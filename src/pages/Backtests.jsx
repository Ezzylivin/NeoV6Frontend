import React, { useState, useEffect, useMemo } from "react";
import { useBacktest } from "../hooks/useBacktest.js";
import { useBacktestSetupFunction } from "../hooks/useBacktestSetup.jsx";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend, ResponsiveContainer,
} from "recharts";
import "./Backtests.css";

// --- Helper functions for dates (no change) ---
const formatDate = (date) => {
  const d = new Date(date);
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
const initialComboData = { strategyConfigs: [{ code: "" }], combinationRule: "AND", symbol: "", timeframe: "", startDate: getInitialDates().startDate, endDate: getInitialDates().endDate };

// --- Metrics Card Component (no change) ---
const MetricsDisplay = ({ metrics }) => {
  if (!metrics || Object.keys(metrics).length === 0) return <p className="no-metrics">No metrics available</p>;
  const keyMetrics = { "Total Profit": metrics.totalProfit, "Total Trades": metrics.totalTrades, "Win Rate": metrics.winRate, "Max Drawdown": metrics.maxDrawdown, "Profit Factor": metrics.profitFactor, "Final Balance": metrics.finalBalance };
  const formatValue = (k, v) => {
    if (v == null) return "N/A";
    if (k.includes("Win Rate")) return `${v.toFixed(2)}%`;
    if (k.includes("Profit Factor")) return v.toFixed(2);
    if (k.includes("Profit") || k.includes("Drawdown") || k.includes("Balance")) return `$${v.toFixed(2)}`;
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
  const { createSetup, loading: isSaving, error: saveError } = useBacktestSetup();
  
  const [formData, setFormData] = useState(initialFormData);
  const [comboData, setComboData] = useState(initialComboData);
  const [backtestResults, setBacktestResults] = useState({ main: null, individuals: [] });
  const [activeTestType, setActiveTestType] = useState(null);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [setupDetails, setSetupDetails] = useState({ name: '', description: '' });

  useEffect(() => {
    // Safety check for options data
    if (options && options.strategies?.length > 0 && !formData.code) {
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
  
  const handleSingleSubmit = async (e) => {
    e.preventDefault();
    setBacktestResults({ main: null, individuals: [] });
    setActiveTestType("single");
    try {
      const result = await runNewBacktest(formData);
      setBacktestResults({ main: { name: "Backtest Results", metrics: result.metrics || {}, equityCurve: result.equityCurve || [], noTradeReason: result.noTradeReason, sourceData: formData }, individuals: [] });
    } catch (err) { alert(err.response?.data?.message || "Error running backtest"); }
  };

  if (initialLoading) return <div>Loading backtests...</div>;
  if (error) return <div style={{ color: 'red' }}>Error: {error}</div>;

  return (
    <div className="dashboard-container">
      <h2 className="header">Backtests</h2>

      {/* --- Forms --- */}
      <div className="forms-container">
        {/* Single Backtest */}
        <form className="card-row" onSubmit={handleSingleSubmit}>
          <div className="metric-card">
            <h3 className="card-title">Single Backtest</h3>
            <label>Strategy
              <select name="code" value={formData.code} onChange={handleChange} required>
                <option value="">Select strategy</option>
                {options.strategies.map(s => <option key={s.code} value={s.code}>{s.name}</option>)}
              </select>
            </label>
            <label>Symbol
              <select name="symbol" value={formData.symbol} onChange={handleChange} required>
                {options.symbols.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>
            <label>Timeframe
              <select name="timeframe" value={formData.timeframe} onChange={handleChange} required>
                {options.timeframes.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </label>
            <label>Start Date<input type="date" name="startDate" value={formData.startDate} onChange={handleChange} required /></label>
            <label>End Date<input type="date" name="endDate" value={formData.endDate} onChange={handleChange} required /></label>
            <button type="submit" disabled={singleLoading}>{singleLoading ? "Running..." : "Run Backtest"}</button>
          </div>
        </form>

        {/* // --- DEBUGGING: Combo Strategy Builder Temporarily Disabled ---
        <form className="card-row" onSubmit={handleComboSubmit}>
            ...
        </form> 
        */}
      </div>

      {/*
      // --- DEBUGGING: Results Display Temporarily Disabled ---
      {backtestResults.main && (
        ...
      )}
      */}
    </div>
  );
}

