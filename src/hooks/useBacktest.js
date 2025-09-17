// File: src/hooks/useBacktest.js

import { useState, useEffect, useCallback } from "react";
import * as backtestApi from "../api/backtest.js";

export function useBacktest() {
  const [options, setOptions] = useState({
    strategies: [],
    symbols: [],
    timeframes: [],
  });
  const [pastBacktests, setPastBacktests] = useState({ results: [], total: 0 });
  const [initialLoading, setInitialLoading] = useState(true);
  const [singleLoading, setSingleLoading] = useState(false);
  const [batchLoading, setBatchLoading] = useState(false);
  const [error, setError] = useState(null);

  // Doc: Fetches the strategies, symbols, and timeframes from the back end.
  const getOptions = useCallback(async () => {
    setError(null);
    try {
      // Step 1: Make the API call to get the options data.
      const response = await backtestApi.fetchOptions();

      // Step 2: Check if the response is valid before setting state.
      if (response?.data) {
        // Step 3: Update the options state with the fetched data.
        setOptions(response.data);
      } else {
        console.error("API response for options was invalid:", response);
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || "Failed to fetch options.";
      setError(errorMessage);
      console.error("Error fetching options:", err);
    }
  }, []);

  // Doc: Fetches a list of past backtest results.
  const getPastBacktests = useCallback(async (page = 1) => {
    // ... (Your existing getPastBacktests logic, which seems okay) ...
  }, []);

  // Run a single backtest
  const runNewBacktest = useCallback(
    async (payload) => {
      setSingleLoading(true);
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
        setSingleLoading(false);
      }
    },
    [getPastBacktests]
  );

  // Run batch backtests
  const runNewBatchBacktest = useCallback(
    async (configs) => {
      setBatchLoading(true);
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
        setBatchLoading(false);
      }
    },
    [getPastBacktests]
  );

  // Load initial data
  useEffect(() => {
    const loadInitialData = async () => {
      setInitialLoading(true);
      // Run both fetch calls in parallel for better performance
      await Promise.all([getOptions(), getPastBacktests()]);
      setInitialLoading(false);
    };
    loadInitialData();
  }, [getOptions, getPastBacktests]);

  return {
    options,
    pastBacktests,
    initialLoading,
    singleLoading,
    batchLoading,
    error,
    getPastBacktests,
    runNewBacktest,
    runNewBatchBacktest,
  };
}
