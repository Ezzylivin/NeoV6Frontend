// File: src/hooks/useBacktest.js
import { useState, useCallback, useEffect } from "react";
import * as backtestApi from "../api/backtest.js";

export function useBacktest() {
  // --- Frontend state ---
  const [backtestResults, setBacktestResults] = useState(null); // store the latest single backtest
  const [pastBacktests, setPastBacktests] = useState({ results: [], total: 0 });
  const [options, setOptions] = useState({
    strategies: [],
    symbols: [],
    timeframes: [],
    takeProfits: [],
    stopLosses: [],
  });

  const [initialLoading, setInitialLoading] = useState(true);
  const [singleLoading, setSingleLoading] = useState(false);
  const [batchLoading, setBatchLoading] = useState(false);
  const [error, setError] = useState(null);

  // --- Fetch available options (symbols, strategies, etc.) ---
  const fetchOptions = useCallback(async () => {
    setError(null);
    try {
      const data = await backtestApi.fetchOptions();
      setOptions(data);
    } catch (err) {
      setError(err.message || "Failed to fetch options.");
    }
  }, []);

  // --- Fetch past backtests ---
  const fetchPastBacktests = useCallback(async (page = 1) => {
    setError(null);
    try {
      const data = await backtestApi.fetchAll(page);
      setPastBacktests({ results: data.backtests, total: data.total });
    } catch (err) {
      setError(err.message || "Failed to fetch past backtests.");
    }
  }, []);

  // --- Run a single backtest ---
  const runSingleBacktest = useCallback(
    async (payload) => {
      setSingleLoading(true);
      setError(null);
      try {
        const result = await backtestApi.runBacktest(payload);
        setBacktestResults(result); // save results for charts/metrics
        await fetchPastBacktests(); // refresh past backtests list
        return result;
      } catch (err) {
        setError(err.message || "Failed to run backtest.");
        throw err;
      } finally {
        setSingleLoading(false);
      }
    },
    [fetchPastBacktests]
  );

  // --- Run batch backtest ---
  const runBatchBacktest = useCallback(
    async (payload) => {
      setBatchLoading(true);
      setError(null);
      try {
        const result = await backtestApi.runComboBacktest(payload);
        return result;
      } catch (err) {
        setError(err.message || "Failed to run batch backtest.");
        throw err;
      } finally {
        setBatchLoading(false);
      }
    },
    []
  );

  // --- Delete a backtest ---
  const deleteBacktest = useCallback(
    async (id) => {
      setError(null);
      try {
        await backtestApi.deleteById(id);
        await fetchPastBacktests();
      } catch (err) {
        setError(err.message || "Failed to delete backtest.");
        throw err;
      }
    },
    [fetchPastBacktests]
  );

  // --- Get a single backtest by ID ---
  const fetchBacktestById = useCallback(
    async (id) => {
      setInitialLoading(true);
      setError(null);
      try {
        const result = await backtestApi.fetchById(id);
        setBacktestResults(result);
        return result;
      } catch (err) {
        setError(err.message || "Failed to fetch backtest.");
        throw err;
      } finally {
        setInitialLoading(false);
      }
    },
    []
  );

  // --- Initial fetch on mount ---
  useEffect(() => {
    setInitialLoading(true);
    Promise.all([fetchOptions(), fetchPastBacktests()]).finally(() =>
      setInitialLoading(false)
    );
  }, [fetchOptions, fetchPastBacktests]);

  return {
    backtestResults,
    pastBacktests,
    options,
    initialLoading,
    singleLoading,
    batchLoading,
    error,
    fetchPastBacktests,
    fetchBacktestById,
    runSingleBacktest,
    runBatchBacktest,
    deleteBacktest,
    fetchOptions,
  };
}
