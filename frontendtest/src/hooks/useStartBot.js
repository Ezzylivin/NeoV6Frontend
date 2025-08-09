// src/hooks/useStartBot.js
import { useState } from "react";
import apiClient from "../api/apiClient";

export function useStartBot() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const startBot = async (botConfig) => {
    setLoading(true);
    setError(null);

    try {
      const { data } = await apiClient.post("/bot/start", botConfig);
      return { success: true, data };
    } catch (err) {
      setError(err.response?.data?.message || "Failed to start bot");
      return { success: false };
    } finally {
      setLoading(false);
    }
  };

  return { startBot, loading, error };
}
