import { useState, useEffect, useCallback } from "react";
import * as backtestApi from "../api/backtest.js";
// No longer need to import setAuthToken here if it's only called in App.jsx
// However, it's fine to leave it if other functions might need it later.

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

  // ✅ REMOVED setAuthToken from all functions below
  const getOptions = useCallback(async () => {
    setError(null);
    try {
      const fetchedOptions = await backtestApi.fetchOptions();
      setOptions(fetchedOptions);
    } catch (err) {
      setError(err.message || "Failed to fetch options.");
    }
  }, []);

  const getPastBacktests = useCallback(async (page = 1) => {
    setError(null);
    try {
      const data = await backtestApi.fetchAll(page);
      setPastBacktests({ results: data.backtests, total: data.total });
    } catch (err) {
      setError(err.message || "Failed to load past backtests.");
    }
  }, []);

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
  
  const deleteBacktest = useCallback(async (id) => {
    setError(null);
    try {
      await backtestApi.deleteById(id);
      await getPastBacktests();
    } catch (err) {
      setError(err.message || "Failed to delete backtest.");
      throw err;
    }
  }, [getPastBacktests]);

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

 const runComboBacktest = useCallback(
  async ({ strategies, combinationRule = "AND", symbol, timeframe, startDate, endDate, initialBalance = 1000 }) => {
    setBatchLoading(true);
    setError(null);

    try {
      if (!strategies || strategies.length === 0) {
        throw new Error("At least one strategy must be selected for combo backtest.");
      }

      // Normalize symbol to backend format: ETH/USD -> ETH-USD
      const normSymbol = symbol.replace("/", "-").toUpperCase();

      const payload = {
        strategyCodes: strategies,   // <-- backend expects 'strategyCodes'
        combinationRule,             // "AND" or "OR"
        symbol: normSymbol,
        timeframe,
        startDate,
        endDate,
        initialBalance
      };

      const result = await backtestApi.runComboBacktest(payload);
      return result;
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Failed to run combo backtest.");
      throw err;
    } finally {
      setBatchLoading(false);
    }
  },
  []
);


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

  useEffect(() => {
    setInitialLoading(true);
    // These functions will now run after the token has been set in App.jsx
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
    getBacktestById,
    deleteBacktest,
    runNewBacktest,
    runComboBacktest,
    previewStrategy,
  };
}
