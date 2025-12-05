import React from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, Legend } from 'recharts';
import { TrendingUp } from 'lucide-react';

const CombinedDataChart = ({ symbol, data }) => {
  // Check for both the existence of the data prop AND its length
  if (!data || !Array.isArray(data) || data.length === 0) {
    return (
      <div className="rounded-2xl bg-slate-900/50 backdrop-blur-sm border border-slate-800/50 p-8 text-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500/20 to-violet-600/20 rounded-2xl flex items-center justify-center">
            <TrendingUp className="w-8 h-8 text-blue-400 opacity-50" />
          </div>
          <div>
            <h3 className="font-semibold text-white mb-2 text-lg">{symbol}</h3>
            <p className="text-slate-400 text-sm">No data available for this symbol.</p>
          </div>
        </div>
      </div>
    );
  }

  // Custom Tooltip Component
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700/50 rounded-xl p-4 shadow-lg">
          <p className="text-slate-300 text-sm mb-2">
            {new Date(label).toLocaleDateString('en-US', { 
              month: 'long', 
              day: 'numeric', 
              year: 'numeric' 
            })}
          </p>
          {payload.map((entry, index) => (
            <div key={index} className="flex items-center justify-between gap-4 mb-1">
              <span className="text-xs text-slate-400">{entry.name}:</span>
              <span 
                className="font-semibold text-sm font-mono"
                style={{ color: entry.color }}
              >
                {entry.name.includes('Price') 
                  ? `$${entry.value.toLocaleString()}` 
                  : `${entry.value.toFixed(2)}%`
                }
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="rounded-2xl bg-slate-900/50 backdrop-blur-sm border border-slate-800/50 p-6 hover:border-slate-700/50 transition-all">
      <div className="mb-6 pb-4 border-b border-slate-800/50">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-gradient-to-br from-orange-500/20 to-blue-500/20 rounded-xl flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-orange-400" />
          </div>
          <div>
            <h3 className="font-semibold text-white text-lg">{symbol} vs. Fed Funds Rate</h3>
            <p className="text-sm text-slate-400">Daily data from combined sources</p>
          </div>
        </div>
      </div>
      
      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
          <defs>
            <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#f97316" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="colorFedRate" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
            </linearGradient>
          </defs>
          
          <CartesianGrid 
            strokeDasharray="3 3" 
            stroke="#334155" 
            opacity={0.2}
            vertical={false}
          />
          
          <XAxis 
            dataKey="time" 
            stroke="#64748b" 
            tick={{ fill: '#94a3b8', fontSize: 12 }}
            tickLine={{ stroke: '#475569' }}
            tickFormatter={(dateStr) => new Date(dateStr).toLocaleDateString('en-US', { 
              month: 'short', 
              day: 'numeric' 
            })}
          />
          
          <YAxis 
            yAxisId="left" 
            domain={['dataMin', 'dataMax']} 
            stroke="#f97316" 
            tick={{ fill: '#fb923c', fontSize: 12 }}
            tickLine={{ stroke: '#fb923c' }}
            tickFormatter={(price) => `$${(price / 1000).toFixed(0)}k`}
          />
          
          <YAxis 
            yAxisId="right" 
            orientation="right" 
            domain={[0, 'dataMax + 1']} 
            stroke="#3b82f6" 
            tick={{ fill: '#60a5fa', fontSize: 12 }}
            tickLine={{ stroke: '#60a5fa' }}
            tickFormatter={(rate) => `${rate.toFixed(1)}%`}
          />
          
          <Tooltip content={<CustomTooltip />} />
          
          <Legend 
            wrapperStyle={{ 
              paddingTop: '20px',
              fontSize: '14px'
            }}
            iconType="line"
          />
          
          <Line 
            yAxisId="left" 
            type="monotone" 
            dataKey="close" 
            name={`${symbol} Price`} 
            stroke="#f97316" 
            strokeWidth={2.5} 
            dot={false} 
            connectNulls={true}
            activeDot={{ 
              r: 6, 
              fill: '#f97316',
              stroke: '#fff',
              strokeWidth: 2 
            }}
          />
          
          <Line 
            yAxisId="right" 
            type="monotone" 
            dataKey="fed_funds_rate" 
            name="Fed Rate (%)" 
            stroke="#3b82f6" 
            strokeWidth={2.5} 
            dot={false} 
            connectNulls={true}
            strokeDasharray="5 5"
            activeDot={{ 
              r: 6, 
              fill: '#3b82f6',
              stroke: '#fff',
              strokeWidth: 2 
            }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default CombinedDataChart;
