import React, { useEffect } from 'react';
import { useDashboard } from '../hooks/useDashboard.js';
import UnifiedChart from '../components/UnifiedChart.jsx';

export default function Dashboard() {
  const { marketData, botStatus, loading, error, loadDashboardData } = useDashboard();

  // This useEffect is the key. The empty dependency array [] at the end
  // tells React to run this function ONLY ONCE, when the component first mounts.
  // This breaks the infinite loop.
  useEffect(() => {
    loadDashboardData();
  }, []); // <-- Empty array is crucial!

  if (loading) {
    return <div className="p-6 text-center text-gray-400">Loading Dashboard Data...</div>;
  }
  if (error) {
    return <div className="p-6 text-center text-red-500">Error: {error}</div>;
  }

  const hasData = marketData && Object.keys(marketData).length > 0;

  return (
    <div className="space-y-8 p-6">
      <div className="flex justify-between items-start">
        <div>
            <h1 className="text-3xl font-bold text-white">Market Dashboard</h1>
            <p className="text-gray-400">Top Cryptocurrencies vs. US Macroeconomic Data</p>
        </div>
        <div className="text-right">
            <p className="text-sm text-gray-400">Bot Status</p>
            <p className={`text-lg font-bold ${botStatus === 'Active' ? 'text-green-400' : 'text-red-400'}`}>
                {botStatus || 'Unknown'}
            </p>
        </div>
      </div>
      
      {hasData ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {Object.keys(marketData).map(symbol => (
            <UnifiedChart 
              key={symbol}
              symbol={symbol} 
              data={marketData[symbol]} 
            />
          ))}
        </div>
      ) : (
        <div className="p-6 text-center text-gray-400 rounded-lg bg-gray-800">
          No market data available to display.
        </div>
      )}
    </div>
  );
}
