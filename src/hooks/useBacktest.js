// File: src/hooks/useBacktest.js
import { useState, useEffect } from "react";
import {
  fetchBacktestOptions,
  runBacktest as apiRunBacktest,
  runBatchBacktests as apiRunBatchBacktests,
} from "../api/backtest.js";

export const useBacktest = () => {
  const [options, setOptions] = useState({
    symbols: [],
    timeframes: [],
    strategies: [],
    balances: [],
    risks: [],
    positions: [],
    takeProfits: [],
    stopLosses: [],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentBacktest, setCurrentBacktest] = useState(null);
  const [batchResults, setBatchResults] = useState([]);
  const [defaultRealism, setDefaultRealism] = useState({
    slippage: true,
    latency: true,
    partialFills: true,
    slippage_bps: 5,
  });

  // Load options from backend
  useEffect(() => {
    const loadOptions = async () => {
      try {
        const data = await fetchBacktestOptions();
        setOptions(data || {});
        setDefaultRealism(data.defaultRealism || defaultRealism);
      } catch (err) {
        console.error("[useBacktest] fetchBacktestOptions failed", err);
        setError("Failed to load backtest options");
      }
    };
    loadOptions();
  }, []);

  const runBacktest = async (payload) => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiRunBacktest(payload);
      const normalized = {
        saved: result.saved || {},
        metrics: result.metrics || {},
        equityCurve: result.equityCurve || [],
        trades: result.trades || [],
      };
      setCurrentBacktest(normalized);
      setLoading(false);
      return normalized;
    } catch (err) {
      console.error("[useBacktest] runBacktest failed", err);
      setError("Backtest failed");
      setLoading(false);
      return null;
    }
  };

  const runBatchBacktests = async (payload) => {
    setLoading(true);
    setError(null);
    try {
      const { results, usedCombos } = await apiRunBatchBacktests(payload);
      const normalizedResults = (results || []).map((r) => ({
        saved: r.saved || {},
        metrics: r.metrics || {},
        equityCurve: r.equityCurve || [],
        trades: r.trades || [],
      }));
      setBatchResults(normalizedResults);
      setLoading(false);
      return { results: normalizedResults, usedCombos };
    } catch (err) {
      console.error("[useBacktest] runBatchBacktests failed", err);
      setError("Batch backtests failed");
      setLoading(false);
      return { results: [], usedCombos: [] };
    }
  };

  return {
    options,
    loading,
    error,
    currentBacktest,
    batchResults,
    defaultRealism,
    runBacktest,
    runBatchBacktests,
  };
};
