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

  // ✅ ADDED: Function to get a single backtest by its ID
  const getBacktestById = useCallback(async (id) => {
    setAuthToken(localStorage.getItem("userToken"));
    setInitialLoading(true); // Use initialLoading for fetching single item
    setError(null);
    try {
      return await backtestApi.fetchById(id);
    } catch (err) {
      setError(err.message || "Failed to fetch backtest.");
      throw err;
    } finally {
      setInitialLoading(false);
    }
  }, []);
  
  // ✅ ADDED: Function to delete a backtest by its ID
  const deleteBacktest = useCallback(async (id) => {
    setAuthToken(localStorage.getItem("userToken"));
    setError(null);
    try {
      await backtestApi.deleteById(id);
      // Refresh the list of backtests after one is deleted
      await getPastBacktests();
    } catch (err) {
      setError(err.message || "Failed to delete backtest.");
      throw err;
    }
  }, [getPastBacktests]);

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
    getBacktestById, // Exported new function
    deleteBacktest,  // Exported new function
    runNewBacktest,
    previewStrategy,
  };
}
