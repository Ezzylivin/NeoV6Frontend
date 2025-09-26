// File: src/pages/Backtests.jsx
import React, { useState, useEffect, useMemo, useContext } from "react";
import { useBacktest } from "../hooks/useBacktest.js";
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

export default function Backtests() {
  const {
    options,
    pastBacktests,
    initialLoading,
    singleLoading,
    batchLoading,
    error,
    runNewBacktest,
  } = useBacktest();

  const { strategy, setStrategy } = useContext(StrategyContext);

  const [symbol, setSymbol] = useState("");
  const [timeframe, setTimeframe] = useState("");
  const [takeProfit, setTakeProfit] = useState("");
  const [stopLoss, setStopLoss] = useState("");

  const [backtestResults, setBacktestResults] = useState(null);

  // === Run Backtest Handler ===
  const handleRunBacktest = async () => {
    if (!symbol || !timeframe || !strategy)
      return alert("Select symbol, timeframe, and strategy");
    try {
      const result = await runNewBacktest({
        symbol,
        timeframe,
        strategy,
        takeProfit,
        stopLoss,
      });
      setBacktestResults(result);
    } catch (err) {
      console.error("Backtest failed:", err);
    }
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
    const wins = backtestResults.main.trades.filter((t) => t.profit > 0).length;
    const losses = backtestResults.main.trades.filter((t) => t.profit <= 0).length;
    return [
      { name: "Wins", value: wins },
      { name: "Losses", value: losses },
    ];
  }, [backtestResults?.main?.trades]);

  // === Monthly Performance ===
  const monthlyData = useMemo(() => {
    if (!backtestResults?.main?.trades) return [];
    const monthlyMap = {};
    backtestResults.main.trades.forEach((t) => {
      const month = new Date(t.date).toLocaleString("default", {
        month: "short",
        year: "numeric",
      });
      if (!monthlyMap[month]) monthlyMap[month] = 0;
      monthlyMap[month] += t.profit;
    });
    return Object.entries(monthlyMap).map(([month, profit]) => ({
      month,
      profit,
    }));
  }, [backtestResults?.main?.trades]);

  if (initialLoading) return <div>Loading options and past backtests...</div>;

  return (
    <div className="dashboard-container">
      <h2 className="section-title">Backtest Dashboard</h2>

      {/* --- Backtest Setup Form --- */}
      <div className="setup-form">
        <label>
          Symbol:
          <select value={symbol} onChange={(e) => setSymbol(e.target.value)}>
            <option value="">Select Symbol</option>
            {(options?.symbols || []).map((sym) => (
              <option key={sym} value={sym}>
                {sym}
              </option>
            ))}
          </select>
        </label>

        <label>
          Timeframe:
          <select value={timeframe} onChange={(e) => setTimeframe(e.target.value)}>
            <option value="">Select Timeframe</option>
            {(options?.timeframes || []).map((tf) => (
              <option key={tf} value={tf}>
                {tf}
              </option>
            ))}
          </select>
        </label>

        <label>
          Strategy:
          <select value={strategy} onChange={(e) => setStrategy(e.target.value)}>
            <option value="">Select Strategy</option>
            {(options?.strategies || []).map((strat) => (
              <option key={strat._id} value={strat.code}>
                {strat.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          Take Profit:
          <select value={takeProfit} onChange={(e) => setTakeProfit(e.target.value)}>
            <option value="">Select TP</option>
            {(options?.takeProfits || []).map((tp) => (
              <option key={tp} value={tp}>
                {tp}
              </option>
            ))}
          </select>
        </label>

        <label>
          Stop Loss:
          <select value={stopLoss} onChange={(e) => setStopLoss(e.target.value)}>
            <option value="">Select SL</option>
            {(options?.stopLosses || []).map((sl) => (
              <option key={sl} value={sl}>
                {sl}
              </option>
            ))}
          </select>
        </label>

        <button onClick={handleRunBacktest} disabled={singleLoading}>
          {singleLoading ? "Running..." : "Run Backtest"}
        </button>
      </div>

      {/* --- Results Section --- */}
      {backtestResults?.main && (
        <div className="results-section">
          <h3 className="section-title">Backtest Results</h3>

          {/* Key Metrics */}
          <div className="metrics-grid">
            {Object.entries(keyMetrics).map(([label, value]) => (
              <div key={label} className="metric-card">
                <span className="metric-label">{label}</span>
                <span className="metric-value">{value}</span>
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
                  stroke="#4f46e5"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Win/Loss Distribution */}
          <div className="chart-container">
            <h4>Win/Loss Distribution</h4>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={winLossBarChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip formatter={(val) => `${val} trades`} />
                <Legend />
                <Bar dataKey="value" fill="#4f46e5" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Monthly Performance */}
          <div className="chart-container">
            <h4>Monthly Performance</h4>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(val) => `$${val.toFixed(2)}`} />
                <Legend />
                <Bar dataKey="profit" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
