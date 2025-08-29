// File: src/hooks/useBot.js
import { useState } from 'react';
import apiClient from '../api/apiClient.js';
import { useAuth } from '../context/AuthContext.jsx';

export function useBot() {
  const { user } = useAuth(); // get userId
  const userId = user?._id;

  const [symbol, setSymbol] = useState('');
  const [amount, setAmount] = useState(0);
  const [timeframes, setTimeframes] = useState(['5m']); // default
  const [status, setStatus] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const startBot = async () => {
    if (!userId) {
      setError('User ID is required to start bot.');
      return;
    }
    if (!symbol) {
      setError('Symbol is required.');
      return;
    }
    if (!amount || amount <= 0) {
      setError('Amount must be greater than 0.');
      return;
    }
    if (!timeframes || timeframes.length === 0) {
      setError('At least one timeframe is required.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { data } = await apiClient.post('/bots/start', {
        userId,
        symbol,
        amount,
        timeframes
      });

      setStatus({ isRunning: true, symbol, amount, timeframes });
      setLogs(prev => [...prev, `Bot started: ${symbol} with $${amount} on ${timeframes.join(', ')}`]);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Failed to start bot');
      setLogs(prev => [...prev, `Failed to start bot: ${err.message}`]);
    } finally {
      setLoading(false);
    }
  };

  const stopBot = async () => {
    if (!userId) {
      setError('User ID is required to stop bot.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await apiClient.post('/bots/stop', { userId });
      setStatus({ isRunning: false, symbol: null, amount: 0, timeframes: [] });
      setLogs(prev => [...prev, 'Bot stopped']);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Failed to stop bot');
      setLogs(prev => [...prev, `Failed to stop bot: ${err.message}`]);
    } finally {
      setLoading(false);
    }
  };

  const getStatus = async () => {
    if (!userId) {
      setError('User ID is required to fetch bot status.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { data } = await apiClient.get(`/bots/status?userId=${userId}`);
      setStatus(data.status);
      setLogs(prev => [...prev, 'Fetched bot status']);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Failed to fetch bot status');
      setLogs(prev => [...prev, `Failed to fetch status: ${err.message}`]);
    } finally {
      setLoading(false);
    }
  };

  return {
    symbol,
    setSymbol,
    amount,
    setAmount,
    timeframes,
    setTimeframes,
    status,
    logs,
    loading,
    error,
    startBot,
    stopBot,
    getStatus
  };
}
