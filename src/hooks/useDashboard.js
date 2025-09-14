import { useState, useCallback } from "react";
// Import our new API function alongside the existing ones
import * as botApi from "../api/bot.js";
import * as dataApi from "../api/data.js";

export function useDashboard() {
  // Existing states
  const [botStatus, setBotStatus] = useState(null);
  const [chartData, setChartData] = useState({ BTCUSDT: [], ETHUSDT: [] });
  
  // 1. Add new state for our combined data
  const [macroData, setMacroData] = useState([]);

  // General loading and error states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Your existing fetchChartData function (no changes needed here)
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

  // 2. Add a new function to fetch the combined macro data
  const fetchMacroData = useCallback(async () => {
    try {
        const data = await dataApi.fetchCombinedMacroData();
        setMacroData(data);
    } catch (err) {
        console.error('Failed to fetch macro data:', err);
        // We can let the main fetchDashboardData function handle the user-facing error
        throw err; 
    }
  }, []);
  
  // Function to fetch all initial dashboard data
  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // 3. Add our new fetch function to the parallel execution
      await Promise.all([
        botApi.getStatus().then(status => setBotStatus(status.status)),
        fetchChartData('BTCUSDT', '1h'),
        fetchChartData('ETHUSDT', '1h'),
        fetchMacroData(), // <-- Add the new call here
      ]);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load dashboard data.");
    } finally {
      setLoading(false);
    }
  }, [fetchChartData, fetchMacroData]); // <-- Add fetchMacroData to dependency array

  // 4. Return the new state so your components can use it
  return { botStatus, chartData, macroData, loading, error, fetchDashboardData, fetchChartData };
}
