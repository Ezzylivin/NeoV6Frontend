// ./pages/Dashboard.jsx
// 🚀 UPGRADE: v72.0 - "Unified Charts"
// Features: 
// 1. BTC & ETH now use the new high-speed Candle API (same as the dropdown).
// 2. Dropdown explicitly removes BTC/ETH (no duplicates).
// 3. Reusable 'CryptoChart' component for cleaner code.

import React, { useState, useEffect } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import './Dashboard.css';

const FLASK_API_URL = "https://crypto-lpzi.onrender.com/api";
const POLLING_INTERVAL_MS = 60000;
const CHART_INTERVALS = ['1D', '1W', '1M', '3M'];

// --- SHARED COMPONENTS ---

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const formatCurrency = (val) => val ? parseFloat(val).toLocaleString('en-US', { style: 'currency', currency: 'USD' }) : 'N/A';
    
    // Handle both timestamp (seconds) and ISO string dates
    const dateObj = data.start ? new Date(data.start * 1000) : new Date(label);
    const formattedDate = !isNaN(dateObj) 
        ? dateObj.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit' })
        : label;

    return (
      <div className="custom-tooltip">
        <p className="tooltip-label">{formattedDate}</p>
        <p className="tooltip-item">{`Open: ${formatCurrency(data.open)}`}</p>
        <p className="tooltip-item">{`High: ${formatCurrency(data.high)}`}</p>
        <p className="tooltip-item">{`Low: ${formatCurrency(data.low)}`}</p>
        <p className="tooltip-item-close">{`Close: ${formatCurrency(data.close)}`}</p>
      </div>
    );
  }
  return null;
};

const MetricCard = ({ title, value, unit = '' }) => {
  let displayValue = 'Loading...';
  if (value !== null && value !== undefined && !isNaN(value)) {
    if (title.includes('Price') || title.includes('-USD')) {
      displayValue = value.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 });
    } else {
      displayValue = value;
    }
  } else if (value === null) {
      displayValue = 'N/A';
  }
  return (
    <div className="metric-card">
      <h3 className="card-title">{title}</h3>
      <div className="card-value">{displayValue}{unit}</div>
    </div>
  );
};

