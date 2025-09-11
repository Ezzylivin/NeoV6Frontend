// File: src/hooks/useBacktest.js
import { useState, useEffect } from "react";
import axios from "axios";

const API_BASE = "https://neov6backend.onrender.com/api/backtests";

export function useBacktest() {
  const [options, setOptions] = useState({
    symbols: ["BTC/USDT"],          // default
    strategies: [{ name: "Default Strategy", params: {} }],
    timeframes: ["1h"],
    balances: [1000],
    risks: ["Medium"],
    positions: ["Both"],
    takeProfits: [0],
    stopLosses: [0],
    availableDates: {},
  });

  const [loadingSingle, setLoadingSingle] = useState(false);
  const [error, setError] = useState(null);
  const [currentBacktest, setCurrentBacktest] = useState(null);

  const [defaultRealism] = useState({
    useNews: true,
    useSlippage: true,
    useSpread: true,
    useRandomEvents: false,
    baseSlippageBps: 5,
  });

  // Fetch options from backend
  useEffect(() => {
    const loadOptions = async () => {
      try {
        const { data } = await axios.get(`${API_BASE}/options`);
        setOptions({
          symbols: data?.symbols?.length ? data.symbols : ["BTC/USDT"],
          strategies: data?.strategies?.length
            ? data.strategies
            : [{ name: "Default Strategy", params: {} }],
          timeframes: data?.timeframes?.length ? data.timeframes : ["1h"],
          balances: data?.balances?.length ? data.balances : [1000],
          risks: data?.risks?.length ? data.risks : ["Medium"],
          positions: data?.positions?.length ? data.positions : ["Both"],
          takeProfits: data?.takeProfits?.length ? data.takeProfits : [0],
          stopLosses: data?.stopLosses?.length ? data.stopLosses : [0],
          availableDates: data?.availableDates || {},
        });
        setError(null);
      } catch (err) {
        console.error("❌ fetchBacktestOptions failed:", err);
        setError("Failed to load backtest options, using defaults");
        // Defaults already set in initial state
      }
    };
    loadOptions();
  }, []);

  // Merge payload with safe defaults
  const mergeDefaults = (payload) => {
    const safeSymbol = payload.symbol || options.symbols[0];
    const safeTimeframe = payload.timeframe || options.timeframes[0];
    const safeBalance =
      Number(payload.initialBalance) > 0 ? Number(payload.initialBalance) : options.balances[0];

    const matchedStrategy =
      options.strategies.find((s) => s.name === payload.strategy?.name) ||
      options.strategies[0];

    const strategyParams =
      payload.strategy?.parameters || matchedStrategy?.params || {};
    const strategyName = matchedStrategy?.name || "Default Strategy";

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
      strategyId: matchedStrategy?._id || null,
      strategy: { name: strategyName, parameters: strategyParams },
      risk: payload.risk || options.risks[0],
      takeProfit: payload.takeProfit ?? options.takeProfits[0],
      stopLoss: payload.stopLoss ?? options.stopLosses[0],
      startDate,
      endDate,
      positionSide: payload.positionSide || options.positions[0],
      useNews: payload.useNews ?? defaultRealism.useNews,
      useSlippage: payload.useSlippage ?? defaultRealism.useSlippage,
      useSpread: payload.useSpread ?? defaultRealism.useSpread,
      useRandomEvents: payload.useRandomEvents ?? defaultRealism.useRandomEvents,
      baseSlippageBps: payload.baseSlippageBps ?? defaultRealism.baseSlippageBps,
      tradeConfig: payload.tradeConfig || {},
    };
  };

  // Run single backtest
  const runBacktest = async (payload) => {
    const safePayload = mergeDefaults(payload);
    setLoadingSingle(true);
    setError(null);
    try {
      const { data } = await axios.post(`${API_BASE}/run`, safePayload);
      const backtestData = { ...data, balanceOverTime: data.balanceOverTime || [] };
      setCurrentBacktest(backtestData);
      return backtestData;
    } catch (err) {
      console.error("❌ runBacktest failed:", err);
      setError("Failed to run backtest");
      throw err;
    } finally {
      setLoadingSingle(false);
    }
  };

  return {
    options,
    loadingSingle,
    error,
    currentBacktest,
    runBacktest,
    defaultRealism,
  };
}
