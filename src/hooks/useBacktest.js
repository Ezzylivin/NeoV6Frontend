// File: src/hooks/useBacktest.js
import { useState, useEffect } from "react";
import {
  fetchBacktestOptions,
  runBacktest as apiRunBacktest,
  runBatchBacktests as apiRunBatchBacktests,
} from "../api/backtest.js";

export function useBacktest() {
  const [options, setOptions] = useState({
    symbols: ["BTC/USDT"],
    strategies: [{ name: "Default Strategy", parameters: {}, _id: null }],
    timeframes: ["1h"],
    balances: [1000],
    risks: ["Medium"],
    positions: ["Both"],
    availableDates: {},
  });
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
        if (data) {
          setOptions({
            symbols: data.symbols?.length ? data.symbols : ["BTC/USDT"],
            strategies:
              data.strategies?.length
                ? data.strategies
                : [{ name: "Default Strategy", parameters: {}, _id: null }],
            timeframes: data.timeframes?.length ? data.timeframes : ["1h"],
            balances: data.balances?.length ? data.balances : [1000],
            risks: data.risks?.length ? data.risks : ["Medium"],
            positions: data.positions?.length ? data.positions : ["Both"],
            availableDates: data.availableDates || {},
          });
        }
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
    const safeSymbol = payload.symbol || options.symbols[0];
    const safeTimeframe = payload.timeframe || options.timeframes[0];
    const safeBalance =
      payload.initialBalance > 0 ? payload.initialBalance : options.balances[0];

    const matchedStrategy =
      options.strategies.find((s) => s.name === payload.strategy?.name) ||
      options.strategies[0];

    const strategyName = matchedStrategy.name || "Default Strategy";
    const strategyParams = payload.strategy?.parameters || matchedStrategy.parameters || {};

    const available = options.availableDates?.[safeSymbol]?.[safeTimeframe] || {};
    return {
      ...payload,
      symbol: safeSymbol,
      timeframe: safeTimeframe,
      initialBalance: safeBalance,
      strategyId: matchedStrategy._id || null,
      strategy: { name: strategyName, parameters: strategyParams },
      risk: payload.risk || options.risks[0],
      takeProfit: payload.takeProfit ?? null,
      stopLoss: payload.stopLoss ?? null,
      startDate: payload.startDate || available.start,
      endDate: payload.endDate || available.end,
      positionSide: payload.positionSide || options.positions[0],
      useNews: payload.useNews ?? defaultRealism.useNews,
      useSlippage: payload.useSlippage ?? defaultRealism.useSlippage,
      useSpread: payload.useSpread ?? defaultRealism.useSpread,
      useRandomEvents:
        payload.useRandomEvents ?? defaultRealism.randomEventProb > 0,
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
