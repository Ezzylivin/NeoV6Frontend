import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthProvider.jsx'; // Auth context hook
import { startBot, stopBot, getBotStatus } from '../services/botService.js';
import { fetchLogs } from '../services/logService.js'; // New log service
import NavBar from '../components/NavBar.jsx';

const Dashboard = () => {
  const { token, user } = useAuth(); // Auth context
  const [botStatus, setBotStatus] = useState(null);
  const [symbol, setSymbol] = useState('BTC/USDT');
  const [amount, setAmount] = useState(100);
  const [timeframes, setTimeframes] = useState(['1h']);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Load bot status and logs on mount
  const loadDashboardData = async () => {
    try {
      const status = await getBotStatus(token);
      const initialLogs = await fetchLogs(token);
      setBotStatus(status);
      setLogs(initialLogs);
    } catch (err) {
      console.error('Dashboard load failed:', err);
      setError('Failed to load dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      loadDashboardData();

      const interval = setInterval(() => {
        fetchLogs(token).then(setLogs).catch(console.error);
      }, 10000);

      return () => clearInterval(interval);
    }
  }, [token]);

  const startHandler = async () => {
    if (!symbol || !amount || timeframes.length === 0) {
      setError('Please fill all bot configuration fields.');
      return;
    }

    setError('');
    try {
      await startBot(token, { symbol, amount: Number(amount), timeframes });
      await loadDashboardData();
      alert('Bot started!');
    } catch (err) {
      console.error('Start bot failed:', err);
      setError(err.message || 'Failed to start bot.');
    }
  };

  const stopHandler = async () => {
    setError('');
    try {
      await stopBot(token);
      await loadDashboardData();
      alert('Bot stopped!');
    } catch (err) {
      console.error('Stop bot failed:', err);
      setError(err.message || 'Failed to stop bot.');
    }
  };

  if (loading) {
    return <div>Loading Dashboard...</div>;
  }

  return (
    <>
      <NavBar />
      <div className="p-4 max-w-4xl mx-auto">
        <h1 className="text-3xl mb-4 font-bold">Dashboard</h1>

        {error && (
          <p className="text-red-500 bg-red-100 p-2 rounded mb-4">
            {error}
          </p>
        )}

        <section className="mb-8 p-4 border rounded shadow">
          <h2 className="text-xl mb-4 font-semibold">Bot Controls</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input
              type="text"
              placeholder="Symbol (e.g., BTC/USDT)"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              className="border p-2 rounded"
            />
            <input
              type="number"
              placeholder="Amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="border p-2 rounded"
            />
            <select
              multiple
              value={timeframes}
              onChange={(e) =>
                setTimeframes(Array.from(e.target.selectedOptions, (o) => o.value))
              }
              className="border p-2 rounded"
            >
              <option value="1m">1m</option>
              <option value="5m">5m</option>
              <option value="15m">15m</option>
              <option value="1h">1h</option>
              <option value="4h">4h</option>
              <option value="1d">1d</option>
            </select>
          </div>
          <div className="mt-4 flex gap-4">
            <button onClick={startHandler} className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">
              Start Bot
            </button>
            <button onClick={stopHandler} className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700">
              Stop Bot
            </button>
          </div>
          <p className="mt-2 font-semibold">
            Status:{' '}
            <span className={botStatus?.isRunning ? 'text-green-600' : 'text-red-600'}>
              {botStatus ? (botStatus.isRunning ? 'Running' : 'Stopped') : 'Unknown'}
            </span>
          </p>
        </section>

        <section className="p-4 border rounded shadow">
          <h2 className="text-xl mb-2 font-semibold">Live Logs</h2>
          <div className="max-h-64 overflow-auto bg-gray-800 text-white p-2 rounded border font-mono text-xs">
            {logs.length > 0 ? (
              logs.map((log) => (
                <div key={log._id}>
                  <span className="text-gray-400">[{new Date(log.createdAt).toLocaleTimeString()}]</span>{' '}
                  {log.message}
                </div>
              ))
            ) : (
              <p>No logs to display.</p>
            )}
          </div>
        </section>
      </div>
    </>
  );
};

export default Dashboard;
