import { useState, useCallback, useEffect } from "react";
import * as dataApi from "../api/data.js";
import * as botApi from "../api/bot.js"; // Assuming this file exists

export function useDashboard() {
  const [botStatus, setBotStatus] = useState(null);
  const [marketData, setMarketData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadDashboardData = useCallback(async () => {
    // Don't set loading to true here, to avoid a full-screen refresh
    setError('');
    try {
      const [marketDataResponse, botStatusResponse] = await Promise.all([
        dataApi.fetchCombinedMacroData(),
        botApi.getStatus()
      ]);
      
      setMarketData(marketDataResponse);
      setBotStatus(botStatusResponse.status);

    } catch (err) {
      console.error("Failed to load all dashboard data:", err);
      setError('Failed to load dashboard data. Please check the connection and API keys.');
    } finally {
      // Turn off the initial loading spinner after the first fetch
      setLoading(false);
    }
  }, []);

  // This useEffect manages the data fetching lifecycle, including polling
  useEffect(() => {
    loadDashboardData(); // Fetch immediately on mount
    const intervalId = setInterval(loadDashboardData, 45000); // Refresh every 45 seconds
    return () => clearInterval(intervalId); // Cleanup on unmount
  }, [loadDashboardData]);

  return { marketData, botStatus, loading, error };
}
