// File: src/pages/Backtests.jsx
import React, { useState, useEffect } from "react";
import { useBacktest } from "../hooks/useBacktest.js";
import "./Backtests.css";

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
  const [selectedStrategy, setSelectedStrategy] = useState("");
  const [selectedSymbol, setSelectedSymbol] = useState("");
  const [selectedTimeframe, setSelectedTimeframe] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [takeProfit, setTakeProfit] = useState("");
  const [stopLoss, setStopLoss] = useState("");
  const [batchConfigs, setBatchConfigs] = useState([]);

  // Run single backtest
  const handleRunBacktest = async () => {
    try {
      await runNewBacktest({
        strategyId: selectedStrategy,
        symbol: selectedSymbol,
        timeframe: selectedTimeframe,
        startDate,
        endDate,
        takeProfit,
        stopLoss,
      });
    } catch (err) {
      console.error("Backtest failed:", err);
    }
  };

  // Run batch backtests
  const handleRunBatch = async () => {
    try {
      await runNewBatchBacktest(batchConfigs);
    } catch (err) {
      console.error("Batch backtests failed:", err);
    }
  };

  // Delete a backtest
  const handleDeleteBacktest = async (id) => {
    try {
      await fetch(`https://neov6backend.onrender.com/api/backtest/${id}`, {
        method: "DELETE",
      });
      getPastBacktests(); // refresh
    } catch (err) {
      console.error("Failed to delete backtest:", err);
    }
  };

  return (
    <div className="backtests-container">
      <h2 className="header">Backtests</h2>

      {error && <div className="error-banner">{error}</div>}

      {/* --- Backtest Form --- */}
      <div className="backtest-form card-row">
        <div className="metric-card">
          <label>Strategy</label>
          <select
            value={selectedStrategy}
            onChange={(e) => setSelectedStrategy(e.target.value)}
          >
            <option value="">Select Strategy</option>
            {options.strategies?.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          <label>Symbol</label>
          <select
            value={selectedSymbol}
            onChange={(e) => setSelectedSymbol(e.target.value)}
          >
            <option value="">Select Symbol</option>
            {options.symbols?.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          <label>Timeframe</label>
          <select
            value={selectedTimeframe}
            onChange={(e) => setSelectedTimeframe(e.target.value)}
          >
            <option value="">Select Timeframe</option>
            {options.timeframes?.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>

          <label>Start Date</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />

          <label>End Date</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />

          <label>Take Profit</label>
          <select
            value={takeProfit}
            onChange={(e) => setTakeProfit(e.target.value)}
          >
            <option value="">None</option>
            <option value="1%">1%</option>
            <option value="2%">2%</option>
            <option value="5%">5%</option>
          </select>

          <label>Stop Loss</label>
          <select
            value={stopLoss}
            onChange={(e) => setStopLoss(e.target.value)}
          >
            <option value="">None</option>
            <option value="1%">1%</option>
            <option value="2%">2%</option>
            <option value="5%">5%</option>
          </select>

          <button className="interval-button active" onClick={handleRunBacktest}>
            Run Backtest
          </button>
          <button className="interval-button" onClick={handleRunBatch}>
            Run Batch
          </button>
        </div>
      </div>

      {/* --- Past Backtests --- */}
      <div className="sub-header">Past Backtests</div>
      {loading ? (
        <div>Loading...</div>
      ) : (
        <div className="card-row">
          {pastBacktests.results?.map((b) => (
            <div key={b._id} className="metric-card">
              <div className="card-title">{b.symbol} - {b.strategy}</div>
              <div className="card-value">Profit: {b.metrics?.profit?.toFixed(2)}</div>
              <div className="card-value">
                Max Drawdown: {b.metrics?.maxDrawdown?.toFixed(2)}%
              </div>
              <div className="card-value">Trades: {b.metrics?.trades}</div>
              <button
                className="interval-button"
                onClick={() => handleDeleteBacktest(b._id)}
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
