// src/hooks/useBacktestResults.js
import { useState, useEffect } from "react";
import apiClient from "../api/apiClient";

export function useBacktestResults() {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchResults = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data } = await apiClient.get("/backtest/results");
      setResults(data);
      return { success: true, data };
    } catch (err) {
      setError(err.response?.data?.message || "Failed to fetch results");
      return { success: false };
    } finally {
      setLoading(false);
    }
  };

  // Auto-fetch on mount
  useEffect(() => {
    fetchResults();
  }, []);

  return { results, loading, error, fetchResults };
}
