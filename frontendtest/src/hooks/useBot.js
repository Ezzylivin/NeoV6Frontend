// File: src/hooks/useBot.js
import { useState } from "react";
import apiClient from "../api/apiClient.js";
import { useAuth } from "../context/AuthContext.jsx";

export function useBot() {
  const { user, token } = useAuth();

  const [symbol, setSymbol] = useState("");
  const [amount, setAmount] = useState(0); // you can default to any number
  const [status, setStatus] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // --- Start bot ---
  const startBot = async () => {
    if (!user?.id) {
      setError("User ID is required to start bot.");
      return;
    }
    if (!symbol || !amount) {
      setError("Symbol and amount are required to start bot.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const body = {
        userId: user.id,
        symbol,
        amount,
      };
      const { data } = await apiClient.post("/bots/start", body);
      setStatus("Running");
      setLogs(prev => [...prev, `Bot started for ${symbol} with $${amount}`]);
      return { success: true, data };
    } catch (err) {
      setError(err.response?.data?.error || "Failed to start bot");
      return { success: false };
    } finally {
      setLoading(false);
    }
  };

  // --- Stop bot ---
  const stopBot = async () => {
    if (!user?.id) {
      setError("User ID is required to stop bot.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const body = { userId: user.id };
      const { data } = await apiClient.post("/bots/stop", body);
      setStatus("Stopped");
      setLogs(prev => [...prev, "Bot stopped"]);
      return { success: true, data };
    } catch (err) {
      setError(err.response?.data?.error || "Failed to stop bot");
      return { success: false };
    } finally {
      setLoading(false);
    }
  };

  // --- Get bot status ---
  const getStatus = async () => {
    if (!user?.id) {
      setError("User ID is required to get bot status.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const { data } = await apiClient.get("/bots/status", { params: { userId: user.id } });
      setStatus(data.status || "Unknown");
      return { success: true, data };
    } catch (err) {
      setError(err.response?.data?.error || "Failed to get bot status");
      return { success: false };
    } finally {
      setLoading(false);
    }
  };

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
