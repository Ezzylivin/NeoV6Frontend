// File: src/hooks/useBacktest.js
import { useState, useEffect, useCallback } from "react";
import * as backtestApi from "../api/backtest.js";

export function useBacktest() {
  const [options, setOptions] = useState({ strategies: [], symbols: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetches the initial dropdown options (strategies, symbols) from the backend
  const getOptions = useCallback(async () => {
    setLoading(true);
    try {
      const opts = await backtestApi.fetchOptions();
      setOptions(opts);
    } catch (err) {
      console.error("Failed to load options:", err);
      setError("Failed to load backtest options.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Run this once when the hook is first used
  useEffect(() => {
    getOptions();
  }, [getOptions]);

  // Function for running a single backtest
  const runNewBacktest = useCallback(async (payload) => {
    setLoading(true);
    setError(null);
    try {
      return await backtestApi.run(payload);
    } catch (err) {
      const errorMessage = err.response?.data?.message || "Failed to run backtest.";
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  // Function for running a batch of backtests
  const runNewBatchBacktest = useCallback(async (configs) => {
    setLoading(true);
    setError(null);
    try {
      return await backtestApi.runBatch(configs);
    } catch (err) {
      const errorMessage = err.response?.data?.message || "Failed to run batch test.";
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  return { options, loading, error, runNewBacktest, runNewBatchBacktest };
}
