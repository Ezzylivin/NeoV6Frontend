import { useState, useCallback } from "react";
// Import all your API functions
import * as botApi from "../api/bot.js";
import * as dataApi from "../api/data.js";

export function useDashboard() {
  // State from your existing hook
  const [botStatus, setBotStatus] = useState(null);
  const [chartData, setChartData] = useState({ BTCUSDT: [], ETHUSDT: [] });

  // UPGRADE: New state to hold the object of top 5 crypto market data
  const [marketData, setMarketData] = useState({});

  // General loading and error states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // This is your existing function for individual charts, it remains unchanged
  const fetchChartData = useCallback(async (symbol, timeframe) => {
    try {
      const candles = await dataApi.fetchCandles({ symbol, timeframe });
      const formattedData = candles.map(c => ({ time: c[0], open: c[1], high: c[2], low: c[3], close: c[4] }));
      setChartData(prev => ({ ...prev, [symbol]: formattedData }));
    } catch (err) {
      console.error(`Failed to fetch chart data for ${symbol}:`, err);
      setChartData(prev => ({ ...prev, [symbol]: [] }));
    }
  }, []);

  // UPGRADE: This new function fetches the combined data for the top 5 cryptos
  const fetchCombinedMarketData = useCallback(async () => {
    try {
      const data = await dataApi.fetchCombinedMacroData();
      setMarketData(data);
    } catch (err) {
      console.error("Failed to fetch market data:", err);
      // Let the main function handle the user-facing error
      throw err;
    }
  }, []);
  
  // UPGRADE: The main fetch function now runs everything in parallel
  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await Promise.all([
        botApi.getStatus().then(status => setBotStatus(status.status)),
        fetchChartData('BTCUSDT', '1h'),
        fetchChartData('ETHUSDT', '1h'),
        fetchCombinedMarketData(), // Added the new data fetch here
      ]);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load all dashboard data.");
    } finally {
      setLoading(false);
    }
  }, [fetchChartData, fetchCombinedMarketData]);

  // UPGRADE: Return all the data your dashboard page will need
  return { 
    botStatus, 
    chartData, 
    marketData, // The new data for your multi-chart display
    loading, 
    error, 
    fetchDashboardData, 
    fetchChartData 
  };
}
