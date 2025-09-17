// File: src/hooks/useBacktest.js

import { useState, useEffect, useCallback } from "react";
import * as backtestApi from "../api/backtest.js";
import { setAuthToken } from '../api/apiClient.js'; // Import setAuthToken

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

  // Fetch backtest options
  const getOptions = useCallback(async () => {
    setError(null);
    try {
      const fetchedOptions = await backtestApi.fetchOptions();
      setOptions(fetchedOptions);
    } catch (err) {
      const errorMessage = err.response?.data?.message || "Failed to fetch options.";
      setError(errorMessage);
      console.error("Error fetching options:", err);
    }
  }, []);

  // Fetch past backtests
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
    async ({ symbol, timeframe, code, startDate, endDate, takeProfit, stopLoss }) => {
      setSingleLoading(true);
      setError(null);
      try {
        const response = await backtestApi.runBacktest({
          symbol,
          timeframe,
          code,
          startDate,
          endDate,
          takeProfit,
          stopLoss,
        });
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
        const formattedConfigs = configs.map(cfg => ({
          ...cfg,
          code: cfg.code,
        }));
        const response = await backtestApi.runBatch(formattedConfigs);
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
      // FIX: Set auth token here before making any API calls
      const token = localStorage.getItem('userToken');
      if (token) {
        setAuthToken(token);
      }

      setInitialLoading(true);
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
