import React from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, Legend } from 'recharts';

const CombinedDataChart = ({ data }) => {
  if (!data || data.length === 0) {
    return <div className="rounded-xl bg-gray-800 p-4 text-center">No combined data available.</div>;
  }

  return (
    <div className="rounded-xl bg-gray-800 p-4">
      <div className="mb-4">
        <h3 className="font-bold text-white">BTC Price vs. Fed Funds Rate</h3>
        <p className="text-sm text-gray-400">Daily data from combined sources</p>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis 
            dataKey="time" 
            stroke="#64748b" 
            tickFormatter={(dateStr) => new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          />
          <YAxis yAxisId="left" domain={['dataMin', 'dataMax']} stroke="#f97316" tickFormatter={(price) => `$${(price / 1000).toFixed(0)}k`} />
          <YAxis yAxisId="right" orientation="right" domain={[0, 'dataMax + 1']} stroke="#3b82f6" />
          <Tooltip 
            contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155' }}
            labelFormatter={(dateStr) => new Date(dateStr).toLocaleDateString()}
          />
          <Legend />
          <Line yAxisId="left" type="monotone" dataKey="close" name="BTC Price" stroke="#f97316" strokeWidth={2} dot={false} />
          <Line yAxisId="right" type="monotone" dataKey="fed_funds_rate" name="Fed Rate (%)" stroke="#3b82f6" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default CombinedDataChart;
