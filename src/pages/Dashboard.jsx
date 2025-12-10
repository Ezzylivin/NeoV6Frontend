// ./pages/Dashboard.jsx
// 🚀 UPGRADE: v73.0 - "Reactive Metrics"
// Fixes: Live Price not updating when changing symbols.
// Changes: Added 'key' prop to charts, price reset logic, and race-condition guards.

import React, { useState, useEffect } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import './Dashboard.css';

const FLASK_API_URL = "https://crypto-lpzi.onrender.com/api";
const POLLING_INTERVAL_MS = 60000;
const CHART_INTERVALS = ['1D', '1W', '1M', '3M'];

// --- SHARED HELPERS ---

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
  let displayValue = 'Loading...'; // Default state
  
  if (value !== null && value !== undefined && !isNaN(value)) {
    if (title.includes('Price') || title.includes('-USD')) {
      displayValue = value.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 });
    } else {
      displayValue = value;
    }
  } else if (value === null) {
      displayValue = '...'; // Show dots while fetching
  }
  
  return (
    <div className="metric-card">
      <h3 className="card-title">{title}</h3>
      <div className="card-value">{displayValue}{unit}</div>
    </div>
  );
};

// --- REUSABLE CHART COMPONENT ---
const CryptoChart = ({ symbol, color, onPriceUpdate, isHighlight = false }) => {
  const [data, setData] = useState([]);
  const [interval, setInterval] = useState('1M');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true; // 🛡️ Prevent race conditions
    if (!symbol) return;

    const fetchData = async () => {
      try {
        const res = await fetch(`${FLASK_API_URL}/candles?product_id=${symbol}&granularity=ONE_HOUR`);
        
        if (res.ok && isMounted) {
          const rawData = await res.json();
          if (Array.isArray(rawData) && rawData.length > 0) {
            // Standardize Data
            const cleanData = rawData.map(d => ({
              ...d,
              close: parseFloat(d.close),
              start: parseFloat(d.start),
              time: new Date(d.start * 1000).toLocaleDateString()
            }));
            
            // ✅ Update Parent Metric immediately
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
        if (isMounted && onPriceUpdate) onPriceUpdate(null);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchData();
    const id = setInterval(fetchData, POLLING_INTERVAL_MS);
    
    // Cleanup
    return () => {
        isMounted = false;
        clearInterval(id);
    };
  }, [symbol]); // Dependencies: only re-run if symbol changes

  // Local Filtering Logic
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
    <div className={`chart-container ${isHighlight ? 'highlight-chart' : ''}`}>
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
  
  // Prices State
  const [prices, setPrices] = useState({ btc: null, eth: null, selected: null });
  const [macroMetrics, setMacroMetrics] = useState({ cpi: null, fedRate: null });
  const [error, setError] = useState(null);

  // 1. Initial Load
  useEffect(() => {
    const initFetch = async () => {
        try {
            // A. Fetch Symbols
            const symRes = await fetch(`${FLASK_API_URL}/symbols`);
            if (symRes.ok) {
                const allSyms = await symRes.json();
                // Remove BTC/ETH from dropdown
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
        }
    };
    initFetch();
  }, []);

  // 2. Reset Selected Price when Symbol Changes
  // This ensures the "Live Price" card shows "..." while loading the new coin
  useEffect(() => {
      setPrices(prev => ({ ...prev, selected: null }));
  }, [selectedSymbol]);

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
      
      {/* 1. DYNAMIC CHART (Using Key to force re-render) */}
      {selectedSymbol && (
        <div className="highlight-chart-wrapper">
            <CryptoChart 
                key={selectedSymbol}  // 🚀 CRITICAL: Forces fresh mount on change
                symbol={selectedSymbol} 
                color="#82ca9d" 
                onPriceUpdate={(p) => setPrices(prev => ({...prev, selected: p}))} 
                isHighlight={true}
            />
        </div>
      )}

      {/* 2. BTC CHART */}
      <CryptoChart 
        key="BTC-USD"
        symbol="BTC-USD" 
        color="var(--btc-color)" 
        onPriceUpdate={(p) => setPrices(prev => ({...prev, btc: p}))} 
      />

      {/* 3. ETH CHART */}
      <CryptoChart 
        key="ETH-USD"
        symbol="ETH-USD" 
        color="var(--eth-color)" 
        onPriceUpdate={(p) => setPrices(prev => ({...prev, eth: p}))} 
      />
    </div>
  );
}

export default Dashboard;
