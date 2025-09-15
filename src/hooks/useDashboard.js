import { useState, useCallback } from "react";
import * as dataApi from "../api/data.js";
import * as botApi from "../api/bot.js"; 

export function useDashboard() {
  // UPGRADE: Add state to hold the bot's status
  const [botStatus, setBotStatus] = useState(null);
  
  const [marketData, setMarketData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchCombinedMarketData = useCallback(async () => {
    try {
      const data = await dataApi.fetchCombinedMacroData();
      setMarketData(data);
    } catch (err) {
      console.error("Failed to fetch market data:", err);
      setError('Failed to load market data.');
      throw err; // Re-throw so Promise.all can catch it
    }
  }, []);

  // UPGRADE: Add a dedicated function to fetch the bot status
  const fetchBotStatus = useCallback(async () => {
    try {
      const statusData = await botApi.getStatus();
      setBotStatus(statusData.status); // Assuming the API returns { status: 'Active' }
    } catch (err) {
      console.error("Failed to fetch bot status:", err);
      // We'll set a specific, non-critical error for the bot status
      setBotStatus('Error'); 
    }
  }, []);
  
  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      // UPGRADE: Run the bot status fetch in parallel with the market data
      await Promise.all([
        fetchCombinedMarketData(),
        fetchBotStatus()
      ]);
    } catch (err) {
      // An error from fetchCombinedMarketData will be caught here
      // The bot status fetch handles its own errors gracefully
    } finally {
      setLoading(false);
    }
  }, [fetchCombinedMarketData, fetchBotStatus]);

  // UPGRADE: Return the botStatus in the hook's output
  return { marketData, botStatus, loading, error, fetchDashboardData };
}
