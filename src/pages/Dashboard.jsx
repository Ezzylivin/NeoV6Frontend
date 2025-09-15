import React from 'react';
import { useDashboard } from '../hooks/useDashboard.js';
import UnifiedChart from '../components/UnifiedChart.jsx'; // Assuming this component exists

export default function Dashboard() {
  const { marketData, botStatus, loading, error } = useDashboard();

  // Show a loading screen only on the very first load
  if (loading && Object.keys(marketData).length === 0) {
    return <div className="p-6 text-center text-gray-400">Loading Dashboard Data...</div>;
  }

  const hasData = marketData && Object.keys(marketData).length > 0;

  return (
    <div className="space-y-8 p-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-white">Market Dashboard</h1>
          <p className="text-gray-400">Data automatically refreshes every 45 seconds.</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-400">Bot Status</p>
          <p className={`text-lg font-bold ${botStatus === 'Active' ? 'text-green-400' : 'text-red-400'}`}>
            {botStatus || 'Unknown'}
          </p>
        </div>
      </div>
      
      {/* Display a small error message if a refresh fails */}
      {error && <div className="p-2 text-center text-yellow-300 bg-yellow-800/50 rounded-lg">{error}</div>}

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
          Waiting for market data...
        </div>
      )}
    </div>
  );
}
