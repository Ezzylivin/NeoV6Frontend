// File: src/hooks/useBacktest.js
import { useState } from "react";
import axios from "axios";
import { useAuth } from "../context/AuthContext.jsx";

export function useBacktest() {
  const { user } = useAuth();

  // --- Default options ---
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

  // -------------------------------
  // Fetch options from backend
  // -------------------------------
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

  // -------------------------------
  // Single backtest
  // -------------------------------
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

  // -------------------------------
  // Realistic backtest (alias route)
  // -------------------------------
  const runRealisticBacktest = async (params) => {
    try {
      const userId = user?.id || user?._id;
      if (!userId) throw new Error("User not authenticated");

      const payload = { userId, ...params };
      console.log("[Realistic Backtest Request]", payload);

      // ✅ Use the new /backtests/realistic endpoint
      const resp = await axios.post(`${apiUrl}/backtests/realistic`, payload);
      return resp.data;
    } catch (err) {
      console.error("[Run Realistic Backtest Error]", err.response?.data || err);
      throw err;
    }
  };

  // -------------------------------
  // Generate all unique param combinations
  // -------------------------------
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
              // ✅ Pass startDate and endDate to each combo
              startDate: baseParams.startDate,
              endDate: baseParams.endDate,
            });
          }
        }
      }
    }

    // Shuffle array for randomness
    for (let i = allCombos.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [allCombos[i], allCombos[j]] = [allCombos[j], allCombos[i]];
    }

    return allCombos.slice(0, count); // return only `count` combos
  };

  // -------------------------------
  // Run batch backtests sequentially
  // -------------------------------
  const runBatchBacktests = async (baseParams) => {
    try {
      const userId = user?.id || user?._id;
      if (!userId) throw new Error("User not authenticated");

      // Pass baseParams which now include startDate and endDate
      const combos = generateUniqueCombos(baseParams, 10);
      console.log("[Batch Backtest Combos]", combos);

      const results = [];
      let best = null;

      for (const combo of combos) {
        const resp = await axios.post(`${apiUrl}/backtests/run`, { userId, ...combo });
        if (resp?.data) {
          const { metrics, equityCurve, trades, backtest } = resp.data;

          // Keep saved object consistent with single backtest
          const saved = backtest || {
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
    setOptions, // You can keep this if you want to allow direct manipulation of options from component
    fetchOptions,
    runBacktest,
    runRealisticBacktest,
    runBatchBacktests,
  };
}
