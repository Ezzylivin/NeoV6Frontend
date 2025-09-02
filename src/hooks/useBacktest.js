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

  const authConfig = { headers: { Authorization: `Bearer ${token}` } };

  // ----------------- Helper: validate batch combos -----------------
  const validateCombos = (combos) => {
    const errors = [];
    const validCombos = combos.filter((c, i) => {
      if (!c.symbol) errors.push(`Combo #${i + 1} missing symbol`);
      if (!c.strategy?.name) errors.push(`Combo #${i + 1} missing strategy`);
      if (!c.timeframe) errors.push(`Combo #${i + 1} missing timeframe`);
      if (c.initialBalance == null || isNaN(c.initialBalance))
        errors.push(`Combo #${i + 1} invalid initialBalance`);
      if (c.stopLoss == null || isNaN(c.stopLoss))
        errors.push(`Combo #${i + 1} invalid stopLoss`);
      if (c.takeProfit == null || isNaN(c.takeProfit))
        errors.push(`Combo #${i + 1} invalid takeProfit`);
      return !errors.length;
    });

    return { validCombos, errors };
  };

  // ----------------- Fetch backtest options -----------------
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

  // ----------------- Fetch user backtests -----------------
  const fetchBacktests = async () => {
    if (!user?._id) return;
    try {
      const { data } = await axios.get(`${API_BASE}/user/${user._id}`, authConfig);
      if (data.success) setResults(data.backtests);
    } catch (err) {
      console.error("Failed to fetch user backtests", err);
    }
  };

  // ----------------- Run single backtest -----------------
  const runBacktest = async (params) => {
    setLoading(true);
    setError(null);

    try {
      const normalized = {
        ...params,
        initialBalance: Number(params.initialBalance),
        stopLoss: Number(params.stopLoss),
        takeProfit: Number(params.takeProfit),
        strategy:
          params.strategy?.name
            ? { name: params.strategy.name, parameters: params.strategy.parameters || {} }
            : { name: params.strategy || "SMA", parameters: {} },
        timeframe: params.timeframe || "1h",
      };

      const { data } = await axios.post(
        `${API_BASE}/run`,
        { userId: user._id, ...normalized },
        authConfig
      );

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

  // ----------------- Run batch backtests -----------------
  const runBatchBacktests = async (paramCombos, exchange = "coinbasepro") => {
    setLoading(true);
    setError(null);

    try {
      // Normalize each combo
      const normalizedCombos = paramCombos.map((p) => ({
        ...p,
        initialBalance: Number(p.initialBalance),
        stopLoss: Number(p.stopLoss),
        takeProfit: Number(p.takeProfit),
        strategy:
          p.strategy?.name
            ? { name: p.strategy.name, parameters: p.strategy.parameters || {} }
            : { name: p.strategy || "SMA", parameters: {} },
        timeframe: p.timeframe || "1h",
      }));

      // Validate combos
      const { validCombos, errors } = validateCombos(normalizedCombos);
      if (errors.length) {
        setError("Validation failed: " + errors.join("; "));
        setLoading(false);
        return;
      }

      const { data } = await axios.post(
        `${API_BASE}/batch`,
        { userId: user._id, paramCombos: validCombos, exchange },
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
