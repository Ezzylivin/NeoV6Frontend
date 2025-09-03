// File: src/hooks/useBacktest.js
import { useState } from "react";
import axios from "axios";

export function useBacktest() {
  const [options, setOptions] = useState({
    symbols: ["BTCUSDT","ETHUSDT","BNBUSDT"],
    timeframes: ["1m","5m","15m","30m","1h","4h","1d"],
    balances: [100,500,1000,5000,10000],
    strategies: ["SMA","EMA","RSI","MACD","BollingerBands","Stochastic","VWAP","ATR"],
    risks: ["Low","Medium","High"],
    takeProfits: [null,1,2,3,5,10],
    stopLosses: [null,0.5,1,2,3,5]
  });

  const apiUrl = import.meta.env.VITE_API_URL || "";

  // --- 1. Fetch options from backend safely ---
  const fetchOptions = async () => {
    try {
      const resp = await axios.get(`${apiUrl}/backtests/options`);
      if (resp?.data?.success && resp.data.options) {
        setOptions(prev => ({ ...prev, ...resp.data.options }));
      }
      return resp.data;
    } catch (err) {
      console.error("[Fetch Options Error]", err);
      return { success: false, options: {} }; // Return safe default instead of throwing
    }
  };

  // --- 2. Run single backtest safely ---
  const runBacktest = async ({ userId, ...params }) => {
    if (!userId || !params.symbol) {
      console.warn("[Run Backtest Skipped] Missing userId or symbol", params);
      return { success: false, message: "Missing userId or symbol" };
    }

    try {
      console.log("[Run Backtest Payload]", { userId, ...params });
      const resp = await axios.post(`${apiUrl}/backtests/run`, { userId, ...params });
      return resp.data;
    } catch (err) {
      console.error("[Run Backtest Error]", err.response?.data || err.message);
      return { success: false, message: err.response?.data?.message || err.message };
    }
  };

  // --- 3. Run batch backtests safely with chunking ---
  const runBatchBacktests = async (userId, combos) => {
    if (!userId || !Array.isArray(combos) || combos.length === 0) {
      console.warn("[Run Batch Skipped] Missing userId or empty combos");
      return { results: [], best: null };
    }

    // Limit chunk size to avoid 413 Payload Too Large
    const CHUNK_SIZE = 50;
    let results = [];
    let best = null;

    for (let i = 0; i < combos.length; i += CHUNK_SIZE) {
      const chunk = combos.slice(i, i + CHUNK_SIZE);
      try {
        const resp = await axios.post(`${apiUrl}/backtests/batch`, { userId, paramCombos: chunk });
        if (resp?.data?.success) {
          results = results.concat(resp.data.results || []);
          if (!best || (resp.data.best?.metrics?.netProfit > best.metrics?.netProfit)) {
            best = resp.data.best;
          }
        }
      } catch (err) {
        console.error("[Batch Chunk Error]", err.response?.data || err.message);
      }
    }

    return { results, best };
  };

  // --- 4. Generate all param combos from current selectors ---
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

  // --- 5. Run batch backtests from selectors safely ---
  const runBatchFromSelectors = async (userId) => {
    const combos = generateParamCombos();
    if (!combos.length) return { results: [], best: null };
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
