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

  // --- Fetch options on mount ---
  useEffect(() => {
    const loadOptions = async () => {
      try {
        setLoading(true);
        const data = await fetchBacktestOptions();
        setOptions(data || {});
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

  // --- Merge payload with safe defaults ---
  const mergeDefaults = (payload) => {
    const safeSymbol = payload.symbol || options.symbols?.[0] || "BTC/USDT";
    const safeTimeframe = payload.timeframe || options.timeframes?.[0] || "1h";
    const safeBalance =
      payload.initialBalance > 0
        ? payload.initialBalance
        : options.balances?.[0] || 1000;
    const safeStrategy =
      options.strategies?.find((s) => s.name === payload.strategy?.name) ||
      options.strategies?.[0] || { name: "Default Strategy", parameters: {}, _id: null };

    return {
      ...payload,
      symbol: safeSymbol,
      timeframe: safeTimeframe,
      initialBalance: safeBalance,
      strategyId: safeStrategy._id,
      strategy: {
        name: safeStrategy.name,
        parameters: payload.strategy?.parameters || safeStrategy.parameters || {},
      },
      risk: payload.risk || options.risks?.[0] || "Medium",
      takeProfit: payload.takeProfit || undefined,
      stopLoss: payload.stopLoss || undefined,
      startDate:
        payload.startDate ||
        options.availableDates?.[safeSymbol]?.[safeTimeframe]?.start,
      endDate:
        payload.endDate ||
        options.availableDates?.[safeSymbol]?.[safeTimeframe]?.end,
      positionSide: payload.positionSide || options.positions?.[0] || "Both",
      useNews: payload.useNews ?? defaultRealism.useNews,
      useSlippage: payload.useSlippage ?? defaultRealism.useSlippage,
      useSpread: payload.useSpread ?? defaultRealism.useSpread,
      useRandomEvents: payload.useRandomEvents ?? defaultRealism.randomEventProb > 0,
      baseSlippageBps: payload.baseSlippageBps ?? defaultRealism.slippage_bps,
      tradeConfig: payload.tradeConfig || {},
    };
  };

  // --- Run single backtest ---
  const runBacktest = async (payload) => {
    const safePayload = mergeDefaults(payload);
    console.log("🚀 [Hook] Running single backtest with payload:", safePayload);

    try {
      setLoading(true);
      const result = await apiRunBacktest(safePayload);
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

  // --- Run batch backtests ---
  const runBatchBacktests = async (payload) => {
    const safeParamCombos = (payload.paramCombos || []).map(mergeDefaults);
    const safePayload = { ...payload, paramCombos: safeParamCombos };
    console.log("🚀 [Hook] Running batch backtests with payload:", safePayload);

    try {
      setLoading(true);
      const result = await apiRunBatchBacktests(safePayload);
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
