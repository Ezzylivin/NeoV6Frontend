// ../hooks/useBacktest.js
// UPGRADED: Correctly handles data flow from the API.

import { useState, useEffect, useCallback } from "react";
import * as backtestApi from "../api/backtest.js";

export function useBacktest() {
  const [options, setOptions] = useState({ strategies: [], symbols: [], timeframes: [] });
  const [pastBacktests, setPastBacktests] = useState({ results: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const getOptions = useCallback(async () => {
    try {
        const data = await backtestApi.fetchOptions();
        
        // --- THE FIX ---
        // Safely access the data and set the state.
        if (data && data.symbols && data.timeframes) {
            setOptions({
                strategies: data.strategies || [],
                symbols: data.symbols,
                timeframes: data.timeframes,
            });
        } else {
            // Handle the case where the data is not in the expected format.
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
      const data = await backtestApi.fetchAll(page);
      
      // --- FIX #2 ---
      // Use "optional chaining" (the ?. operator) to safely access properties.
      // If 'data' is undefined, this will return [] and 0 instead of crashing.
      setPastBacktests({ 
        results: data?.backtests || [], 
        total: data?.total || 0 
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
      const result = await backtestApi.runBacktest(payload);
      if (!result.isPythonResult) {
        await getPastBacktests();
      }
      return result;
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
      const result = await backtestApi.runBatch(configs);
      await getPastBacktests();
      return result;
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
