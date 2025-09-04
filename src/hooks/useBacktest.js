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

      // NEW: allow startDate and endDate in payload
      const payload = {
        userId,
        ...params,
        startDate: params.startDate || null,
        endDate: params.endDate || null,
      };

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

      // NEW: allow startDate and endDate in payload
      const payload = {
        userId,
        ...params,
        startDate: params.startDate || null,
        endDate: params.endDate || null,
      };

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
              startDate: baseParams.startDate || null, // NEW
              endDate: baseParams.endDate || null,     // NEW
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

  // Run batch = 10 single backtests with proper saved object
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
          const { metrics, equityCurve, trades } = resp.data;

          // Ensure each batch result has a proper `saved` object like single backtest
          const saved = {
            equityCurve: equityCurve || [],
            tradeBreakdown: trades || [],
            symbol: combo.symbol,
            strategy: combo.strategy,
          };

          const resultObj = {
            saved,
            metrics: {
              netProfit: metrics?.netProfit ?? 0,
              winRate: metrics?.winRate ?? 0,
              maxDrawdown: metrics?.maxDrawdown ?? 0,
              tradesCount: metrics?.tradesCount ?? 0,
            },
            equityCurve: saved.equityCurve,
            trades: saved.tradeBreakdown,
          };

          results.push(resultObj);

          if (!best || (metrics?.netProfit ?? -Infinity) > (best?.metrics?.netProfit ?? -Infinity)) {
            best = resultObj;
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
