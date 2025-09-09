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

  // Load backtest options from backend on mount
  useEffect(() => {
    const loadOptions = async () => {
      try {
        const data = await fetchBacktestOptions();
        if (!data) return;

        setOptions({
          symbols: data.symbols || [],
          timeframes: data.timeframes || [],
          strategies: data.strategies || [],
          balances: data.balances || [],
          risks: data.risks || [],
          positions: data.positions || [],
          takeProfits: data.takeProfits || [],
          stopLosses: data.stopLosses || [],
        });

        setDefaultRealism(data.defaultRealism || defaultRealism);
      } catch (err) {
        console.error("[useBacktest] fetchBacktestOptions failed", err);
        setError("Failed to load backtest options");
      }
    };
    loadOptions();
  }, []);

  // Normalize backtest result
  const normalizeBacktest = (result) => ({
    saved: result.saved || {},
    metrics: result.metrics || {},
    equityCurve: result.equityCurve || result.saved?.equityCurve || [],
    trades: result.trades || result.saved?.tradeBreakdown || [],
  });

  // Run a single backtest
  const runBacktest = async (payload) => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiRunBacktest(payload);
      const normalized = normalizeBacktest(result);
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

  // Run batch backtests
  const runBatchBacktests = async (payload) => {
    setLoading(true);
    setError(null);
    try {
      const { results, usedCombos } = await apiRunBatchBacktests(payload);
      const normalizedResults = (results || []).map(normalizeBacktest);
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
