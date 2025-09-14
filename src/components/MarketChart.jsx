import React, { useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from "recharts";

const MarketChart = ({ symbol, data, onTimeframeChange }) => {
  const [timeframe, setTimeframe] = useState('1h');
  const timeframes = ['15m', '1h', '4h', '1d'];

  const handleTimeframeClick = (newTimeframe) => {
    setTimeframe(newTimeframe);
    // This calls the function passed down from the useDashboard hook
    onTimeframeChange(symbol, newTimeframe);
  };

  // Safely get the latest price and determine its color
  const latestPrice = data && data.length > 0 ? data[data.length - 1].close : 0;
  const priceColor = data && data.length > 1 && data[data.length - 1].close >= data[data.length - 2].close ? 'text-green-400' : 'text-red-400';

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
            tickFormatter={(unixTime) => new Date(unixTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} 
            stroke="#64748b"
          />
          <YAxis 
            domain={['dataMin', 'dataMax']} 
            stroke="#64748b"
            tickFormatter={(price) => `$${price.toLocaleString(undefined, { minimumFractionDigits: 0 })}`}
          />
          <Tooltip 
            contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '0.5rem' }}
            labelFormatter={(unixTime) => new Date(unixTime).toLocaleString()}
            formatter={(value) => [`$${value.toFixed(2)}`, 'Close']}
          />
          <Line type="monotone" dataKey="close" stroke="#3b82f6" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default MarketChart;
