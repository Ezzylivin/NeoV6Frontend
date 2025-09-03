// File: src/hooks/useBacktest.js
import { useState } from "react";
import axios from "axios";

export function useBacktest() {
  const apiBase = import.meta.env.VITE_API_URL || "/api";

  const [options, setOptions] = useState({
    symbols: ["BTCUSDT", "ETHUSDT", "BNBUSDT"],
    timeframes: ["1m", "5m", "15m", "30m", "1h", "4h", "1d"],
    balances: [100, 500, 1000, 5000, 10000],
    strategies: ["SMA","EMA","RSI","MACD","BollingerBands","Stochastic","VWAP","ATR"],
    risks: ["Low","Medium","High"],
    takeProfits: [null, 1, 2, 3, 5, 10],
    stopLosses: [null, 0.5, 1, 2, 3, 5]
  });

  // Fetch options from backend
  const fetchOptions = async () => {
    try {
      const resp = await axios.get(`${apiBase}/backtests/options`);
      if (resp?.data?.success && resp.data.options) {
        setOptions(prev => ({ ...prev, ...resp.data.options }));
      }
      return resp.data;
    } catch (err) {
      console.error("[Fetch Options Error]", err);
      throw err;
    }
  };

  // Run single backtest
  const runBacktest = async ({ userId, ...params }) => {
    if (!userId) throw new Error("userId is required");
    try {
      const resp = await axios.post(`${apiBase}/backtests/run`, { userId, ...params });
      return resp.data;
    } catch (err) {
      console.error("[Run Backtest Error]", err);
      throw err;
    }
  };

  // Run batch backtests
  const runBatchBacktests = async (userId, combos) => {
    if (!userId) throw new Error("userId is required");
    if (!Array.isArray(combos) || combos.length === 0) return { results: [], best: null };
    try {
      const resp = await axios.post(`${apiBase}/backtests/batch`, { userId, paramCombos: combos });
      return resp.data;
    } catch (err) {
      console.error("[Run Batch Backtests Error]", err);
      throw err;
    }
  };

  // Generate all param combos from current selectors
  const generateParamCombos = () => {
    const combos = [];
    for (const symbol of options.symbols) {
      for (const timeframe of options.timeframes) {
        for (const strategy of options.strategies) {
          for (const risk of options.risks) {
            for (const takeProfit of options.takeProfits) {
              for (const stopLoss of options.stopLosses) {
                combos.push({
                  symbol,
                  timeframe,
                  strategy: { name: strategy, parameters: {} },
                  risk,
                  takeProfit,
                  stopLoss
                });
              }
            }
          }
        }
      }
    }
    return combos;
  };

  // Run batch backtests from selectors
  const runBatchFromSelectors = async (userId) => {
    const combos = generateParamCombos();
    return await runBatchBacktests(userId, combos);
  };

  return {
    options,
    setOptions,
    fetchOptions,
    runBacktest,
    runBatchBacktests,
    runBatchFromSelectors,
    generateParamCombos
  };
}
