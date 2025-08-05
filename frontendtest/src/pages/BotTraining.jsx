import React, { useContext, useState } from 'react';
import NavBar from '../components/NavBar.jsx';
import { AuthProvider } from './hooks/useAuth.jsx';
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const BotTraining = () => {
  const { token } = useContext(AuthContext);
  const [timeframe, setTimeframe] = useState('all');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const runTraining = async () => {
    setLoading(true);
    setError('');
    setResults([]);

    try {
      const body = timeframe === 'all' ? {} : { timeframe };
      const res = await fetch(`${API_BASE}/backtest/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'Failed to run training');
      }

      const data = await res.json();

      // If single timeframe returns single object, wrap in array
      if (timeframe === 'all') {
        setResults(data.results || []);
      } else {
        setResults([data]);
      }
    } catch (err) {
      setError(err.message);
    }

    setLoading(false);
  };

  return (
    <>
      <NavBar />
      <div className="p-6 max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold mb-4">🧠 Bot Training</h1>
        <p className="mb-4 text-gray-700">
          Run strategy backtest on a specific timeframe or all timeframes.
        </p>

        <label htmlFor="timeframe" className="block mb-2 font-semibold">
          Select Timeframe:
        </label>
        <select
          id="timeframe"
          className="mb-4 p-2 border rounded"
          value={timeframe}
          onChange={(e) => setTimeframe(e.target.value)}
          disabled={loading}
        >
          <option value="all">All Timeframes</option>
          {['1m', '5m', '15m', '30m', '1h', '2h', '4h', '1d', '1w'].map((tf) => (
            <option key={tf} value={tf}>
              {tf}
            </option>
          ))}
        </select>

        <button
          onClick={runTraining}
          className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 disabled:opacity-50"
          disabled={loading}
        >
          {loading ? 'Training in Progress...' : 'Run Training'}
        </button>

        {error && <p className="text-red-600 mt-4">{error}</p>}

        {results.length > 0 && (
          <div className="mt-8">
            <h2 className="text-xl font-semibold mb-2">Training Results:</h2>
            <table className="table-auto w-full text-sm border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-200">
                  <th className="p-2 border border-gray-300">Timeframe</th>
                  <th className="p-2 border border-gray-300">Initial</th>
                  <th className="p-2 border border-gray-300">Final</th>
                  <th className="p-2 border border-gray-300">Profit</th>
                  <th className="p-2 border border-gray-300">Trades</th>
                  <th className="p-2 border border-gray-300">Candles</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r, i) => (
                  <tr key={i} className="text-center border-t border-gray-300">
                    <td className="p-2 border border-gray-300">{r.timeframe || timeframe}</td>
                    <td className="p-2 border border-gray-300">${r.initialBalance}</td>
                    <td className="p-2 border border-gray-300">${r.finalBalance}</td>
                    <td
                      className={`p-2 border border-gray-300 font-semibold ${
                        parseFloat(r.profit) >= 0 ? 'text-green-700' : 'text-red-700'
                      }`}
                    >
                      {parseFloat(r.profit) >= 0 ? `+${r.profit}` : r.profit}
                    </td>
                    <td className="p-2 border border-gray-300">{r.totalTrades}</td>
                    <td className="p-2 border border-gray-300">{r.candlesTested}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
};

export default BotTraining;
