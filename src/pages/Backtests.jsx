// File: src/pages/Backtests.jsx
import React, { useState, useEffect, useMemo, useContext } from "react";
import { useBacktest } from "../hooks/useBacktest.js";
import { useBacktestSetupFunction } from "../hooks/useBacktestSetup.jsx";
import { StrategyContext } from "../context/StrategyContext.jsx";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import "./Backtests.css";

const Backtests = () => {
  const { strategies } = useContext(StrategyContext);
  const { backtestResults, runBacktest, loading } = useBacktest();
  const { fetchOptions, options } = useBacktestSetupFunction();

  const [formData, setFormData] = useState({
    symbol: "",
    timeframe: "",
    strategy: "",
    takeProfit: "",
    stopLoss: "",
  });

  useEffect(() => {
    fetchOptions();
  }, [fetchOptions]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await runBacktest(formData);
  };

  // === Metrics ===
  const metrics = backtestResults?.main?.metrics || {};
  const keyMetrics = {
    "Total Profit": metrics.totalProfit ?? "-",
    "Total Trades": metrics.totalTrades ?? "-",
    "Win Rate": metrics.winRate ?? "-",
    "Max Drawdown": metrics.maxDrawdown ?? "-",
    "Profit Factor": metrics.profitFactor ?? "-",
    "Final Balance": metrics.finalBalance ?? "-",
  };

  // === Equity Curve ===
  const equityCurve = useMemo(() => {
    if (!backtestResults?.main?.equityCurve) return [];
    return backtestResults.main.equityCurve.map((point, i) => ({
      date: point.date || i,
      equity: point.equity,
    }));
  }, [backtestResults?.main?.equityCurve]);

  // === Win/Loss Bar Chart ===
  const winLossBarChartData = useMemo(() => {
    if (!backtestResults?.main?.trades) return [];

    const buckets = [
      { range: "< -100", min: -Infinity, max: -100, count: 0 },
      { range: "-100 to 0", min: -100, max: 0, count: 0 },
      { range: "0 to 100", min: 0, max: 100, count: 0 },
      { range: "100+", min: 100, max: Infinity, count: 0 },
    ];

    backtestResults.main.trades.forEach((trade) => {
      const profit = trade.profit || 0;
      const bucket = buckets.find((b) => profit >= b.min && profit < b.max);
      if (bucket) bucket.count += 1;
    });

    return buckets.filter((b) => b.count > 0);
  }, [backtestResults?.main?.trades]);

  // === Monthly Performance ===
  const monthlyData = useMemo(() => {
    if (!backtestResults?.main?.trades) return [];

    const monthlyProfits = {};

    backtestResults.main.trades.forEach((trade) => {
      const d = new Date(trade.date);
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
        2,
        "0"
      )}`;

      if (!monthlyProfits[monthKey]) monthlyProfits[monthKey] = 0;
      monthlyProfits[monthKey] += trade.profit || 0;
    });

    return Object.entries(monthlyProfits).map(([month, profit]) => ({
      month,
      profit,
    }));
  }, [backtestResults?.main?.trades]);

  return (
    <div className="dashboard-container">
      <h2 className="dashboard-title">Backtest</h2>

      {/* === Setup Form === */}
      <form onSubmit={handleSubmit} className="backtest-form">
        <label>
          Symbol:
          <select
            name="symbol"
            value={formData.symbol}
            onChange={handleChange}
            required
          >
            <option value="">Select Symbol</option>
            {options.symbols?.map((sym) => (
              <option key={sym} value={sym}>
                {sym}
              </option>
            ))}
          </select>
        </label>

        <label>
          Timeframe:
          <select
            name="timeframe"
            value={formData.timeframe}
            onChange={handleChange}
            required
          >
            <option value="">Select Timeframe</option>
            {options.timeframes?.map((tf) => (
              <option key={tf} value={tf}>
                {tf}
              </option>
            ))}
          </select>
        </label>

        <label>
          Strategy:
          <select
            name="strategy"
            value={formData.strategy}
            onChange={handleChange}
            required
          >
            <option value="">Select Strategy</option>
            {strategies.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>

        <label>
          Take Profit:
          <select
            name="takeProfit"
            value={formData.takeProfit}
            onChange={handleChange}
          >
            <option value="">Select TP</option>
            {options.takeProfits?.map((tp) => (
              <option key={tp} value={tp}>
                {tp}
              </option>
            ))}
          </select>
        </label>

        <label>
          Stop Loss:
          <select
            name="stopLoss"
            value={formData.stopLoss}
            onChange={handleChange}
          >
            <option value="">Select SL</option>
            {options.stopLosses?.map((sl) => (
              <option key={sl} value={sl}>
                {sl}
              </option>
            ))}
          </select>
        </label>

        <button type="submit" disabled={loading}>
          {loading ? "Running..." : "Run Backtest"}
        </button>
      </form>

      {/* === Results === */}
      {backtestResults?.main && (
        <div className="results-section">
          <h3>Results</h3>

          {/* Metrics */}
          <div className="metrics-grid">
            {Object.entries(keyMetrics).map(([label, value]) => (
              <div key={label} className="metric-card">
                <h4>{label}</h4>
                <p>{value}</p>
              </div>
            ))}
          </div>

          {/* Equity Curve */}
          <div className="chart-container">
            <h4>Equity Curve</h4>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={equityCurve}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip formatter={(val) => `$${val.toFixed(2)}`} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="equity"
                  stroke="#8884d8"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Win/Loss Distribution */}
          <div className="chart-container">
            <h4>Win/Loss Distribution</h4>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={winLossBarChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="range" />
                <YAxis />
                <Tooltip formatter={(val) => `${val} trades`} />
                <Bar dataKey="count" fill="#82ca9d" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Monthly Performance */}
          <div className="chart-container">
            <h4>Monthly Performance</h4>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(val) => `$${val.toFixed(2)}`} />
                <Bar dataKey="profit" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
};

export default Backtests;
