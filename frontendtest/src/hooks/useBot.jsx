import { useState, useEffect } from "react";
import apiClient from "../api/apiClient";

export function useBot(botId = null, autoFetchStatus = true) {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Start bot
  const startBot = async (botConfig) => {
    setLoading(true);
    setError(null);

    try {
      const { data } = await apiClient.post("/bots/start", botConfig);
      setStatus(data);
      return { success: true, data };
    } catch (err) {
      setError(err.response?.data?.message || "Failed to start bot");
      return { success: false };
    } finally {
      setLoading(false);
    }
  };

  // Stop bot
  const stopBot = async (id = botId) => {
    if (!id) return { success: false, message: "Bot ID is required" };
    setLoading(true);
    setError(null);

    try {
      const { data } = await apiClient.post("/bots/stop", { botId: id });
      setStatus(null);
      return { success: true, data };
    } catch (err) {
      setError(err.response?.data?.message || "Failed to stop bot");
      return { success: false };
    } finally {
      setLoading(false);
    }
  };

  // Get bot status
  const getBotStatus = async (id = botId) => {
    if (!id) return { success: false, message: "Bot ID is required" };
    setLoading(true);
    setError(null);

    try {
      const { data } = await apiClient.get(`/bots/status/${id}`);
      setStatus(data);
      return { success: true, data };
    } catch (err) {
      setError(err.response?.data?.message || "Failed to fetch bot status");
      return { success: false };
    } finally {
      setLoading(false);
    }
  };

  // Auto-fetch status on mount or when botId changes
  useEffect(() => {
    if (botId && autoFetchStatus) {
      getBotStatus(botId);
    }
  }, [botId]);

  return {
    status,
    loading,
    error,
    startBot,
    stopBot,
    getBotStatus
  };
}
