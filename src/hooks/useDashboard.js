import { useState, useCallback, useEffect } from "react";
import * as dataApi from "../api/data.js";
import * as botApi from "../api/bot.js";

export function useDashboard() {
  const [botStatus, setBotStatus] = useState(null);
  const [marketData, setMarketData] = useState({});
  const [chartData, setChartData] = useState({ BTCUSDT: [], ETHUSDT: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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

  const loadDashboardData = useCallback(async () => {
    setError('');
    try {
      await Promise.all([
        dataApi.fetchCombinedMacroData().then(data => setMarketData(data)),
        // 🛠️ The fix is here! We now access the 'status' property from the response object.
        botApi.getStatus().then(response => {
          // Assuming the response is an object with a 'status' key or a 'isRunning' key
          if (response.status) {
            setBotStatus(response.status);
          } else if (response.isRunning !== undefined) {
            setBotStatus(response.isRunning ? 'Active' : 'Inactive');
          } else {
            setBotStatus('Unknown');
          }
        }),
        fetchChartData('BTCUSDT', '1h'),
        fetchChartData('ETHUSDT', '1h')
      ]);
    } catch (err) {
      console.error("Failed to load all dashboard data:", err);
      setError('Failed to load dashboard data.');
    } finally {
      setLoading(false);
    }
  }, [fetchChartData]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  return { marketData, chartData, botStatus, loading, error, fetchChartData, loadDashboardData };
}
