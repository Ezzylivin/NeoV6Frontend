// File: src/hooks/useBacktest.js
import { useState } from "react";
import axios from "axios";

export function useBacktest(currentUser) {
  const [options, setOptions] = useState({
    symbols: ["BTCUSDT", "ETHUSDT", "BNBUSDT"],
    timeframes: ["1m","5m","15m","30m","1h","4h","1d"],
    balances: [100,500,1000,5000,10000],
    strategies: ["SMA","EMA","RSI","MACD","BollingerBands","Stochastic","VWAP","ATR"],
    risks: ["Low","Medium","High"],
    takeProfits: [null,1,2,3,5,10],
    stopLosses: [null,0.5,1,2,3,5]
  });

  const apiUrl = import.meta.env.VITE_API_URL || "";

  // Fetch options from backend
  const fetchOptions = async () => {
    try {
      const resp = await axios.get(`${apiUrl}/backtests/options`);
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
  const runBacktest = async (params) => {
    try {
      // Use real MongoDB ObjectId from currentUser
      const payload = {
        userId: currentUser?._id,
        symbol: params.symbol,
        timeframe: params.timeframe,
        initialBalance: Number(params.initialBalance),
        strategy: params.strategy,
        risk: params.risk,
        takeProfit: params.takeProfit != null ? Number(params.takeProfit) : null,
        stopLoss: params.stopLoss != null ? Number(params.stopLoss) : null
      };

      console.log("[Run Backtest Payload]", payload);

      const resp = await axios.post(`${apiUrl}/backtests/run`, payload);
      return resp.data;
    } catch (err) {
      console.error("[Run Backtest Error]", err.response?.data || err);
      throw err;
    }
  };

  // Run batch backtests
  const runBatchBacktests = async (combos) => {
    try {
      const payload = {
        userId: currentUser?._id,
        paramCombos: combos
      };
      const resp = await axios.post(`${apiUrl}/backtests/batch`, payload);
      return resp.data;
    } catch (err) {
      console.error("[Run Batch Backtests Error]", err.response?.data || err);
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
  const runBatchFromSelectors = async () => {
    const combos = generateParamCombos();
    if (!combos.length) return { results: [], best: null };
    return await runBatchBacktests(combos);
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
