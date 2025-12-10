// ./pages/Dashboard.jsx
// 🚀 UPGRADE: v76.0 - "Throttled Dashboard"
// Fixes: "ERR_INSUFFICIENT_RESOURCES" by preventing request flooding.
// Changes: Added fetch guards, memoization, and strict effect dependencies.

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import './Dashboard.css';

const FLASK_API_URL = "https://crypto-lpzi.onrender.com/api";
const POLLING_INTERVAL_MS = 60000;
const CHART_INTERVALS = ['1D', '1W', '1M', '3M'];

// --- HELPERS ---
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
  let displayValue = 'Loading...';
  if (value !== null && value !== undefined && !isNaN(value)) {
    if (title.includes('Price') || title.includes('-USD')) {
      displayValue = value.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 });
    } else {
      displayValue = value;
    }
  } else if (value === null) {
      displayValue = '...';
  }
  return (
    <div className="metric-card">
      <h3 className="card-title">{title}</h3>
      <div className="card-value">{displayValue}{unit}</div>
    </div>
  );
};

// --- REUSABLE CHART COMPONENT ---
// Uses React.memo to prevent re-renders unless props change
const CryptoChart = React.memo(({ symbol, color, onPriceUpdate, isHighlight = false }) => {
  const [data, setData] = useState([]);
  const [interval, setInterval] = useState('1M');
  const [loading, setLoading] = useState(true);
  const fetchingRef = useRef(false); // 🛡️ Prevent double fetches

  const fetchData = useCallback(async () => {
    if (fetchingRef.current) return; // Stop if already busy
    fetchingRef.current = true;

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
          
          setData(cleanData);
          // Only notify if provided
          if (onPriceUpdate) onPriceUpdate(cleanData[cleanData.length - 1].close);
        } else {
          setData([]);
        }
      }
    } catch (e) {
      console.error(`Chart Error (${symbol}):`, e);
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  }, [symbol, onPriceUpdate]);

  useEffect(() => {
    fetchData();
    const id = setInterval(fetchData, POLLING_INTERVAL_MS);
    return () => clearInterval(id);
  }, [fetchData]); // Only re-run if symbol changes

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
            <div style={{color: '#aaa', textAlign: 'center', paddingTop: '100px'}}>Loading...</div>
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
});

// --- MAIN DASHBOARD ---
function Dashboard() {
  const [availableSymbols, setAvailableSymbols] = useState([]);
  const [selectedSymbol, setSelectedSymbol] = useState('');
  
  const [prices, setPrices] = useState({ btc: null, eth: null, selected: null });
  const [macroMetrics, setMacroMetrics] = useState({ cpi: null, fedRate: null });
  const [error, setError] = useState(null);

  // 1. Initial Load
  useEffect(() => {
    const initFetch = async () => {
        try {
            const symRes = await fetch(`${FLASK_API_URL}/symbols`);
            if (symRes.ok) {
                const allSyms = await symRes.json();
                const filteredSyms = allSyms.filter(s => s !== 'BTC-USD' && s !== 'ETH-USD');
                setAvailableSymbols(filteredSyms);
                if (filteredSyms.length > 0) setSelectedSymbol(filteredSyms[0]);
            }

            const dataRes = await fetch(`${FLASK_API_URL}/data`);
            if (dataRes.ok) {
                const result = await dataRes.json();
                const btcData = result['BTC-USD'] || [];
                // Extract Macro
                let metrics = { cpi: null, fedRate: null };
                if (btcData.length > 0) {
                    // Safe reverse search for macro data
                    for (let i = btcData.length - 1; i >= 0; i--) {
                        const obs = btcData[i];
                        if (metrics.cpi === null && obs.cpi) metrics.cpi = obs.cpi;
                        if (metrics.fedRate === null && obs.fed_funds_rate) metrics.fedRate = obs.fed_funds_rate;
                        if (metrics.cpi && metrics.fedRate) break;
                    }
                }
                setMacroMetrics(metrics);
            }
        } catch (e) {
            console.error("Init Error:", e);
            setError("Failed to load dashboard data.");
        }
    };
    initFetch();
  }, []);

  // 2. Fast Fetch Price Logic
  useEffect(() => {
      if (!selectedSymbol) return;
      setPrices(prev => ({ ...prev, selected: null })); // Reset to "..."

      const fetchPriceFast = async () => {
          try {
              const res = await fetch(`${FLASK_API_URL}/candles?product_id=${selectedSymbol}&granularity=ONE_HOUR&limit=1`);
              if (res.ok) {
                  const data = await res.json();
                  if (Array.isArray(data) && data.length > 0) {
                      setPrices(prev => ({ ...prev, selected: parseFloat(data[0].close) }));
                  }
              }
          } catch (e) {
              console.error("Fast price fetch failed:", e);
          }
      };
      fetchPriceFast();
  }, [selectedSymbol]);

  // Callbacks for Chart Updates (Memoized to prevent re-renders)
  const updateBtc = useCallback((p) => setPrices(prev => ({...prev, btc: p})), []);
  const updateEth = useCallback((p) => setPrices(prev => ({...prev, eth: p})), []);

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
      
      {/* 1. DYNAMIC CHART */}
      {selectedSymbol && (
        <div className="highlight-chart-wrapper">
            <CryptoChart 
                key={selectedSymbol} 
                symbol={selectedSymbol} 
                color="#82ca9d" 
                onPriceUpdate={null} // Handled by Fast-Fetch
                isHighlight={true}
            />
        </div>
      )}

      {/* 2. BTC CHART */}
      <CryptoChart 
        key="BTC-USD"
        symbol="BTC-USD" 
        color="var(--btc-color)" 
        onPriceUpdate={updateBtc} 
      />

      {/* 3. ETH CHART */}
      <CryptoChart 
        key="ETH-USD"
        symbol="ETH-USD" 
        color="var(--eth-color)" 
        onPriceUpdate={updateEth} 
      />
    </div>
  );
}

export default Dashboard;
