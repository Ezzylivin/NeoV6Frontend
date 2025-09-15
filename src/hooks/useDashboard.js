import { useState, useCallback, useEffect } from "react";
import * as dataApi from "../api/data.js";
import * as botApi from "../api/bot.js";

export function useDashboard() {
  // State for all sections of the dashboard
  const [botStatus, setBotStatus] = useState(null);
  const [marketData, setMarketData] = useState({}); // For the Top 5 vs. Macro charts
  const [chartData, setChartData] = useState({ BTCUSDT: [], ETHUSDT: [] }); // For the individual live charts
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Function to fetch data for the individual live price charts
  const fetchChartData = useCallback(async (symbol, timeframe) => {
    try {
      // This function call should exist in your api/data.js file
      const candles = await dataApi.fetchCandles({ symbol, timeframe });
      const formattedData = candles.map(c => ({ time: c[0], open: c[1], high: c[2], low: c[3], close: c[4] }));
      setChartData(prev => ({ ...prev, [symbol]: formattedData }));
    } catch (err) {
      console.error(`Failed to fetch chart data for ${symbol}:`, err);
      setChartData(prev => ({ ...prev, [symbol]: [] }));
    }
  }, []);

  // Main function to fetch all data needed for the dashboard
  const loadDashboardData = useCallback(async () => {
    setError('');
    try {
      await Promise.all([
        // Fetch Top 5 vs. Macro data
        dataApi.fetchCombinedMacroData().then(data => setMarketData(data)),
        // Fetch Bot Status
        botApi.getStatus().then(response => setBotStatus(response.status)),
        // Fetch initial data for the live price charts
        fetchChartData('BTCUSDT', '1h'),
        fetchChartData('ETHUSDT', '1h')
      ]);
    } catch (err) {
      console.error("Failed to load all dashboard data:", err);
      setError('Failed to load dashboard data.');
    } finally {
      setLoading(false);
    }
  }, [fetchChartData]); // fetchChartData is a stable dependency

  useEffect(() => {
    loadDashboardData(); // Fetch once on initial load
    // Polling is removed here to focus on the layout, but can be added back if desired
  }, [loadDashboardData]);

  return { marketData, chartData, botStatus, loading, error, fetchChartData, loadDashboardData };
}
