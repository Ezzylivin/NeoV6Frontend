import React, { useEffect, useState } from "react";
import { useDashboard } from "../hooks/useDashboard.js";
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from "recharts";

// A reusable chart component with timeframe selectors
const MarketChart = ({ symbol, data, onTimeframeChange }) => {
  const [timeframe, setTimeframe] = useState('1h');
  const timeframes = ['15m', '1h', '4h', '1d'];

  const handleTimeframeClick = (newTimeframe) => {
    setTimeframe(newTimeframe);
    onTimeframeChange(symbol, newTimeframe);
  };

  const latestPrice = data.length > 0 ? data[data.length - 1].close : 0;
  const priceColor = data.length > 1 && data[data.length - 1].close >= data[data.length - 2].close ? 'text-green-400' : 'text-red-400';

  return (
    <div className="rounded-xl bg-gray-800 p-4">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="font-bold text-white">{symbol}</h3>
          <p className={`text-2xl font-semibold ${priceColor}`}>
            ${latestPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
        <div className="flex items-center gap-1 rounded-lg bg-gray-700 p-1">
          {timeframes.map(tf => (
            <button
              key={tf}
              onClick={() => handleTimeframeClick(tf)}
              className={`rounded-md px-3 py-1 text-sm font-semibold transition ${
                timeframe === tf ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-600'
              }`}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis 
            dataKey="time" 
            tickFormatter={(unixTime) => new Date(unixTime).toLocaleTimeString()} 
            stroke="#64748b"
          />
          <YAxis 
            domain={['dataMin', 'dataMax']} 
            stroke="#64748b"
            tickFormatter={(price) => `$${price.toLocaleString()}`}
          />
          <Tooltip 
            contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155' }}
            labelFormatter={(unixTime) => new Date(unixTime).toLocaleString()}
          />
          <Line type="monotone" dataKey="close" stroke="#3b82f6" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default function Dashboard() {
  const { botStatus, chartData, loading, error, fetchDashboardData, fetchChartData } = useDashboard();

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
    <div className="space-y-8 p-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-gray-400">Welcome back! Here is your current trading overview.</p>
      </div>

      {/* Reusable charts with timeframe selectors */}
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

      {/* You can add your Bot Status component here if you like */}
    </div>
  );
}
