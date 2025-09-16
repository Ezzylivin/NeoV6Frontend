// ../hooks/useBacktest.js
// UPGRADED: Correctly handles the data flow from the API.

import { useState, useEffect, useCallback } from "react";
import * as backtestApi from "../api/backtest.js";

export function useBacktest() {
  const [options, setOptions] = useState({ strategies: [], symbols: [], timeframes: [] });
  const [pastBacktests, setPastBacktests] = useState({ results: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const getOptions = useCallback(async () => {
    try {
      const response = await backtestApi.fetchOptions();
      
      // FIX: Correctly access the nested data object.
      if (response?.data?.data) {
        setOptions({
          strategies: response.data.data.strategies || [],
          symbols: response.data.data.symbols || [],
          timeframes: response.data.data.timeframes || [],
        });
      } else {
        console.error("API response is missing required data keys.");
        setError("Failed to load backtest options due to unexpected data format.");
      }
    } catch (err) {
      console.error("Failed to load options:", err);
      setError("Failed to load backtest options.");
    }
  }, []);

  const getPastBacktests = useCallback(async (page = 1) => {
    try {
      const response = await backtestApi.fetchAll(page);
      
      setPastBacktests({ 
        results: response?.data?.data?.backtests || [], 
        total: response?.data?.data?.total || 0 
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
      if (!response.data.isPythonResult) {
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
