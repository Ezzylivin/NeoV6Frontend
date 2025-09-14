import { useState, useCallback } from "react";
import * as botApi from "../api/bot.js";
import * as dataApi from "../api/data.js";

export function useDashboard() {
  const [botStatus, setBotStatus] = useState(null);
  const [chartData, setChartData] = useState({ BTCUSDT: [], ETHUSDT: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Function to fetch data for a single chart
  const fetchChartData = useCallback(async (symbol, timeframe) => {
    try {
      const candles = await dataApi.fetchCandles({ symbol, timeframe });
      // Format data for Recharts: use timestamp for x-axis
      const formattedData = candles.map(c => ({ 
        time: c[0], 
        open: c[1], 
        high: c[2], 
        low: c[3], 
        close: c[4] 
      }));
      setChartData(prev => ({ ...prev, [symbol]: formattedData }));
    } catch (err) {
      console.error(`Failed to fetch chart data for ${symbol}:`, err);
      // Don't set a global error, just leave the chart empty
      setChartData(prev => ({ ...prev, [symbol]: [] }));
    }
  }, []);
  
  // Function to fetch all initial dashboard data
  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch bot status and initial charts in parallel
      await Promise.all([
        botApi.getStatus().then(status => setBotStatus(status.status)),
        fetchChartData('BTCUSDT', '1h'),
        fetchChartData('ETHUSDT', '1h'),
      ]);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load dashboard data.");
    } finally {
      setLoading(false);
    }
  }, [fetchChartData]);

  return { botStatus, chartData, loading, error, fetchDashboardData, fetchChartData };
}
