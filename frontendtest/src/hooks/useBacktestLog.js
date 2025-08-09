// src/hooks/useBacktestLogs.js
import { useState } from "react";
import apiClient from "../api/apiClient";

export function useBacktestLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchLogs = async (backtestId) => {
    setLoading(true);
    setError(null);

    try {
      const { data } = await apiClient.get(`/logs/backtest/${backtestId}`);
      setLogs(data);
      return { success: true, data };
    } catch (err) {
      setError(err.response?.data?.message || "Failed to fetch logs");
      return { success: false };
    } finally {
      setLoading(false);
    }
  };

  return { logs, loading, error, fetchLogs };
}
