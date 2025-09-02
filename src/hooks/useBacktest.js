// File: src/hooks/useBacktest.js
import { useState, useEffect } from "react";
import axios from "axios";
import { useAuth } from "../context/AuthContext.jsx";

const API_BASE = `${import.meta.env.VITE_API_URL}/backtests`;

export function useBacktest() {
  const { user, token } = useAuth();
  const [options, setOptions] = useState({});
  const [results, setResults] = useState([]);
  const [best, setBest] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const authConfig = {
    headers: {
      Authorization: token ? `Bearer ${token}` : undefined,
    },
  };

  // Fetch available backtest options
  const fetchOptions = async () => {
    if (!user?._id) return;
    try {
      const res = await axios.get(`${API_BASE}/options`, authConfig);
      if (res.data?.success) {
        setOptions(res.data.options);
      } else {
        // fallback defaults
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
    } catch (err) {
      console.warn("Failed to fetch options", err);
    }
  };

  // Fetch user's backtests
  const fetchBacktests = async () => {
    if (!user?._id) return;
    try {
      const res = await axios.get(`${API_BASE}/user/${user._id}`, authConfig);

      // Handle 404 gracefully (no backtests yet)
      if (res.status === 404 || !res.data?.success) {
        setResults([]);
        return;
      }

      setResults(res.data.backtests || []);
    } catch (err) {
      if (err.response?.status === 404) {
        setResults([]); // no backtests yet
      } else {
        console.error("Failed to fetch user backtests", err);
        setError(err.message);
      }
    }
  };

  const runBacktest = async (params) => {
    if (!user?._id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await axios.post(`${API_BASE}/run`, { userId: user._id, ...params }, authConfig);
      if (res.data?.success && res.data.backtests?.length) {
        setResults((prev) => [res.data.backtests[0], ...prev]);
      } else {
        setError(res.data?.message || "Backtest failed");
      }
    } catch (err) {
      console.error("Run backtest failed", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const runBatchBacktests = async (paramCombos, exchange = "coinbasepro") => {
    if (!user?._id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await axios.post(`${API_BASE}/batch`, { userId: user._id, paramCombos, exchange }, authConfig);
      if (res.data?.success) {
        setResults((prev) => [...res.data.results.map((r) => r.saved), ...prev]);
        setBest(res.data.best || null);
      } else {
        setError(res.data?.message || "Batch backtests failed");
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
  }, [user?._id]);

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
