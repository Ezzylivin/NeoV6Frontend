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
  const [error, setError] = useState("");
  const [currentBacktest, setCurrentBacktest] = useState(null);
  const [batchResults, setBatchResults] = useState([]);
  const [defaultRealism, setDefaultRealism] = useState({
    useSlippage: true,
    useSpread: true,
    useNews: true,
    useRandomEvents: true,
    randomEventProb: 0.005,
    slippage_bps: 5,
  });

  const [dateRange, setDateRange] = useState({
    startDate: "",
    endDate: "",
  });

  // Fetch options on mount
  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const data = await fetchBacktestOptions();
        setOptions(data);
      } catch (err) {
        console.error("[Hook] fetchBacktestOptions failed:", err);
        setError("Failed to load backtest options.");
      }
    };
    fetchOptions();
  }, []);

  // --- Run single backtest ---
  const runBacktest = async (payload) => {
    setLoading(true);
    setError("");
    try {
      const cleanPayload = {
        userId: payload.userId,
        symbol: payload.symbol,
        timeframe: payload.timeframe,
        initialBalance: payload.initialBalance,
        strategyId: payload.strategyId || null,
        strategy: payload.strategy || {},
        risk: payload.risk,
        takeProfit: payload.takeProfit,
        stopLoss: payload.stopLoss,
        limit: payload.limit || undefined,
        startDate: payload.startDate || undefined,
        endDate: payload.endDate || undefined,
        useNews: payload.useNews ?? true,
        useSlippage: payload.useSlippage ?? true,
        useSpread: payload.useSpread ?? true,
        useRandomEvents: payload.useRandomEvents ?? false,
        baseSlippageBps: payload.baseSlippageBps ?? 5,
        positionSide: payload.positionSide || "Both",
        tradeConfig: payload.tradeConfig || {},
      };

      console.log("[Hook] runBacktest outgoing payload:", JSON.stringify(cleanPayload, null, 2));

      const result = await apiRunBacktest(cleanPayload);
      setCurrentBacktest(result);
      return result;
    } catch (err) {
      console.error("[Hook] runBacktest failed:", err);
      setError(err.message || "Backtest failed");
      return null;
    } finally {
      setLoading(false);
    }
  };

  // --- Run batch backtests ---
  const runBatchBacktests = async (payload) => {
    setLoading(true);
    setError("");
    try {
      const cleanParamCombos = (payload.paramCombos || []).map((p) => ({
        userId: payload.userId,
        symbol: p.symbol,
        timeframe: p.timeframe,
        initialBalance: p.initialBalance,
        strategyId: p.strategyId || null,
        strategy: p.strategy || {},
        risk: p.risk,
        takeProfit: p.takeProfit,
        stopLoss: p.stopLoss,
        limit: p.limit || undefined,
        startDate: p.startDate || undefined,
        endDate: p.endDate || undefined,
        useNews: p.useNews ?? true,
        useSlippage: p.useSlippage ?? true,
        useSpread: p.useSpread ?? true,
        useRandomEvents: p.useRandomEvents ?? false,
        baseSlippageBps: p.baseSlippageBps ?? 5,
        positionSide: p.positionSide || "Both",
        tradeConfig: p.tradeConfig || {},
      }));

      const cleanPayload = {
        userId: payload.userId,
        paramCombos: cleanParamCombos,
      };

      console.log("[Hook] runBatchBacktests outgoing payload:", JSON.stringify(cleanPayload, null, 2));

      const { results } = await apiRunBatchBacktests(cleanPayload);
      setBatchResults(results);
      return results;
    } catch (err) {
      console.error("[Hook] runBatchBacktests failed:", err);
      setError(err.message || "Batch backtests failed");
      return [];
    } finally {
      setLoading(false);
    }
  };

  // Optional utility to update date range
  const updateDateRange = (startDate, endDate) => {
    setDateRange({ startDate: startDate || "", endDate: endDate || "" });
  };

  return {
    options,
    loading,
    error,
    currentBacktest,
    batchResults,
    defaultRealism,
    dateRange,
    runBacktest,
    runBatchBacktests,
    updateDateRange,
    setDefaultRealism,
  };
}
