import React, { useState, useEffect } from "react";
import { useBacktest } from "../hooks/useBacktest.js";

export default function Backtests() {
  const { options, pastBacktests, loading, error, runNewBacktest } = useBacktest();

  // Selected values
  const [selectedStrategyId, setSelectedStrategyId] = useState("");
  const [selectedSymbol, setSelectedSymbol] = useState("");
  const [selectedTimeframe, setSelectedTimeframe] = useState("");

  const handleRunBacktest = async () => {
    try {
      if (!selectedStrategyId || !selectedSymbol || !selectedTimeframe) {
        alert("Please select all fields.");
        return;
      }

      await runNewBacktest({
        strategyId: selectedStrategyId,
        symbol: selectedSymbol,
        timeframe: selectedTimeframe,
      });

      alert("Backtest executed successfully.");
    } catch (err) {
      console.error("Backtest failed:", err);
      alert("Backtest failed: " + err.message);
    }
  };

  return (
    <div style={{ padding: "2rem", color: "#fff", backgroundColor: "#121212" }}>
      <h1>Backtests</h1>

      {/* Error display */}
      {error && <div style={{ color: "red", marginBottom: "1rem" }}>{error}</div>}

      {/* Strategy Dropdown */}
      <label htmlFor="strategy" style={{ display: "block", marginBottom: "0.5rem" }}>
        Strategy
      </label>
      <select
        id="strategy"
        value={selectedStrategyId}
        onChange={(e) => setSelectedStrategyId(e.target.value)}
        style={{
          backgroundColor: "black",
          color: "white",
          padding: "0.5rem",
          borderRadius: "0.25rem",
          border: "1px solid #333",
          marginBottom: "1rem",
        }}
      >
        <option value="">-- Select Strategy --</option>
        {options.strategies.map((s) => (
          <option key={s._id} value={s._id}>
            {s.name}
          </option>
        ))}
      </select>

      {/* Symbol Dropdown */}
      <label htmlFor="symbol" style={{ display: "block", marginBottom: "0.5rem" }}>
        Symbol
      </label>
      <select
        id="symbol"
        value={selectedSymbol}
        onChange={(e) => setSelectedSymbol(e.target.value)}
        style={{
          backgroundColor: "black",
          color: "white",
          padding: "0.5rem",
          borderRadius: "0.25rem",
          border: "1px solid #333",
          marginBottom: "1rem",
        }}
      >
        <option value="">-- Select Symbol --</option>
        {options.symbols.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>

      {/* Timeframe Dropdown */}
      <label htmlFor="timeframe" style={{ display: "block", marginBottom: "0.5rem" }}>
        Timeframe
      </label>
      <select
        id="timeframe"
        value={selectedTimeframe}
        onChange={(e) => setSelectedTimeframe(e.target.value)}
        style={{
          backgroundColor: "black",
          color: "white",
          padding: "0.5rem",
          borderRadius: "0.25rem",
          border: "1px solid #333",
          marginBottom: "1rem",
        }}
      >
        <option value="">-- Select Timeframe --</option>
        {options.timeframes.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>

      <button
        onClick={handleRunBacktest}
        style={{
          padding: "0.75rem 1.5rem",
          backgroundColor: "#1f1f1f",
          color: "white",
          border: "1px solid #333",
          borderRadius: "0.25rem",
          cursor: "pointer",
        }}
      >
        Run Backtest
      </button>

      {/* Past Backtests */}
      <div style={{ marginTop: "2rem" }}>
        <h2>Past Backtests</h2>
        {pastBacktests.results.length === 0 && <div>No backtests found.</div>}
        <ul>
          {pastBacktests.results.map((bt) => (
            <li key={bt._id}>
              {bt.strategyName} | {bt.symbol} | {bt.timeframe} | {new Date(bt.createdAt).toLocaleString()}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
