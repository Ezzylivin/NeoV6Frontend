// ./pages/Dashboard.jsx
// 🚀 UPGRADE: v67.0 - "Precision Dashboard"
// Fixes: Tooltip dates, Live Price updates, Symbol Dropdown

import React, { useState, useEffect } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { dashboard } from "../api/dashboard.js"; 
import './Dashboard.css';

const POLLING_INTERVAL_MS = 30000;
const chartIntervals = ['1D', '1W', '1M', '3M'];

// --- CUSTOM TOOLTIP (Fixed Date Parsing) ---
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const formatCurrency = (val) => val ? parseFloat(val).toLocaleString('en-US', { style: 'currency', currency: 'USD' }) : 'N/A';
    
    // 🚀 FIX: Use 'start' (timestamp) if available, otherwise parse 'time'
    let dateObj;
    if (data.start) {
        dateObj = new Date(data.start * 1000);
    } else {
        dateObj = new Date(label);
    }
    
    const formattedDate = dateObj.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit' });

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

// --- METRIC CARD ---
function MetricCard({ title, value, unit = '' }) {
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
}

// --- INTERVAL BUTTONS ---
const IntervalButtons = ({ intervals, activeInterval, onIntervalChange }) => (
  <div className="interval-controls">
    {intervals.map((interval) => (
      <button key={interval} className={`interval-button ${activeInterval === activeInterval ? (activeInterval === interval ? 'active' : '') : ''}`} onClick={() => onIntervalChange(interval)}>
        {interval}
      </button>
    ))}
  </div>
);

