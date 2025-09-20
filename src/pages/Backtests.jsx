import React, { useState, useEffect } from "react";
import { useBacktest } from "../hooks/useBacktest.js";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
} from "recharts";
import "./Backtests.css";

// --- Helper functions for dates ---
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

// --- Initial state for forms ---
const initialFormData = {
  code: "",
  symbol: "",
  timeframe: "",
  startDate: getInitialDates().startDate,
  endDate: getInitialDates().endDate,
  params: {},
};

const initialComboData = {
  strategyConfigs: [{ code: "" }], // Start with one empty strategy selector
  combinationRule: 'AND',
  symbol: "",
  timeframe: "",
  startDate: getInitialDates().startDate,
  endDate: getInitialDates().endDate,
};

export default function Backtests() {
  const {
    options,
    initialLoading,
    singleLoading,
    batchLoading,
    error,
    runNewBacktest,
    runComboBacktest,
  } = useBacktest();

  const [formData, setFormData] = useState(initialFormData);
  const [comboData, setComboData] = useState(initialComboData);
  const [metricsData, setMetricsData] = useState([]);

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

  // --- Handlers for Single Backtest Form ---
  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "code") {
      const selectedStrategy = options.strategies.find((s) => s.code === value);
      if (selectedStrategy) {
        setFormData((prev) => ({
          ...prev,
          code: selectedStrategy.code,
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

  // --- Handlers for new Combo Strategy Builder ---
  const handleComboChange = (e, index) => {
    const { name, value } = e.target;
    if (name === "strategyCode") {
      const newStrategyConfigs = [...comboData.strategyConfigs];
      newStrategyConfigs[index] = { ...newStrategyConfigs[index], code: value };
      setComboData(prev => ({ ...prev, strategyConfigs: newStrategyConfigs }));
    } else {
      setComboData(prev => ({ ...prev, [name]: value }));
    }
  };

  const addStrategyToCombo = () => {
    setComboData(prev => ({
      ...prev,
      strategyConfigs: [...prev.strategyConfigs, { code: "" }]
    }));
  };

  const removeStrategyFromCombo = (index) => {
    const newStrategyConfigs = comboData.strategyConfigs.filter((_, i) => i !== index);
    setComboData(prev => ({ ...prev, strategyConfigs: newStrategyConfigs }));
  };

  // --- Submit Handlers ---
  const handleSingleSubmit = async (e) => {
    e.preventDefault();
    setMetricsData([]);
    try {
      const result = await runNewBacktest(formData);
      if (result?.equityCurve && result.equityCurve.length > 0) {
        setMetricsData(result.equityCurve);
      } else {
        console.log("Single backtest ran but produced no trades.");
      }
    } catch (err) {
      console.error("Single backtest failed:", err);
    }
  };

  const handleComboSubmit = async (e) => {
    e.preventDefault();
    setMetricsData([]);
    try {
      // Filter out empty strategy selections and get the codes
      const payload = {
        ...comboData,
        strategyCodes: comboData.strategyConfigs
          .map(s => s.code)
          .filter(code => code !== ""),
      };
      delete payload.strategyConfigs; // Clean up payload for the backend

      if (payload.strategyCodes.length < 2) {
        alert("Please select at least two strategies for a combo backtest.");
        return;
      }

      const result = await runComboBacktest(payload);
      if (result?.metrics?.equityCurve && result.metrics.equityCurve.length > 0) {
        setMetricsData(result.metrics.equityCurve);
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
             <label>Strategy<select name="code" value={formData.code} onChange={handleChange} required><option value="">Select strategy</option>{options.strategies.map(s => (<option key={s.code} value={s.code}>{s.name}</option>))}</select></label>
             <label>Symbol<select name="symbol" value={formData.symbol} onChange={handleChange} required><option value="">Select symbol</option>{options.symbols.map(s => (<option key={s} value={s}>{s}</option>))}</select></label>
             <label>Timeframe<select name="timeframe" value={formData.timeframe} onChange={handleChange} required><option value="">Select timeframe</option>{options.timeframes.map(t => (<option key={t} value={t}>{t}</option>))}</select></label>
             <label>Start Date<input type="date" name="startDate" value={formData.startDate} onChange={handleChange} required /></label>
             <label>End Date<input type="date" name="endDate" value={formData.endDate} onChange={handleChange} required /></label>
             <button type="submit" disabled={singleLoading}>{singleLoading ? "Running..." : "Run Backtest"}</button>
           </div>
        </form>

        {/* --- UPGRADED: Combo Strategy Builder --- */}
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

      {metricsData.length > 0 && (
        <div className="chart-card">
          <h3>Equity Curve</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={metricsData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="equity" stroke="#8884d8" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
