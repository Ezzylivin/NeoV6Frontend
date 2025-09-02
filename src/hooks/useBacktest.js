// File: src/hooks/useBacktests.js
import { useState, useEffect } from "react";
import axios from "axios";

const API_BASE = "/api/backtests";

export function useBacktest(userId) {
  const [results, setResults] = useState([]); // backtest list
  const [best, setBest] = useState(null); // best backtest
  const [options, setOptions] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch backtests for user
  const fetchBacktests = async () => {
    if (!userId) return;
    try {
      const res = await axios.get(`${API_BASE}/${userId}`);
      if (res.data.success) {
        setResults(res.data.backtests);
      }
    } catch (err) {
      setError("Failed to fetch backtests");
    }
  };

  // Fetch selectable options
  const fetchOptions = async () => {
    try {
      const res = await axios.get(`${API_BASE}/options/all`);
      if (res.data.success) {
        setOptions(res.data.options);
      }
    } catch (err) {
      setError("Failed to fetch options");
    }
  };

  // Run single backtest
  const runBacktest = async (params) => {
    setLoading(true);
    try {
      const res = await axios.post(API_BASE, params);
      if (res.data.success) {
        setResults((prev) => [res.data.backtest, ...prev]);
      }
    } catch (err) {
      setError("Backtest failed");
    } finally {
      setLoading(false);
    }
  };

  // Run batch backtests
  const runBatchBacktests = async (paramCombos, exchange = "binance") => {
    setLoading(true);
    try {
      const res = await axios.post(`${API_BASE}/batch`, {
        userId,
        paramCombos,
        exchange,
      });
      if (res.data.success) {
        setResults((prev) => [...res.data.results.map((r) => r.saved), ...prev]);
        setBest(res.data.best);
      }
    } catch (err) {
      setError("Batch backtests failed");
    } finally {
      setLoading(false);
    }
  };

  // auto-fetch when user changes
  useEffect(() => {
    if (userId) {
      fetchOptions();
      fetchBacktests();
    }
  }, [userId]);

  return {
    results,
    best,
    options,
    loading,
    error,
    fetchOptions,
    fetchBacktests,
    runBacktest,
    runBatchBacktests,
  };
}
