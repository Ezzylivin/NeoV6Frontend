// ./pages/Dashboard.jsx
// 🚀 UPGRADE: v73.1 - "Stable Layout & 2026 Aesthetic"
// Fixes: Layout jumping on selection, Scrollbar stability, Persistent containers

import React, { useState, useEffect } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { 
  TrendingUp, Activity, DollarSign, Percent, 
  BarChart3, RefreshCw, Clock, Zap, Eye
} from 'lucide-react';
import './Dashboard.css';

const FLASK_API_URL = "https://crypto-lpzi.onrender.com/api";
const POLLING_INTERVAL_MS = 60000;
const CHART_INTERVALS = ['1D', '1W', '1M', '3M'];

// --- SHARED COMPONENTS ---

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const formatCurrency = (val) => val ? parseFloat(val).toLocaleString('en-US', { style: 'currency', currency: 'USD' }) : 'N/A';
    
    const dateObj = data.start ? new Date(data.start * 1000) : new Date(label);
    const formattedDate = !isNaN(dateObj) 
        ? dateObj.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit' })
        : label;

    return (
      <div className="custom-tooltip">
        <p className="tooltip-label">{formattedDate}</p>
        <div className="tooltip-divider"></div>
        <p className="tooltip-item">
          <span className="tooltip-key">Open:</span>
          <span className="tooltip-value">{formatCurrency(data.open)}</span>
        </p>
        <p className="tooltip-item">
          <span className="tooltip-key">High:</span>
          <span className="tooltip-value-high">{formatCurrency(data.high)}</span>
        </p>
        <p className="tooltip-item">
          <span className="tooltip-key">Low:</span>
          <span className="tooltip-value-low">{formatCurrency(data.low)}</span>
        </p>
        <p className="tooltip-item-close">
          <span className="tooltip-key">Close:</span>
          <span className="tooltip-value-close">{formatCurrency(data.close)}</span>
        </p>
      </div>
    );
  }
  return null;
};

const MetricCard = ({ title, value, unit = '', icon: Icon, color = 'blue' }) => {
  let displayValue = 'Loading...';
  
  if (value !== null && value !== undefined && !isNaN(value)) {
    if (title.includes('Price') || title.includes('-USD') || title.includes('USD')) {
      displayValue = value.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 });
    } else {
      displayValue = value;
    }
  } else if (value === null) {
      displayValue = 'N/A';
  }

  const colorMap = {
    blue: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/30', glow: 'shadow-blue-500/20', icon: 'text-blue-400' },
    emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30', glow: 'shadow-emerald-500/20', icon: 'text-emerald-400' },
    violet: { bg: 'bg-violet-500/10', text: 'text-violet-400', border: 'border-violet-500/30', glow: 'shadow-violet-500/20', icon: 'text-violet-400' },
    amber: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/30', glow: 'shadow-amber-500/20', icon: 'text-amber-400' },
    cyan: { bg: 'bg-cyan-500/10', text: 'text-cyan-400', border: 'border-cyan-500/30', glow: 'shadow-cyan-500/20', icon: 'text-cyan-400' }
  };

  const colors = colorMap[color] || colorMap.blue;

  return (
    <div className={`metric-card-modern bg-slate-900/50 backdrop-blur-sm border ${colors.border} rounded-2xl p-5 hover:shadow-lg ${colors.glow} transition-all group`}>
      <div className="flex items-start justify-between mb-3">
        <div className={`p-2.5 ${colors.bg} rounded-xl group-hover:scale-110 transition-transform`}>
          {Icon && <Icon className={`w-5 h-5 ${colors.icon}`} />}
        </div>
        <span className="text-slate-500 text-xs flex items-center gap-1">
          <Activity className="w-3 h-3" />
          LIVE
        </span>
      </div>
      <div className="space-y-1">
        <p className="text-slate-400 text-sm">{title}</p>
        <p className={`text-2xl font-mono ${colors.text}`}>
          {displayValue}{unit}
        </p>
      </div>
    </div>
  );
};

