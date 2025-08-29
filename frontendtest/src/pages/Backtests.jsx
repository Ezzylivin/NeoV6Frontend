import React, { useState } from "react";
import { useBacktest } from "../hooks/useBacktest.js";

export default function Backtests() {
  const { results, executeBacktest, loading } = useBacktest();
  const [timeframeFilter, setTimeframeFilter] = useState("");

  const filteredResults = results ? results.filter((bt) =>
    timeframeFilter ? bt.timeframe === timeframeFilter : true
  ) : [];

  return (
    <div> {/* Removed text-center */}
      <h1 className="text-2xl font-bold mb-4">Backtest Results</h1>

      <div className="mb-4 flex gap-2"> {/* Removed justify-center here for left alignment of filter/button */}
        <input
          className="border p-2 rounded text-black w-48"
          placeholder="Filter by timeframe"
          value={timeframeFilter}
          onChange={(e) => setTimeframeFilter(e.target.value)}
        />
        <button
          className="bg-blue-500 text-white px-4 py-2 rounded"
          onClick={executeBacktest}
          disabled={loading}
        >
          {loading ? "Running Backtest..." : "Run Backtest"}
        </button>
      </div>

      {loading && filteredResults.length === 0 ? (
        <p>Loading results...</p>
      ) : filteredResults.length > 0 ? (
        <ul className="text-left"> {/* Removed inline-block */}
          {filteredResults.map((bt) => (
            <li key={bt._id} className="border-b py-2">
              <strong>Timeframe:</strong> {bt.timeframe} |{" "}
              <strong>Profit:</strong> ${bt.profit} |{" "}
              <strong>Trades:</strong> {bt.totalTrades}
            </li>
          ))}
        </ul>
      ) : (
        <p>No backtest results found.</p>
      )}
    </div>
  );
}
