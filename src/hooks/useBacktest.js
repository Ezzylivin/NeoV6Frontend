// File: src/hooks/useBacktest.js
// FIXED + UPGRADED VERSION
// - Strategies are now exposed directly
// - Strategies page can use getStrategies()
// - Backtests still work and store as before

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

  const [strategies, setStrategies] = useState([]); // <-- NEW direct state
  const [pastBacktests, setPastBacktests] = useState({ results: [], total: 0 });
  const [initialLoading, setInitialLoading] = useState(true);
  const [singleLoading, setSingleLoading] = useState(false);
  const [batchLoading, setBatchLoading] = useState(false);
  const [error, setError] = useState(null);

  // --- Fetches the data needed for form dropdowns ---
  const getOptions = useCallback(async () => {
    setError(null);
    try {
      const fetchedOptions = await backtestApi.fetchOptions();
      setOptions(fetchedOptions);
      setStrategies(fetchedOptions.strategies || []); // keep strategies synced
      return fetchedOptions;
    } catch (err) {
      setError(err.message || "Failed to fetch options.");
      return null;
    }
  }, []);

  // --- Fetches only strategies (for Strategies page) ---
  const getStrategies = useCallback(async () => {
    const data = await getOptions();
    return data ? data.strategies : [];
  }, [getOptions]);

  // --- Fetches the list of previously run backtests ---
  const getPastBacktests = useCallback(async (page = 1) => {
    setError(null);
    try {
      const data = await backtestApi.fetchAll(page);
      setPastBacktests({ results: data.backtests, total: data.total });
    } catch (err) {
      setError(err.message || "Failed to load past backtests.");
    }
  }, []);

  // --- Fetches a single backtest by its ID ---
  const getBacktestById = useCallback(async (id) => {
    setInitialLoading(true);
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
  
  // --- Deletes a backtest by its ID ---
  const deleteBacktest = useCallback(async (id) => {
    setError(null);
    try {
      await backtestApi.deleteById(id);
      await getPastBacktests(); // Refresh the list after deleting
    } catch (err) {
      setError(err.message || "Failed to delete backtest.");
      throw err;
    }
  }, [getPastBacktests]);

  // --- Runs a new single-strategy backtest ---
  const runNewBacktest = useCallback(
    async (payload) => {
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

  // --- Runs a new combined-strategy backtest ---
  const runComboBacktest = useCallback(
    async (payload) => {
      setBatchLoading(true);
      setError(null);
      try {
        const result = await backtestApi.runComboBacktest(payload);
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

  // --- Runs a strategy preview (simulation without saving) ---
  const previewStrategy = useCallback(
    async (payload) => {
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

  // --- Initial fetch (both options + backtests) ---
  useEffect(() => {
    setInitialLoading(true);
    Promise.all([getOptions(), getPastBacktests()]).finally(() =>
      setInitialLoading(false)
    );
  }, [getOptions, getPastBacktests]);

  // --- Expose everything ---
  return {
    options,
    strategies, // <-- direct accessor
    pastBacktests,
    initialLoading,
    singleLoading,
    batchLoading,
    error,

    // methods
    getOptions,
    getStrategies,   // <-- for Strategies page
    getPastBacktests,
    getBacktestById,
    deleteBacktest,
    runNewBacktest,
    runComboBacktest,
    previewStrategy,
  };
}
