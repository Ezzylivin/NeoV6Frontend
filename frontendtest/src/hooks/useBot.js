import { useState, useCallback } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import apiClient from "../api/apiClient.js";

export function useBot() {
  const { user } = useAuth();
  const [symbol, setSymbol] = useState("");
  const [amount, setAmount] = useState(0);
  const [status, setStatus] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Helper: make sure userId exists
  const getUserId = () => user?.id;

  const startBot = useCallback(async () => {
    const userId = getUserId();
    if (!userId) return setError("User ID is required to start bot.");

    if (!symbol || !amount) return setError("Symbol and amount are required.");

    setLoading(true);
    setError("");

    try {
      const { data } = await apiClient.post("/bots/start", {
        userId,
        symbol,
        amount,
      });
      setStatus({ ...data });
      setLogs(prev => [...prev, `Bot started for ${symbol}`]);
    } catch (err) {
      setError(err.response?.data?.error || err.message || "Failed to start bot");
    } finally {
      setLoading(false);
    }
  }, [symbol, amount, user]);

  const stopBot = useCallback(async () => {
    const userId = getUserId();
    if (!userId) return setError("User ID is required to stop bot.");

    setLoading(true);
    setError("");

    try {
      const { data } = await apiClient.post("/bots/stop", { userId });
      setStatus(null);
      setLogs(prev => [...prev, "Bot stopped."]);
    } catch (err) {
      setError(err.response?.data?.error || err.message || "Failed to stop bot");
    } finally {
      setLoading(false);
    }
  }, [user]);

  const getStatus = useCallback(async () => {
    const userId = getUserId();
    if (!userId) return setError("User ID is required to get bot status.");

    setLoading(true);
    setError("");

    try {
      const { data } = await apiClient.get(`/bots/status?userId=${userId}`);
      setStatus(data.status || null);
    } catch (err) {
      setError(err.response?.data?.error || err.message || "Failed to fetch status");
    } finally {
      setLoading(false);
    }
  }, [user]);

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
    getStatus,
  };
}
