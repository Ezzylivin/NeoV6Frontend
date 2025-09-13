// File: src/hooks/useDashboard.js
import { useState, useCallback } from "react";
import * as botApi from "../api/bot.js";
import * as dataApi from "../api/data.js"; // We need to create this file

export function useDashboard() {
  const [botStatus, setBotStatus] = useState(null);
  const [livePrices, setLivePrices] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch bot status and live prices at the same time for speed
      const [status, prices] = await Promise.all([
        botApi.getStatus(),
        dataApi.fetchLivePrices(['BTCUSDT', 'ETHUSDT', 'SOLUSDT']) // Example symbols
      ]);
      
      setBotStatus(status.status); // The status is nested in the response
      setLivePrices(prices);

    } catch (err) {
      const errorMessage = err.response?.data?.message || "Failed to load dashboard data.";
      setError(errorMessage);
      console.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  return { botStatus, livePrices, loading, error, fetchDashboardData };
}
