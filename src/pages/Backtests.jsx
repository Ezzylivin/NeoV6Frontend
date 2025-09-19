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

// Initial state with a wider default date range
const initialFormData = {
  code: "",
  symbol: "",
  timeframe: "",
  startDate: "2024-01-01", // Default to a wider range
  endDate: "2024-09-18",   // Default to a wider range
  takeProfit: "",
  stopLoss: "",
};

export default function Backtests() {
  const {
    options,
    initialLoading,
    singleLoading,
    error,
    runNewBacktest,
  } = useBacktest();

  const [formData, setFormData] = useState(initialFormData);
  const [metricsData, setMetricsData] = useState([]);

  // Auto-select first strategy on initial load
  useEffect(() => {
    if (options.strategies?.length > 0 && !formData.code) {
      const firstStrategy = options.strategies[0];
      setFormData((prev) => ({
        ...prev,
        code: firstStrategy.code,
        symbol: firstStrategy.params?.symbol || options.symbols[0] || "",
        timeframe: firstStrategy.params?.timeframe || options.timeframes[0] || "",
        takeProfit: firstStrategy.params?.takeProfit || options.takeProfits[0] || "",
        stopLoss: firstStrategy.params?.stopLoss || options.stopLosses[0] || "",
        // Spread strategy-specific params into the form data
        params: firstStrategy.params || {},
      }));
    }
  }, [options, formData.code]);

  // --- Handlers ---
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
          takeProfit: selectedStrategy.params?.takeProfit || options.takeProfits[0] || "",
          stopLoss: selectedStrategy.params?.stopLoss || options.stopLosses[0] || "",
          params: selectedStrategy.params || {},
        }));
      } else {
        setFormData((prev) => ({ ...prev, code: "", symbol: "", timeframe: "", takeProfit: "", stopLoss: "" }));
      }
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSingleSubmit = async (e) => {
    e.preventDefault();
    setMetricsData([]);

    try {
      const payload = {
        code: formData.code,
        symbol: formData.symbol,
        timeframe: formData.timeframe,
        startDate: formData.startDate,
        endDate: formData.endDate,
        tp: parseFloat(formData.takeProfit) || 0,
        sl: parseFloat(formData.stopLoss) || 0,
        params: formData.params, // ✅ Ensures strategy-specific rules are included
      };

      console.log("Payload created in Backtests.jsx:", payload);
      const result = await runNewBacktest(payload);
      console.log("Backend Response:", result);

      // ✅ Correctly finds equityCurve and checks if it has data
      if (result?.equityCurve && result.equityCurve.length > 0) {
        setMetricsData(result.equityCurve);
      } else {
        console.log("Chart data is empty. The backtest may have produced no trades.");
      }
    } catch (err) {
      console.error("Single backtest failed:", err);
    }
  };

  if (initialLoading) return <div>Loading backtests...</div>;
  if (error) return <div style={{ color: 'red' }}>Error: {error}</div>;

  return (
    <div className="dashboard-container">
      <h2 className="header">Backtests</h2>
      {error && <div className="error-banner">{error}</div>}
      <form className="card-row" onSubmit={handleSingleSubmit}>
        <div className="metric-card">
          <h3 className="card-title">Single Backtest</h3>
          {/* Form elements remain the same */}
          <label>
            Strategy
            <select name="code" value={formData.code} onChange={handleChange} required>
              <option value="">Select strategy</option>
              {options.strategies.map((s) => (
                <option key={s.code} value={s.code}>{s.name}</option>
              ))}
            </select>
          </label>
          <label>
            Symbol
            <select name="symbol" value={formData.symbol} onChange={handleChange} required>
              <option value="">Select symbol</option>
              {options.symbols.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </label>
          <label>
            Timeframe
            <select name="timeframe" value={formData.timeframe} onChange={handleChange} required>
              <option value="">Select timeframe</option>
              {options.timeframes.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </label>
          <label>
            Start Date
            <input type="date" name="startDate" value={formData.startDate} onChange={handleChange} required />
          </label>
          <label>
            End Date
            <input type="date" name="endDate" value={formData.endDate} onChange={handleChange} required />
          </label>
          <label>
            Take Profit %
            <select name="takeProfit" value={formData.takeProfit} onChange={handleChange}>
              <option value="">Select TP</option>
              {options.takeProfits.map((val) => (
                <option key={val} value={val}>{val * 100}%</option>
              ))}
            </select>
          </label>
          <label>
            Stop Loss %
            <select name="stopLoss" value={formData.stopLoss} onChange={handleChange}>
              <option value="">Select SL</option>
              {options.stopLosses.map((val) => (
                <option key={val} value={val}>{val * 100}%</option>
              ))}
            </select>
          </label>
          <button type="submit" disabled={singleLoading}>
            {singleLoading ? "Running..." : "Run Backtest"}
          </button>
        </div>
      </form>
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
