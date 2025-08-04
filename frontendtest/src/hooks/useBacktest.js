// src/hooks/useBacktest.js
import { useState, useEffect } from 'react';
import api from '../api';

export const useBacktest = (timeframe = null) => {
  const [results, setResults] = useState([]);
  const [running, setRunning] = useState(false);

  const fetchResults = async () => {
    const query = timeframe ? `?timeframe=${timeframe}` : '';
    const { data } = await api.get(`/backtest/results${query}`);
    setResults(data);
  };

  const runBacktest = async () => {
    setRunning(true);
    await api.post('/backtest/run', timeframe ? { timeframe } : {});
    await fetchResults();
    setRunning(false);
  };

  useEffect(() => {
    fetchResults();
  }, [timeframe]);

  return { results, runBacktest, running };
};
