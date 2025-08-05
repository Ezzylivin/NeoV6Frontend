import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import NavBar from '../components/NavBar.jsx';
import { fetchBacktestResults, runBacktest } from '../api/backtest';

const Backtests = () => {
  const { token } = useAuth();
  const [results, setResults] = useState([]);
  const [timeframeFilter, setTimeframeFilter] = useState('');
  const [loading, setLoading] = useState(false);

  // Fetch backtest results (optionally filtered)
  const fetchBacktests = async () => {
    setLoading(true);
    try {
      const data = await fetchBacktestResults(token, timeframeFilter);
      setResults(data);
    } catch (error) {
      console.error(error);
      alert('Error fetching backtests');
    }
    setLoading(false);
  };

  // Run new backtest and update results
  const handleRunBacktest = async () => {
    setLoading(true);
    try {
      const data = await runBacktest(token);
      setResults(data.results);
    } catch (error) {
      console.error(error);
      alert('Error running backtest');
    }
    setLoading(false);
  };

  // Initial load
  useEffect(() => {
    if (token) fetchBacktests();
  }, [token]);

  return (
    <>
      <NavBar />
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
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded"
            onClick={fetchBacktests}
          >
            Apply
          </button>
          <button
            disabled={loading}
            className="px-4 py-2 bg-green-600 text-white rounded"
            onClick={handleRunBacktest}
          >
            {loading ? 'Running...' : 'Run Backtest'}
          </button>
        </div>

        {/* Results */}
        {loading ? (
          <p>Loading...</p>
        ) : results.length === 0 ? (
          <p>No backtest results found.</p>
        ) : (
          <table className="table-auto w-full text-sm">
            <thead>
              <tr className="bg-gray-200">
                <th>Timeframe</th>
                <th>Initial</th>
                <th>Final</th>
                <th>Profit</th>
                <th>Trades</th>
                <th>Candles Tested</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {results.map((b) => (
                <tr key={b._id}>
                  <td>{b.timeframe}</td>
                  <td>${Number(b.initialBalance).toFixed(2)}</td>
                  <td>${Number(b.finalBalance).toFixed(2)}</td>
                  <td
                    style={{ color: Number(b.profit) >= 0 ? 'green' : 'red' }}
                  >
                    ${Number(b.profit).toFixed(2)}
                  </td>
                  <td>{b.totalTrades}</td>
                  <td>{b.candlesTested}</td>
                  <td>{new Date(b.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
};

export default Backtests;
