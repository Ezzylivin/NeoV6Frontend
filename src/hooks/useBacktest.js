// File: src/hooks/useBacktest.js
import { useState } from "react";
import axios from "axios";

export function useBacktest() {
  const API_URL = import.meta.env.VITE_API_URL || "https://neov6backend.onrender.com/api";

  const [results, setResults] = useState([]);
  const [best, setBest] = useState(null);
  const [options, setOptions] = useState({
    symbols: ["BTCUSDT", "ETHUSDT", "BNBUSDT", "SOLUSDT"],
    timeframes: ["1m", "5m", "15m", "1h", "4h", "1d"],
    balances: [100, 300, 500, 1000, 5000, 10000],
    strategies: ["SMA", "EMA", "RSI", "MACD"],
    risks: ["Low", "Medium", "High"],
    stopLosses: [0.5, 1, 2, 3, 5],
    takeProfits: [1, 2, 3, 5, 10],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch backtest options from backend
  const fetchOptions = async () => {
    try {
      const res = await axios.get(`${API_URL}/backtests/options`);
      if (res.data?.success && res.data?.options) {
        setOptions(res.data.options);
      }
      return res.data;
    } catch (err) {
      console.error("[Fetch Options Error]", err);
      return null;
    }
  };

  // Fetch backtests for a user
  const fetchBacktests = async (userId) => {
    if (!userId) return;
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/backtests`, { params: { userId } });
      if (res.data?.success && Array.isArray(res.data.backtests)) {
        setResults(res.data.backtests);
        setBest(res.data.backtests[0] || null);
      } else {
        setResults([]);
        setBest(null);
      }
      return res.data;
    } catch (err) {
      console.error("[Fetch Backtests Error]", err);
      setResults([]);
      setBest(null);
      setError(err);
      return { success: false, error: err };
    } finally {
      setLoading(false);
    }
  };

  // Run single backtest
  const runBacktest = async ({ userId, symbol, timeframe = "1h", initialBalance = 1000, strategy = { name: "SMA", parameters: {} }, risk = "Medium" }) => {
    if (!userId || !symbol) {
      console.error("Missing userId or symbol for backtest");
      return { success: false, error: "Missing userId or symbol" };
    }
    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}/backtests/run`, {
        userId,
        symbol,
        timeframe,
        initialBalance,
        strategy,
        risk,
      });
      return res.data;
    } catch (err) {
      console.error("[Run Backtest Error]", err);
      setError(err);
      return { success: false, error: err };
    } finally {
      setLoading(false);
    }
  };

  // Run batch backtests
  const runBatchBacktests = async (userId, paramCombos) => {
    if (!userId || !Array.isArray(paramCombos) || paramCombos.length === 0) {
      console.error("Missing userId or paramCombos for batch backtests");
      return { success: false, error: "Missing userId or paramCombos" };
    }
    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}/backtests/batch`, { userId, paramCombos });
      return res.data;
    } catch (err) {
      console.error("[Run Batch Backtests Error]", err);
      setError(err);
      return { success: false, error: err };
    } finally {
      setLoading(false);
    }
  };

  return {
    results,
    best,
    options,
    loading,
    error,
    fetchOptions,
    fetchBacktests,
    runBacktest,
    runBatchBacktests,
  };
}
