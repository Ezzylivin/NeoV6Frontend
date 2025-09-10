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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentBacktest, setCurrentBacktest] = useState(null);
  const [batchResults, setBatchResults] = useState([]);
  const [defaultRealism, setDefaultRealism] = useState({
    useNews: false,
    useSlippage: false,
    useSpread: false,
    useRandomEvents: false,
    slippage_bps: 5,
  });

  useEffect(() => {
    const loadOptions = async () => {
      try {
        setLoading(true);
        const data = await fetchBacktestOptions();
        setOptions({
          symbols: data?.symbols || ["BTCUSDT"],
          strategies: data?.strategies?.map((s) => ({
            ...s,
            parameters: s.params || {},
          })) || [{ name: "Default Strategy", parameters: {}, _id: null }],
          timeframes: data?.timeframes || ["1h"],
          balances: data?.balances || [1000],
          risks: data?.risks || ["Medium"],
          positions: data?.positions || ["Both"],
          availableDates: data?.availableDates || {},
        });
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

  const mergeDefaults = (payload) => {
    const safeSymbol = payload.symbol || options.symbols[0];
    const safeTimeframe = payload.timeframe || options.timeframes[0];
    const safeBalance = payload.initialBalance > 0 ? payload.initialBalance : options.balances[0];

    const matchedStrategy =
      options.strategies.find((s) => s.name === payload.strategy?.name) ||
      options.strategies[0];

    const strategyParams = payload.strategy?.parameters || matchedStrategy?.parameters || {};

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
      strategy: { name: matchedStrategy.name, parameters: strategyParams },
      risk: payload.risk || options.risks[0],
      takeProfit: payload.takeProfit ?? null,
      stopLoss: payload.stopLoss ?? null,
      startDate,
      endDate,
      positionSide: payload.positionSide || options.positions[0],
      useNews: payload.useNews ?? defaultRealism.useNews,
      useSlippage: payload.useSlippage ?? defaultRealism.useSlippage,
      useSpread: payload.useSpread ?? defaultRealism.useSpread,
      useRandomEvents: payload.useRandomEvents ?? defaultRealism.useRandomEvents,
      baseSlippageBps: payload.baseSlippageBps ?? defaultRealism.slippage_bps,
      tradeConfig: { ...payload.tradeConfig },
    };
  };

  const runBacktest = async (payload) => {
    const safePayload = mergeDefaults(payload);
    try {
      setLoading(true);
      const result = await apiRunBacktest(safePayload);
      setCurrentBacktest(result || {});
      return result || {};
    } catch (err) {
      console.error("❌ runBacktest failed:", err);
      setError("Failed to run backtest");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const runBatchBacktests = async (payload) => {
    const safeParamCombos = (payload.paramCombos || []).map((p) => mergeDefaults(p));
    const safePayload = { ...payload, paramCombos: safeParamCombos };
    try {
      setLoading(true);
      const result = await apiRunBatchBacktests(safePayload);
      setBatchResults(result || []);
      return result || [];
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
