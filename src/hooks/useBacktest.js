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

  const fetchOptions = async () => {
    try {
      const resp = await axios.get(`${import.meta.env.VITE_API_URL}/backtests/options`);
      if(resp?.data?.success && resp.data.options){
        setOptions(prev=>({...prev,...resp.data.options}));
      }
      return resp.data;
    } catch(err){
      console.error("[Fetch Options Error]", err);
      throw err;
    }
  };

  const runBacktest = async ({ userId, ...params }) => {
    try {
      const payload = {
        userId,
        symbol: params.symbol || "BTCUSDT",
        timeframe: params.timeframe || "1h",
        initialBalance: Number(params.initialBalance) || 1000,
        strategy: params.strategy || { name: "SMA", parameters:{} },
        risk: params.risk || "Medium",
        takeProfit: params.takeProfit ?? null,
        stopLoss: params.stopLoss ?? null
      };
      console.log("[Run Backtest Payload]", payload);

      const resp = await axios.post(`${import.meta.env.VITE_API_URL}/backtests/run`, payload);
      return resp.data;
    } catch(err){
      console.error("[Run Backtest Error]", err);
      throw err;
    }
  };

  const runBatchBacktests = async (userId, combos) => {
    try {
      const resp = await axios.post(`${import.meta.env.VITE_API_URL}/backtests/batch`, { userId, paramCombos: combos });
      return resp.data;
    } catch(err){
      console.error("[Run Batch Backtests Error]", err);
      throw err;
    }
  };

  const generateParamCombos = () => {
    const combos = [];
    for(const symbol of options.symbols){
      for(const timeframe of options.timeframes){
        for(const strategy of options.strategies){
          for(const risk of options.risks){
            for(const takeProfit of options.takeProfits){
              for(const stopLoss of options.stopLosses){
                combos.push({ symbol, timeframe, strategy:{name:strategy,parameters:{}}, risk, takeProfit, stopLoss });
              }
            }
          }
        }
      }
    }
    return combos;
  };

  const runBatchFromSelectors = async (userId) => {
    const combos = generateParamCombos();
    if(!combos.length) return { results: [], best: null };
    return await runBatchBacktests(userId, combos);
  };

  return { options, setOptions, fetchOptions, runBacktest, runBatchBacktests, generateParamCombos, runBatchFromSelectors };
}
