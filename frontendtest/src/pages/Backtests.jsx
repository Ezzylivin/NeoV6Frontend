import React, { useState } from 'react';
import { useBacktest } from '../hooks/useBacktest.js';
import { useAuth } from '../context/AuthContext.jsx';

const TIMEFRAMES = ['1m', '5m', '15m', '30m', '1h', '4h', '1d'];
const BALANCES = [100, 300, 500, 1000, 5000, 10000];

export default function Backtests() {
  const { user } = useAuth();
  const { results, loading, error, executeBacktest } = useBacktest();

  const [timeframe, setTimeframe] = useState(TIMEFRAMES[0]);
  const [initialBalance, setInitialBalance] = useState(BALANCES[2]);

  const filteredResults = (results || []).filter(
    (bt) => !timeframe || bt.timeframe === timeframe
  );

  const handleRunBacktest = () => {
    if (!user) return;
    executeBacktest(user.id, initialBalance, timeframe);
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-black text-white">
      <div className="w-full max-w-4xl p-6 border border-gray-700 rounded-lg">
        <h1 className="text-2xl font-bold mb-4">Backtest Results</h1>

        {/* Filters / Inputs */}
        <div className="mb-4 flex flex-wrap gap-2 items-center">
          <div>
            <label className="block mb-1">Timeframe:</label>
            <select
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value)}
              className="border p-2 rounded text-black"
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
              className="border p-2 rounded text-black"
            >
              {BALANCES.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>

          <button
            className="bg-blue-500 text-white px-4 py-2 rounded mt-4"
            onClick={handleRunBacktest}
            disabled={loading}
          >
            {loading ? 'Running Backtest...' : 'Run Backtest'}
          </button>
        </div>

        {error && <p className="text-red-500">{error}</p>}

        {filteredResults.length > 0 ? (
          <ul>
            {filteredResults.map((bt) => (
              <li key={bt._id} className="border-b py-2">
                <strong>Timeframe:</strong> {bt.timeframe} |{' '}
                <strong>Initial Balance:</strong> ${bt.initialBalance} |{' '}
                <strong>Final Balance:</strong> ${bt.finalBalance} |{' '}
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
