import { useState, useEffect } from "react";
import apiClient from "../api/apiClient";

export function useBot(botId = null, autoFetchStatus = true) {
  const [symbol, setSymbol] = useState(""); // added symbol state
  const [status, setStatus] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Example symbols
  const availableSymbols = ["BTC/USDT", "ETH/USDT", "BNB/USDT", "XRP/USDT"];

  const startBot = async () => {
    if (!symbol) {
      setError("Please select a symbol");
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const { data } = await apiClient.post("/bots/start", { botId, symbol });
      setStatus(data);
      return { success: true, data };
    } catch (err) {
      setError(err.response?.data?.message || "Failed to start bot");
      return { success: false };
    } finally {
      setLoading(false);
    }
  };

  const stopBot = async () => {
    if (!botId) return { success: false, message: "Bot ID is required" };
    setLoading(true);
    setError(null);

    try {
      const { data } = await apiClient.post("/bots/stop", { botId });
      setStatus(null);
      return { success: true, data };
    } catch (err) {
      setError(err.response?.data?.message || "Failed to stop bot");
      return { success: false };
    } finally {
      setLoading(false);
    }
  };

  const getBotStatus = async () => {
    if (!botId) return { success: false, message: "Bot ID is required" };
    setLoading(true);
    setError(null);

    try {
      const { data } = await apiClient.get(`/bots/status/${botId}`);
      setStatus(data);
      return { success: true, data };
    } catch (err) {
      setError(err.response?.data?.message || "Failed to fetch bot status");
      return { success: false };
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (botId && autoFetchStatus) {
      getBotStatus();
    }
  }, [botId]);

  return {
    symbol,
    setSymbol,
    availableSymbols,
    status,
    logs,
    loading,
    error,
    startBot,
    stopBot,
    getBotStatus
  };
}
