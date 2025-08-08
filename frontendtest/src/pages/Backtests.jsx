import React, { useState, useEffect } from 'react';
import NavBar from '../components/NavBar.jsx';
 // Correct hook import
import { useBacktest  } from '../hooks/useBacktest.jsx'; // Your API functions

const Backtests = () => {
  //const { token } = useAuth();
  const [results, setResults] = useState([]);
  const [timeframeFilter, setTimeframeFilter] = useState('');
  const [loading, setLoading] = useState(false);

  // Rename local function to avoid conflict
  const loadBacktestResults = async () => {
    setLoading(true);
    try {
      const data = await fetchBacktestsResults(token, timeframeFilter);
      setResults(data.results || []); // Adjust if API returns differently
    } catch (error) {
      console.error(error);
      alert('Error fetching backtest results');
    }
    setLoading(false);
  };

  const handleRunBacktest = async () => {
    setLoading(true);
    try {
      const data = await runBacktest(token);
      if (data?.results) {
        setResults((prev) => [...data.results, ...prev]); // Spread array of results
      }
    } catch (error) {
      console.error(error);
      alert('Error running backtest');
    }
    setLoading(false);
  };

  useEffect(() => {
    if (token) loadBacktestResults();
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
            className="bg-blue-500 text-white px-4 py-2 rounded"
            onClick={handleRunBacktest}
            disabled={loading}
          >
            {loading ? 'Running Backtest...' : 'Run Backtest'}
          </button>
          <button
            className="bg-gray-300 px-4 py-2 rounded"
            onClick={loadBacktestResults}
            disabled={loading}
          >
            Refresh
          </button>
        </div>

        {/* Results List */}
        {loading && results.length === 0 ? (
          <p>Loading results...</p>
        ) : (
          <ul>
            {results.map((bt) => (
              <li key={bt._id} className="border-b py-2">
                <strong>Timeframe:</strong> {bt.timeframe} |{' '}
                <strong>Profit:</strong> ${bt.profit} |{' '}
                <strong>Trades:</strong> {bt.totalTrades}
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
};

export default Backtests;
