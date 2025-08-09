// src/hooks/useRunBacktest.js
import { useState } from "react";
import apiClient from "../api/apiClient";

export function useRunBacktest() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const runBacktest = async (params) => {
    setLoading(true);
    setError(null);

    try {
      const { data } = await apiClient.post("/backtest/run", params);
      return { success: true, data };
    } catch (err) {
      setError(err.response?.data?.message || "Failed to run backtest");
      return { success: false };
    } finally {
      setLoading(false);
    }
  };

  return { runBacktest, loading, error };
}