// --- MAIN DASHBOARD ---
function Dashboard() {
  const [availableSymbols, setAvailableSymbols] = useState([]);
  const [selectedSymbol, setSelectedSymbol] = useState('');
  
  const [masterBtcData, setMasterBtcData] = useState([]);
  const [masterEthData, setMasterEthData] = useState([]);
  const [selectedChartData, setSelectedChartData] = useState([]);

  const [displayedBtc, setDisplayedBtc] = useState([]);
  const [displayedEth, setDisplayedEth] = useState([]);
  const [displayedSelected, setDisplayedSelected] = useState([]);

  const [btcInterval, setBtcInterval] = useState('1M');
  const [ethInterval, setEthInterval] = useState('1M');
  const [selectedInterval, setSelectedInterval] = useState('1M');

  const [macroMetrics, setMacroMetrics] = useState({ cpi: null, fedRate: null });
  const [latestBtc, setLatestBtc] = useState(null);
  const [latestEth, setLatestEth] = useState(null);
  const [latestSelected, setLatestSelected] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 1. Initial Data Fetch (Symbols + Macro + BTC/ETH)
  useEffect(() => {
    const initFetch = async () => {
        try {
            // A. Fetch Symbols from your ML Server
            try {
                const res = await api.get('/data/symbols');
                if (Array.isArray(res.data)) {
                    setAvailableSymbols(res.data);
                    if (res.data.length > 0) setSelectedSymbol(res.data[0]);
                }
            } catch (err) {
                console.warn("ML Server symbol fetch failed, using fallback.");
                setAvailableSymbols(["BTC-USD", "ETH-USD", "SOL-USD", "XRP-USD", "DOGE-USD"]);
                setSelectedSymbol("BTC-USD");
            }

            // B. Fetch Macro/BTC/ETH from Legacy API
            const response = await fetch('https://crypto-lpzi.onrender.com/api/data');
            if (response.ok) {
                const text = await response.text();
                const result = JSON.parse(text.replace(/NaN/g, 'null'));
                
                const process = (arr) => arr.map(d => ({ 
                    ...d, 
                    close: parseFloat(d.close), 
                    // Use 'start' timestamp if available for accurate sorting/filtering
                    start: d.start ? parseFloat(d.start) : (new Date(d.date).getTime() / 1000),
                    time: d.start ? new Date(parseFloat(d.start) * 1000).toLocaleDateString() : d.date 
                }));

                const cleanBtc = process(result['BTC-USD'] || []);
                const cleanEth = process(result['ETH-USD'] || []);
                
                setMasterBtcData(cleanBtc);
                setMasterEthData(cleanEth);
                
                if(cleanBtc.length) setLatestBtc(cleanBtc[cleanBtc.length-1].close);
                if(cleanEth.length) setLatestEth(cleanEth[cleanEth.length-1].close);

                // Extract Macro Metrics
                let metrics = { cpi: null, fedRate: null };
                const reversed = [...cleanBtc].reverse();
                for (const obs of reversed) {
                    if (metrics.cpi === null && obs.cpi) metrics.cpi = obs.cpi;
                    if (metrics.fedRate === null && obs.fed_funds_rate) metrics.fedRate = obs.fed_funds_rate;
                    if (metrics.cpi && metrics.fedRate) break;
                }
                setMacroMetrics(metrics);
            }
        } catch (e) {
            console.error("Init Error:", e);
            setError("Failed to load initial data. Check console.");
        } finally {
            setLoading(false);
        }
    };
    initFetch();
  }, []);

  // 2. Fetch Selected Symbol Data (Dynamic)
  useEffect(() => {
      if (!selectedSymbol) return;
      
      const fetchSelected = async () => {
          try {
              // 🚀 Request data from your ML Server
              const res = await api.get(`/data/candles?symbol=${selectedSymbol}&timeframe=1h`);
              
              if (Array.isArray(res.data) && res.data.length > 0) {
                  const clean = res.data.map(d => ({
                      ...d,
                      close: parseFloat(d.close),
                      start: d.start, // Keep raw timestamp for logic
                      time: new Date(d.start * 1000).toLocaleDateString() // Readable string for XAxis
                  }));
                  
                  setSelectedChartData(clean);
                  setLatestSelected(clean[clean.length - 1].close);
              } else {
                  console.warn(`No data returned for ${selectedSymbol}`);
                  setLatestSelected(null);
                  setSelectedChartData([]);
              }
          } catch (e) {
              console.error(`Failed to fetch ${selectedSymbol}:`, e);
              setLatestSelected(null);
          }
      };
      
      fetchSelected();
      const id = setInterval(fetchSelected, POLLING_INTERVAL_MS);
      return () => clearInterval(id);
  }, [selectedSymbol]);

  // Filtering Logic
  const filterByInterval = (data, interval) => {
    if (!data || data.length === 0) return [];
    const now = Date.now() / 1000;
    let cutoff = 0;
    switch (interval) {
      case '1D': cutoff = now - 86400; break;
      case '1W': cutoff = now - 604800; break;
      case '1M': cutoff = now - 2592000; break;
      case '3M': cutoff = now - 7776000; break;
      default: return data;
    }
    return data.filter(d => parseFloat(d.start) >= cutoff);
  };

  useEffect(() => setDisplayedBtc(filterByInterval(masterBtcData, btcInterval)), [masterBtcData, btcInterval]);
  useEffect(() => setDisplayedEth(filterByInterval(masterEthData, ethInterval)), [masterEthData, ethInterval]);
  useEffect(() => setDisplayedSelected(filterByInterval(selectedChartData, selectedInterval)), [selectedChartData, selectedInterval]);

  if (loading) return <div className="dashboard-container">Loading Dashboard...</div>;

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
        <MetricCard title="Live BTC Price" value={latestBtc} />
        <MetricCard title="Live ETH Price" value={latestEth} />
        <MetricCard title={`Live ${selectedSymbol || 'Asset'}`} value={latestSelected} />
        <MetricCard title="Latest CPI" value={macroMetrics.cpi} />
        <MetricCard title="Fed Funds Rate" value={macroMetrics.fedRate} unit="%" />
      </div>

      <h2 className="sub-header">Live Price Charts</h2>
      
      {/* Dynamic Chart */}
      {selectedSymbol && (
        <div className="chart-container highlight-chart">
          <div className="chart-header">
            <h3>{selectedSymbol} Closing Price</h3>
            <IntervalButtons intervals={chartIntervals} activeInterval={selectedInterval} onIntervalChange={setSelectedInterval} />
          </div>
          <ResponsiveContainer width="100%" height={300}>
            {displayedSelected.length > 0 ? (
                <LineChart data={displayedSelected}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" minTickGap={30} />
                <YAxis domain={['auto', 'auto']} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Line type="monotone" dataKey="close" stroke="#82ca9d" name={`${selectedSymbol} Close`} dot={false} strokeWidth={2} />
                </LineChart>
            ) : (
                <div style={{color: '#aaa', textAlign: 'center', paddingTop: '100px'}}>Loading Data or No Data Available...</div>
            )}
          </ResponsiveContainer>
        </div>
      )}

      {/* BTC Chart */}
      <div className="chart-container">
        <div className="chart-header">
          <h3>BTC-USD Closing Price</h3>
          <IntervalButtons intervals={chartIntervals} activeInterval={btcInterval} onIntervalChange={setBtcInterval} />
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={displayedBtc}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="time" minTickGap={30} />
            <YAxis domain={['auto', 'auto']} />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Line type="monotone" dataKey="close" stroke="var(--btc-color)" name="BTC Close" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* ETH Chart */}
      <div className="chart-container">
        <div className="chart-header">
          <h3>ETH-USD Closing Price</h3>
          <IntervalButtons intervals={chartIntervals} activeInterval={ethInterval} onIntervalChange={setEthInterval} />
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={displayedEth}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="time" minTickGap={30} />
            <YAxis domain={['auto', 'auto']} />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Line type="monotone" dataKey="close" stroke="var(--eth-color)" name="ETH Close" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default Dashboard;
