import React, { useEffect } from 'react';
import { useDashboard } from '../hooks/useDashboard.js';
import UnifiedChart from '../components/UnifiedChart.jsx';

export default function Dashboard() {
  const { marketData, loading, error, fetchDashboardData } = useDashboard();

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  if (loading) {
    return <div className="p-6 text-center text-gray-400">Loading Dashboard Data...</div>;
  }
  if (error) {
    return <div className="p-6 text-center text-red-500">Error: {error}</div>;
  }

  const hasData = marketData && Object.keys(marketData).length > 0;

  return (
    <div className="space-y-8 p-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Market Dashboard</h1>
        <p className="text-gray-400">Top Cryptocurrencies vs. US Macroeconomic Data</p>
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
        !loading && <div className="p-6 text-center text-gray-400">No market data available to display.</div>
      )}
    </div>
  );
}
