import React, { useEffect } from 'react';

// 1. Import your custom hook
import { useDashboard } from '../hooks/useDashboard.js';

// 2. Import both of your chart components
import MarketChart from '../components/MarketChart.jsx';
import CombinedDataChart from '../components/CombinedDataChart.jsx';

export default function Dashboard() {
  // 3. Get all the data and states from your powerful custom hook
  const { 
    chartData, 
    macroData, 
    loading, 
    error, 
    fetchDashboardData, 
    fetchChartData 
  } = useDashboard();

  // 4. Fetch all necessary data when the component first loads
  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]); // Dependency array ensures this runs only once

  // 5. Handle loading and error states for a clean user experience
  if (loading) {
    return <div className="p-6 text-center text-gray-400">Loading Dashboard...</div>;
  }
  if (error) {
    return <div className="p-6 text-center text-red-500">Error: {error}</div>;
  }

  // 6. Render the full dashboard layout with all components
  return (
    <div className="space-y-8 p-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Dashboard</h1>
        <p className="text-gray-400">Welcome back! Here is your current trading overview.</p>
      </div>

      {/* Render the new chart for our combined Python service data */}
      {/* This component gets the 'macroData' from the hook */}
      <div className="grid grid-cols-1 gap-6">
        <CombinedDataChart data={macroData} />
      </div>

      {/* Render your existing, reusable market charts */}
      {/* These components get their data from the 'chartData' state */}
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

      {/* You can add other components like bot status here */}
    </div>
  );
}
