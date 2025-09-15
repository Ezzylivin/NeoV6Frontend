import React, { useEffect } from 'react';
import { useDashboard } from '../hooks/useDashboard.js';
import MarketChart from '../components/MarketChart.jsx';
import CombinedDataChart from '../components/CombinedDataChart.jsx';

export default function Dashboard() {
  const { 
    chartData, 
    marketData,
    loading, 
    error, 
    fetchChartData,
    loadDashboardData 
  } = useDashboard();

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // 🛠️ The fix: The component will now display "Loading" until ALL data is fetched.
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
        <h2 className="text-2xl font-bold text-white mb-4">Market Overview</h2>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <CombinedDataChart 
            symbol="BTC-USD"
            data={marketData['BTC-USD']}
          />
          <CombinedDataChart
            symbol="ETH-USD"
            data={marketData['ETH-USD']}
          />
        </div>
      </div>

      <div>
        <h2 className="text-2xl font-bold text-white mb-4">Live Price Charts</h2>
        <div className="grid grid-cols-1 gap-6 lg-grid-cols-2">
          <MarketChart 
            symbol="BTC-USD" 
            data={chartData['BTC-USD']} 
            onTimeframeChange={fetchChartData} 
          />
          <MarketChart 
            symbol="ETH-USD" 
            data={chartData['ETH-USD']} 
            onTimeframeChange={fetchChartData} 
          />
        </div>
      </div>
    </div>
  );
}
