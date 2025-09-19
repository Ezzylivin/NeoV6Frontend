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
  const [batchLoading, setBatchLoading] = useState(false); // Can be used for combo tests
  const [error, setError] = useState(null);

  const getOptions = useCallback(async () => {
    setAuthToken(localStorage.getItem("userToken"));
    setError(null);
    try {
      const fetchedOptions = await backtestApi.fetchOptions();
      setOptions(fetchedOptions);
    } catch (err) {
      setError(err.message || "Failed to fetch options.");
    }
  }, []);

  const getPastBacktests = useCallback(async (page = 1) => {
    setAuthToken(localStorage.getItem("userToken"));
    setError(null);
    try {
      const data = await backtestApi.fetchAll(page);
      setPastBacktests({ results: data.backtests, total: data.total });
    } catch (err) {
      setError(err.message || "Failed to load past backtests.");
    }
  }, []);

  const runNewBacktest = useCallback(
    async (payload) => {
      setAuthToken(localStorage.getItem("userToken"));
      setSingleLoading(true);
      setError(null);
      try {
        const result = await backtestApi.runBacktest(payload);
        await getPastBacktests();
        return result;
      } catch (err) {
        setError(err.message || "Failed to run backtest.");
        throw err;
      } finally {
        setSingleLoading(false);
      }
    },
    [getPastBacktests]
  );

  // ✅ --- NEW: Function to run a combined strategy backtest ---
  const runComboBacktest = useCallback(
    async (payload) => {
      setAuthToken(localStorage.getItem("userToken"));
      setBatchLoading(true); // Reuse batchLoading for combo tests
      setError(null);
      try {
        const result = await backtestApi.runComboBacktest(payload);
        // You may want to handle the results of a combo test differently
        return result;
      } catch (err) {
        setError(err.message || "Failed to run combo backtest.");
        throw err;
      } finally {
        setBatchLoading(false);
      }
    },
    []
  );

  const previewStrategy = useCallback(
    async (payload) => {
      setAuthToken(localStorage.getItem("userToken"));
      setSingleLoading(true);
      setError(null);
      try {
        return await backtestApi.previewStrategy(payload);
      } catch (err) {
        setError(err.message || "Failed to preview strategy.");
        throw err;
      } finally {
        setSingleLoading(false);
      }
    },
    []
  );

  useEffect(() => {
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
    runComboBacktest, // Export the new function
    previewStrategy,
  };
}
