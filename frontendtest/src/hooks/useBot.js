// File: src/hooks/useBot.js
import { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';

export function useBot() {
  const { user } = useAuth();
  const [status, setStatus] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const API = import.meta.env.VITE_API_URL;

  const startBot = async ({ symbol, amount, timeframes, strategy, risk }) => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch(`${API}/bots/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          symbol,
          amount,
          timeframes,
          strategy,
          risk
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to start bot');

      setStatus(`Running: ${symbol} | $${amount}`);
      setLogs((prev) => [...prev, `Bot started with ${symbol} | ${timeframes.join(', ')}`]);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const stopBot = async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch(`${API}/bots/stop`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to stop bot');

      setStatus('Stopped');
      setLogs((prev) => [...prev, 'Bot stopped']);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getBotStatus = async () => {
    try {
      setLoading(true);
      setError(null);

      const url = new URL(`${API}/bots/status`);
      url.searchParams.set('userId', user.id);

      const res = await fetch(url.toString());
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch status');

      setStatus(data.bot?.isRunning ? 'Running' : 'Stopped');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return { status, logs, loading, error, startBot, stopBot, getBotStatus };
}
