import { useState, useEffect } from 'react';
import { runBacktest, GetBacktestResults } from '../api/backtests';

export const useBacktest = () => {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  // Fetch existing backtest results from backend
  const fetchResults = async () => {
    setLoading(true);
    try {
      const data = await GetBacktestResults();
      setResults(data);
    } finally {
      setLoading(false);
    }
  };

  // Run a new backtest and refresh results
  const executeBacktest = async () => {
    setLoading(true);
    try {
      await runBacktest();
      await fetchResults();
    } finally {
      setLoading(false);
    }
  };

  // Fetch on initial mount
  useEffect(() => {
    fetchResults();
  }, []);

  return { results, executeBacktest, loading };
};
