// File: src/pages/Backtests.jsx
import React, { useEffect, useState } from "react";
import { useBacktest } from "../hooks/useBacktest.js";

const TIMEFRAMES = ["1m", "5m", "15m", "30m", "1h", "4h", "1d"];
const BALANCES = [100, 300, 500, 1000, 5000, 10000, 50000];

export default function Backtests() {
  const { results, loading, error, runBacktests, fetchBacktests } = useBacktest();
  const [timeframe, setTimeframe] = useState(TIMEFRAMES[0]);
  const [initialBalance, setInitialBalance] = useState(BALANCES[2]);

  // Fetch saved backtests on load
  useEffect(() => {
    fetchBacktests();
  }, []);

  // Always ensure results is an array
  const safeResults = Array.isArray(results) ? results : [];
  const filteredResults = safeResults.filter(
    (bt) => !timeframe || bt.timeframe === timeframe
  );

  const handleRun = async () => {
    await runBacktests(timeframe, initialBalance);
    await fetchBacktests();
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-black text-white">
      <div className="w-full max-w-4xl p-6 border border-gray-700 rounded-lg">
        <h1 className="text-2xl font-bold mb-4">Backtests</h1>

        {/* Controls */}
        <div className="flex gap-4 mb-4">
          <div>
            <label className="block mb-1">Timeframe:</label>
            <select
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value)}
              className="p-2 rounded text-black"
            >
              {TIMEFRAMES.map((tf) => (
                <option key={tf} value={tf}>{tf}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block mb-1">Initial Balance ($):</label>
            <select
              value={initialBalance}
              onChange={(e) => setInitialBalance(Number(e.target.value))}
              className="p-2 rounded text-black"
            >
              {BALANCES.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>

          <button
            onClick={handleRun}
            className="bg-green-500 px-4 py-2 rounded self-end"
            disabled={loading}
          >
            {loading ? "Running..." : "Run Backtest"}
          </button>
        </div>

        {/* Error */}
        {error && <div className="text-red-500 mb-4"><strong>Error:</strong> {error}</div>}

        {/* Results */}
        <div>
          <h2 className="text-xl font-semibold mb-2">Results</h2>
          {safeResults.length === 0 ? (
            <p>No backtests found.</p>
          ) : (
            <table className="w-full border-collapse border border-gray-700">
              <thead>
                <tr className="bg-gray-800">
                  <th className="border border-gray-700 p-2">Timeframe</th>
                  <th className="border border-gray-700 p-2">Initial</th>
                  <th className="border border-gray-700 p-2">Final</th>
                  <th className="border border-gray-700 p-2">Profit</th>
                  <th className="border border-gray-700 p-2">Trades</th>
                  <th className="border border-gray-700 p-2">Candles</th>
                </tr>
              </thead>
              <tbody>
                {filteredResults.map((bt, idx) => (
                  <tr key={idx} className="text-center">
                    <td className="border border-gray-700 p-2">{bt.timeframe}</td>
                    <td className="border border-gray-700 p-2">${bt.initialBalance}</td>
                    <td className="border border-gray-700 p-2">${bt.finalBalance}</td>
                    <td className={`border border-gray-700 p-2 ${bt.profit >= 0 ? "text-green-400" : "text-red-400"}`}>
                      ${bt.profit}
                    </td>
                    <td className="border border-gray-700 p-2">{bt.totalTrades}</td>
                    <td className="border border-gray-700 p-2">{bt.candlesTested}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
