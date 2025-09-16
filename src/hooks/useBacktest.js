// File: src/hooks/useBacktest.js
import { useState, useEffect, useCallback } from "react";
import * as backtestApi from "../api/backtest.js";

export function useBacktest() {
  const [options, setOptions] = useState({ strategies: [], symbols: [], timeframes: [] });
  const [pastBacktests, setPastBacktests] = useState({ results: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch backtest options from backend
  const getOptions = useCallback(async () => {
    try {
      const response = await backtestApi.fetchOptions();
      setOptions(response.data || { strategies: [], symbols: [], timeframes: [] });
    } catch (err) {
      console.error("Failed to load options:", err);
      setError("Failed to load backtest options.");
    }
  }, []);

  // Fetch user's past backtests with pagination
  const getPastBacktests = useCallback(async (page = 1) => {
    try {
      const response = await backtestApi.fetchAll(page);
      setPastBacktests({
        results: response.data.backtests || [],
        total: response.data.total || 0
      });
    } catch (err) {
      console.error("Failed to load past backtests:", err);
      setError(err.response?.data?.message || "Failed to load past backtests.");
    }
  }, []);

  // Initial load: fetch options + past backtests
  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true);
      setError(null);
      await Promise.all([getOptions(), getPastBacktests()]);
      setLoading(false);
    };
    loadInitialData();
  }, [getOptions, getPastBacktests]);

  // Run a single backtest
  const runNewBacktest = useCallback(async (payload) => {
    setLoading(true);
    setError(null);
    try {
      const response = await backtestApi.runBacktest(payload);
      // Update past backtests after a successful run
      await getPastBacktests();
      return response.data;
    } catch (err) {
      const errorMessage = err.response?.data?.message || "Failed to run backtest.";
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [getPastBacktests]);

  // Run multiple backtests in batch
  const runNewBatchBacktest = useCallback(async (configs) => {
    setLoading(true);
    setError(null);
    try {
      const response = await backtestApi.runBatch(configs);
      await getPastBacktests();
      return response.data;
    } catch (err) {
      const errorMessage = err.response?.data?.message || "Failed to run batch backtests.";
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [getPastBacktests]);

  return {
    options,
    pastBacktests,
    loading,
    error,
    runNewBacktest,
    runNewBatchBacktest,
    getPastBacktests
  };
}
