import React, { useContext, useEffect, useState } from 'react';
import { AuthProvider } from './hooks/useAuth.jsx';
import { startBot, stopBot, getBotStatus } from '../api/bot.js';
import { fetchLogs } from '../api/logs.js';
import NavBar from '../components/NavBar.jsx';

const Dashboard = () => {
  const { token } = useContext(AuthContext);

  const [botStatus, setBotStatus] = useState(null);
  const [symbol, setSymbol] = useState('BTC/USDT');
  const [amount, setAmount] = useState('');
  const [timeframes, setTimeframes] = useState(['1h']);
  const [logs, setLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  const fetchStatus = async () => {
    try {
      const data = await getBotStatus(token);
      setBotStatus(data);
    } catch {}
  };

  const fetchLatestLogs = async () => {
    setLoadingLogs(true);
    try {
      const data = await fetchLogs(token);
      setLogs(data);
    } catch {}
    setLoadingLogs(false);
  };

  useEffect(() => {
    fetchStatus();
    fetchLatestLogs();

    const interval = setInterval(() => {
      fetchLatestLogs();
    }, 5000); // poll every 5 sec

    return () => clearInterval(interval);
  }, []);

  const startHandler = async () => {
    if (!symbol || !amount || timeframes.length === 0) {
      alert('Please fill all fields');
      return;
    }

    try {
      await startBot(token, symbol, Number(amount), timeframes);
      fetchStatus();
      alert('Bot started');
    } catch {
      alert('Failed to start bot');
    }
  };

  const stopHandler = async () => {
    try {
      await stopBot(token);
      fetchStatus();
      alert('Bot stopped');
    } catch {
      alert('Failed to stop bot');
    }
  };

  return (
    <>
      <NavBar />
      <div className="p-4 max-w-4xl mx-auto">
        <h1 className="text-3xl mb-4 font-bold">Dashboard</h1>

        <section className="mb-8">
          <h2 className="text-xl mb-2 font-semibold">Bot Controls</h2>
          <div className="flex gap-4 flex-wrap">
            <input
              type="text"
              className="border p-2 rounded flex-grow"
              placeholder="Symbol (e.g. BTC/USDT)"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
            />
            <input
              type="number"
              className="border p-2 rounded flex-grow"
              placeholder="Amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <input
              type="text"
              className="border p-2 rounded flex-grow"
              placeholder="Timeframes comma separated (e.g. 1m,5m,1h)"
              value={timeframes.join(',')}
              onChange={(e) =>
                setTimeframes(e.target.value.split(',').map((t) => t.trim()))
              }
            />
          </div>
          <div className="mt-4 flex gap-4">
            <button
              onClick={startHandler}
              className="bg-green-600 px-4 py-2 rounded hover:bg-green-700"
            >
              Start Bot
            </button>
            <button
              onClick={stopHandler}
              className="bg-red-600 px-4 py-2 rounded hover:bg-red-700"
            >
              Stop Bot
            </button>
          </div>
          <p className="mt-2">
            Status:{' '}
            {botStatus
              ? botStatus.isRunning
                ? 'Running'
                : 'Stopped'
              : 'Loading...'}
          </p>
        </section>

        <section>
          <h2 className="text-xl mb-2 font-semibold">Live Logs</h2>
          {loadingLogs ? (
            <p>Loading logs...</p>
          ) : (
            <div className="max-h-64 overflow-auto bg-gray-100 p-2 rounded border">
              {logs.length === 0 && <p>No logs yet.</p>}
              <ul className="text-xs font-mono">
                {logs.map((log) => (
                  <li key={log._id}>
                    [{new Date(log.createdAt).toLocaleTimeString()}] {log.message}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      </div>
    </>
  );
};

export default Dashboard;
