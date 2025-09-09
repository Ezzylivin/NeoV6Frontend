// File: src/hooks/useBacktest.js
import { useState, useEffect, useCallback } from "react";
import axios from "axios";

export function useBacktest(baseUrl = "") {
  const [options, setOptions] = useState({
    symbols: [],
    timeframes: [],
    strategies: [],
    risks: [],
    balances: [],
    takeProfits: [],
    stopLosses: [],
    positions: [],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [backtests, setBacktests] = useState([]);
  const [currentBacktest, setCurrentBacktest] = useState(null);

  /** --- Fetch options --- */
 const fetchOptions = useCallback(async () => {
  setLoading(true);
  setError(null);
  try {
    const res = await axios.get(`${baseUrl}/api/backtests/options`);
    setOptions(res.data);
    return res.data; // <-- Add this line
  } catch (err) {
    console.error("[useBacktest] fetchOptions error:", err);
    setError(err.response?.data?.error || err.message);
    return null; // optional
  } finally {
    setLoading(false);
  }
}, [baseUrl]);

  /** --- Run single backtest --- */
  const runBacktest = useCallback(async (payload) => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.post(`${baseUrl}/api/backtests/run`, payload);

      // Ensure consistent structure
      const data = {
        saved: res.data.saved || {},
        metrics: res.data.metrics || {},
        equityCurve: res.data.equityCurve || [],
        trades: res.data.trades || []
      };

      setCurrentBacktest(data.saved);
      return data;
    } catch (err) {
      console.error("[useBacktest] runBacktest error:", err);
      setError(err.response?.data?.error || err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [baseUrl]);

  /** --- Run batch backtests --- */
  const runBatchBacktests = useCallback(async (payload) => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.post(`${baseUrl}/api/backtests/batch`, payload);

      // Map results consistently
      const results = (res.data.results || []).map((r) => ({
        saved: r.saved || {},
        metrics: r.metrics || {},
        equityCurve: r.equityCurve || r.saved?.equityCurve || [],
        trades: r.trades || r.saved?.tradeBreakdown || [],
      }));

      return { results, usedCombos: res.data.usedCombos || [] };
    } catch (err) {
      console.error("[useBacktest] runBatchBacktests error:", err);
      setError(err.response?.data?.error || err.message);
      return { results: [], usedCombos: [] };
    } finally {
      setLoading(false);
    }
  }, [baseUrl]);

  /** --- Fetch all user backtests --- */
  const fetchUserBacktests = useCallback(async (userId) => {
    if (!userId) return [];
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get(`${baseUrl}/api/backtests/user/${userId}`);
      setBacktests(res.data.backtests || []);
      return res.data.backtests || [];
    } catch (err) {
      console.error("[useBacktest] fetchUserBacktests error:", err);
      setError(err.response?.data?.error || err.message);
      return [];
    } finally {
      setLoading(false);
    }
  }, [baseUrl]);

  /** --- Fetch single backtest by ID --- */
  const fetchBacktestById = useCallback(async (backtestId) => {
    if (!backtestId) return null;
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get(`${baseUrl}/api/backtests/${backtestId}`);
      setCurrentBacktest(res.data.backtest || null);
      return res.data.backtest || null;
    } catch (err) {
      console.error("[useBacktest] fetchBacktestById error:", err);
      setError(err.response?.data?.error || err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [baseUrl]);

  /** --- Delete backtest --- */
  const deleteBacktest = useCallback(async (backtestId) => {
    if (!backtestId) return false;
    setLoading(true);
    setError(null);
    try {
      await axios.delete(`${baseUrl}/api/backtests/${backtestId}`);
      setBacktests(prev => prev.filter(b => b._id !== backtestId));
      if (currentBacktest?._id === backtestId) setCurrentBacktest(null);
      return true;
    } catch (err) {
      console.error("[useBacktest] deleteBacktest error:", err);
      setError(err.response?.data?.error || err.message);
      return false;
    } finally {
      setLoading(false);
    }
  }, [baseUrl, currentBacktest]);

  useEffect(() => {
    fetchOptions();
  }, [fetchOptions]);

  return {
    options,
    loading,
    error,
    backtests,
    currentBacktest,
    fetchOptions,
    runBacktest,
    runBatchBacktests,
    fetchUserBacktests,
    fetchBacktestById,
    deleteBacktest,
  };
}
