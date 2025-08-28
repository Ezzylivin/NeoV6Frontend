import React, { useState } from 'react';
import { useBacktest } from '../hooks/useBacktest.js';

const BacktestsPage = () => {
  const { results, executeBacktest, loading } = useBacktest();
  const [timeframeFilter, setTimeframeFilter] = useState('');

  const filteredResults = results.filter((bt) =>
    timeframeFilter ? bt.timeframe === timeframeFilter : true
  );

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h1 className="text-2xl mb-4">Backtest Results</h1>

      {/* Filter & Actions */}
      <div className="mb-4 flex flex-wrap gap-2 items-center">
        <input
          className="border p-2"
          placeholder="Filter by timeframe (e.g. 1h)"
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

      {/* Results List */}
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
};

export default BacktestsPage;
