// File: src/hooks/useBot.js
// 🚀 UPGRADE: Fixed Naming Mismatch (fetch -> get) to ensure data loads.

import { useState, useEffect, useCallback } from "react";
import * as botApi from '../api/bot.js'; 

export function useBot() {
  const [botStatus, setBotStatus] = useState({ status: 'stopped', candles: [], trades: [] });
  const [logs, setLogs] = useState([]);
  const [winners, setWinners] = useState([]); 
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // --- Fetches bot status, logs, and winners ---
  const fetchBotData = useCallback(async () => {
    // Don't set global loading to avoid flickering on polling
    // only set error if it fails hard
    try {
      const [statusData, logsData, winnersData] = await Promise.all([
        botApi.getBotStatus(),  // 🟢 FIXED: Was fetchBotStatus
        botApi.getBotLogs(),    // 🟢 FIXED: Was fetchBotLogs
        botApi.getWinners()     // 🟢 FIXED: Was fetchWinners
      ]);

      if (statusData) setBotStatus(statusData);
      if (logsData) setLogs(logsData);
      if (winnersData) setWinners(winnersData || []);
      
    } catch (err) {
      console.error("Bot Data Fetch Error:", err);
      // Optional: Don't set global error on polling failure to keep UI active
    } 
  }, []);

  // --- Initial Load ---
  useEffect(() => {
    setLoading(true);
    fetchBotData().finally(() => setLoading(false));
  }, [fetchBotData]);

  // --- Starts the trading bot ---
  const startBot = async (config) => {
    setLoading(true);
    setError(null);
    try {
      await botApi.startBot(config);
      // Small delay to allow Python thread to initialize data
      setTimeout(() => fetchBotData(), 1000); 
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
      setTimeout(() => fetchBotData(), 1000);
    } catch (err) {
      setError(err.message || "Failed to stop the bot.");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { 
    botStatus, 
    logs, 
    winners, 
    loading, 
    error, 
    startBot, 
    stopBot, 
    refreshBotData: fetchBotData 
  };
}
