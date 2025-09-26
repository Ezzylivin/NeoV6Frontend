/* File: src/pages/Backtests.jsx */
import React, { useState, useEffect } from "react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell
} from "recharts";
import { useBacktest } from "../hooks/useBacktest.js";
import { useBacktestSetupFunction } from "../hooks/useBacktestSetup.jsx";

const colors = [
  "#4f46e5", "#3b82f6", "#22c55e", "#ef4444", "#facc15",
  "#f97316", "#8b5cf6", "#ec4899", "#06b6d4", "#10b981"
];

const gradientColors = [
  { start: "#4f46e5", end: "#3b82f6" },
  { start: "#22c55e", end: "#16a34a" },
  { start: "#ef4444", end: "#b91c1c" },
  { start: "#facc15", end: "#eab308" },
  { start: "#f97316", end: "#ea580c" },
];

export default function Backtests() {
  const { fetchBacktestData } = useBacktest();
  const { saveSetup, setupName, setSetupName } = useBacktestSetupFunction();
  const [backtestData, setBacktestData] = useState(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetchBacktestData().then((data) => setBacktestData(data));
  }, []);

  if (!backtestData) return <div>Loading backtest results...</div>;

  const { combinedResult, individualResults } = backtestData;

  // --- Transform equity curve data ---
  const transformedCombined = combinedResult.equityCurve.map((p) => ({
    x: new Date(p.timestamp).toLocaleString(),
    y: p.balance,
  }));

  const transformedStrategies = individualResults.map((s) => ({
    name: s.strategyName,
    data: s.equityCurve.map((p) => ({
      x: new Date(p.timestamp).toLocaleString(),
      y: p.balance,
    })),
    metrics: s.metrics,
  }));

  const combinedMetrics = combinedResult.metrics;

  const profitLossData = individualResults.map((s) => ({
    name: s.strategyName,
    profit: s.metrics.totalProfit,
    trades: s.metrics.totalTrades
  }));

  const drawdownData = individualResults.map((s) => ({
    name: s.strategyName,
    drawdown: s.metrics.maxDrawdown
  }));

  const winLossData = individualResults.map((s) => ({
    name: s.strategyName,
    wins: s.metrics.winningTrades,
    losses: s.metrics.losingTrades
  }));

  const tradeReturns = individualResults.flatMap((s) =>
    s.equityCurve.slice(1).map((p, i) => ({
      name: s.strategyName,
      return: (p.balance - s.equityCurve[i].balance)
    }))
  );

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{
          background: "#1b1b2b",
          color: "#fff",
          padding: "10px",
          borderRadius: "8px",
          fontSize: "0.9rem",
          boxShadow: "0 0 10px rgba(0,0,0,0.5)"
        }}>
          <p>{label}</p>
          {payload.map((p, i) => (
            <p key={i} style={{ color: p.color }}>
              {p.name}: {typeof p.value === "number" ? p.value.toFixed(2) : p.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="dashboard-container">
      <h2 className="section-title">Backtest Results</h2>

      {/* --- Save Setup Button & Modal --- */}
      <button className="save-setup-btn" onClick={() => setShowModal(true)}>
        Save Backtest Setup
      </button>

      {showModal && (
        <div className="modal modal-open">
          <div className="modal-content">
            <h3>Save Backtest Setup</h3>
            <input
              type="text"
              value={setupName}
              onChange={(e) => setSetupName(e.target.value)}
              placeholder="Enter setup name"
            />
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <button type="button" onClick={() => setShowModal(false)}>Cancel</button>
              <button type="submit" onClick={() => { saveSetup(); setShowModal(false); }}>
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- Metrics Grid --- */}
      <div className="metrics-grid">
        <div className="metric-item">
          <span className="metric-label">Total Trades</span>
          <span className="metric-value">{combinedMetrics.totalTrades}</span>
        </div>
        <div className="metric-item">
          <span className="metric-label">Win Rate</span>
          <span className="metric-value">{combinedMetrics.winRate}%</span>
        </div>
        <div className="metric-item">
          <span className="metric-label">Total Profit</span>
          <span className="metric-value">${combinedMetrics.totalProfit.toFixed(2)}</span>
        </div>
        <div className="metric-item">
          <span className="metric-label">Final Balance</span>
          <span className="metric-value">${combinedMetrics.finalBalance.toFixed(2)}</span>
        </div>
      </div>

      {/* --- Equity Curve Chart --- */}
      <h3 className="section-title">Equity Curves</h3>
      <ResponsiveContainer width="100%" height={400}>
        <LineChart>
          <CartesianGrid strokeDasharray="3 3" stroke="#333" />
          <XAxis dataKey="x" tick={{ fill: "#aaa" }} />
          <YAxis tick={{ fill: "#aaa" }} />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ color: "#fff" }} />
          <Line type="monotone" data={transformedCombined} dataKey="y" name="Combined" stroke="#00ff88" dot={false} strokeWidth={2} />
          {transformedStrategies.map((s, i) => (
            <Line
              key={i}
              type="monotone"
              data={s.data}
              dataKey="y"
              name={s.name}
              stroke={colors[i % colors.length]}
              dot={false}
              strokeWidth={2}
              activeDot={{ r: 5 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>

      {/* --- Profit/Loss Bar Chart --- */}
      <h3 className="section-title">Profit/Loss per Strategy</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={profitLossData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#333" />
          <XAxis dataKey="name" tick={{ fill: "#aaa" }} />
          <YAxis tick={{ fill: "#aaa" }} />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ color: "#fff" }} />
          <Bar dataKey="profit" fill="#22c55e" radius={[5,5,0,0]} />
          <Bar dataKey="trades" fill="#3b82f6" radius={[5,5,0,0]} />
        </BarChart>
      </ResponsiveContainer>

      {/* --- Drawdown Chart --- */}
      <h3 className="section-title">Max Drawdown per Strategy</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={drawdownData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#333" />
          <XAxis dataKey="name" tick={{ fill: "#aaa" }} />
          <YAxis tick={{ fill: "#aaa" }} />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="drawdown" fill="#ef4444" radius={[5,5,0,0]} />
        </BarChart>
      </ResponsiveContainer>

      {/* --- Win/Loss Pie Charts --- */}
      <h3 className="section-title">Wins vs Losses per Strategy</h3>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "20px" }}>
        {winLossData.map((s, i) => (
          <ResponsiveContainer key={i} width={250} height={250}>
            <PieChart>
              <Pie
                data={[
                  { name: "Wins", value: s.wins },
                  { name: "Losses", value: s.losses }
                ]}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={80}
                label
              >
                <Cell key="wins" fill="#22c55e" />
                <Cell key="losses" fill="#ef4444" />
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        ))}
      </div>

      {/* --- Trade Returns Histogram --- */}
      <h3 className="section-title">Individual Trade Returns</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={tradeReturns}>
          <CartesianGrid strokeDasharray="3 3" stroke="#333" />
          <XAxis dataKey="name" tick={{ fill: "#aaa" }} />
          <YAxis tick={{ fill: "#aaa" }} />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="return" fill="#facc15" radius={[5,5,0,0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
