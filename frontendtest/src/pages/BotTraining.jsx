import React, { useContext, useState } from 'react';
import NavBar from '../components/NavBar.jsx';
import { AuthContext } from '../context/AuthContext.jsx';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const BotTraining = () => {
  const { token } = useContext(AuthContext);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const runTraining = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/backtest/run`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to run training');
      const data = await res.json();
      setResults(data.results || []);
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
        <p className="mb-4 text-gray-700">This will run the strategy across multiple timeframes and store results.</p>

        <button
          onClick={runTraining}
          className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 disabled:opacity-50"
          disabled={loading}
        >
          {loading ? 'Training in Progress...' : 'Run Training Across All Timeframes'}
        </button>

        {error && <p className="text-red-600 mt-4">{error}</p>}

        {results.length > 0 && (
          <div className="mt-8">
            <h2 className="text-xl font-semibold mb-2">Training Results:</h2>
            <table className="table-auto w-full text-sm">
              <thead>
                <tr className="bg-gray-200">
                  <th className="p-2">Timeframe</th>
                  <th className="p-2">Initial</th>
                  <th className="p-2">Final</th>
                  <th className="p-2">Profit</th>
                  <th className="p-2">Trades</th>
                  <th className="p-2">Candles</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r, i) => (
                  <tr key={i} className="text-center border-t">
                    <td className="p-2">{r.timeframe}</td>
                    <td className="p-2">${r.initialBalance}</td>
                    <td className="p-2">${r.finalBalance}</td>
                    <td className="p-2 text-green-700 font-semibold">
                      {parseFloat(r.profit) >= 0 ? `+${r.profit}` : r.profit}
                    </td>
                    <td className="p-2">{r.totalTrades}</td>
                    <td className="p-2">{r.candlesTested}</td>
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
