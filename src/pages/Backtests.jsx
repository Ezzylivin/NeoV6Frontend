/* File: src/pages/Backtests.jsx */
import React, { useState, useEffect, useMemo } from "react";
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

export default function Backtests() {
  const { fetchBacktestData, runComboBacktest, singleLoading } = useBacktest();
  const { saveSetup, setupName, setSetupName } = useBacktestSetupFunction();
  const [backtestData, setBacktestData] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const [formData, setFormData] = useState({
    symbol: "",
    timeframe: "1h",
    initialBalance: 1000,
    strategyConfigs: []
  });

  useEffect(() => {
    fetchBacktestData().then((data) => setBacktestData(data));
  }, [fetchBacktestData]);

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "initialBalance" ? Number(value) : value
    }));
  };

  const handleAddStrategy = (strategyCode) => {
    if (!formData.strategyConfigs.find(s => s.code === strategyCode)) {
      setFormData((prev) => ({
        ...prev,
        strategyConfigs: [...prev.strategyConfigs, { code: strategyCode }]
      }));
    }
  };

  const handleRemoveStrategy = (strategyCode) => {
    setFormData((prev) => ({
      ...prev,
      strategyConfigs: prev.strategyConfigs.filter(s => s.code !== strategyCode)
    }));
  };

  const handleComboSubmit = async (e) => {
    e.preventDefault();
    if (!formData.symbol || formData.strategyConfigs.length === 0) return;

    const payload = {
      strategies: formData.strategyConfigs.map(s => s.code),
      symbol: formData.symbol,
      timeframe: formData.timeframe,
      initial_balance: Number(formData.initialBalance)
    };

    try {
      const result = await runComboBacktest(payload);
      setBacktestData(result);
    } catch (err) {
      console.error("❌ Error running combo backtest:", err);
    }
  };

  if (!backtestData) return <div>Loading backtest results...</div>;

  const { combinedResult, individualResults } = backtestData;

  // --- Transform equity curves ---
  const transformedCombined = combinedResult?.equityCurve?.map((p) => ({
    x: new Date(p.timestamp).toLocaleString(),
    y: p.balance
  })) || [];

  const transformedStrategies = individualResults?.map((s) => ({
    name: s.strategyName,
    data: s.equityCurve.map((p) => ({
      x: new Date(p.timestamp).toLocaleString(),
      y: p.balance
    })),
    metrics: s.metrics
  })) || [];

  // --- Metrics for combined result ---
  const combinedMetrics = combinedResult?.metrics || {};

  // --- Charts data ---
  const profitLossData = transformedStrategies.map(s => ({
    name: s.name,
    profit: s.metrics.totalProfit,
    trades: s.metrics.totalTrades
  }));

  const drawdownData = transformedStrategies.map(s => ({
    name: s.name,
    drawdown: s.metrics.maxDrawdown
  }));

  const winLossData = transformedStrategies.map(s => ({
    name: s.name,
    wins: s.metrics.winningTrades,
    losses: s.metrics.losingTrades
  }));

  const tradeReturns = individualResults?.flatMap(s =>
    s.equityCurve.slice(1).map((p, i) => ({
      name: s.strategyName,
      return: (p.balance - s.equityCurve[i].balance)
    }))
  ) || [];

  return (
    <div className="dashboard-container">
      <h2 className="section-title">Backtest Results</h2>

      {/* --- Combo Backtest Form --- */}
      <form onSubmit={handleComboSubmit} className="combo-form">
        <label>
          Symbol:
          <input type="text" name="symbol" value={formData.symbol} onChange={handleFormChange} placeholder="e.g. BTC/USDT" />
        </label>
        <label>
          Timeframe:
          <select name="timeframe" value={formData.timeframe} onChange={handleFormChange}>
            <option value="1m">1m</option>
            <option value="5m">5m</option>
            <option value="15m">15m</option>
            <option value="1h">1h</option>
            <option value="4h">4h</option>
            <option value="1d">1d</option>
          </select>
        </label>
        <label>
          Initial Balance:
          <input type="number" name="initialBalance" value={formData.initialBalance} onChange={handleFormChange} />
        </label>
        <div className="strategies-selector">
          {transformedStrategies.map((s, i) => (
            <button type="button" key={i} onClick={() => handleAddStrategy(s.name)}>
              {s.name}
            </button>
          ))}
        </div>
        <button type="submit" disabled={singleLoading}>
          {singleLoading ? "Running..." : "Run Combo Backtest"}
        </button>
      </form>

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
      {combinedMetrics && (
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
            <span className="metric-value">${combinedMetrics.totalProfit?.toFixed(2)}</span>
          </div>
          <div className="metric-item">
            <span className="metric-label">Final Balance</span>
            <span className="metric-value">${combinedMetrics.finalBalance?.toFixed(2)}</span>
          </div>
        </div>
      )}

      {/* --- Equity Curve Chart --- */}
      <h3 className="section-title">Equity Curves</h3>
      <ResponsiveContainer width="100%" height={400}>
        <LineChart>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="x" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line type="monotone" data={transformedCombined} dataKey="y" name="Combined" stroke="#00ff00" dot={false} />
          {transformedStrategies.map((s, i) => (
            <Line
              key={i}
              type="monotone"
              data={s.data}
              dataKey="y"
              name={s.name}
              stroke={colors[i % colors.length]}
              dot={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>

      {/* --- Profit/Loss Chart --- */}
      <h3 className="section-title">Profit/Loss per Strategy</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={profitLossData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="profit" fill="#22c55e" />
          <Bar dataKey="trades" fill="#3b82f6" />
        </BarChart>
      </ResponsiveContainer>

      {/* --- Drawdown Chart --- */}
      <h3 className="section-title">Max Drawdown per Strategy</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={drawdownData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="drawdown" fill="#ef4444" />
        </BarChart>
      </ResponsiveContainer>

      {/* --- Win/Loss Pie Charts --- */}
      <h3 className="section-title">Wins vs Losses per Strategy</h3>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "20px" }}>
        {winLossData.map((s, i) => (
          <ResponsiveContainer key={i} width={250} height={250}>
            <PieChart>
              <Pie data={[
                { name: "Wins", value: s.wins },
                { name: "Losses", value: s.losses }
              ]} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
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
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="return" fill="#facc15" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
