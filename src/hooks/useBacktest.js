import { useState, useEffect, useCallback } from "react";
import * as backtestApi from "../api/backtest.js";
import { setAuthToken } from '../api/apiClient.js';

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

  // --- Fetch backtest options ---
  const getOptions = useCallback(async () => {
    setError(null);
    try {
      const fetchedOptions = await backtestApi.fetchOptions();
      setOptions(fetchedOptions);
    } catch (err) {
      console.error("Error fetching options:", err);
      setError(err.message || "Failed to fetch options.");
    }
  }, []);

  // --- Fetch past backtests ---
  const getPastBacktests = useCallback(async (page = 1) => {
    setError(null);
    try {
      const data = await backtestApi.fetchAll(page);
      setPastBacktests({ results: data.backtests, total: data.total });
    } catch (err) {
      console.error("Failed to load past backtests:", err);
      setError(err.message || "Failed to load past backtests.");
    }
  }, []);

  // --- Run single backtest ---
  const runNewBacktest = useCallback(
    async (payload) => {
      setSingleLoading(true);
      setError(null);
      try {
        const result = await backtestApi.runBacktest(payload);
        await getPastBacktests();
        return result;
      } catch (err) {
        console.error("Single backtest failed:", err);
        setError(err.message || "Failed to run backtest.");
        throw err;
      } finally {
        setSingleLoading(false);
      }
    },
    [getPastBacktests]
  );

  // --- Run batch backtests ---
  const runNewBatchBacktest = useCallback(
    async (configs) => {
      setBatchLoading(true);
      setError(null);
      try {
        const result = await backtestApi.runBatch(configs);
        await getPastBacktests();
        return result;
      } catch (err) {
        console.error("Batch backtest failed:", err);
        setError(err.message || "Failed to run batch backtests.");
        throw err;
      } finally {
        setBatchLoading(false);
      }
    },
    [getPastBacktests]
  );

  // --- Load initial data ---
  useEffect(() => {
    const token = localStorage.getItem("userToken");
    if (token) setAuthToken(token);

    setInitialLoading(true);
    Promise.all([getOptions(), getPastBacktests()]).finally(() => setInitialLoading(false));
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
