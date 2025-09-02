import { useState, useEffect } from "react";
import axios from "axios";
import { useAuth } from "../context/AuthContext.jsx";

const API_BASE = "https://neov6backend.onrender.com/api/backtests";

export function useBacktest() {
  const { user, token } = useAuth();
  const [options, setOptions] = useState({});
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
    if (!token) return;
    try {
      const { data } = await axios.get(`${API_BASE}/options`, authConfig);
      if (data.success) setOptions(data.options);
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
      const { data } = await axios.get(`${API_BASE}/user/${user._id}`, authConfig);
      if (data.success) setResults(data.backtests);
    } catch (err) {
      console.error("Failed to fetch user backtests", err);
    }
  };

  // Run a single backtest
  const runBacktest = async (params) => {
    setLoading(true);
    try {
      const { data } = await axios.post(`${API_BASE}/run`, { userId: user._id, ...params }, authConfig);
      if (data.success) {
        setResults((prev) => [data.backtests[0], ...prev]);
      }
    } catch (err) {
      console.error("Run backtest failed", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Run batch backtests
  const runBatchBacktests = async (paramCombos, exchange = "coinbasepro") => {
    setLoading(true);
    try {
      const { data } = await axios.post(
        `${API_BASE}/batch`,
        { userId: user._id, paramCombos, exchange },
        authConfig
      );
      if (data.success) {
        setResults((prev) => [...data.results.map((r) => r.saved), ...prev]);
        setBest(data.best);
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
