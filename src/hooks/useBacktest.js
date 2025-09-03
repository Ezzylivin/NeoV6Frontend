// File: src/hooks/useBacktest.js
import { useState, useEffect } from "react";
import axios from "axios";
import { useAuth } from "../context/AuthContext.jsx";

const API_URL = import.meta.env.VITE_API_URL || "https://neov6backend.onrender.com/api";

const fallbackOptions = {
  symbols: ["BTCUSDT", "ETHUSDT", "BNBUSDT", "SOLUSDT"],
  timeframes: ["1m", "5m", "15m", "1h", "4h", "1d"],
  balances: [100, 300, 500, 1000, 5000],
  strategies: ["SMA", "EMA", "RSI", "MACD"],
  risks: ["Low", "Medium", "High"],
  stopLosses: [0.5, 1, 2, 3, 5],
  takeProfits: [1, 2, 3, 5, 10],
};

export function useBacktest() {
  const { user, token } = useAuth();
  const [options, setOptions] = useState(fallbackOptions);
  const [results, setResults] = useState([]);
  const [best, setBest] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const authConfig = {
    headers: { Authorization: `Bearer ${token}` },
  };

  // Fetch options
  const fetchOptions = async () => {
    if (!user?.token) return;
    try {
      const { data } = await axios.get(`${API_URL}/backtests/options`, authConfig);
      if (data.success && data.options) setOptions(data.options);
      else setOptions(fallbackOptions);
    } catch (err) {
      console.warn("Failed to fetch options, using fallback", err);
      setOptions(fallbackOptions);
    }
  };

  // Fetch user backtests
  const fetchBacktests = async () => {
    if (!user?._id) return;
    setLoading(true);
    try {
      const { data } = await axios.get(`${API_URL}/backtests/recent/${user._id}`, authConfig);
      setResults(data.backtests || []);
    } catch (err) {
      console.error("Failed to fetch user backtests", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Run single backtest
  const runBacktest = async (params) => {
    if (!user?._id) return;
    setLoading(true);
    try {
      const { data } = await axios.post(`${API_URL}/backtests/run`, { userId: user._id, ...params }, authConfig);
      if (data.success) {
        setResults((prev) => [data.backtests?.[0], ...prev]);
        fetchBacktests();
      }
    } catch (err) {
      console.error("Run backtest failed", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Run batch backtests
  const runBatchBacktests = async (paramCombos) => {
    if (!user?._id || !paramCombos?.length) return;
    setLoading(true);
    try {
      const { data } = await axios.post(`${API_URL}/backtests/batch`, { userId: user._id, paramCombos }, authConfig);
      if (data.success) {
        setResults((prev) => [...(data.results?.map(r => r.saved) || []), ...prev]);
        setBest(data.best || null);
        fetchBacktests();
      }
    } catch (err) {
      console.error("Run batch backtests failed", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
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
