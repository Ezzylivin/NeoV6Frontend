import { useState } from 'react';
import apiClient from '../api/apiClient.js';

export function useBacktest() {
  const [results, setResults] = useState([]); // ✅ always an array
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const executeBacktest = async (userId, initialBalance, timeframe) => {
    if (!userId) {
      setError('User ID is required');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const { data } = await apiClient.post('/backtests/run', {
        userId,
        initialBalance,
        timeframe,
      });
      setResults(data.backtests || []);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to run backtests');
    } finally {
      setLoading(false);
    }
  };

  return { results, loading, error, executeBacktest };
}
