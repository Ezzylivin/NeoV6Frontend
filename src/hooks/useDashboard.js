// src/hooks/useDashboard.js
import { useState, useCallback, useEffect } from "react";
import * as dataApi from "../api/data.js";

export function useDashboard() {
  // 🛠️ The Fix: Removed marketData state and related fetching logic
  const [chartData, setChartData] = useState({ 'BTC-USD': [], 'ETH-USD': [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchChartData = useCallback(async (symbol, timeframe) => {
    try {
      const candles = await dataApi.fetchCandles({ symbol, timeframe });
      if (!candles) {
        throw new Error(`No data returned for ${symbol}.`);
      }
      return candles.map(c => ({ time: c[0], open: c[1], high: c[2], low: c[3], close: c[4] }));
    } catch (err) {
      console.error(`Failed to fetch chart data for ${symbol}:`, err);
      return [];
    }
  }, []);

  const loadChartData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [btcChartData, ethChartData] = await Promise.all([
        fetchChartData('BTC-USD', '1h'),
        fetchChartData('ETH-USD', '1h')
      ]);

      setChartData({
        'BTC-USD': btcChartData,
        'ETH-USD': ethChartData
      });
    } catch (err) {
      setError('Failed to load chart data.');
    } finally {
      setLoading(false);
    }
  }, [fetchChartData]);

  useEffect(() => {
    loadChartData();
  }, [loadChartData]);

  // 🛠️ The Fix: Only return data for the live price charts
  return { chartData, loading, error, fetchChartData, loadDashboardData: loadChartData };
}
