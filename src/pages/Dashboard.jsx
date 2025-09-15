import React, { useEffect } from 'react';
import { useDashboard } from '../hooks/useDashboard.js';
import UnifiedChart from '../components/UnifiedChart.jsx';
import MarketChart from '../components/MarketChart.jsx'; // Make sure this component exists

export default function Dashboard() {
  // Get all the data and functions from our comprehensive hook
  const { 
    marketData, 
    chartData, 
    botStatus, 
    loading, 
    error, 
    fetchChartData,
    loadDashboardData 
  } = useDashboard();

  // The hook now manages its own data loading, but we call it via useEffect
  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  if (loading && Object.keys(marketData).length === 0) {
    return <div className="p-6 text-center text-gray-400">Loading Dashboard Data...</div>;
  }

  return (
    <div className="space-y-8 p-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-white">Dashboard</h1>
          <p className="text-gray-400">Welcome back! Here is your current trading overview.</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-400">Bot Status</p>
          <p className={`text-lg font-bold ${botStatus === 'Active' ? 'text-green-400' : 'text-red-400'}`}>
            {botStatus || 'Unknown'}
          </p>
        </div>
      </div>

      {error && <div className="p-2 text-center text-yellow-300 bg-yellow-800/50 rounded-lg">{error}</div>}

      {/* Section for the Top 5 Crypto vs. Macro Charts */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-4">Market Overview vs. Macro Data</h2>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {Object.keys(marketData).map(symbol => (
            <UnifiedChart 
              key={symbol}
              symbol={symbol} 
              data={marketData[symbol]} 
            />
          ))}
        </div>
      </div>

      {/* Section for your original Live Price Charts */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-4">Live Price Charts</h2>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
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
