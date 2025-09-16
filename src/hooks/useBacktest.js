// File: src/hooks/useBacktest.js
import { useState, useEffect, useCallback } from "react";
import * as backtestApi from "../api/backtest.js";

export function useBacktest() {
  const [options, setOptions] = useState({
    strategies: [],
    symbols: [],
    timeframes: [],
    takeProfits: [0.5, 1, 1.5, 2, 3], // predefined TP percentages
    stopLosses: [0.5, 1, 1.5, 2, 3],  // predefined SL percentages
  });
  const [pastBacktests, setPastBacktests] = useState({ results: [], total: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch options
  const getOptions = useCallback(async () => {
    try {
      const data = await backtestApi.fetchOptions();
      setOptions((prev) => ({ ...prev, ...data }));
    } catch (err) {
      console.error("Failed to load options:", err);
      setError("Failed to load backtest options.");
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
    async ({ strategyId, symbol, timeframe, startDate, endDate, takeProfit, stopLoss }) => {
      setLoading(true);
      setError(null);
      try {
        const payload = { strategyId, symbol, timeframe, startDate, endDate, takeProfit, stopLoss };
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
        setLoading(false);
      }
    },
    [getPastBacktests]
  );

  // Run batch backtests
  const runNewBatchBacktest = useCallback(
    async (configs) => {
      setLoading(true);
      setError(null);
      try {
        // configs = array of { strategyId, symbol, timeframe, startDate, endDate, takeProfit, stopLoss }
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
        setLoading(false);
      }
    },
    [getPastBacktests]
  );

  // Load options and past backtests initially (no auto-run)
  useEffect(() => {
    getOptions();
    getPastBacktests();
  }, [getOptions, getPastBacktests]);

  return {
    options,
    pastBacktests,
    loading,
    error,
    getPastBacktests,
    runNewBacktest,
    runNewBatchBacktest,
  };
}
