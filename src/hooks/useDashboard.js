import { useState, useCallback } from "react";
import * as dataApi from "../api/data.js";
import * as botApi from "../api/bot.js";

export function useDashboard() {
  const [botStatus, setBotStatus] = useState(null);
  const [marketData, setMarketData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // This is the main function that the component will call.
  // It orchestrates all the data fetching.
  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      // Run all API calls in parallel for the best performance
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
      setLoading(false);
    }
  }, []); // Empty dependency array means this function is created only once.

  return { marketData, botStatus, loading, error, loadDashboardData };
}
