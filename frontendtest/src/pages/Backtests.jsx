import React, { useEffect } from "react";
import { useBacktest } from "../hooks/useBacktest.js";

export default function Backtests() {
  const {
    results,
    loading,
    error,
    timeframe,
    setTimeframe,
    runBacktest,
    fetchBacktests,
  } = useBacktest(true);

  // Fetch whenever timeframe changes
  useEffect(() => {
    fetchBacktests(timeframe);
  }, [timeframe]);

  const TIMEFRAMES = ['','1m', '5m', '15m', '30m', '1h', '2h', '4h', '1d', '1w'];

  return (
    <div className="flex justify-center min-h-screen bg-black text-white">
      <div className="w-full max-w-4xl p-6 border border-gray-700 rounded-lg">
        <h1 className="text-2xl mb-4">Backtest Results</h1>

        <div className="mb-4 flex gap-2 items-center">
          <select
            className="border p-2 rounded text-black"
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value)}
          >
            {TIMEFRAMES.map((tf, idx) => (
              <option key={idx} value={tf}>{tf || "All Timeframes"}</option>
            ))}
          </select>

          <button
            className="bg-blue-500 text-white px-4 py-2 rounded"
            onClick={runBacktest}
            disabled={loading}
          >
            {loading ? 'Running Backtest...' : 'Run Backtest'}
          </button>
        </div>

        {loading ? (
          <p>Loading results...</p>
        ) : error ? (
          <p className="text-red-500">{error}</p>
        ) : results.length > 0 ? (
          <ul>
            {results.map((bt) => (
              <li key={bt._id} className="border-b py-2">
                <strong>Timeframe:</strong> {bt.timeframe} |{' '}
                <strong>Profit:</strong> ${bt.profit} |{' '}
                <strong>Trades:</strong> {bt.totalTrades}
              </li>
            ))}
          </ul>
        ) : (
          <p>No backtest results found.</p>
        )}
      </div>
    </div>
  );
}
