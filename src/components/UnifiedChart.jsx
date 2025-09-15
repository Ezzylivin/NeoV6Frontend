import React, { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, Legend } from 'recharts';

const UnifiedChart = ({ symbol, data }) => {
  const [timeframe, setTimeframe] = useState('1d'); // Default to daily
  const timeframes = ['1h', '4h', '1d']; // Example timeframes

  const handleTimeframeClick = (newTimeframe) => {
    setTimeframe(newTimeframe);
    // In the future, this could call a function to refetch data with the new timeframe
    console.log(`Timeframe for ${symbol} changed to: ${newTimeframe}. (Refetch logic to be added)`);
  };
  
  const latestPrice = data && data.length > 0 ? data[data.length - 1].close : 0;

  if (!data || data.length === 0) {
    return <div className="rounded-xl bg-gray-800 p-4 text-center text-gray-400">No data for {symbol}.</div>;
  }

  return (
    <div className="rounded-xl bg-gray-800 p-4">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="font-bold text-white">{symbol}</h3>
          <p className="text-2xl font-semibold text-green-400">
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
              {tf.toUpperCase()}
            </button>
          ))}
        </div>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis dataKey="time" stroke="#64748b" tickFormatter={(dateStr) => new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} />
          <YAxis yAxisId="left" domain={['dataMin', 'dataMax']} stroke="#f97316" tickFormatter={(price) => `$${(price / 1000).toFixed(0)}k`} />
          <YAxis yAxisId="right" orientation="right" domain={[0, 'dataMax + 1']} stroke="#3b82f6" />
          <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155' }} labelFormatter={(dateStr) => new Date(dateStr).toLocaleDateString()} />
          <Legend />
          <Line yAxisId="left" type="monotone" dataKey="close" name={`${symbol} Price`} stroke="#f97316" strokeWidth={2} dot={false} />
          <Line yAxisId="right" type="monotone" dataKey="fed_funds_rate" name="Fed Rate (%)" stroke="#3b82f6" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default UnifiedChart;
