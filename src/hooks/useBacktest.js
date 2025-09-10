// File: src/hooks/useBacktest.js
import { useState, useEffect } from "react";
import {
  fetchBacktestOptions,
  runBacktest as apiRunBacktest,
  runBatchBacktests as apiRunBatchBacktests,
} from "../api/backtest.js";

export function useBacktest() {
  const [options, setOptions] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentBacktest, setCurrentBacktest] = useState(null);
  const [batchResults, setBatchResults] = useState([]);
  const [defaultRealism, setDefaultRealism] = useState({
    useNews: false,
    useSlippage: false,
    useSpread: false,
    randomEventProb: 0,
    slippage_bps: 5,
  });

  // fetch options on mount
  useEffect(() => {
    const loadOptions = async () => {
      try {
        setLoading(true);
        const data = await fetchBacktestOptions();
        setOptions(data);
        setError(null);
      } catch (err) {
        console.error("❌ fetchBacktestOptions failed:", err);
        setError("Failed to load options");
      } finally {
        setLoading(false);
      }
    };
    loadOptions();
  }, []);

  // run single backtest
  const runBacktest = async (payload) => {
    try {
      setLoading(true);
      const result = await apiRunBacktest(payload);
      setCurrentBacktest(result);
      return result;
    } catch (err) {
      console.error("❌ runBacktest failed:", err);
      setError("Failed to run backtest");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // run batch backtests
  const runBatchBacktests = async (payload) => {
    try {
      setLoading(true);
      const result = await apiRunBatchBacktests(payload);
      setBatchResults(result);
      return result;
    } catch (err) {
      console.error("❌ runBatchBacktests failed:", err);
      setError("Failed to run batch backtests");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    options,
    loading,
    error,
    currentBacktest,
    runBacktest,
    batchResults,
    runBatchBacktests,
    defaultRealism,
  };
}
