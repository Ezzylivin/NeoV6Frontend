import React, { useEffect, useState } from 'react';
// FIX 1: Import the useAuth hook to get user and token info correctly.
import { AuthContext } from '../context/AuthContext.jsx';
// FIX 2: Import API functions from dedicated frontend service files.
import { startBot, stopBot, getBotStatus } from '../services/botService.js';
import NavBar from '../components/NavBar.jsx';

const Dashboard = () => {
  // Get the token and user from our consistent auth hook.
  const { token, user } = useContext(AuthContext);

  const [botStatus, setBotStatus] = useState(null);
  const [symbol, setSymbol] = useState('BTC/USDT');
  const [amount, setAmount] = useState(100); // Set a default amount
  const [timeframes, setTimeframes] = useState(['1h']);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Use a single function to fetch all necessary data.
  const loadDashboardData = async () => {
    if (!token) return;
    try {
      const statusData = await getBotStatus(token);
      setBotStatus(statusData);
      const logData = await fetchLogs(token);
      setLogs(logData);
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
      setError('Could not load dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();

    const interval = setInterval(() => {
      fetchLogs(token).then(setLogs).catch(console.error);
    }, 10000); // Poll every 10 seconds

    return () => clearInterval(interval);
  }, [token]); // Re-run if the token changes

  const startHandler = async () => {
    if (!symbol || !amount || timeframes.length === 0) {
      setError('Please fill all bot configuration fields.');
      return;
    }
    setError('');
    try {
      await startBot(token, { symbol, amount: Number(amount), timeframes });
      await loadDashboardData(); // Refresh all data
      alert('Bot start request sent!');
    } catch (err) {
      console.error('Failed to start bot:', err);
      setError(err.message || 'Failed to start bot.');
      alert(err.message || 'Failed to start bot.');
    }
  };

  const stopHandler = async () => {
    setError('');
    try {
      await stopBot(token);
      await loadDashboardData(); // Refresh all data
      alert('Bot stop request sent!');
    } catch (err) {
      console.error('Failed to stop bot:', err);
      setError(err.message || 'Failed to stop bot.');
      alert(err.message || 'Failed to stop bot.');
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
        {error && <p className="text-red-500 bg-red-100 p-2 rounded mb-4">{error}</p>}

        <section className="mb-8 p-4 border rounded shadow">
          <h2 className="text-xl mb-4 font-semibold">Bot Controls</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Input fields for symbol, amount, and timeframes */}
          </div>
          <div className="mt-4 flex gap-4">
            <button onClick={startHandler} className="bg-green-600 ...">Start Bot</button>
            <button onClick={stopHandler} className="bg-red-600 ...">Stop Bot</button>
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
                  <span className="text-gray-400">[{new Date(log.createdAt).toLocaleTimeString()}]</span> {log.message}
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
