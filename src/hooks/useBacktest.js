import { useState, useEffect, useCallback } from "react";
import * as backtestApi from "../api/backtest.js";

export function useBacktest() {
  const [options, setOptions] = useState({ strategies: [], symbols: [], timeframes: [] });
  const [pastBacktests, setPastBacktests] = useState({ results: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const getOptions = useCallback(async () => {
    try {
      const opts = await backtestApi.fetchOptions();
      setOptions(opts);
    } catch (err) {
      console.error("Failed to load options:", err);
      setError("Failed to load backtest options.");
    }
  }, []);

  const getPastBacktests = useCallback(async (page = 1) => {
    try {
      const data = await backtestApi.fetchAll(page);
      setPastBacktests({ results: data.backtests, total: data.total });
    } catch (err) {
      console.error("Failed to load past backtests:", err);
      setError(err.response?.data?.message || "Failed to load past backtests.");
    }
  }, []);

  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true);
      setError(null);
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
      // UPGRADE: This now calls a single, unified API function.
      // The backend handles the logic of which engine (Python or Node.js) to use.
      const result = await backtestApi.runBacktest(payload);
      
      // Only refresh the history if the result was a saved backtest (not a temporary Python run)
      if (!result.isPythonResult) {
        await getPastBacktests();
      }
      
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
      await getPastBacktests();
      return result;
    } catch (err) {
      const errorMessage = err.response?.data?.message || "Failed to run batch test.";
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [getPastBacktests]);

  return { options, pastBacktests, loading, error, runNewBacktest, runNewBatchBacktest, getPastBacktests };
}
