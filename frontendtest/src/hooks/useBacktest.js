import { useState } from "react";
import apiClient from "../api/apiClient.js";
import { useAuth } from "../context/AuthContext.jsx";

const TIMEFRAMES = ['1m', '5m', '15m', '30m', '1h', '2h', '4h', '1d', '1w'];
const SYMBOLS = ['BTC/USDT','ETH/USDT','BNB/USDT','XRP/USDT'];
const BALANCES = [1000, 5000, 10000, 50000];

export const useBacktest = () => {
  const { user } = useAuth();
  const [results, setResults] = useState([]);
  const [symbol, setSymbol] = useState(SYMBOLS[0]);
  const [timeframe, setTimeframe] = useState(TIMEFRAMES[0]);
  const [initialBalance, setInitialBalance] = useState(BALANCES[2]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const executeBacktest = async () => {
    if (!user) return setError("User must be logged in.");
    setLoading(true);
    setError("");

    try {
      const { data } = await apiClient.post("/backtests/run", {
        userId: user._id,
        symbol,
        timeframes: [timeframe],
        initialBalance
      });

      setResults(data.backtests);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || "Failed to run backtests");
    } finally {
      setLoading(false);
    }
  };

  return {
    results,
    symbol,
    setSymbol,
    timeframe,
    setTimeframe,
    initialBalance,
    setInitialBalance,
    SYMBOLS,
    TIMEFRAMES,
    BALANCES,
    executeBacktest,
    loading,
    error
  };
};
