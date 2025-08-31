// File: src/hooks/useBacktest.js
import { useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import axios from "axios";

export function useBacktest() {
  const { user } = useAuth();
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [options, setOptions] = useState({
    symbols: ["BTCUSDT","ETHUSDT","BNBUSDT","SOLUSDT"],
    timeframes: ["1m","5m","15m","30m","1h","4h","1d"],
    balances: [100,300,500,1000,5000,10000],
    strategies: ["SMA","EMA","RSI","MACD"],
    risks: ["Low","Medium","High"]
  });

  const API_URL = import.meta.env.VITE_API_URL || "https://neov6backend.onrender.com/api";

  // Fetch dropdown options dynamically
  const fetchOptions = async () => {
    if (!user?._id) return;
    try {
      const { data } = await axios.get(`${API_URL}/backtests/options`);
      if (data.success) setOptions(data.options);
    } catch(err) {
      console.warn("Failed to fetch options, using fallback", err);
    }
  };

  // Fetch saved backtests for the current user
  const fetchBacktests = async () => {
    if (!user?._id) return;
    setLoading(true);
    try {
      const { data } = await axios.get(`${API_URL}/backtests?userId=${user._id}`);
      if (data.success) setResults(data.backtests || []);
    } catch(err) {
      console.error(err);
      setError("Failed to fetch backtests");
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  // Run a new backtest
  const runBacktest = async (form) => {
    if (!user?._id) {
      setError("User not logged in");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data } = await axios.post(`${API_URL}/backtests/run`, {
        userId: user._id,
        ...form
      });

      if (data.success && data.backtests?.length) {
        // Prepend the new backtest to results
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

  return {
    results,
    options,
    loading,
    error,
    fetchOptions,
    fetchBacktests,
    runBacktest
  };
}
