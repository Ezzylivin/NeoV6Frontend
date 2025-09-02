// File: src/hooks/useBacktest.js
import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import axios from "axios";

export function useBacktest() {
  const { user } = useAuth();
  const userId = user?._id;

  const [results, setResults] = useState([]);
  const [best, setBest] = useState(null);
  const [options, setOptions] = useState({
    symbols: ["BTCUSDT","ETHUSDT","BNBUSDT","SOLUSDT"],
    timeframes: ["1m","5m","15m","30m","1h","4h","1d"],
    balances: [100,300,500,1000,5000,10000],
    strategies: ["SMA","EMA","RSI","MACD"],
    risks: ["Low","Medium","High"]
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [historyChart, setHistoryChart] = useState([]);

  const API_URL = import.meta.env.VITE_API_URL || "https://neov6backend.onrender.com/api";

  // Fetch dropdown options dynamically
  const fetchOptions = async () => {
    if (!userId) return;
    try {
      const { data } = await axios.get(`${API_URL}/backtests/options`);
      if (data.success) setOptions(data.options);
    } catch (err) {
      console.warn("Failed to fetch options, using defaults", err);
    }
  };

  // Fetch saved backtests for current user
  const fetchBacktests = async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const { data } = await axios.get(`${API_URL}/backtests/user/${userId}`);
      if (data.success) {
        setResults(data.backtests || []);
      } else {
        setResults([]);
        setError("No backtests found");
      }
    } catch (err) {
      console.error("Fetch backtests error:", err);
      setError(err.response?.data?.message || "Failed to fetch backtests");
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  // Load history chart data for user
  const loadHistoryChart = async () => {
    if (!userId) return;
    try {
      const res = await axios.get(`${API_URL}/backtests/user/${userId}`);
      const data = (res.data.backtests || []).map(bt => ({
        time: new Date(bt.createdAt).toLocaleString(),
        initialBalance: bt.initialBalance,
        finalBalance: bt.finalBalance ?? (bt.initialBalance + (bt.results?.profit ?? 0)),
        profit: bt.results?.profit ?? 0,
      }));
      setHistoryChart(data);
    } catch (e) {
      console.error("Load history chart error:", e);
      setHistoryChart([]);
    }
  };

  // Run a single backtest
  const runBacktest = async (form) => {
    if (!userId) {
      setError("User not logged in");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data } = await axios.post(`${API_URL}/backtests/run`, {
        userId,
        ...form
      });
      if (data.success && data.backtest) {
        setResults(prev => [data.backtest, ...prev]);
        loadHistoryChart(); // update chart automatically
      } else {
        setError("Backtest run failed");
      }
    } catch (err) {
      console.error("Run backtest error:", err);
      setError(err.response?.data?.message || "Failed to run backtest");
    } finally {
      setLoading(false);
    }
  };

  // Automatically fetch options and backtests when user logs in
  useEffect(() => {
    if (userId) {
      fetchOptions();
      fetchBacktests();
      loadHistoryChart();
    }
  }, [userId]);

  return {
    results,
    best,
    options,
    loading,
    error,
    historyChart,
    fetchOptions,
    fetchBacktests,
    loadHistoryChart,
    runBacktest
  };
}
