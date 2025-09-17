// File: src/hooks/useBacktest.js

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
  const [initialLoading, setInitialLoading] = useState(true);
  const [singleLoading, setSingleLoading] = useState(false);
  const [batchLoading, setBatchLoading] = useState(false);
  const [error, setError] = useState(null);

  // Doc: Fetches the strategies, symbols, and timeframes from the back end.
  const getOptions = useCallback(async () => {
    setError(null);
    try {
      // FIX: Directly use the returned data from the API function.
      const fetchedOptions = await backtestApi.fetchOptions();
      
      // FIX: Directly set the state.
      setOptions(fetchedOptions);
      
    } catch (err) {
      const errorMessage = err.response?.data?.message || "Failed to fetch options.";
      setError(errorMessage);
      console.error("Error fetching options:", err);
    }
  }, []);

  // Doc: Fetches a list of past backtest results.
    const getPastBacktests = useCallback(async (page = 1) => {
        try {
            const data = await backtestApi.fetchAll(page);
            setPastBacktests({ results: data.backtests, total: data.total });
        } catch (err) {
            console.error("Failed to load past backtests:", err);
            setError(err.response?.data?.message || "Failed to load past backtests.");
        }
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
