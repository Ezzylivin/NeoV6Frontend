import { useState, useCallback, useEffect } from "react";
import * as dataApi from "../api/data.js";
import { useMarketOverview } from "./useMarketOverview.js"; // 🛠️ Import the new hook

export function useDashboard() {
  // 🛠️ Use the new hook to get market overview data
  const { marketData, loading: marketLoading, error: marketError } = useMarketOverview();
  
  const [chartData, setChartData] = useState({ 'BTC-USD': [], 'ETH-USD': [] });
  const [chartLoading, setChartLoading] = useState(true);
  const [chartError, setChartError] = useState('');

  const fetchChartData = useCallback(async (symbol, timeframe) => {
    try {
      const candles = await dataApi.fetchCandles({ symbol, timeframe });
      if (!candles) {
        throw new Error(`No data returned for ${symbol}.`);
      }
      setChartData(prev => ({ ...prev, [symbol]: candles.map(c => ({ time: c[0], open: c[1], high: c[2], low: c[3], close: c[4] })) }));
    } catch (err) {
      console.error(`Failed to fetch chart data for ${symbol}:`, err);
      setChartData(prev => ({ ...prev, [symbol]: [] }));
    }
  }, []);

  const loadChartData = useCallback(async () => {
    setChartLoading(true);
    setChartError('');
    try {
      await Promise.all([
        fetchChartData('BTC-USD', '1h'),
        fetchChartData('ETH-USD', '1h')
      ]);
    } catch (err) {
      setChartError('Failed to load chart data.');
    } finally {
      setChartLoading(false);
    }
  }, [fetchChartData]);

  useEffect(() => {
    loadChartData();
  }, [loadChartData]);

  // Combine loading and error states from both hooks
  const loading = marketLoading || chartLoading;
  const error = marketError || chartError;

  return { marketData, chartData, loading, error, fetchChartData, loadDashboardData: loadChartData };
}
