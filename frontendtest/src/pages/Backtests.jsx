import React, { useState } from 'react';
import { useBacktest } from '../hooks/useBacktest.js';

export default function Backtests() {
  const { results = [], executeBacktest, loading } = useBacktest();
  const [timeframeFilter, setTimeframeFilter] = useState('');

  const filteredResults = results.filter(bt =>
    timeframeFilter ? bt.timeframe === timeframeFilter : true
  );

  return (
    <div className="w-full bg-black text-white p-4 rounded-lg border border-gray-700">
      <h1 className="text-2xl mb-4">Backtest Results</h1>

      <div className="mb-4 flex flex-wrap gap-2 items-center">
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
          {loading ? 'Running Backtest...' : 'Run Backtest'}
        </button>
      </div>

      {loading && results.length === 0 ? (
        <p>Loading results...</p>
      ) : filteredResults.length > 0 ? (
        <ul>
          {filteredResults.map((bt) => (
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
  );
}
