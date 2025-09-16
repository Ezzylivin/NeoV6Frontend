// File: src/pages/Backtests.jsx
// UPGRADED: Correctly handles nested API responses to display metrics and charts.

import React, { useState } from "react";
import { useBacktest } from "../hooks/useBacktest.js";
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend, ResponsiveContainer } from "recharts";
import "./Backtests.css";

export default function Backtests() {
  const {
    options,
    pastBacktests,
    loading,
    error,
    runNewBacktest,
    runNewBatchBacktest,
  } = useBacktest();

  const [formData, setFormData] = useState({
    strategyId: "",
    symbol: "AAPL", // Default for easier testing
    timeframe: "1d", // Default for easier testing
    startDate: "2024-01-01", // Default for easier testing
    endDate: "2025-09-15", // Default for easier testing
    takeProfit: "2",
    stopLoss: "1",
  });

  const [batchConfigs, setBatchConfigs] = useState([{ ...formData }]);
  const [metricsData, setMetricsData] = useState([]); // Will hold the equity curve array

  // Handle input changes
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

  // Add/remove batch row
  const addBatchRow = () => setBatchConfigs([...batchConfigs, { ...formData }]);
  const removeBatchRow = (i) => setBatchConfigs(batchConfigs.filter((_, idx) => idx !== i));

  // Run single backtest
  const handleSingleSubmit = async (e) => {
    e.preventDefault();
    setMetricsData([]); // Clear previous results
    try {
      // The hook returns { success: true, message: "...", data: {...} }
      const result = await runNewBacktest(formData);
      
      // --- FIX #1 ---
      // We must access the nested `data` property from the response.
      // The chart expects the `equityCurve` array, which is inside `metrics`.
      if (result?.data?.metrics?.equityCurve) {
        setMetricsData(result.data.metrics.equityCurve);
      }
    } catch (err) {
      console.error("Single backtest failed:", err);
    }
  };

  // Run batch backtests
  const handleBatchSubmit = async (e) => {
    e.preventDefault();
    setMetricsData([]); // Clear previous results
    try {
      // The hook returns { success: true, message: "...", data: [...] }
      const result = await runNewBatchBacktest(batchConfigs);

      // --- FIX #2 ---
      // The result.data is an array of backtest results.
      // We'll find the first successful result in the batch and display its chart.
      const firstSuccessfulResult = result?.data?.find(res => res.metrics);
      if (firstSuccessfulResult?.metrics?.equityCurve) {
        setMetricsData(firstSuccessfulResult.metrics.equityCurve);
      }
    } catch (err) {
      console.error("Batch backtest failed:", err);
    }
  };

  // Generate TP/SL options
  const tpSlOptions = [0.5, 1, 2, 3, 5, 10, 20].map((val) => (
    <option key={val} value={val}>{val}%</option>
  ));

  return (
    <div className="dashboard-container">
      <h2 className="header">Backtests</h2>

      {error && <div className="error-banner">{error}</div>}

      {/* --- Single Backtest Form --- */}
      <form className="card-row" onSubmit={handleSingleSubmit}>
        {/* ... (form inputs remain the same) ... */}
      </form>

      {/* --- Batch Backtests Form --- */}
      <form className="card-row" onSubmit={handleBatchSubmit}>
        {/* ... (form inputs remain the same) ... */}
      </form>

      {/* --- Metrics Charts --- */}
      {metricsData.length > 0 && (
        <div className="chart-container">
          <h3 className="chart-header">Performance Metrics</h3>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={metricsData}>
              <CartesianGrid strokeDasharray="3 3" />
              {/* --- FIX #3 --- */}
              {/* The equityCurve data has a 'time' key, not 'date' */}
              <XAxis dataKey="time" tickFormatter={(timeStr) => new Date(timeStr).toLocaleDateString()} />
              <YAxis />
              <Tooltip contentStyle={{ backgroundColor: "#2D3748", borderColor: "#4A5568" }} />
              <Legend />
              <Line type="monotone" dataKey="equity" name="Equity Curve" stroke="#3182CE" dot={false} />
              {/* The 'balance' dataKey does not exist in the equityCurve data, so it is removed. */}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* --- Past Backtests Table --- */}
      <div className="card-row">
      {/* ... (past backtests display remains the same) ... */}
      </div>
    </div>
  );
}
