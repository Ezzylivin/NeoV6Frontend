// File: src/hooks/useBacktest.js
import { useState, useEffect, useCallback } from "react";
import * as backtestApi from "../api/backtest.js"; // Import our fixed API service

export function useBacktest() {
  const [options, setOptions] = useState({ symbols: [], strategies: [] });
  const [pastBacktests, setPastBacktests] = useState({ results: [], total: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch initial options for the form
  const getOptions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const opts = await backtestApi.fetchOptions();
      setOptions(opts);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load backtest options.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch the user's history of backtests
  const getPastBacktests = useCallback(async (page = 1) => {
    setLoading(true);
    setError(null);
    try {
      const data = await backtestApi.fetchAll(page);
      setPastBacktests({ results: data.backtests, total: data.total });
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load past backtests.");
    } finally {
      setLoading(false);
    }
  }, []);

   const runNewBatchBacktest = useCallback(async (configs) => {
    setLoading(true);
    setError(null);
    try {
      return await backtestApi.runBatch(configs);
    } catch (err) {         
      const errorMessage = err.response?.data?.message || "Failed to run backtest.";
      setError(errorMessage);
      throw new Error(errorMessage); // Re-throw for the component to catch if needed
    } finally {
      setLoading(false);
    }
  }, [getPastBacktests]);

  // Run a new backtest
  const runNewBacktest = useCallback(async (payload) => {
    setLoading(true);
    setError(null);
    try {
      const result = await backtestApi.run(payload);
      getPastBacktests(); // Refresh the list of past backtests after running a new one
      return result;
    } catch (err) {
      const errorMessage = err.response?.data?.message || "Failed to run backtest.";
      setError(errorMessage);
      throw new Error(errorMessage); // Re-throw for the component to catch if needed
    } finally {
      setLoading(false);
    }
  }, [getPastBacktests]);

  useEffect(() => {
    getOptions();
    getPastBacktests();
  }, [getOptions, getPastBacktests]);

  return {
    options,
    pastBacktests,
    loading,
    error,
    runNewBacktest,
    refresh: getPastBacktests, // Allow components to trigger a refresh
  };
}
