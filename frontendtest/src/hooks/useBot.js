import { useState } from "react";
import apiClient from "../api/apiClient";
import { useAuth } from "../context/AuthContext.jsx";

export function useBot() {
  const { user } = useAuth();
  const userId = user?.id;

  const [status, setStatus] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Start bot
  const handleStart = async ({ symbol, timeframes = ['5m'], initialBalance = 10000 }) => {
    if (!userId) {
      setError("User ID is required to start bot.");
      return;
    }

    if (!symbol || !initialBalance) {
      setError("Symbol and initial balance are required.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data } = await apiClient.post("/bots/start", {
        userId,
        symbol,
        amount: initialBalance,
        timeframes,
      });

      setStatus("Running");
      setLogs(prev => [...prev, `Bot started: ${symbol}, Balance: $${initialBalance}`]);
      return { success: true, data };
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || "Failed to start bot");
      return { success: false };
    } finally {
      setLoading(false);
    }
  };

  // Stop bot
  const handleStop = async () => {
    if (!userId) {
      setError("User ID is required to stop bot.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await apiClient.post("/bots/stop", { userId });
      setStatus("Stopped");
      setLogs(prev => [...prev, "Bot stopped"]);
      return { success: true };
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || "Failed to stop bot");
      return { success: false };
    } finally {
      setLoading(false);
    }
  };

  // Get bot status
  const handleStatus = async () => {
    if (!userId) {
      setError("User ID is required to get status.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data } = await apiClient.get(`/bots/status?userId=${userId}`);
      setStatus(data?.status?.isRunning ? "Running" : "Stopped");
      setLogs(prev => [...prev, `Bot status checked: ${data?.status?.isRunning ? "Running" : "Stopped"}`]);
      return { success: true, data };
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || "Failed to fetch bot status");
      return { success: false };
    } finally {
      setLoading(false);
    }
  };

  return {
    status,
    logs,
    loading,
    error,
    handleStart,
    handleStop,
    handleStatus,
  };
}
