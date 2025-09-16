import React, { useState } from "react";
import { useBacktest } from "../hooks/useBacktest.js";
import "./backtests.css";

export default function Backtests() {
  const { options, pastBacktests, loading, error, runNewBacktest } = useBacktest();

  const [selectedStrategy, setSelectedStrategy] = useState("");
  const [selectedSymbol, setSelectedSymbol] = useState("");
  const [selectedTimeframe, setSelectedTimeframe] = useState("");

  const handleRunBacktest = async () => {
    if (!selectedStrategy || !selectedSymbol || !selectedTimeframe) return;
    try {
      await runNewBacktest({
        strategyId: selectedStrategy,
        symbol: selectedSymbol,
        timeframe: selectedTimeframe,
        startDate: "2025-01-01",
        endDate: "2025-09-16",
        takeProfit: 1,
        stopLoss: 1,
      });
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="backtest-panel">
      <h2>Run Backtest</h2>
      <div className="form-grid">
        <div>
          <label>Strategy</label>
          <select
            className="form-input dark-dropdown"
            value={selectedStrategy}
            onChange={(e) => setSelectedStrategy(e.target.value)}
          >
            <option value="">Select Strategy</option>
            {options.strategies.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label>Symbol</label>
          <select
            className="form-input dark-dropdown"
            value={selectedSymbol}
            onChange={(e) => setSelectedSymbol(e.target.value)}
          >
            <option value="">Select Symbol</option>
            {options.symbols.map((sym) => (
              <option key={sym} value={sym}>
                {sym}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label>Timeframe</label>
          <select
            className="form-input dark-dropdown"
            value={selectedTimeframe}
            onChange={(e) => setSelectedTimeframe(e.target.value)}
          >
            <option value="">Select Timeframe</option>
            {options.timeframes.map((tf) => (
              <option key={tf} value={tf}>
                {tf}
              </option>
            ))}
          </select>
        </div>
      </div>

      <button className="run-button" onClick={handleRunBacktest} disabled={loading}>
        {loading ? "Running..." : "Run Backtest"}
      </button>

      {error && <p style={{ color: "red" }}>{error}</p>}

      <h2>Past Backtests</h2>
      <div className="past-backtests overflow-x-auto">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Strategy</th>
              <th>Symbol</th>
              <th>Timeframe</th>
              <th>Result</th>
            </tr>
          </thead>
          <tbody>
            {pastBacktests.results.map((b) => (
              <tr key={b.id}>
                <td>{b.id}</td>
                <td>{b.strategy}</td>
                <td>{b.symbol}</td>
                <td>{b.timeframe}</td>
                <td>{b.result}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
