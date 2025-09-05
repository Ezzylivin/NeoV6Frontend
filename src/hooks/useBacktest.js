import { useState } from "react";
import axios from "axios";

export function useBacktest() {
  const [options, setOptions] = useState({
    symbols: ["BTCUSDT", "ETHUSDT", "BNBUSDT"],
    timeframes: ["1m","5m","15m","30m","1h","4h","1d"],
    strategies: ["SMA","EMA","RSI","MACD","BollingerBands","Stochastic","VWAP","ATR"],
    risks: ["Low","Medium","High"],
    balances: [100,500,1000,5000],
    takeProfits: [1,2,5],
    stopLosses: [1,2,5]
  });

  const normalizeStrategy = (name) => name.toUpperCase().replace(/\s+/g,"");

  const runSingleBacktest = async (payload) => {
    payload.strategy.name = normalizeStrategy(payload.strategy.name);
    const res = await axios.post("/api/backtests/single", payload);
    return res.data;
  };

  const runRealisticBacktest = async (payload) => {
    payload.strategy.name = normalizeStrategy(payload.strategy.name);
    const res = await axios.post("/api/backtests/realistic", payload);
    return res.data;
  };

  const runBatchBacktests = async ({ userId, combos }) => {
    const normalizedCombos = combos.map(c => ({
      ...c,
      strategy: { name: normalizeStrategy(c.strategy.name), parameters: c.strategy.parameters || {} }
    }));
    const res = await axios.post("/api/backtests/batch", { userId, combos: normalizedCombos });
    return res.data;
  };

  const fetchUserBacktests = async (userId) => {
    const res = await axios.get(`/api/backtests/user/${userId}`);
    return res.data;
  };

  return { options, setOptions, runSingleBacktest, runRealisticBacktest, runBatchBacktests, fetchUserBacktests };
}
