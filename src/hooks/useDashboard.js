import { useState, useCallback } from "react";
import * as dataApi from "../api/data.js";
import * as botApi from "../api/bot.js"; // Assuming you still need this

export function useDashboard() {
  const [marketData, setMarketData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchCombinedMarketData = useCallback(async () => {
    try {
      // This function should receive an object like { "BTC-USD": [...], "ETH-USD": [...] }
      const data = await dataApi.fetchCombinedMacroData();
      setMarketData(data);
    } catch (err) {
      console.error("Failed to fetch market data:", err);
      setError('Failed to load market data.');
      throw err; // Re-throw to be caught by Promise.all
    }
  }, []);
  
  // This function fetches all data needed for the dashboard in parallel
  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      // You can add other initial data fetches here as needed
      await Promise.all([
        fetchCombinedMarketData()
        // botApi.getStatus().then(status => setBotStatus(status.status)),
      ]);
    } catch (err) {
      // The individual fetch function already sets a more specific error
    } finally {
      setLoading(false);
    }
  }, [fetchCombinedMarketData]);

  return { marketData, loading, error, fetchDashboardData };
}
