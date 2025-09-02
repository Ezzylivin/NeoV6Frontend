// File: src/hooks/useBacktest.js
import { useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import axios from "axios";

export function useBacktest() {
  const { user } = useAuth();
  const userId = user?._id;

  const [results, setResults] = useState([]);
  const [best, setBest] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [options, setOptions] = useState({
    symbols: ["BTCUSDT","ETHUSDT","BNBUSDT","SOLUSDT"],
    timeframes: ["1m","5m","15m","30m","1h","4h","1d"],
    balances: [100,300,500,1000,5000,10000],
    strategies: ["SMA","EMA","RSI","MACD"],
    risks: ["Low","Medium","High"],
    stopLosses: [0.5, 1, 2, 3, 5],
    takeProfits: [1, 2, 3, 5, 10],
  });

  const API_URL = import.meta.env.VITE_API_URL || "https://neov6backend.onrender.com/api";

  const fetchOptions = async () => {
    if (!userId) return;
    try {
      const { data } = await axios.get(`${API_URL}/backtests/options`);
      if (data.success) setOptions(data.options);
    } catch(err) {
      console.warn("Failed to fetch options, using fallback", err);
    }
  };

  const fetchBacktests = async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const { data } = await axios.get(`${API_URL}/backtests/user/${userId}`);
      if (data.success) setResults(data.backtests || []);
    } catch(err) {
      console.error(err);
      setError(err.response?.data?.message || "Failed to fetch backtests");
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const runBacktest = async (form) => {
    if (!userId) {
      setError("User not logged in");
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const { data } = await axios.post(`${API_URL}/backtests/run`, { userId, ...form });
      if (data.success && data.backtests?.length) {
        setResults(prev => [data.backtests[0], ...prev]);
      } else {
        setError("Backtest run failed");
      }
    } catch(err) {
      console.error(err);
      setError(err.response?.data?.message || "Failed to run backtest");
    } finally {
      setLoading(false);
    }
  };

  const runBatchBacktests = async (paramCombos, exchange) => {
    if (!userId || !Array.isArray(paramCombos) || paramCombos.length === 0) return;
    setLoading(true);
    setError(null);

    try {
      const { data } = await axios.post(`${API_URL}/backtests/batch`, { userId, paramCombos, exchange });
      if (data.success) {
        const allBacktests = data.results.map(r => r.saved);
        setResults(prev => [...allBacktests, ...prev]);
        setBest(data.best);
      } else {
        setError("Batch backtests failed");
      }
    } catch(err) {
      console.error(err);
      setError(err.response?.data?.message || "Failed to run batch backtests");
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
