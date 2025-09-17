// File: src/hooks/useBacktest.js
// UPGRADED: Implemented separate loading states for each operation.

import { useState, useEffect, useCallback } from "react";
import * as backtestApi from "../api/backtest.js";

export function useBacktest() {
  const [options, setOptions] = useState({
    strategies: [],
    symbols: [],
    timeframes: [],
    takeProfits: [],
    stopLosses: [],
  });
  const [pastBacktests, setPastBacktests] = useState({ results: [], total: 0 });
  // --- THIS IS THE FIX (Part 1) ---
  const [initialLoading, setInitialLoading] = useState(true); // For initial page load
  const [singleLoading, setSingleLoading] = useState(false);   // For single backtests
  const [batchLoading, setBatchLoading] = useState(false);     // For batch backtests
  const [error, setError] = useState(null);

  const getOptions = useCallback(async () => { /* ... (no changes) ... */ });
  const getPastBacktests = useCallback(async (page = 1) => { /* ... (no changes) ... */ });

  // Run a single backtest
  const runNewBacktest = useCallback(
    async (payload) => {
      setSingleLoading(true); // Use singleLoading state
      setError(null);
      try {
        const response = await backtestApi.runBacktest(payload);
        if (response?.data) {
          await getPastBacktests();
        }
        return response.data;
      } catch (err) {
        const errorMessage = err.response?.data?.message || "Failed to run backtest.";
        setError(errorMessage);
        throw new Error(errorMessage);
      } finally {
        setSingleLoading(false); // Use singleLoading state
      }
    },
    [getPastBacktests]
  );

  // Run batch backtests
  const runNewBatchBacktest = useCallback(
    async (configs) => {
      setBatchLoading(true); // Use batchLoading state
      setError(null);
      try {
        const response = await backtestApi.runBatch(configs);
        if (response?.data) {
          await getPastBacktests();
        }
        return response.data;
      } catch (err) {
        const errorMessage = err.response?.data?.message || "Failed to run batch backtests.";
        setError(errorMessage);
        throw new Error(errorMessage);
      } finally {
        setBatchLoading(false); // Use batchLoading state
      }
    },
    [getPastBacktests]
  );

  // Load initial data
  useEffect(() => {
    const loadInitialData = async () => {
      setInitialLoading(true); // Use initialLoading state
      await Promise.all([getOptions(), getPastBacktests()]);
      setInitialLoading(false); // Use initialLoading state
    };
    loadInitialData();
  }, [getOptions, getPastBacktests]);

  return {
    options,
    pastBacktests,
    initialLoading, // Export new states
    singleLoading,
    batchLoading,
    error,
    getPastBacktests,
    runNewBacktest,
    runNewBatchBacktest,
  };
}
