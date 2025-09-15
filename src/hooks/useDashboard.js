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
        throw new Error("No data returned from candles API.");
      }
      const formattedData = candles.map(c => ({ time: c[0], open: c[1], high: c[2], low: c[3], close: c[4] }));
      setChartData(prev => ({ ...prev, [symbol]: formattedData }));
    } catch (err) {
      console.error(`Failed to fetch chart data for ${symbol}:`, err);
      setChartData(prev => ({ ...prev, [symbol]: [] }));
    }
  }, []);

  const loadDashboardData = useCallback(async () => {
    setError('');
    setLoading(true);
    try {
      const marketDataResponse = await dataApi.fetchCombinedMacroData();
      if (marketDataResponse) {
        setMarketData(marketDataResponse);
      }
      
      await Promise.all([
        fetchChartData('BTC-USD', '1h'), 
        fetchChartData('ETH-USD', '1h')
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

  return { marketData, chartData, loading, error, fetchChartData, loadDashboardData };
}