// --- REUSABLE CHART COMPONENT ---
const CryptoChart = ({ symbol, color, onPriceUpdate }) => {
  const [data, setData] = useState([]);
  const [interval, setInterval] = useState('1M');
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);

  // Fetch Logic
  useEffect(() => {
    if (!symbol) return;
    
    // Set loading true immediately on symbol change to trigger loading state
    setLoading(true);
    
    const fetchData = async () => {
      try {
        const res = await fetch(`${FLASK_API_URL}/candles?product_id=${symbol}&granularity=ONE_HOUR`);
        if (res.ok) {
          const rawData = await res.json();
          if (Array.isArray(rawData) && rawData.length > 0) {
            const cleanData = rawData.map(d => ({
              ...d,
              close: parseFloat(d.close),
              start: parseFloat(d.start),
              time: new Date(d.start * 1000).toLocaleDateString()
            }));
            
            if (onPriceUpdate) {
                onPriceUpdate(cleanData[cleanData.length - 1].close);
            }
            setData(cleanData);
            setLastUpdate(new Date());
          } else {
            setData([]);
            if (onPriceUpdate) onPriceUpdate(null);
          }
        }
      } catch (e) {
        console.error(`Chart Error (${symbol}):`, e);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const id = setInterval(fetchData, POLLING_INTERVAL_MS);
    return () => clearInterval(id);
  }, [symbol, onPriceUpdate]); // Dependency on symbol ensures refetch on change

  // Filtering Logic
  const filteredData = React.useMemo(() => {
    if (!data.length) return [];
    const now = Date.now() / 1000;
    let cutoff = 0;
    switch (interval) {
      case '1D': cutoff = now - 86400; break;
      case '1W': cutoff = now - 604800; break;
      case '1M': cutoff = now - 2592000; break;
      case '3M': cutoff = now - 7776000; break;
      default: return data;
    }
    return data.filter(d => d.start >= cutoff);
  }, [data, interval]);

  return (
    <div className="chart-container-modern bg-slate-900/50 backdrop-blur-sm border border-slate-800/50 rounded-2xl p-6 h-full flex flex-col">
      <div className="chart-header-modern">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500/20 to-violet-500/20 rounded-xl flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h3 className="text-white">{symbol} Closing Price</h3>
            {lastUpdate && (
              <p className="text-slate-500 text-xs flex items-center gap-1 mt-1">
                <Clock className="w-3 h-3" />
                Updated: {lastUpdate.toLocaleTimeString()}
              </p>
            )}
          </div>
        </div>
        <div className="interval-controls-modern">
          {CHART_INTERVALS.map((int) => (
            <button 
              key={int} 
              className={`interval-button-modern ${interval === int ? 'active' : ''}`} 
              onClick={() => setInterval(int)}
            >
              {int}
            </button>
          ))}
        </div>
      </div>
      
      {/* STABILITY FIX: 
          Fixed min-height ensures container doesn't collapse during loading 
      */}
      <div className="chart-content flex-grow relative min-h-[300px]" style={{ marginTop: '20px' }}>
        <ResponsiveContainer width="100%" height={300}>
          {loading ? (
            <div className="chart-loading-state h-[300px] flex flex-col items-center justify-center text-slate-500">
              <div className="loading-spinner mb-4"></div>
              <p>Loading {symbol}...</p>
            </div>
          ) : filteredData.length > 0 ? (
            <LineChart data={filteredData}>
              <defs>
                <linearGradient id={`gradient-${symbol}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={color} stopOpacity={0.3}/>
                  <stop offset="95%" stopColor={color} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.2} vertical={false} />
              <XAxis 
                dataKey="time" 
                minTickGap={30} 
                stroke="#64748b"
                tick={{ fill: '#94a3b8', fontSize: 12 }}
                tickLine={{ stroke: '#475569' }}
              />
              <YAxis 
                domain={['auto', 'auto']} 
                stroke="#64748b"
                tick={{ fill: '#94a3b8', fontSize: 12 }}
                tickLine={{ stroke: '#475569' }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '14px' }} />
              <Line 
                type="monotone" 
                dataKey="close" 
                stroke={color} 
                name={`${symbol} Close`} 
                dot={false} 
                strokeWidth={2.5}
                activeDot={{ r: 6, fill: color, stroke: '#fff', strokeWidth: 2 }}
              />
            </LineChart>
          ) : (
            <div className="chart-empty-state h-[300px] flex flex-col items-center justify-center text-slate-500">
              <BarChart3 className="w-12 h-12 text-slate-600 mb-3" />
              <p>No Data Available</p>
            </div>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
};

// --- MAIN DASHBOARD ---
function Dashboard() {
  const [availableSymbols, setAvailableSymbols] = useState([]);
  const [selectedSymbol, setSelectedSymbol] = useState('');
  
  const [prices, setPrices] = useState({ btc: null, eth: null, selected: null });
  const [macroMetrics, setMacroMetrics] = useState({ cpi: null, fedRate: null });
  const [error, setError] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // 🚀 STABILITY FIX: Force scrollbar gutter to prevent horizontal jumps
  useEffect(() => {
    document.documentElement.style.scrollbarGutter = 'stable';
    // Cleanup not strictly necessary for root style, but good practice
    return () => { document.documentElement.style.scrollbarGutter = ''; };
  }, []);

  // Initial Load: Symbols & Macro
  useEffect(() => {
    const initFetch = async () => {
        try {
            setIsRefreshing(true);
            
            // A. Fetch Symbols
            const symRes = await fetch(`${FLASK_API_URL}/symbols`);
            if (symRes.ok) {
                const allSyms = await symRes.json();
                const filteredSyms = allSyms.filter(s => s !== 'BTC-USD' && s !== 'ETH-USD');
                
                setAvailableSymbols(filteredSyms);
                if (filteredSyms.length > 0) setSelectedSymbol(filteredSyms[0]);
            }

            // B. Fetch Macro Data
            const dataRes = await fetch(`${FLASK_API_URL}/data`);
            if (dataRes.ok) {
                const result = await dataRes.json();
                const btcData = result['BTC-USD'] || [];
                let metrics = { cpi: null, fedRate: null };
                const reversed = [...btcData].reverse();
                for (const obs of reversed) {
                    if (metrics.cpi === null && obs.cpi) metrics.cpi = obs.cpi;
                    if (metrics.fedRate === null && obs.fed_funds_rate) metrics.fedRate = obs.fed_funds_rate;
                    if (metrics.cpi && metrics.fedRate) break;
                }
                setMacroMetrics(metrics);
            }
        } catch (e) {
            console.error("Init Error:", e);
            setError("Failed to load dashboard configuration.");
        } finally {
            setIsRefreshing(false);
        }
    };
    initFetch();
  }, []);

  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Header */}
      <div className="border-b border-slate-800/50 bg-slate-900/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-blue-500 to-violet-600 rounded-xl shadow-lg shadow-blue-500/20">
                <Activity className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-white text-2xl font-bold">Crypto & Macro Dashboard</h1>
                <p className="text-slate-400 text-sm">Real-time market data & analytics</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <button 
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="p-2.5 bg-slate-800/50 border border-slate-700/50 rounded-xl text-slate-400 hover:text-blue-400 hover:border-blue-500/50 transition-all disabled:opacity-50 cursor-pointer"
              >
                <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
              </button>
              
              <div className="flex items-center gap-2 bg-slate-800/50 border border-slate-700/50 rounded-xl px-4 py-2">
                <Eye className="w-4 h-4 text-slate-400" />
                <span className="text-slate-400 text-sm">Select Chart:</span>
                <select 
                  value={selectedSymbol} 
                  onChange={(e) => setSelectedSymbol(e.target.value)}
                  className="bg-transparent border-none text-white focus:outline-none cursor-pointer w-32"
                >
                  {availableSymbols.length > 0 
                    ? availableSymbols.map(sym => <option key={sym} value={sym} className="text-black">{sym}</option>)
                    : <option className="text-black">Loading...</option>
                  }
                </select>
              </div>
              
              <div className="px-4 py-2 bg-emerald-500/10 border border-emerald-500/30 rounded-xl hidden md:block">
                <span className="text-emerald-400 text-sm flex items-center gap-2">
                  <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                  Live
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="container mx-auto px-6 py-4">
          <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-4 text-rose-400 text-center">
            {error}
          </div>
        </div>
      )}
      
      <div className="container mx-auto px-6 py-6 space-y-6">
        {/* Metrics Section */}
        <div>
          <div className="flex items-center gap-3 mb-4">
            <Zap className="w-5 h-5 text-blue-400" />
            <h2 className="text-white text-xl font-semibold">Key Metrics</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <MetricCard 
              title="Bitcoin (BTC)" 
              value={prices.btc} 
              icon={TrendingUp}
              color="blue"
            />
            <MetricCard 
              title="Ethereum (ETH)" 
              value={prices.eth} 
              icon={TrendingUp}
              color="violet"
            />
            <MetricCard 
              title={selectedSymbol || 'Selected Asset'} 
              value={prices.selected} 
              icon={DollarSign}
              color="emerald"
            />
            <MetricCard 
              title="Latest CPI" 
              value={macroMetrics.cpi} 
              icon={BarChart3}
              color="amber"
            />
            <MetricCard 
              title="Fed Funds Rate" 
              value={macroMetrics.fedRate} 
              unit="%" 
              icon={Percent}
              color="cyan"
            />
          </div>
        </div>

        {/* Charts Section */}
        <div>
          <div className="flex items-center gap-3 mb-4">
            <TrendingUp className="w-5 h-5 text-violet-400" />
            <h2 className="text-white text-xl font-semibold">Live Price Charts</h2>
          </div>
          
          <div className="space-y-6">
            {/* Dynamic Chart - Always Render Container for Stability */}
            <div className="highlight-chart min-h-[420px]">
              {selectedSymbol ? (
                <CryptoChart 
                  symbol={selectedSymbol} 
                  color="#10b981" 
                  onPriceUpdate={(p) => setPrices(prev => ({...prev, selected: p}))} 
                />
              ) : (
                // Fallback container to maintain height if no symbol selected
                <div className="chart-container-modern h-[420px] flex items-center justify-center text-slate-500">
                    <p>Select a symbol above to view data</p>
                </div>
              )}
            </div>

            {/* BTC & ETH Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="min-h-[420px]">
                  <CryptoChart 
                    symbol="BTC-USD" 
                    color="#3b82f6" 
                    onPriceUpdate={(p) => setPrices(prev => ({...prev, btc: p}))} 
                  />
              </div>
              
              <div className="min-h-[420px]">
                  <CryptoChart 
                    symbol="ETH-USD" 
                    color="#8b5cf6" 
                    onPriceUpdate={(p) => setPrices(prev => ({...prev, eth: p}))} 
                  />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
