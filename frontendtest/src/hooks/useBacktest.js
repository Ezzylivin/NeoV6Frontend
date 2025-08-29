import { useState, useEffect } from "react";
import apiClient from "../api/apiClient";

export function useBacktest(autoFetch = false, backtestId = null) {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Run backtest
  const runBacktest = async (params) => {
    setLoading(true);
    setError(null);

    try {
      const { data } = await apiClient.post("/backtests/run", params);
      setResults(data || []);
      return { success: true, data };
    } catch (err) {
      setError(err.response?.data?.message || "Failed to run backtest");
      return { success: false };
    } finally {
      setLoading(false);
    }
  };

  // Get backtest results by ID
  const getBacktestResults = async (id = backtestId) => {
    if (!id) return { success: false, message: "Backtest ID is required" };
    setLoading(true);
    setError(null);

    try {
      const { data } = await apiClient.get(`/backtests/results/${id}`);
      setResults(data);
      return { success: true, data };
    } catch (err) {
      setError(err.response?.data?.message || "Failed to fetch backtest results");
      return { success: false };
    } finally {
      setLoading(false);
    }
  };

  // Auto-fetch results if enabled
  useEffect(() => {
    if (autoFetch && backtestId) {
      getBacktestResults(backtestId);
    }
  }, [autoFetch, backtestId]);

  return {
    results,
    loading,
    error,
    runBacktest,
    getBacktestResults,
  };
}
