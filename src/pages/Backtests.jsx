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

  const authConfig = {
    headers: { Authorization: `Bearer ${token}` },
  };

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

  const fetchBacktests = async () => {
    if (!user?._id) return;
    try {
      const { data } = await axios.get(`${API_BASE}/user/${user._id}`, authConfig);
      if (data.success) setResults(data.backtests);
    } catch (err) {
      console.error("Failed to fetch user backtests", err);
    }
  };

  const runBacktest = async (params) => {
    if (!user?._id) return setError("User not authenticated");
    setLoading(true);
    setError(null);
    try {
      // normalize strategy object
      if (typeof params.strategy === "string") params.strategy = { name: params.strategy, parameters: {} };
      if (!params.strategy.parameters) params.strategy.parameters = {};

      const { data } = await axios.post(
        `${API_BASE}/run`,
        { userId: user._id, ...params },
        authConfig
      );
      if (data.success) setResults((prev) => [data.backtests[0], ...prev]);
    } catch (err) {
      console.error("Run backtest failed", err);
      setError(err?.response?.data?.message || err.message || "Server Error");
    } finally {
      setLoading(false);
    }
  };

  const runBatchBacktests = async (paramCombos, exchange = "coinbasepro") => {
    if (!user?._id) return setError("User not authenticated");
    setLoading(true);
    setError(null);
    try {
      // normalize each combo
      const normalized = paramCombos.map((p) => {
        if (typeof p.strategy === "string") p.strategy = { name: p.strategy, parameters: {} };
        if (!p.strategy.parameters) p.strategy.parameters = {};
        return { ...p, initialBalance: Number(p.initialBalance), stopLoss: Number(p.stopLoss), takeProfit: Number(p.takeProfit) };
      });

      const { data } = await axios.post(
        `${API_BASE}/batch`,
        { userId: user._id, paramCombos: normalized, exchange },
        authConfig
      );
      if (data.success) {
        setResults((prev) => [...data.results.map((r) => r.saved), ...prev]);
        setBest(data.best);
      }
    } catch (err) {
      console.error("Run batch backtests failed", err);
      setError(err?.response?.data?.message || err.message || "Server Error");
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

  return { results, best, options, loading, error, fetchOptions, fetchBacktests, runBacktest, runBatchBacktests };
}
