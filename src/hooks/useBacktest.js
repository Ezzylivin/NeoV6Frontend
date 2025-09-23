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

  // --- Fetch dropdown options
  const getOptions = useCallback(async () => {
    setError(null);
    try {
      const fetchedOptions = await backtestApi.fetchOptions();
      setOptions(fetchedOptions);
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Failed to fetch options.");
    }
  }, []);

  // --- Fetch paginated past backtests
  const getPastBacktests = useCallback(async (page = 1) => {
    setError(null);
    try {
      const data = await backtestApi.fetchAll(page);
      setPastBacktests({ results: data.backtests, total: data.total });
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Failed to load past backtests.");
    }
  }, []);

  // --- Fetch single backtest by ID
  const getBacktestById = useCallback(async (id) => {
    setInitialLoading(true);
    setError(null);
    try {
      return await backtestApi.fetchById(id);
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Failed to fetch backtest.");
      throw err;
    } finally {
      setInitialLoading(false);
    }
  }, []);

  // --- Delete backtest by ID
  const deleteBacktest = useCallback(
    async (id) => {
      setError(null);
      try {
        await backtestApi.deleteById(id);
        await getPastBacktests();
      } catch (err) {
        setError(err.response?.data?.message || err.message || "Failed to delete backtest.");
        throw err;
      }
    },
    [getPastBacktests]
  );

  // --- Run single strategy backtest
  const runNewBacktest = useCallback(
    async (payload) => {
      setSingleLoading(true);
      setError(null);
      try {
        const result = await backtestApi.runBacktest(payload);
        await getPastBacktests();
        return result;
      } catch (err) {
        setError(err.response?.data?.message || err.message || "Failed to run backtest.");
        throw err;
      } finally {
        setSingleLoading(false);
      }
    },
    [getPastBacktests]
  );

  // --- Run combo backtest (DB schema compliant)
  const runComboBacktest = useCallback(
    async ({ name, strategies, params }) => {
      if (!name || !strategies || strategies.length === 0) {
        throw new Error("Name and strategies are required for combo backtest.");
      }

      setBatchLoading(true);
      setError(null);
      try {
        // Backend expects { name, strategies: [ids], params: {...} }
        const result = await backtestApi.runComboBacktest({ name, strategies, params });
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

  // --- Preview strategy without saving
  const previewStrategy = useCallback(
    async (payload) => {
      setSingleLoading(true);
      setError(null);
      try {
        return await backtestApi.previewStrategy(payload);
      } catch (err) {
        setError(err.response?.data?.message || err.message || "Failed to preview strategy.");
        throw err;
      } finally {
        setSingleLoading(false);
      }
    },
    []
  );

  // --- Initial load
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
    getBacktestById,
    deleteBacktest,
    runNewBacktest,
    runComboBacktest,
    previewStrategy,
  };
}
