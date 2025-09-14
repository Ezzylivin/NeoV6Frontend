import React, { useEffect } from 'react';

// 1. Import your custom hook and all necessary chart components
import { useDashboard } from '../hooks/useDashboard.js';
import MarketChart from '../components/MarketChart.jsx';
import CombinedDataChart from '../components/CombinedDataChart.jsx';

export default function Dashboard() {
  // 2. Get all data states from our fully upgraded hook
  const { 
    chartData,      // For the individual BTC/ETH charts
    marketData,     // For the new Top 5 crypto vs. macro charts
    loading, 
    error, 
    fetchDashboardData, 
    fetchChartData 
  } = useDashboard();

  // 3. Fetch all necessary data when the component first loads
  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // 4. Handle loading and error states for a clean user experience
  if (loading) {
    return <div className="p-6 text-center text-gray-400">Loading Dashboard...</div>;
  }
  if (error) {
    return <div className="p-6 text-center text-red-500">Error: {error}</div>;
  }

  // 5. Render the full, comprehensive dashboard layout
  return (
    <div className="space-y-8 p-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Dashboard</h1>
        <p className="text-gray-400">Welcome back! Here is your current trading overview.</p>
      </div>

      {/* Section for the new Top 5 Crypto vs. Macro Charts */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-4">Market Overview vs. Macro Data</h2>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* This dynamically creates a chart for each symbol in the marketData object */}
          {Object.keys(marketData).map(symbol => (
            <CombinedDataChart 
              key={symbol}
              symbol={symbol} 
              data={marketData[symbol]} 
            />
          ))}
        </div>
      </div>

      {/* Section for your existing individual price charts */}
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
