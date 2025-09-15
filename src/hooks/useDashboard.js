import { useState, useCallback, useEffect } from "react";
import * as dataApi from "../api/data.js";

export function useDashboard() {
  const [marketData, setMarketData] = useState({});
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

  const loadDashboardData = useCallback(async () => {
    setError('');
    setLoading(true);
    try {
      // 🛠️ The Fix: Use Promise.all to fetch all data sources concurrently and handle them at once.
      const [marketDataResponse, btcChartData, ethChartData] = await Promise.all([
        dataApi.fetchCombinedMacroData(),
        fetchChartData('BTC-USD', '1h'),
        fetchChartData('ETH-USD', '1h')
      ]);

      // 🛠️ The Fix: Set all states at once after all fetches are complete.
      setMarketData(marketDataResponse || {});
      setChartData({
        'BTC-USD': btcChartData,
        'ETH-USD': ethChartData
      });
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

  return { marketData, chartData, loading, error, fetchChartData, loadDashboardData };
}
