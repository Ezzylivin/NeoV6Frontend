// File: src/pages/Backtests.jsx
import React, { useState } from "react";
import { useBacktest } from "../hooks/useBacktest.js";
import "./Backtests.css";

export default function Backtests() {
  const { options, pastBacktests, loading, error, runNewBacktest, runNewBatchBacktest } = useBacktest();

  const [formState, setFormState] = useState({
    strategy: "",
    symbol: "",
    timeframe: "",
    startDate: "",
    endDate: "",
    takeProfit: "0.5%",
    stopLoss: "0.5%",
    batchConfigs: [],
  });

  // Handle form input changes
  const handleChange = (e) => {
    setFormState({ ...formState, [e.target.name]: e.target.value });
  };

  // Single backtest submission
  const handleRunBacktest = async () => {
    try {
      await runNewBacktest({
        strategyId: formState.strategy,
        symbol: formState.symbol,
        timeframe: formState.timeframe,
        startDate: formState.startDate,
        endDate: formState.endDate,
        takeProfit: formState.takeProfit,
        stopLoss: formState.stopLoss,
      });
      alert("Backtest executed successfully!");
    } catch (err) {
      alert("Backtest failed: " + err.message);
    }
  };

  // Batch backtest submission
  const handleRunBatch = async () => {
    try {
      // Example: You would gather multiple configs from batchConfigs array
      await runNewBatchBacktest(formState.batchConfigs);
      alert("Batch backtests executed successfully!");
    } catch (err) {
      alert("Batch backtests failed: " + err.message);
    }
  };

  return (
    <div className="backtests-container">
      <div className="backtest-form">
        <h2>Run Backtest</h2>

        {error && <div className="backtest-error">{error}</div>}
        {loading && <div className="backtest-loading">Loading...</div>}

        <label>
          Strategy
          <select name="strategy" value={formState.strategy} onChange={handleChange}>
            <option value="">Select strategy</option>
            {options.strategies.map((s) => (
              <option key={s._id} value={s._id}>{s.name}</option>
            ))}
          </select>
        </label>

        <label>
          Symbol
          <select name="symbol" value={formState.symbol} onChange={handleChange}>
            <option value="">Select symbol</option>
            {options.symbols.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </label>

        <label>
          Timeframe
          <select name="timeframe" value={formState.timeframe} onChange={handleChange}>
            <option value="">Select timeframe</option>
            {options.timeframes.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </label>

        <label>
          Start Date
          <input type="date" name="startDate" value={formState.startDate} onChange={handleChange} />
        </label>

        <label>
          End Date
          <input type="date" name="endDate" value={formState.endDate} onChange={handleChange} />
        </label>

        <label>
          Take Profit
          <select name="takeProfit" value={formState.takeProfit} onChange={handleChange}>
            <option value="0.5%">0.5%</option>
            <option value="1%">1%</option>
            <option value="2%">2%</option>
            <option value="5%">5%</option>
          </select>
        </label>

        <label>
          Stop Loss
          <select name="stopLoss" value={formState.stopLoss} onChange={handleChange}>
            <option value="0.5%">0.5%</option>
            <option value="1%">1%</option>
            <option value="2%">2%</option>
            <option value="5%">5%</option>
          </select>
        </label>

        <div style={{ marginTop: "15px" }}>
          <button onClick={handleRunBacktest}>Run Backtest</button>
          <button onClick={handleRunBatch}>Run Batch</button>
        </div>
      </div>

      <div className="past-backtests">
        <h2>Past Backtests</h2>
        <table>
          <thead>
            <tr>
              <th>Strategy</th>
              <th>Symbol</th>
              <th>Timeframe</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {pastBacktests.results.map((b) => (
              <tr key={b._id}>
                <td>{b.strategy?.name || "-"}</td>
                <td>{b.symbol || "-"}</td>
                <td>{b.timeframe || "-"}</td>
                <td>{new Date(b.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
