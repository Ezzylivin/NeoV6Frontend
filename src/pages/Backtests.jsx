// File: src/pages/Backtests.jsx
import React, { useState } from "react";
import { useBacktest } from "../hooks/useBacktest.js";
import { useBacktestSetupFunction } from "../hooks/useBacktestSetup.jsx";
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
  // ✅ Use hooks correctly
  const {
    options,
    runNewBacktest,
    runComboBacktest,
    initialLoading,
    singleLoading,
    batchLoading,
  } = useBacktest();

  const { setups, createSetup, deleteSetup } = useBacktestSetupFunction();

  // --- Form State ---
  const [selectedStrategy, setSelectedStrategy] = useState("");
  const [selectedSymbol, setSelectedSymbol] = useState("");
  const [selectedTimeframe, setSelectedTimeframe] = useState("");
  const [selectedTP, setSelectedTP] = useState("");
  const [selectedSL, setSelectedSL] = useState("");
  const [comboStrategies, setComboStrategies] = useState([]);
  const [initialBalance, setInitialBalance] = useState(1000); // ✅ NEW

  // --- Results ---
  const [singleResult, setSingleResult] = useState(null);
  const [comboResult, setComboResult] = useState(null);

  // --- Handlers ---
  const handleAddStrategy = () => {
    if (selectedStrategy) {
      setComboStrategies((prev) => [...prev, selectedStrategy]);
      setSelectedStrategy("");
    }
  };

  const handleRunSingle = async () => {
    try {
      const payload = {
        strategy: selectedStrategy,
        symbol: selectedSymbol,
        timeframe: selectedTimeframe,
        takeProfit: selectedTP,
        stopLoss: selectedSL,
        initialBalance, // ✅ include initial balance
      };
      const result = await runNewBacktest(payload);
      setSingleResult(result);
    } catch (err) {
      console.error("❌ Single backtest error:", err);
    }
  };

  const handleRunCombo = async () => {
    try {
      const payload = {
        strategies: comboStrategies,
        symbol: selectedSymbol,
        timeframe: selectedTimeframe,
        takeProfit: selectedTP,
        stopLoss: selectedSL,
        initialBalance, // ✅ include initial balance
      };
      const result = await runComboBacktest(payload);
      setComboResult(result);
    } catch (err) {
      console.error("❌ Combo backtest error:", err);
    }
  };

  const handleSaveSetup = async () => {
    try {
      await createSetup({
        strategies: comboStrategies,
        symbol: selectedSymbol,
        timeframe: selectedTimeframe,
        takeProfit: selectedTP,
        stopLoss: selectedSL,
        initialBalance, // ✅ save initial balance too
      });
    } catch (err) {
      console.error("❌ Save setup error:", err);
    }
  };

  // --- Chart Renderer ---
  const renderEquityCurve = (title, data, key = "equity") => (
    <div className="chart-card" key={title}>
      <h4>{title}</h4>
      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={data || []}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="timestamp" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line
            type="monotone"
            dataKey={key}
            stroke="#82ca9d"
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );

  if (initialLoading) return <div>Loading backtest options...</div>;

  return (
    <div className="backtests-container">
      <h2>Backtests</h2>

      {/* --- Form Section --- */}
      <div className="selectors">
        <label>Strategy:</label>
        <select
          value={selectedStrategy}
          onChange={(e) => setSelectedStrategy(e.target.value)}
        >
          <option value="">-- Select Strategy --</option>
          {options.strategies.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        <button
          onClick={handleAddStrategy}
          disabled={!selectedStrategy}
          className="add-strategy-btn"
        >
          ➕ Add Strategy
        </button>

        <label>Symbol:</label>
        <select
          value={selectedSymbol}
          onChange={(e) => setSelectedSymbol(e.target.value)}
        >
          <option value="">-- Select Symbol --</option>
          {options.symbols.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        <label>Timeframe:</label>
        <select
          value={selectedTimeframe}
          onChange={(e) => setSelectedTimeframe(e.target.value)}
        >
          <option value="">-- Select Timeframe --</option>
          {options.timeframes.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>

        <label>Take Profit:</label>
        <select
          value={selectedTP}
          onChange={(e) => setSelectedTP(e.target.value)}
        >
          <option value="">-- Select TP --</option>
          {options.takeProfits.map((tp) => (
            <option key={tp} value={tp}>
              {tp}
            </option>
          ))}
        </select>

        <label>Stop Loss:</label>
        <select
          value={selectedSL}
          onChange={(e) => setSelectedSL(e.target.value)}
        >
          <option value="">-- Select SL --</option>
          {options.stopLosses.map((sl) => (
            <option key={sl} value={sl}>
              {sl}
            </option>
          ))}
        </select>

        {/* ✅ Initial Balance Input */}
        <label>Initial Balance:</label>
        <input
          type="number"
          min="100"
          step="100"
          value={initialBalance}
          onChange={(e) => setInitialBalance(Number(e.target.value))}
        />

        <div className="button-row">
          <button onClick={handleRunSingle} disabled={singleLoading}>
            {singleLoading ? "Running..." : "Run Single"}
          </button>
          <button onClick={handleRunCombo} disabled={batchLoading}>
            {batchLoading ? "Running..." : "Run Combo"}
          </button>
          <button onClick={handleSaveSetup}>Save Setup</button>
        </div>
      </div>

      {/* --- Active Combo List --- */}
      {comboStrategies.length > 0 && (
        <div className="combo-strategies">
          <h4>Selected Strategies:</h4>
          <ul>
            {comboStrategies.map((s, idx) => (
              <li key={idx}>{s}</li>
            ))}
          </ul>
        </div>
      )}

      {/* --- Results --- */}
      <div className="charts-grid">
        {singleResult && renderEquityCurve("Single Strategy Equity Curve", singleResult.equity_curve)}
        {comboResult &&
          comboResult.strategy_results &&
          Object.entries(comboResult.strategy_results).map(([strategy, res]) =>
            renderEquityCurve(`${strategy} Equity Curve`, res.equity_curve)
          )}
        {comboResult && comboResult.combined_equity_curve &&
          renderEquityCurve("Combined Equity Curve", comboResult.combined_equity_curve)}
      </div>
    </div>
  );
}
