// File: src/pages/Backtests.jsx
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

export default function Backtests() {
  const {
    options,
    pastBacktests,
    initialLoading,
    singleLoading,
    batchLoading,
    error,
    runNewBacktest,
    runNewBatchBacktest,
  } = useBacktest();

  // --- Form state ---
  const [formData, setFormData] = useState({
    code: "",
    symbol: "BTC/USD",
    timeframe: "1d",
    startDate: "2024-01-01",
    endDate: "2025-09-15",
    takeProfit: "5",
    stopLoss: "2",
  });

  const [batchConfigs, setBatchConfigs] = useState([{ ...formData }]);
  const [metricsData, setMetricsData] = useState([]);

  // --- Auto-select first available strategy once options load ---
  useEffect(() => {
    if (options.strategies?.length > 0 && !formData.code) {
      setFormData((prev) => ({
        ...prev,
        code: options.strategies[0].code, // FIX: use strategyCode instead of _id
      }));
    }
  }, [options.strategies]);

  // --- Handlers ---
  const handleChange = (e, index = null) => {
    const { name, value } = e.target;
    if (index !== null) {
      const newBatch = [...batchConfigs];
      newBatch[index][name] = value;
      setBatchConfigs(newBatch);
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const addBatchRow = () => setBatchConfigs([...batchConfigs, { ...formData }]);
  const removeBatchRow = (i) =>
    setBatchConfigs(batchConfigs.filter((_, idx) => idx !== i));

  const handleSingleSubmit = async (e) => {
    e.preventDefault();
    setMetricsData([]);
    try {
      const result = await runNewBacktest(formData);
      if (result?.metrics?.equityCurve) {
        setMetricsData(result.metrics.equityCurve);
      }
    } catch (err) {
      console.error("Single backtest failed:", err);
    }
  };

  const handleBatchSubmit = async (e) => {
    e.preventDefault();
    setMetricsData([]);
    try {
      const result = await runNewBatchBacktest(batchConfigs);
      const firstSuccessfulResult = result?.find((res) => res.metrics);
      if (firstSuccessfulResult?.metrics?.equityCurve) {
        setMetricsData(firstSuccessfulResult.metrics.equityCurve);
      }
    } catch (err) {
      console.error("Batch backtest failed:", err);
    }
  };

  // --- Options for TP/SL dropdowns ---
  const tpSlOptions = [0.5, 1, 2, 3, 5, 10, 20].map((val) => (
    <option key={val} value={val}>
      {val}%
    </option>
  ));

  return (
    <div className="dashboard-container">
      <h2 className="header">Backtests</h2>

      {error && <div className="error-banner">{error}</div>}

      {/* --- Single Backtest Form --- */}
      <form className="card-row" onSubmit={handleSingleSubmit}>
        <div className="metric-card">
          <h3 className="card-title">Single Backtest</h3>

          <label>
            Strategy
            <select
              name="strategyCode"
              value={formData.code}
              onChange={handleChange}
              required
            >
              <option value="">Select strategy</option>
              {options.strategies.map((s) => (
                <option key={s.code} value={s.code}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            Symbol
            <select
              name="symbol"
              value={formData.symbol}
              onChange={handleChange}
              required
            >
              <option value="">Select symbol</option>
              {options.symbols.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>

          <label>
            Timeframe
            <select
              name="timeframe"
              value={formData.timeframe}
              onChange={handleChange}
              required
            >
              <option value="">Select timeframe</option>
              {options.timeframes.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>

          <label>
            Start Date
            <input
              type="date"
              name="startDate"
              value={formData.startDate}
              onChange={handleChange}
              required
            />
          </label>

          <label>
            End Date
            <input
              type="date"
              name="endDate"
              value={formData.endDate}
              onChange={handleChange}
              required
            />
          </label>

          <label>
            Take Profit %
            <select
              name="takeProfit"
              value={formData.takeProfit}
              onChange={handleChange}
            >
              <option value="">Select TP</option>
              {tpSlOptions}
            </select>
          </label>

          <label>
            Stop Loss %
            <select
              name="stopLoss"
              value={formData.stopLoss}
              onChange={handleChange}
            >
              <option value="">Select SL</option>
              {tpSlOptions}
            </select>
          </label>

          <button type="submit" disabled={singleLoading}>
            {singleLoading ? "Running..." : "Run Backtest"}
          </button>
        </div>
      </form>

      {/* --- Batch Backtests and Charts remain unchanged --- */}
    </div>
  );
}
