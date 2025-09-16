// File: ../hooks/useBacktest.js
import { useState, useEffect, useCallback } from "react";
import * as backtestApi from "../api/backtest.js";

export function useBacktest() {
  const [options, setOptions] = useState({ strategies: [], symbols: [], timeframes: [] });
  const [pastBacktests, setPastBacktests] = useState({ results: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const normalizeOptions = (raw) => {
    if (!raw) return { strategies: [], symbols: [], timeframes: [] };

    return {
      strategies: raw.strategies || [],
      symbols: raw.symbols || [],
      timeframes: raw.timeframes || [],
    };
  };

  const getOptions = useCallback(async () => {
    try {
      const response = await backtestApi.fetchOptions();

      // Prefer nested .data.data but fallback gracefully
      const raw = response?.data?.data ?? response?.data;

      if (raw) {
        setOptions(normalizeOptions(raw));
        if (!raw.strategies || !raw.symbols || !raw.timeframes) {
          console.warn("Backtest options missing expected keys:", raw);
        }
      } else {
        console.error("Backtest options response missing data:", response);
        setError("Failed to load backtest options due to unexpected format.");
      }
    } catch (err) {
      console.error("Failed to load options:", err);
      setError("Failed to load backtest options.");
    }
  }, []);

  const getPastBacktests = useCallback(async (page = 1) => {
    try {
      const response = await backtestApi.fetchAll(page);
      const raw = response?.data?.data ?? response?.data;

      setPastBacktests({
        results: raw?.backtests || [],
        total: raw?.total || 0,
      });
    } catch (err) {
      console.error("Failed to load past backtests:", err);
      setError(err.response?.data?.message || "Failed to load past backtests.");
    }
  }, []);

  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true);
      setError(null);
      await Promise.all([
        getOptions(),
        getPastBacktests()
      ]);
      setLoading(false);
    };
    loadInitialData();
  }, [getOptions, getPastBacktests]);

  const runNewBacktest = useCallback(async (payload) => {
    setLoading(true);
    setError(null);
    try {
      const response = await backtestApi.runBacktest(payload);
      const raw = response?.data?.data ?? response?.data;

      if (!raw?.isPythonResult) {
        await getPastBacktests();
      }
      return response.data; // return full { success, message, data }
    } catch (err) {
      const errorMessage = err.response?.data?.message || "Failed to run backtest.";
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [getPastBacktests]);

  const runNewBatchBacktest = useCallback(async (configs) => {
    setLoading(true);
    setError(null);
    try {
      const response = await backtestApi.runBatch(configs);
      await getPastBacktests();
      return response.data;
    } catch (err) {
      const errorMessage = err.response?.data?.message || "Failed to run batch test.";
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [getPastBacktests]);

  return { options, pastBacktests, loading, error, runNewBacktest, runNewBatchBacktest, getPastBacktests };
}
