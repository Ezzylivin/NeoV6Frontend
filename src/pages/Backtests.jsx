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

export default function Backtests() {
  const backtest = useBacktest();
  const backtestSetup = useBacktestSetupFunction();

  const {
    options,
    runComboBacktest,
  } = backtest;

  const {
    createSetup,
  } = backtestSetup;

  const [backtestData, setBacktestData] = useState(null);
  const [showModal, setShowModal] = useState(false);

  // --- selectors state ---
  const [comboStrategies, setComboStrategies] = useState([]);
  const [symbol, setSymbol] = useState("");
  const [timeframe, setTimeframe] = useState("");
  const [takeProfit, setTakeProfit] = useState("");
  const [stopLoss, setStopLoss] = useState("");
  const [initialBalance, setInitialBalance] = useState(1000);

  useEffect(() => {
    // run initial backtest
    if (options.strategies.length > 0) {
      handleRunBacktest();
    }
  }, [options]);

  const handleRunBacktest = async () => {
    try {
      const payload = {
        strategies: comboStrategies.map((s) => s.code),
        symbol,
        timeframe,
        takeProfit,
        stopLoss,
        initialBalance,
      };
      const data = await runComboBacktest(payload);
      setBacktestData(data);
    } catch (err) {
      console.error("❌ Error running combo backtest:", err);
    }
  };

  const handleSaveSetup = async () => {
    try {
      const setupData = {
        strategies: comboStrategies,
        symbol,
        timeframe,
        takeProfit,
        stopLoss,
        initialBalance,
      };
      await createSetup(setupData);
      setShowModal(false);
    } catch (err) {
      console.error("❌ Error saving setup:", err);
    }
  };

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

  // --- Metrics for combined result ---
  const combinedMetrics = combinedResult.metrics;

  // --- Prepare additional chart data ---
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

  return (
    <div className="dashboard-container">
      <h2 className="section-title">Backtest Results</h2>

      {/* --- Controls --- */}
      <div className="selectors-grid">
        <div>
          <label>Symbol</label>
          <select value={symbol} onChange={(e) => setSymbol(e.target.value)}>
            <option value="">Select Symbol</option>
            {options.symbols.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div>
          <label>Timeframe</label>
          <select value={timeframe} onChange={(e) => setTimeframe(e.target.value)}>
            <option value="">Select Timeframe</option>
            {options.timeframes.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        <div>
          <label>Take Profit</label>
          <select value={takeProfit} onChange={(e) => setTakeProfit(e.target.value)}>
            <option value="">Select TP</option>
            {options.takeProfits.map((tp) => (
              <option key={tp} value={tp}>{tp}</option>
            ))}
          </select>
        </div>
        <div>
          <label>Stop Loss</label>
          <select value={stopLoss} onChange={(e) => setStopLoss(e.target.value)}>
            <option value="">Select SL</option>
            {options.stopLosses.map((sl) => (
              <option key={sl} value={sl}>{sl}</option>
            ))}
          </select>
        </div>
        <div>
          <label>Initial Balance</label>
          <input
            type="number"
            value={initialBalance}
            onChange={(e) => setInitialBalance(Number(e.target.value))}
          />
        </div>
        <div>
          <label>Add Strategy</label>
          <select
            onChange={(e) => {
              const s = options.strategies.find((strat) =>
                strat.code === e.target.value || strat.name === e.target.value
              );
              if (s && !comboStrategies.some((cs) => cs.code === s.code)) {
                setComboStrategies((prev) => [...prev, s]);
              }
            }}
          >
            <option value="">Select Strategy</option>
            {options.strategies.map((s) => (
              <option key={s._id || s.code} value={s.code}>
                {s.name || s.code}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* --- Selected strategies --- */}
      <div className="selected-strategies">
        <h4>Selected Strategies</h4>
        <ul>
          {comboStrategies.map((s, idx) => (
            <li key={idx}>{s.name || s.code}</li>
          ))}
        </ul>
      </div>

      {/* --- Action Buttons --- */}
      <div className="actions">
        <button className="run-btn" onClick={handleRunBacktest}>
          Run Backtest
        </button>
        <button className="save-setup-btn" onClick={() => setShowModal(true)}>
          Save Backtest Setup
        </button>
      </div>

      {/* --- Save Setup Modal --- */}
      {showModal && (
        <div className="modal modal-open">
          <div className="modal-content">
            <h3>Save Backtest Setup</h3>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <button type="button" onClick={() => setShowModal(false)}>Cancel</button>
              <button type="submit" onClick={handleSaveSetup}>Save</button>
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

      {/* --- Profit/Loss Bar Chart --- */}
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
