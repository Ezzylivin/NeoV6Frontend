// File: src/hooks/useBot.js
import { useState, useEffect } from "react";
import apiClient from "../api/apiClient.js";

export function useBot(defaultSymbol = "", defaultAmount = 0) {
  const [symbol, setSymbol] = useState(defaultSymbol);
  const [amount, setAmount] = useState(defaultAmount);
  const [status, setStatus] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Start bot
  const startBot = async (timeframes = ["5m"]) => {
    if (!symbol || !amount) {
      setError("Symbol and amount are required to start the bot.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const { data } = await apiClient.post("/bots/start", { symbol, amount, timeframes });
      setStatus({ isRunning: true, symbol, amount, timeframes });
      setLogs(prev => [...prev, `Bot started for ${symbol} with $${amount}`]);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to start bot");
      setLogs(prev => [...prev, `Failed to start bot: ${err.message}`]);
    } finally {
      setLoading(false);
    }
  };

  // Stop bot
  const stopBot = async () => {
    setLoading(true);
    setError("");

    try {
      await apiClient.post("/bots/stop", { symbol });
      setStatus({ isRunning: false, symbol: null, amount: 0, timeframes: [] });
      setLogs(prev => [...prev, `Bot stopped.`]);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to stop bot");
      setLogs(prev => [...prev, `Failed to stop bot: ${err.message}`]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch bot status
  const fetchStatus = async () => {
    setLoading(true);
    setError("");

    try {
      const { data } = await apiClient.get("/bots/status");
      setStatus(data.status);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to fetch bot status");
    } finally {
      setLoading(false);
    }
  };

  // Auto fetch on mount
  useEffect(() => {
    fetchStatus();
  }, []);

  return {
    symbol,
    setSymbol,
    amount,
    setAmount,
    status,
    logs,
    loading,
    error,
    startBot,
    stopBot,
    fetchStatus,
  };
}
