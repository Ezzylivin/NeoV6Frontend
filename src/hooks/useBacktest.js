import { useState, useEffect, useCallback } from "react";
import * as backtestApi from "../api/backtest.js";

export function useBacktest() {
  const [options, setOptions] = useState({ strategies: [], symbols: [], timeframes: [] });
  const [pastBacktests, setPastBacktests] = useState({ results: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetches the initial dropdown options from the backend
  const getOptions = useCallback(async () => {
    try {
      const opts = await backtestApi.fetchOptions();
      setOptions(opts);
    } catch (err) {
      console.error("Failed to load options:", err);
      setError("Failed to load backtest options.");
    }
  }, []);

  // Fetches the user's history of backtests
  const getPastBacktests = useCallback(async (page = 1) => {
    try {
      const data = await backtestApi.fetchAll(page);
      setPastBacktests({ results: data.backtests, total: data.total });
    } catch (err) {
      console.error("Failed to load past backtests:", err);
      setError(err.response?.data?.message || "Failed to load past backtests.");
    }
  }, []);

  // Fetch initial data when the hook is first used
  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true);
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
      let result;

      // **UPGRADE**: This logic routes the request based on the selected strategy.
      if (payload.strategyId === 'python_sma_crossover') {
        console.log("Routing request to Python backtest service...");
        // Call the specific API function that talks to our Python service
        const pythonResult = await backtestApi.runPythonSMABacktest(payload);
        
        // Map the Python output to the format your frontend expects
        result = {
          metrics: {
            totalReturn: pythonResult.total_return_percent,
            winRate: pythonResult.sharpe_ratio, // Using Sharpe as a proxy for this metric field
            totalTrades: pythonResult.total_trades
          },
          // Add a flag to indicate this result isn't from the database
          isPythonResult: true 
        };
        // Note: This result is temporary and not saved to your backtest history.
        
      } else {
        // This is the original logic for all your standard, database-driven strategies
        console.log("Routing request to standard Node.js backtest service...");
        result = await backtestApi.run(payload);
        // Refresh the history list with the newly saved backtest
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
    // This function remains unchanged and works with your existing Node.js batch logic
    setLoading(true);
    setError(null);
    try {
      const result = await backtestApi.runBatch(configs);
      await getPastBacktests(); // Refresh the list after a new batch run
      return result;
    } catch (err) {
      const errorMessage = err.response?.data?.message || "Failed to run batch test.";
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [getPastBacktests]);

  return { options, pastBacktests, loading, error, runNewBacktest, runNewBatchBacktest };
}
