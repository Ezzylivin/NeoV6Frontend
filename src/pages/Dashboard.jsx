import React, { useEffect } from 'react';
import { useDashboard } from '../hooks/useDashboard.js';
import MarketChart from '../components/MarketChart.jsx';

export default function Dashboard() {
  const { 
    chartData, 
    loading, 
    error, 
    fetchChartData,
    loadDashboardData 
  } = useDashboard();

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  if (loading) {
    return <div className="p-6 text-center text-gray-400">Loading Dashboard Data...</div>;
  }

  return (
    <div className="space-y-8 p-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-white">Dashboard</h1>
          <p className="text-gray-400">Welcome back! Here is your current trading overview.</p>
        </div>
      </div>

      {error && <div className="p-2 text-center text-yellow-300 bg-yellow-800/50 rounded-lg">{error}</div>}

      <div>
        <h2 className="text-2xl font-bold text-white mb-4">Live Price Charts</h2>
        <div className="grid grid-cols-1 gap-6 lg-grid-cols-2">
          <MarketChart 
            symbol="BTCUSDT" 
            data={chartData.BTCUSDT} 
            onTimeframeChange={fetchChartData} 
          />
          <MarketChart 
            symbol="ETHUSDT" 
            data={chartData.ETHUSDT} 
            onTimeframeChange={fetchChartData} 
          />
        </div>
      </div>
    </div>
  );
}
