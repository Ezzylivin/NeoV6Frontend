// File: src/pages/Backtests.jsx
import React, { useState, useEffect } from "react";
import { useBacktest } from "../hooks/useBacktest.js";
import "./Backtests.css";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from "recharts";

export default function Backtests() {
  const {
    options,
    pastBacktests,
    loading,
    error,
    runNewBacktest,
    runNewBatchBacktest,
    getPastBacktests,
  } = useBacktest();

  // Form state
  const [strategyId, setStrategyId] = useState("");
  const [symbol, setSymbol] = useState("");
  const [timeframe, setTimeframe] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [takeProfit, setTakeProfit] = useState("5%");
  const [stopLoss, setStopLoss] = useState("2%");
  const [batchConfigs, setBatchConfigs] = useState([]);

  const handleSingleBacktest = async () => {
    if (!strategyId || !symbol || !timeframe || !startDate || !endDate) {
      alert("Please fill in all required fields.");
      return;
    }

    const payload = {
      strategyId,
      symbol,
      timeframe,
      startDate,
      endDate,
      takeProfit,
      stopLoss,
    };

    try {
      await runNewBacktest(payload);
      alert("Single backtest completed!");
    } catch (err) {
      console.error("Backtest failed:", err);
      alert(`Backtest failed: ${err.message}`);
    }
  };

  const handleBatchBacktest = async () => {
    if (batchConfigs.length === 0) {
      alert("Batch configs are empty!");
      return;
    }

    try {
      await runNewBatchBacktest(batchConfigs);
      alert("Batch backtests completed!");
    } catch (err) {
      console.error("Batch backtest failed:", err);
      alert(`Batch backtest failed: ${err.message}`);
    }
  };

  // Metrics state
  const [metricsData, setMetricsData] = useState([]);

  const updateMetrics = (backtestResult) => {
    // Example: add simple equity curve for chart
    if (!backtestResult?.equityCurve) return;
    setMetricsData(
      backtestResult.equityCurve.map((v, i) => ({ index: i + 1, equity: v }))
    );
  };

  return (
    <div className="backtests-container">
      <h2 className="backtests-header">Backtests</h2>

      {error && <div className="error-banner">{error}</div>}

      <div className="backtests-form">
        <label>
          Strategy
          <select
            value={strategyId}
            onChange={(e) => setStrategyId(e.target.value)}
          >
            <option value="">Select strategy</option>
            {options.strategies?.map((s) => (
              <option key={s._id} value={s._id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          Symbol
          <select value={symbol} onChange={(e) => setSymbol(e.target.value)}>
            <option value="">Select symbol</option>
            {options.symbols?.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>

        <label>
          Timeframe
          <select
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value)}
          >
            <option value="">Select timeframe</option>
            {options.timeframes?.map((t) => (
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
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </label>

        <label>
          End Date
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </label>

        <label>
          Take Profit
          <select
            value={takeProfit}
            onChange={(e) => setTakeProfit(e.target.value)}
          >
            {["1%", "2%", "5%", "10%", "15%"].map((tp) => (
              <option key={tp} value={tp}>
                {tp}
              </option>
            ))}
          </select>
        </label>

        <label>
          Stop Loss
          <select
            value={stopLoss}
            onChange={(e) => setStopLoss(e.target.value)}
          >
            {["1%", "2%", "5%", "10%"].map((sl) => (
              <option key={sl} value={sl}>
                {sl}
              </option>
            ))}
          </select>
        </label>

        <div className="form-buttons">
          <button
            type="button"
            className="single-backtest"
            onClick={handleSingleBacktest}
            disabled={loading}
          >
            Run Single Backtest
          </button>
          <button
            type="button"
            className="batch-backtest"
            onClick={handleBatchBacktest}
            disabled={loading}
          >
            Run Batch Backtests
          </button>
        </div>
      </div>

      {/* Metrics Charts */}
      {metricsData.length > 0 && (
        <div className="chart-container">
          <div className="chart-header">
            <h3>Equity Curve</h3>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={metricsData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="index" stroke="#A0AEC0" />
              <YAxis stroke="#A0AEC0" />
              <Tooltip
                contentStyle={{ backgroundColor: "#2D3748", border: "1px solid #4A5568" }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="equity"
                stroke="#3182CE"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Past Backtests Table */}
      <div className="chart-container">
        <h3>Past Backtests</h3>
        {pastBacktests.results.length === 0 ? (
          <p>No past backtests yet.</p>
        ) : (
          <table style={{ width: "100%", color: "#F7FAFC", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th>Strategy</th>
                <th>Symbol</th>
                <th>Timeframe</th>
                <th>Start Date</th>
                <th>End Date</th>
                <th>Profit/Loss</th>
              </tr>
            </thead>
            <tbody>
              {pastBacktests.results.map((b) => (
                <tr key={b._id}>
                  <td>{b.strategyName}</td>
                  <td>{b.symbol}</td>
                  <td>{b.timeframe}</td>
                  <td>{b.startDate}</td>
                  <td>{b.endDate}</td>
                  <td>{b.profitLoss}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
