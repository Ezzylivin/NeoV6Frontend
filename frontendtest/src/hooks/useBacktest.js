import { useState, useEffect } from "react";
import apiClient from "../api/apiClient.js";
import { useAuth } from "../context/AuthContext.jsx";

export function useBacktest(autoFetch = false, initialTimeframe = '') {
  const { user } = useAuth();
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [timeframe, setTimeframe] = useState(initialTimeframe);

  // Run backtest (calls /run)
  const runBacktest = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const { data } = await apiClient.post("/backtests/run", { userId: user._id });
      setResults(data.backtests);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to run backtest");
    } finally {
      setLoading(false);
    }
  };

  // Fetch backtests with optional timeframe filter
  const fetchBacktests = async (tf = timeframe) => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const query = new URLSearchParams({ userId: user._id });
      if (tf) query.append("timeframe", tf);
      const { data } = await apiClient.get(`/backtests/results?${query.toString()}`);
      setResults(data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to fetch backtests");
    } finally {
      setLoading(false);
    }
  };

  // Auto-fetch on mount or when user changes
  useEffect(() => {
    if (autoFetch && user) {
      fetchBacktests();
    }
  }, [autoFetch, user]);

  return {
    results,
    loading,
    error,
    timeframe,
    setTimeframe,
    runBacktest,
    fetchBacktests,
  };
}
