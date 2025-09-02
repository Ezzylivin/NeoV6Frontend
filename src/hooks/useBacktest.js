// File: src/hooks/useBacktest.js
import { useState, useEffect } from "react";
import axios from "axios";
import { useAuth } from "../context/AuthContext.jsx";

const API_BASE = "https://neov6backend.onrender.com/api/backtests";

export function useBacktest() {
  const { user, token } = useAuth();
  const [options, setOptions] = useState({
    symbols: [],
    timeframes: [],
    balances: [],
    strategies: [],
    risks: [],
    stopLosses: [],
    takeProfits: [],
  });
  const [results, setResults] = useState([]);
  const [best, setBest] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Axios config with token
  const authConfig = {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };

  // Fetch backtest options
  const fetchOptions = async () => {
    if (!user?.token) return;
    try {
      const { data } = await axios.get(`${API_BASE}/options`, authConfig);
      if (data.success && data.options) {
        setOptions({
          symbols: data.options.symbols || [],
          timeframes: data.options.timeframes || [],
          balances: data.options.balances || [],
          strategies: data.options.strategies || [],
          risks: data.options.risks || [],
          stopLosses: data.options.stopLosses || [],
          takeProfits: data.options.takeProfits || [],
        });
      }
    } catch (err) {
      console.warn("Failed to fetch options, using fallback", err);
      setOptions({
        symbols: ["BTCUSDT", "ETHUSDT", "BNBUSDT", "SOLUSDT"],
        timeframes: ["1m", "5m", "15m", "1h", "4h", "1d"],
        balances: [100, 300, 500, 1000, 5000, 10000],
        strategies: ["SMA", "EMA", "RSI", "MACD"],
        risks: ["Low", "Medium", "High"],
        stopLosses: [0.5, 1, 2, 3, 5],
        takeProfits: [1, 2, 3, 5, 10],
      });
    }
  };

  // Fetch user backtests
  const fetchBacktests = async () => {
    if (!user?._id) return;
    try {
      const { data } = await axios.get(`${API_BASE}/recent/${user._id}`, authConfig);
      if (data.success) setResults(data.backtests || []);
    } catch (err) {
      console.error("Failed to fetch user backtests", err);
      setError(err.message);
    }
  };

  // Run a single backtest
  const runBacktest = async (params) => {
    setLoading(true);
    try {
      const { data } = await axios.post(`${API_BASE}/run`, { userId: user._id, ...params }, authConfig);
      if (data.success) {
        setResults((prev) => [data.backtests?.[0], ...prev].filter(Boolean));
      }
    } catch (err) {
      console.error("Run backtest failed", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Run batch backtests (loops over runBacktest)
  const runBatchBacktests = async (paramCombos) => {
    if (!Array.isArray(paramCombos) || !paramCombos.length) return;
    setLoading(true);
    const batchResults = [];
    let bestResult = null;

    for (const params of paramCombos) {
      try {
        const { data } = await axios.post(`${API_BASE}/run`, { userId: user._id, ...params }, authConfig);
        if (data.success && data.backtests?.[0]) {
          const bt = data.backtests[0];
          batchResults.push(bt);
          if (!bestResult || (bt.results?.profit ?? 0) > (bestResult.results?.profit ?? -Infinity)) {
            bestResult = bt;
          }
        }
      } catch (err) {
        console.error("One batch backtest failed", err);
      }
    }

    setResults((prev) => [...batchResults, ...prev].filter(Boolean));
    setBest(bestResult);
    setLoading(false);
  };

  useEffect(() => {
    if (user?._id) {
      fetchOptions();
      fetchBacktests();
    }
  }, [user?.token]);

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
