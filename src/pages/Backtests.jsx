// File: src/pages/Backtests.jsx
import React, { useEffect, useState } from "react";
import { useBacktest } from "../hooks/useBacktest.js";

export default function Backtests() {
  const { options, fetchOptions, runBacktest, runBatchFromSelectors } = useBacktest();
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadOptions = async () => {
      try {
        await fetchOptions();
      } catch (err) {
        console.error("Failed to fetch options:", err);
        setError("Could not load backtest options");
      }
    };
    loadOptions();
  }, [fetchOptions]);

  // Run single backtest
  const handleRun = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await runBacktest({
        symbol: "BNBUSDT",
        timeframe: "1h",
        initialBalance: 1000,
        strategy: { name: "SMA", parameters: {} },
        risk: "Medium",
        takeProfit: null,
        stopLoss: null,
      });
      setResults([res, ...results]);
    } catch (err) {
      console.error("Backtest failed:", err);
      setError("Backtest failed");
    } finally {
      setLoading(false);
    }
  };

  // Run batch backtests
  const handleRunBatch = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await runBatchFromSelectors();
      setResults([res, ...results]);
    } catch (err) {
      console.error("Batch backtests failed:", err);
      setError("Batch backtests failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2>Backtests</h2>
      {error && <p style={{ color: "red" }}>{error}</p>}
      <button onClick={handleRun} disabled={loading}>
        {loading ? "Running..." : "Run Backtest"}
      </button>
      <button onClick={handleRunBatch} disabled={loading}>
        {loading ? "Running Batch..." : "Run Batch Backtests"}
      </button>

      <pre>{JSON.stringify(results, null, 2)}</pre>
    </div>
  );
}
