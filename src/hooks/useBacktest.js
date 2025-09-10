// File: src/hooks/useBacktest.js
import { useState, useEffect } from "react";
import {
  fetchBacktestOptions,
  runBacktest as apiRunBacktest,
  runBatchBacktests as apiRunBatchBacktests,
} from "../api/backtest.js";

export function useBacktest() {
  const [options, setOptions] = useState({
    symbols: [],
    strategies: [],
    timeframes: [],
    balances: [1000],
    risks: ["Medium"],
    positions: ["Both"],
    availableDates: {},
  });
  const [loadingSingle, setLoadingSingle] = useState(false);
  const [loadingBatch, setLoadingBatch] = useState(false);
  const [error, setError] = useState(null);
  const [currentBacktest, setCurrentBacktest] = useState(null);
  const [batchResults, setBatchResults] = useState([]);
  const [defaultRealism] = useState({
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
        const data = await fetchBacktestOptions();
        setOptions({
          symbols: data?.symbols || [],
          strategies: data?.strategies || [],
          timeframes: data?.timeframes || ["1h"],
          balances: data?.balances || [1000],
          risks: data?.risks || ["Medium"],
          positions: data?.positions || ["Both"],
          availableDates: data?.availableDates || {},
        });
        setError(null);
      } catch (err) {
        console.error("❌ fetchBacktestOptions failed:", err);
        setError("Failed to load backtest options");
      }
    };
    loadOptions();
  }, []);

  // --- Merge payload with safe defaults ---
  const mergeDefaults = (payload) => {
    const safeSymbol = payload.symbol || options.symbols[0] || "BTC/USDT";
    const safeTimeframe = payload.timeframe || options.timeframes[0] || "1h";
    const safeBalance = Number(payload.initialBalance) > 0
      ? Number(payload.initialBalance)
      : options.balances[0] || 1000;

    const matchedStrategy =
      options.strategies.find((s) => s.name === payload.strategy?.name) ||
      options.strategies[0] ||
      { name: "Default Strategy", parameters: {}, _id: null };

    const strategyParams = payload.strategy?.parameters || matchedStrategy.parameters || {};
    const strategyName = matchedStrategy.name || "Default Strategy";

    const startDate =
      payload.startDate ||
      options.availableDates?.[safeSymbol]?.[safeTimeframe]?.start ||
      new Date().toISOString().split("T")[0];

    const endDate =
      payload.endDate ||
      options.availableDates?.[safeSymbol]?.[safeTimeframe]?.end ||
      new Date().toISOString().split("T")[0];

    return {
      ...payload,
      symbol: safeSymbol,
      timeframe: safeTimeframe,
      initialBalance: safeBalance,
      strategyId: matchedStrategy._id || null,
      strategy: { name: strategyName, parameters: strategyParams },
      risk: payload.risk || options.risks[0] || "Medium",
      takeProfit: payload.takeProfit ?? null,
      stopLoss: payload.stopLoss ?? null,
      startDate,
      endDate,
      positionSide: payload.positionSide || options.positions[0] || "Both",
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
    setLoadingSingle(true);
    setError(null);
    try {
      const result = await apiRunBacktest(safePayload);
      setCurrentBacktest(result || {});
      return result || {};
    } catch (err) {
      console.error("❌ runBacktest failed:", err);
      setError("Failed to run backtest");
      throw err;
    } finally {
      setLoadingSingle(false);
    }
  };

  // --- Run batch backtests ---
  const runBatchBacktests = async (payload) => {
    const safeParamCombos = (payload.paramCombos || []).map((p) => {
      const stratDefaults = options.strategies.find((s) => s.name === p.strategy?.name) || {};
      return mergeDefaults({
        ...p,
        strategy: { name: stratDefaults.name || "Default Strategy", parameters: stratDefaults.parameters || {} },
      });
    });

    const safePayload = { ...payload, paramCombos: safeParamCombos };
    setLoadingBatch(true);
    setError(null);
    try {
      const result = await apiRunBatchBacktests(safePayload);
      setBatchResults(result || []);
      return result || [];
    } catch (err) {
      console.error("❌ runBatchBacktests failed:", err);
      setError("Failed to run batch backtests");
      throw err;
    } finally {
      setLoadingBatch(false);
    }
  };

  return {
    options,
    loadingSingle,
    loadingBatch,
    error,
    currentBacktest,
    batchResults,
    runBacktest,
    runBatchBacktests,
    defaultRealism,
  };
}
