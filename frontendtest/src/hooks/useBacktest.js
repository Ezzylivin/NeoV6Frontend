import { useState } from "react";

const API = import.meta.env.VITE_API_URL || "https://neov6backend.onrender.com/api";

export function useBacktest() {
  const [results, setResults] = useState([]);

  // ✅ Fetch all backtests for this user
  const fetchBacktests = async (userId) => {
    if (!userId) return;
    try {
      const res = await fetch(`${API}/backtests?userId=${userId}`);
      const data = await res.json();
      if (data.success !== false) {
        setResults(data);
      }
    } catch (err) {
      console.error("Error fetching backtests:", err);
    }
  };

  // ✅ Run a new backtest
  const runBacktests = async ({ userId, symbol, timeframe, initialBalance, strategy, risk }) => {
    try {
      const res = await fetch(`${API}/backtests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          symbol,
          timeframe,
          initialBalance,
          strategy,
          risk,
        }),
      });
      const data = await res.json();
      if (data.success !== false) {
        setResults((prev) => [...prev, data]);
      }
    } catch (err) {
      console.error("Error running backtest:", err);
    }
  };

  return { results, fetchBacktests, runBacktests };
}
