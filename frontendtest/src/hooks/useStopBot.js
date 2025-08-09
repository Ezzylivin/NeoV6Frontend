// src/hooks/useStopBot.js
import { useState } from "react";
import apiClient from "../api/apiClient";

export function useStopBot() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const stopBot = async (botId) => {
    setLoading(true);
    setError(null);

    try {
      const { data } = await apiClient.post("/bot/stop", { botId });
      return { success: true, data };
    } catch (err) {
      setError(err.response?.data?.message || "Failed to stop bot");
      return { success: false };
    } finally {
      setLoading(false);
    }
  };

  return { stopBot, loading, error };
}
