import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useBacktests } from '../hooks/useBacktests.js';

export default function Backtests() {
  const { user } = useAuth();
  const { backtests, loading, error, runBacktests, fetchBacktests } = useBacktests(user?.id);
  const [timeframeFilter, setTimeframeFilter] = useState('');

  // Fetch existing backtests on mount
  useEffect(() => {
    if (user?.id) {
      fetchBacktests();
    }
  }, [user?.id]);

  const filteredBacktests = backtests?.filter(bt =>
    timeframeFilter ? bt.timeframe === timeframeFilter : true
  );

  return (
    <div className="flex justify-center min-h-screen bg-black text-white p-6">
      <div className="w-full max-w-5xl border border-gray-700 rounded-lg p-6">
        <h1 className="text-2xl font-bold mb-4">Backtest Results</h1>

        <div className="flex flex-wrap gap-2 mb-4 items-center">
          <input
            className="border p-2 rounded text-black w-48"
            placeholder="Filter by timeframe"
            value={timeframeFilter}
            onChange={(e) => setTimeframeFilter(e.target.value)}
          />
          <button
            className="bg-blue-500 text-white px-4 py-2 rounded"
            onClick={runBacktests}
            disabled={loading}
          >
            {loading ? 'Running Backtests...' : 'Run Backtests'}
          </button>
        </div>

        {error && <p className="text-red-500 mb-4">{error}</p>}

        {loading && backtests.length === 0 ? (
          <p>Loading results...</p>
        ) : filteredBacktests?.length > 0 ? (
          <table className="w-full table-auto border-collapse border border-gray-600">
            <thead>
              <tr className="border-b border-gray-600">
                <th className="p-2 text-left">Timeframe</th>
                <th className="p-2 text-left">Profit</th>
                <th className="p-2 text-left">Trades</th>
                <th className="p-2 text-left">Final Balance</th>
              </tr>
            </thead>
            <tbody>
              {filteredBacktests.map(bt => (
                <tr key={bt._id} className="border-b border-gray-700">
                  <td className="p-2">{bt.timeframe}</td>
                  <td className="p-2">${bt.profit}</td>
                  <td className="p-2">{bt.totalTrades}</td>
                  <td className="p-2">${bt.finalBalance}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>No backtest results found.</p>
        )}
      </div>
    </div>
  );
}
