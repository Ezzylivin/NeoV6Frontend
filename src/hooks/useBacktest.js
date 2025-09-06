// File: src/hooks/useBacktest.js
import { useState, useEffect, useCallback } from "react";
import axios from "axios";

export function useBacktest(baseUrl = "") {
  const [options, setOptions] = useState({ risks: [], strategies: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [backtests, setBacktests] = useState([]);
  const [currentBacktest, setCurrentBacktest] = useState(null);

  // Fetch available backtest options
  const fetchOptions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get(`${baseUrl}/api/backtests/options`);
      setOptions(res.data);
    } catch (err) {
      console.error("[useBacktest] fetchOptions error:", err);
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  }, [baseUrl]);

  // Run a single backtest
  const runBacktest = useCallback(async (payload) => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.post(`${baseUrl}/api/backtests/run`, payload);
      setCurrentBacktest(res.data);
      return res.data;
    } catch (err) {
      console.error("[useBacktest] runBacktest error:", err);
      setError(err.response?.data?.error || err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [baseUrl]);

  // Run batch backtests
  const runBatchBacktests = useCallback(async (payload) => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.post(`${baseUrl}/api/backtests/batch`, payload);
      return res.data;
    } catch (err) {
      console.error("[useBacktest] runBatchBacktests error:", err);
      setError(err.response?.data?.error || err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [baseUrl]);

  // Fetch all backtests for a user
  const fetchUserBacktests = useCallback(async (userId) => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get(`${baseUrl}/api/backtests/user/${userId}`);
      setBacktests(res.data.backtests);
      return res.data.backtests;
    } catch (err) {
      console.error("[useBacktest] fetchUserBacktests error:", err);
      setError(err.response?.data?.error || err.message);
      return [];
    } finally {
      setLoading(false);
    }
  }, [baseUrl]);

  // Fetch a single backtest by ID
  const fetchBacktestById = useCallback(async (backtestId) => {
    if (!backtestId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get(`${baseUrl}/api/backtests/${backtestId}`);
      setCurrentBacktest(res.data.backtest);
      return res.data.backtest;
    } catch (err) {
      console.error("[useBacktest] fetchBacktestById error:", err);
      setError(err.response?.data?.error || err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [baseUrl]);

  // Delete a backtest by ID
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
    deleteBacktest
  };
}