// --- REUSABLE CHART COMPONENT ---
// This ensures BTC, ETH, and Selected charts all behave exactly the same.
const CryptoChart = ({ symbol, color, onPriceUpdate }) => {
  const [data, setData] = useState([]);
  const [interval, setInterval] = useState('1M');
  const [loading, setLoading] = useState(true);

  // Fetch Logic
  useEffect(() => {
    if (!symbol) return;
    const fetchData = async () => {
      // Map frontend interval to backend granularity if needed
      // (Your backend handles ONE_HOUR vs ONE_DAY logic based on granularity arg)
      // For this simplified version, we request ONE_HOUR and filter locally, 
      // or we could ask backend for specific granularity.
      // Let's stick to the working ONE_HOUR fetch and local filter for responsiveness.
      try {
        const res = await fetch(`${FLASK_API_URL}/candles?product_id=${symbol}&granularity=ONE_HOUR`);
        if (res.ok) {
          const rawData = await res.json();
          if (Array.isArray(rawData) && rawData.length > 0) {
            // Standardize Data
            const cleanData = rawData.map(d => ({
              ...d,
              close: parseFloat(d.close),
              start: parseFloat(d.start),
              time: new Date(d.start * 1000).toLocaleDateString()
            }));
            
            // Notify Parent of latest price
            if (onPriceUpdate) {
                onPriceUpdate(cleanData[cleanData.length - 1].close);
            }
            setData(cleanData);
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
  }, [symbol, onPriceUpdate]);

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
    <div className="chart-container">
      <div className="chart-header">
        <h3>{symbol} Closing Price</h3>
        <div className="interval-controls">
          {CHART_INTERVALS.map((int) => (
            <button 
              key={int} 
              className={`interval-button ${interval === int ? 'active' : ''}`} 
              onClick={() => setInterval(int)}
            >
              {int}
            </button>
          ))}
        </div>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        {loading ? (
            <div style={{color: '#aaa', textAlign: 'center', paddingTop: '100px'}}>Loading {symbol}...</div>
        ) : filteredData.length > 0 ? (
            <LineChart data={filteredData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" minTickGap={30} />
                <YAxis domain={['auto', 'auto']} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Line type="monotone" dataKey="close" stroke={color} name={`${symbol} Close`} dot={false} strokeWidth={2} />
            </LineChart>
        ) : (
            <div style={{color: '#aaa', textAlign: 'center', paddingTop: '100px'}}>No Data Available</div>
        )}
      </ResponsiveContainer>
    </div>
  );
};

// --- MAIN DASHBOARD ---
function Dashboard() {
  const [availableSymbols, setAvailableSymbols] = useState([]);
  const [selectedSymbol, setSelectedSymbol] = useState('');
  
  // Prices State (Lifted up for Metrics Cards)
  const [prices, setPrices] = useState({ btc: null, eth: null, selected: null });
  const [macroMetrics, setMacroMetrics] = useState({ cpi: null, fedRate: null });
  const [error, setError] = useState(null);

  // 1. Initial Load: Symbols & Macro
  useEffect(() => {
    const initFetch = async () => {
        try {
            // A. Fetch Symbols
            const symRes = await fetch(`${FLASK_API_URL}/symbols`);
            if (symRes.ok) {
                const allSyms = await symRes.json();
                // 🚀 FILTER: Remove BTC and ETH from the dropdown list
                const filteredSyms = allSyms.filter(s => s !== 'BTC-USD' && s !== 'ETH-USD');
                
                setAvailableSymbols(filteredSyms);
                if (filteredSyms.length > 0) setSelectedSymbol(filteredSyms[0]);
            }

            // B. Fetch Macro Data (Legacy Endpoint)
            // We only need this for CPI and Fed Rate now
            const dataRes = await fetch(`${FLASK_API_URL}/data`);
            if (dataRes.ok) {
                const result = await dataRes.json();
                // Extract Macro from BTC data (it's embedded there)
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
        }
    };
    initFetch();
  }, []);

  return (
    <div className="dashboard-container">
      {error && <div className="error-banner">{error}</div>}
      
      <div className="header-row">
        <h1 className="header">Crypto & Macro Dashboard</h1>
        <div className="symbol-selector">
          <span>Select Chart:</span>
          <select value={selectedSymbol} onChange={(e) => setSelectedSymbol(e.target.value)}>
             {availableSymbols.length > 0 
                ? availableSymbols.map(sym => <option key={sym} value={sym}>{sym}</option>)
                : <option>Loading...</option>
             }
          </select>
        </div>
      </div>
      
      <h2 className="sub-header">Key Metrics</h2>
      <div className="card-row">
        <MetricCard title="Live BTC Price" value={prices.btc} />
        <MetricCard title="Live ETH Price" value={prices.eth} />
        <MetricCard title={`Live ${selectedSymbol || 'Asset'}`} value={prices.selected} />
        <MetricCard title="Latest CPI" value={macroMetrics.cpi} />
        <MetricCard title="Fed Funds Rate" value={macroMetrics.fedRate} unit="%" />
      </div>

      <h2 className="sub-header">Live Price Charts</h2>
      
      {/* 1. Dynamic Chart */}
      {selectedSymbol && (
        <div className="highlight-chart-wrapper">
            <CryptoChart 
                symbol={selectedSymbol} 
                color="#82ca9d" 
                onPriceUpdate={(p) => setPrices(prev => ({...prev, selected: p}))} 
            />
        </div>
      )}

      {/* 2. BTC Chart (Now uses same component) */}
      <CryptoChart 
        symbol="BTC-USD" 
        color="var(--btc-color)" 
        onPriceUpdate={(p) => setPrices(prev => ({...prev, btc: p}))} 
      />

      {/* 3. ETH Chart (Now uses same component) */}
      <CryptoChart 
        symbol="ETH-USD" 
        color="var(--eth-color)" 
        onPriceUpdate={(p) => setPrices(prev => ({...prev, eth: p}))} 
      />
    </div>
  );
}

export default Dashboard;
