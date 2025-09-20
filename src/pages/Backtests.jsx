import React, { useState, useEffect } from "react";
import { useBacktest } from "../hooks/useBacktest.js";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend, ResponsiveContainer,
} from "recharts";
import "./Backtests.css";

// --- Helper functions for dates (no change) ---
const formatDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getInitialDates = () => {
  const today = new Date();
  const endDate = new Date(today);
  endDate.setDate(today.getDate() - 1);
  const startDate = new Date(today);
  startDate.setFullYear(today.getFullYear() - 1);
  return { startDate: formatDate(startDate), endDate: formatDate(endDate) };
};

// --- Initial state for forms (no change) ---
const initialFormData = {
  code: "", symbol: "", timeframe: "",
  startDate: getInitialDates().startDate,
  endDate: getInitialDates().endDate,
  params: {},
};

const initialComboData = {
  strategyConfigs: [{ code: "" }],
  combinationRule: 'AND',
  symbol: "", timeframe: "",
  startDate: getInitialDates().startDate,
  endDate: getInitialDates().endDate,
};

// --- Metrics Display Component (no change) ---
const MetricsDisplay = ({ metrics }) => {
    if (!metrics || Object.keys(metrics).length === 0) {
        return <p className="no-metrics">No performance metrics available.</p>;
    }

    const formatValue = (key, value) => {
        if (typeof value !== 'number') return String(value);
        if (key.toLowerCase().includes('win rate')) return `${value.toFixed(2)}%`;
        if (key.toLowerCase().includes('factor')) return `${(value * 100).toFixed(2)}%`;
        if (key.toLowerCase().includes('profit') || key.toLowerCase().includes('drawdown') || key.toLowerCase().includes('balance')) return `$${value.toFixed(2)}`;
        return value;
    };
    
    const keyMetrics = {
        "Total Profit": metrics.totalProfit, "Total Trades": metrics.totalTrades, "Win Rate": metrics.winRate,
        "Max Drawdown": metrics.maxDrawdown, "Profit Factor": metrics.profitFactor, "Final Balance": metrics.finalBalance,
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

export default function Backtests() {
  const {
    options, initialLoading, singleLoading, batchLoading, error, runNewBacktest, runComboBacktest,
  } = useBacktest();

  const [formData, setFormData] = useState(initialFormData);
  const [comboData, setComboData] = useState(initialComboData);
  const [backtestResults, setBacktestResults] = useState(null);
  const [activeTestType, setActiveTestType] = useState(null); // ✅ NEW: Track which test was run

  useEffect(() => {
    if (options.strategies?.length > 0 && !formData.code) {
      const firstStrategy = options.strategies[0];
      setFormData((prev) => ({
        ...prev,
        code: firstStrategy.code,
        symbol: firstStrategy.params?.symbol || options.symbols[0] || "",
        timeframe: firstStrategy.params?.timeframe || options.timeframes[0] || "",
        params: firstStrategy.params || {},
      }));
      setComboData(prev => ({
        ...prev,
        symbol: options.symbols[0] || "",
        timeframe: options.timeframes[0] || "",
        strategyConfigs: [{ code: options.strategies[0]?.code || "" }]
      }));
    }
  }, [options.strategies, options.symbols, options.timeframes, formData.code]);

  // --- Handlers (no change) ---
  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "code") {
      const selectedStrategy = options.strategies.find((s) => s.code === value);
      if (selectedStrategy) {
        setFormData((prev) => ({
          ...prev, code: selectedStrategy.code,
          symbol: selectedStrategy.params?.symbol || options.symbols[0] || "",
          timeframe: selectedStrategy.params?.timeframe || options.timeframes[0] || "",
          params: selectedStrategy.params || {},
        }));
      } else {
        setFormData((prev) => ({ ...prev, code: "", symbol: "", timeframe: "", params: {} }));
      }
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleComboChange = (e, index) => {
    const { name, value } = e.target;
    if (name === "strategyCode") {
      const newConfigs = [...comboData.strategyConfigs];
      newConfigs[index] = { ...newConfigs[index], code: value };
      setComboData(prev => ({ ...prev, strategyConfigs: newConfigs }));
    } else {
      setComboData(prev => ({ ...prev, [name]: value }));
    }
  };

  const addStrategyToCombo = () => setComboData(prev => ({ ...prev, strategyConfigs: [...prev.strategyConfigs, { code: "" }] }));
  const removeStrategyFromCombo = (index) => setComboData(prev => ({ ...prev, strategyConfigs: comboData.strategyConfigs.filter((_, i) => i !== index) }));

  // --- Submit Handlers ---
  const handleSingleSubmit = async (e) => {
    e.preventDefault();
    setBacktestResults(null);
    setActiveTestType('single'); // ✅ NEW: Set the active test type
    try {
      const result = await runNewBacktest(formData);
      if (result?.equityCurve?.length > 0) {
        setBacktestResults({
          main: { 
            metrics: { ...result.metrics, totalProfit: result.profit, finalBalance: result.finalBalance }, 
            equityCurve: result.equityCurve 
          },
          individuals: []
        });
      } else {
        alert("Backtest ran successfully but produced no trades.");
      }
    } catch (err) {
      console.error("Single backtest failed:", err);
    }
  };

  const handleComboSubmit = async (e) => {
    e.preventDefault();
    setBacktestResults(null);
    setActiveTestType('combo'); // ✅ NEW: Set the active test type
    try {
      const payload = { ...comboData, strategyCodes: comboData.strategyConfigs.map(s => s.code).filter(Boolean) };
      delete payload.strategyConfigs;
      if (payload.strategyCodes.length < 2) {
        alert("Please select at least two strategies for a combo backtest.");
        return;
      }
      const result = await runComboBacktest(payload);
      if (result?.combinedResult?.metrics?.equityCurve) {
        setBacktestResults({
          main: { 
            metrics: result.combinedResult.metrics, 
            equityCurve: result.combinedResult.metrics.equityCurve 
          },
          individuals: result.individualResults.map(res => ({
            name: res.strategyName,
            metrics: res.metrics,
            equityCurve: res.metrics.equityCurve
          }))
        });
      } else {
        alert("Combo backtest ran successfully but produced no trades.");
      }
    } catch (err) {
      console.error("Combo backtest failed:", err);
    }
  };

  if (initialLoading) return <div>Loading backtests...</div>;
  if (error) return <div style={{ color: 'red' }}>Error: {error}</div>;

  return (
    <div className="dashboard-container">
      <h2 className="header">Backtests</h2>
      {error && <div className="error-banner">{error}</div>}
      
      <div className="forms-container">
        {/* --- Single Backtest Form --- */}
        <form className="card-row" onSubmit={handleSingleSubmit}>
           <div className="metric-card">
             <h3 className="card-title">Single Backtest</h3>
             <label>Strategy
               <select name="code" value={formData.code} onChange={handleChange} required>
                 <option value="">Select strategy</option>
                 {options.strategies.map(s => (<option key={s.code} value={s.code}>{s.name}</option>))}
               </select>
             </label>
             <label>Symbol
               <select name="symbol" value={formData.symbol} onChange={handleChange} required>
                 <option value="">Select symbol</option>
                 {options.symbols.map(s => (<option key={s} value={s}>{s}</option>))}
               </select>
             </label>
             <label>Timeframe
               <select name="timeframe" value={formData.timeframe} onChange={handleChange} required>
                 <option value="">Select timeframe</option>
                 {options.timeframes.map(t => (<option key={t} value={t}>{t}</option>))}
               </select>
             </label>
             <label>Start Date<input type="date" name="startDate" value={formData.startDate} onChange={handleChange} required /></label>
             <label>End Date<input type="date" name="endDate" value={formData.endDate} onChange={handleChange} required /></label>
             <button type="submit" disabled={singleLoading}>{singleLoading ? "Running..." : "Run Backtest"}</button>
           </div>
        </form>

        {/* --- Combo Strategy Builder --- */}
        <form className="card-row" onSubmit={handleComboSubmit}>
          <div className="metric-card">
            <h3 className="card-title">Combo Strategy Builder</h3>
            <div className="combo-strategies-list">
              <h4>Strategies to Combine</h4>
              {comboData.strategyConfigs.map((strategy, index) => (
                <div key={index} className="combo-strategy-item">
                  <select name="strategyCode" value={strategy.code} onChange={(e) => handleComboChange(e, index)} required>
                    <option value="">Select Strategy {index + 1}</option>
                    {options.strategies.map(s => (<option key={s.code} value={s.code}>{s.name}</option>))}
                  </select>
                  {comboData.strategyConfigs.length > 1 && (
                    <button type="button" onClick={() => removeStrategyFromCombo(index)} className="button-remove">X</button>
                  )}
                </div>
              ))}
              <button type="button" onClick={addStrategyToCombo} className="button-add">+ Add Strategy</button>
            </div>
            <label>Combination Rule
              <select name="combinationRule" value={comboData.combinationRule} onChange={handleComboChange} required>
                <option value="AND">AND (All must agree)</option>
                <option value="OR">OR (Any can trigger)</option>
              </select>
            </label>
            <label>Symbol<select name="symbol" value={comboData.symbol} onChange={handleComboChange} required><option value="">Select symbol</option>{options.symbols.map(s => <option key={s} value={s}>{s}</option>)}</select></label>
            <label>Timeframe<select name="timeframe" value={comboData.timeframe} onChange={handleComboChange} required><option value="">Select timeframe</option>{options.timeframes.map(t => <option key={t} value={t}>{t}</option>)}</select></label>
            <label>Start Date<input type="date" name="startDate" value={comboData.startDate} onChange={handleComboChange} required /></label>
            <label>End Date<input type="date" name="endDate" value={comboData.endDate} onChange={handleComboChange} required /></label>
            <button type="submit" disabled={batchLoading}>{batchLoading ? "Running..." : "Run Combo Test"}</button>
          </div>
        </form>
      </div>

      {/* ✅ UPGRADED: Results Display now has robust safety checks and dynamic titles */}
      {backtestResults && (
        <>
          {/* Main Chart & Metrics */}
          {backtestResults.main?.equityCurve && Array.isArray(backtestResults.main.equityCurve) && backtestResults.main.equityCurve.length > 0 && (
            <div className="chart-card">
              <h3>{activeTestType === 'combo' ? 'Combined Strategy Performance' : 'Backtest Results'}</h3>
              <MetricsDisplay metrics={backtestResults.main.metrics} />
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={backtestResults.main.equityCurve}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="timestamp" name="Time" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="balance" name="Equity" stroke="#8884d8" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Individual Charts & Metrics */}
          {backtestResults.individuals?.length > 0 && (
             <div className="individual-charts-container">
                <h3 className="header">Individual Strategy Performance</h3>
                {backtestResults.individuals.map((result, index) => (
                  result?.equityCurve && Array.isArray(result.equityCurve) && result.equityCurve.length > 0 && (
                    <div key={index} className="chart-card">
                        <h4>{result.name}</h4>
                        <MetricsDisplay metrics={result.metrics} />
                        <ResponsiveContainer width="100%" height={250}>
                            <LineChart data={result.equityCurve}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="timestamp" name="Time" />
                                <YAxis />
                                <Tooltip />
                                <Line type="monotone" dataKey="balance" name={result.name} stroke="#82ca9d" />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                  )
                ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
