// File: src/hooks/useBacktest.js
import { useState } from "react";
import axios from "axios";
import { useAuth } from "../context/AuthContext.jsx";

export function useBacktest() {
  const { user } = useAuth();
  const [options, setOptions] = useState({
    symbols: ["BTCUSDT", "ETHUSDT", "BNBUSDT"],
    timeframes: ["1m", "5m", "15m", "30m", "1h", "4h", "1d"],
    balances: [100, 500, 1000, 5000, 10000],
    strategies: ["SMA", "EMA", "RSI", "MACD", "BollingerBands", "Stochastic", "VWAP", "ATR"],
    risks: ["Low", "Medium", "High"],
    takeProfits: [null, 1, 2, 3, 5, 10],
    stopLosses: [null, 0.5, 1, 2, 3, 5],
  });

  const apiUrl = import.meta.env.VITE_API_URL || "";

  const fetchOptions = async () => {
    try {
      const resp = await axios.get(`${apiUrl}/backtests/options`);
      if (resp?.data?.success && resp.data.options) {
        setOptions((prev) => ({ ...prev, ...resp.data.options }));
      }
      return resp.data;
    } catch (err) {
      console.error("[Fetch Options Error]", err);
      throw err;
    }
  };

  const runBacktest = async (params) => {
    try {
      const userId = user?.id || user?._id;
      if (!userId) throw new Error("User not authenticated");

      const payload = { userId, ...params };
      console.log("[Single Backtest Request]", payload);
      const resp = await axios.post(`${apiUrl}/backtests/run`, payload);
      return resp.data;
    } catch (err) {
      console.error("[Run Backtest Error]", err.response?.data || err);
      throw err;
    }
  };

  const runRealisticBacktest = async (params) => {
    try {
      const userId = user?.id || user?._id;
      if (!userId) throw new Error("User not authenticated");

      const payload = { userId, ...params };
      console.log("[Realistic Backtest Request]", payload);
      const resp = await axios.post(`${apiUrl}/backtests/run-realistic`, payload);
      return resp.data;
    } catch (err) {
      console.error("[Run Realistic Backtest Error]", err.response?.data || err);
      throw err;
    }
  };

  // Helper: create all possible param combos (symbol + timeframe are fixed)
  const generateUniqueCombos = (baseParams, count = 10) => {
    const allCombos = [];
    for (const strategy of options.strategies) {
      for (const risk of options.risks) {
        for (const takeProfit of options.takeProfits) {
          for (const stopLoss of options.stopLosses) {
            allCombos.push({
              symbol: baseParams.symbol,
              timeframe: baseParams.timeframe,
              initialBalance: baseParams.initialBalance,
              strategy: { name: strategy, parameters: {} },
              risk,
              takeProfit,
              stopLoss,
            });
          }
        }
      }
    }

    // Shuffle for randomness
    for (let i = allCombos.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [allCombos[i], allCombos[j]] = [allCombos[j], allCombos[i]];
    }

    return allCombos.slice(0, count); // take only 10 unique
  };

  // Run one batch = 10 single backtests with different params
  const runBatchBacktests = async (baseParams) => {
    try {
      const userId = user?.id || user?._id;
      if (!userId) throw new Error("User not authenticated");

      const combos = generateUniqueCombos(baseParams, 10);
      console.log("[Batch Backtest Combos]", combos);

      const results = [];
      let best = null;

      for (const combo of combos) {
        const resp = await axios.post(`${apiUrl}/backtests/run`, { userId, ...combo });
        if (resp?.data) {
          results.push(resp.data);
          if (!best || (resp.data?.metrics?.netProfit ?? -Infinity) > (best?.metrics?.netProfit ?? -Infinity)) {
            best = resp.data;
          }
        }
      }

      return { results, best, usedCombos: combos };
    } catch (err) {
      console.error("[Run Batch Backtests Error]", err.response?.data || err);
      throw err;
    }
  };

  return {
    options,
    setOptions,
    fetchOptions,
    runBacktest,
    runRealisticBacktest,
    runBatchBacktests,
  };
}
