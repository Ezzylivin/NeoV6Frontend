// File: src/pages/Dashboard.jsx
import React, { useEffect } from "react";
import { useDashboard } from "../hooks/useDashboard.js";

// A small, reusable component for displaying a single statistic
const StatCard = ({ title, value, valueColor }) => (
  <div className="bg-gray-800 p-6 rounded-xl">
    <p className="text-sm text-gray-400">{title}</p>
    <p className={`text-2xl font-bold ${valueColor || ''}`}>{value}</p>
  </div>
);

// A component to display live crypto prices
const LivePrices = ({ prices }) => (
  <div>
    <h2 className="text-xl font-bold mb-4">Live Market Prices</h2>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {Object.entries(prices).map(([symbol, price]) => (
        <StatCard 
          key={symbol} 
          title={symbol} 
          value={price ? `$${Number(price).toLocaleString()}` : 'Loading...'} 
        />
      ))}
    </div>
  </div>
);

// A component to display the bot's current status
const BotStatus = ({ status }) => {
  const isRunning = status?.isRunning;
  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Bot Status</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard 
          title="Status" 
          value={isRunning ? "Running" : "Stopped"}
          valueColor={isRunning ? 'text-green-500' : 'text-red-500'}
        />
        <StatCard title="Symbol" value={status?.symbol || 'N/A'} />
        <StatCard title="Strategy" value={status?.strategy?.name || 'N/A'} />
      </div>
    </div>
  );
};


export default function Dashboard() {
  const { botStatus, livePrices, loading, error, fetchDashboardData } = useDashboard();

  // Fetch data when the component mounts
  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  if (loading) {
    return <div className="p-6 text-center">Loading Dashboard...</div>;
  }

  if (error) {
    return <div className="p-6 text-center text-red-500">Error: {error}</div>;
  }

  return (
    <div className="p-6 space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-gray-400">Welcome back! Here is your current trading overview.</p>
      </div>

      <BotStatus status={botStatus} />
      
      <LivePrices prices={livePrices} />
      
      {/* You could add a historical performance chart here later if needed */}
    </div>
  );
}
