// File: src/hooks/useBot.js
// UPGRADED: Now includes fetching 'Golden Strategies' (Winners) alongside bot status/controls.

import { useState, useEffect, useCallback } from "react";
import * as botApi from '../api/bot.js'; // Import your API service

export function useBot() {
  const [botStatus, setBotStatus] = useState(null);
  const [logs, setLogs] = useState([]);
  const [winners, setWinners] = useState([]); // 🚀 Added state for winners
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // --- Fetches bot status, logs, and winners ---
  // We combine them into one refresh function for convenience, 
  // though winners usually don't change as often as logs.
  const fetchBotData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // ✅ Parallel fetching for speed
      const [statusData, logsData, winnersData] = await Promise.all([
        botApi.fetchBotStatus(),
        botApi.fetchBotLogs(),
        botApi.fetchWinners() // 🚀 Fetch golden strategies
      ]);

      setBotStatus(statusData);
      setLogs(logsData);
      setWinners(winnersData || []); // Ensure array
    } catch (err) {
      // If specific winner fetch fails, don't crash the whole UI, just log it
      // But generally set the error state for visibility
      console.error("Bot Data Fetch Error:", err);
      setError(err.message || "Failed to fetch bot data.");
    } finally {
      setLoading(false);
    }
  }, []);

  // --- Initial data load when the hook is first used ---
  useEffect(() => {
    fetchBotData();
  }, [fetchBotData]);

  // --- Starts the trading bot ---
  const startBot = async (config) => {
    setLoading(true);
    setError(null);
    try {
      await botApi.startBot(config);
      // Refresh status and logs after starting
      await fetchBotData();
    } catch (err) {
      setError(err.message || "Failed to start the bot.");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // --- Stops the trading bot ---
  const stopBot = async () => {
    setLoading(true);
    setError(null);
    try {
      await botApi.stopBot();
      // Refresh status and logs after stopping
      await fetchBotData();
    } catch (err) {
      setError(err.message || "Failed to stop the bot.");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // --- Return all state and functions needed by the UI ---
  return { 
    botStatus, 
    logs, 
    winners, // 🚀 Export the winners list
    loading, 
    error, 
    startBot, 
    stopBot, 
    refreshBotData: fetchBotData 
  };
}
