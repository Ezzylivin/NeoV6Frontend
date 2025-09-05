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

  // ---------------------
  // Fetch available backtest options from API
  // ---------------------
  const fetchOptions = async () => {
    try {
      const resp = await axios.get(`${apiUrl}/backtests/options`);
      if (resp?.data?.success && resp.data.options) {
        setOptions((prev) => ({ ...prev, ...resp.data.options }));
      }
      return resp.data;
    } catch (err) {
      console.error("[Fetch Options Error]", err.response?.data || err);
      throw err;
    }
  };

  // ---------------------
  // Run a single backtest
  // ---------------------
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

  // ---------------------
  // Run a realistic backtest
  // ---------------------
  const runRealisticBacktest = async (params) => {
    try {
      const userId = user?.id || user?._id;
      if (!userId) throw new Error("User not authenticated");

      const payload = { userId, ...params };
      console.log("[Realistic Backtest Request]", payload);

      const resp = await axios.post(`${apiUrl}/backtests/realistic`, payload);
      return resp.data;
    } catch (err) {
      console.error("[Run Realistic Backtest Error]", err.response?.data || err);
      throw err;
    }
  };

  // ---------------------
  // Generate all possible parameter combinations for batch backtests
  // ---------------------
  const generateUniqueCombos = (baseParams, count = 10) => {
    const combos = [];
    for (const strategy of options.strategies) {
      for (const risk of options.risks) {
        for (const takeProfit of options.takeProfits) {
          for (const stopLoss of options.stopLosses) {
            combos.push({
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

    // Shuffle array for randomness
    for (let i = combos.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [combos[i], combos[j]] = [combos[j], combos[i]];
    }

    return combos.slice(0, count);
  };

  // ---------------------
  // Run batch backtests
  // ---------------------
  const runBatchBacktests = async (baseParams) => {
    try {
      const userId = user?.id || user?._id;
      if (!userId) throw new Error("User not authenticated");

      const combos = generateUniqueCombos(baseParams, 10);
      console.log("[Batch Backtest Combos]", combos);

      // Attempt API batch endpoint first
      try {
        const resp = await axios.post(`${apiUrl}/backtests/batch`, { userId, paramCombos: combos });
        if (resp?.data?.success) return resp.data;
      } catch (err) {
        console.warn("[Batch Endpoint Failed], falling back to single requests", err.response?.data || err);
      }

      // Fallback: sequential single backtests
      const results = [];
      let best = null;
      for (const combo of combos) {
        const resp = await axios.post(`${apiUrl}/backtests/run`, { userId, ...combo });
        if (resp?.data) {
          const { saved, metrics, equityCurve, trades } = resp.data;

          const resultObj = {
            saved: saved || { equityCurve: equityCurve || [], tradeBreakdown: trades || [], symbol: combo.symbol, strategy: combo.strategy },
            metrics: {
              netProfit: metrics?.netProfit ?? 0,
              winRate: metrics?.winRate ?? 0,
              maxDrawdown: metrics?.maxDrawdown ?? 0,
              tradesCount: metrics?.tradesCount ?? 0,
            },
            equityCurve: equityCurve || [],
            trades: trades || [],
          };

          results.push(resultObj);

          if (!best || (resultObj.metrics.netProfit ?? -Infinity) > (best.metrics.netProfit ?? -Infinity)) {
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
