// File: src/hooks/useBacktest.js
import { useState, useEffect } from "react";
import axios from "axios";

// SUGGESTION: Use an environment variable for the API base URL
const API_BASE = process.env.REACT_APP_API_URL || "https://neov6backend.onrender.com/api/backtests";

export function useBacktest() {
  const [options, setOptions] = useState({
    symbols: ["BTC/USDT"],
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
        // Note: The backend response has a 'data' wrapper
        const { data: response } = await axios.get(`${API_BASE}/options`);
        const data = response.data; // Access the actual data object
        
        setOptions({
          symbols: data?.symbols?.length ? data.symbols : ["BTC/USDT"],
          strategies: data?.strategies?.length ? data.strategies : [{ name: "Default Strategy", params: {} }],
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
      }
    };
    loadOptions();
  }, []);

  // Merge payload with safe defaults
  const mergeDefaults = (payload) => {
    const safeSymbol = payload.symbol || options.symbols[0];
    const safeTimeframe = payload.timeframe || options.timeframes[0];
    const safeBalance = Number(payload.initialBalance) > 0 ? Number(payload.initialBalance) : options.balances[0];

    const matchedStrategy = options.strategies.find((s) => s.name === payload.strategy?.name) || options.strategies[0];
    
    // --- FIX: Add 'type' to the strategy object ---
    const finalStrategy = {
      name: matchedStrategy?.name || "Default Strategy",
      type: matchedStrategy?.strategyType || "SMA", // <-- CRITICAL FIX
      parameters: payload.strategy?.parameters || matchedStrategy?.params || {},
    };

    const startDate = payload.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const endDate = payload.endDate || new Date().toISOString().split("T")[0];

    return {
      ...payload,
      symbol: safeSymbol,
      timeframe: safeTimeframe,
      initialBalance: safeBalance,
      strategyId: matchedStrategy?._id || null,
      strategy: finalStrategy, // Use the fixed strategy object
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
    // NOTE: An auth solution will be needed to provide a real userId
    const payloadWithUser = { ...payload, userId: '65f0c233932a32a13295964f' }; // Placeholder ID
    const safePayload = mergeDefaults(payloadWithUser);
    
    setLoadingSingle(true);
    setError(null);
    try {
      const { data: response } = await axios.post(`${API_BASE}/run`, safePayload);
      const data = response.data; // Access the actual data object

      // --- FIX: Use 'equityCurve' to match the backend schema ---
      const backtestData = {
        ...data,
        equityCurve: data?.equityCurve || [], // <-- FIX
      };

      setCurrentBacktest(backtestData);
      return backtestData;
    } catch (err) {
      console.error("❌ runBacktest failed:", err);
      const errorMessage = err.response?.data?.message || "Failed to run backtest";
      setError(errorMessage);
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
