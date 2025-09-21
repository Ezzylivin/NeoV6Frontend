// File: src/hooks/useBot.js
// UPGRADED: This hook now calls the API service functions with the new, consistent naming convention.

import { useState, useEffect, useCallback } from "react";
import * as botApi from '../api/bot.js'; // Import your API service

export function useBot() {
  const [botStatus, setBotStatus] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // --- Fetches both status and logs, and updates state ---
  const fetchBotData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // ✅ Calls the correctly named functions from the API service
      const statusData = await botApi.fetchBotStatus();
      const logsData = await botApi.fetchBotLogs();
      setBotStatus(statusData);
      setLogs(logsData);
    } catch (err) {
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
      // ✅ Calls the correctly named function
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
      // ✅ Calls the correctly named function
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
    loading, 
    error, 
    startBot, 
    stopBot,
    refreshBotData: fetchBotData // Expose a manual refresh function
  };
}

