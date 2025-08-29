// File: src/hooks/useBacktest.js
import { useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";

export function useBacktest() {
  const { user } = useAuth();
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Run new backtests
  const runBacktests = async (timeframe, initialBalance) => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/backtests/run`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: user.id, timeframe, initialBalance }),
        }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to run backtests");

      // Backend returns { message, backtests }
      setResults(Array.isArray(data.backtests) ? data.backtests : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch saved backtests
  const fetchBacktests = async (timeframe = null) => {
    try {
      setLoading(true);
      setError(null);

      const url = new URL(`${import.meta.env.VITE_API_URL}/backtests`);
      url.searchParams.set("userId", user.id);
      if (timeframe) url.searchParams.set("timeframe", timeframe);

      const res = await fetch(url.toString());
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to fetch backtests");

      // Ensure results is an array
      setResults(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  return { results, loading, error, runBacktests, fetchBacktests };
}
