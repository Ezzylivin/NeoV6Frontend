import { useState, useEffect, useCallback } from "react";
import * as backtestApi from "../api/backtest.js";

export function useBacktest() {
  const [options, setOptions] = useState({ strategies: [], symbols: [], timeframes: [] });
  const [pastBacktests, setPastBacktests] = useState({ results: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetches the initial dropdown options from the backend
  const getOptions = useCallback(async () => {
    try {
      const opts = await backtestApi.fetchOptions();
      setOptions(opts);
    } catch (err) {
      console.error("Failed to load options:", err);
      setError("Failed to load backtest options.");
    }
  }, []);

  // Fetches the user's history of backtests
  const getPastBacktests = useCallback(async (page = 1) => {
    try {
      const data = await backtestApi.fetchAll(page);
      setPastBacktests({ results: data.backtests, total: data.total });
    } catch (err) {
      console.error("Failed to load past backtests:", err);
      setError(err.response?.data?.message || "Failed to load past backtests.");
    }
  }, []);

  // Fetch initial data when the hook is first used
  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true);
      await Promise.all([
        getOptions(),
        getPastBacktests()
      ]);
      setLoading(false);
    };
    loadInitialData();
  }, [getOptions, getPastBacktests]);

  const runNewBacktest = useCallback(async (payload) => {
    setLoading(true);
    setError(null);
    try {
      const result = await backtestApi.run(payload);
      await getPastBacktests(); // Refresh the list after a new run
      return result;
    } catch (err) {
      const errorMessage = err.response?.data?.message || "Failed to run backtest.";
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [getPastBacktests]);

  const runNewBatchBacktest = useCallback(async (configs) => {
    setLoading(true);
    setError(null);
    try {
      const result = await backtestApi.runBatch(configs);
      await getPastBacktests(); // Refresh the list after a new batch run
      return result;
    } catch (err) {
      const errorMessage = err.response?.data?.message || "Failed to run batch test.";
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [getPastBacktests]);

  return { options, pastBacktests, loading, error, runNewBacktest, runNewBatchBacktest };
}
