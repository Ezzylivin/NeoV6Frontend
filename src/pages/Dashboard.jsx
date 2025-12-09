// ./pages/Dashboard.jsx
// FULL UPGRADED VERSION
// Features: 
// - Fetches symbols from ML Server (Live List)
// - Fetches candles from ML Server (Live Data)
// - Maintains Macro Data

import React, { useState, useEffect } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import api from "../api/apiClient"; // Assuming you have an axios instance pointing to ML server
import './Dashboard.css';

const POLLING_INTERVAL_MS = 30000;
const chartIntervals = ['1D', '1W', '1M', '3M'];

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const formatCurrency = (val) => val ? parseFloat(val).toLocaleString('en-US', { style: 'currency', currency: 'USD' }) : 'N/A';
    const timestamp = data.start ? parseFloat(data.start) : data.time;
    const date = new Date(timestamp * 1000);
    return (
      <div className="custom-tooltip">
        <p className="tooltip-label">{date.toLocaleString()}</p>
        <p className="tooltip-item">{`Open: ${formatCurrency(data.open)}`}</p>
        <p className="tooltip-item">{`High: ${formatCurrency(data.high)}`}</p>
        <p className="tooltip-item">{`Low: ${formatCurrency(data.low)}`}</p>
        <p className="tooltip-item-close">{`Close: ${formatCurrency(data.close)}`}</p>
      </div>
    );
  }
  return null;
};

function MetricCard({ title, value, unit = '' }) {
  let displayValue = 'N/A';
  if (value !== null && value !== undefined && !isNaN(value)) {
    if (title.includes('Price') || title.includes('-USD')) {
      displayValue = value.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 });
    } else {
      displayValue = value;
    }
  }
  return (
    <div className="metric-card">
      <h3 className="card-title">{title}</h3>
      <div className="card-value">{displayValue}{unit}</div>
    </div>
  );
}

const IntervalButtons = ({ intervals, activeInterval, onIntervalChange }) => (
  <div className="interval-controls">
    {intervals.map((interval) => (
      <button key={interval} className={`interval-button ${activeInterval === interval ? 'active' : ''}`} onClick={() => onIntervalChange(interval)}>
        {interval}
      </button>
    ))}
  </div>
);

function Dashboard() {
  // Data States
  const [availableSymbols, setAvailableSymbols] = useState([]);
  const [selectedSymbol, setSelectedSymbol] = useState('');
  
  // Chart Data
  const [masterBtcData, setMasterBtcData] = useState([]);
  const [masterEthData, setMasterEthData] = useState([]);
  const [selectedChartData, setSelectedChartData] = useState([]);

  // Filtered Data
  const [displayedBtc, setDisplayedBtc] = useState([]);
  const [displayedEth, setDisplayedEth] = useState([]);
  const [displayedSelected, setDisplayedSelected] = useState([]);

  // Intervals
  const [btcInterval, setBtcInterval] = useState('1M');
  const [ethInterval, setEthInterval] = useState('1M');
  const [selectedInterval, setSelectedInterval] = useState('1M');

  // Metrics
  const [macroMetrics, setMacroMetrics] = useState({ cpi: null, fedRate: null });
  const [latestBtc, setLatestBtc] = useState(null);
  const [latestEth, setLatestEth] = useState(null);
  const [latestSelected, setLatestSelected] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 1. Initial Load: Get Symbols & Macro Data
  useEffect(() => {
    const initFetch = async () => {
        try {
            // A. Fetch Symbols from ML Server (Your custom backend)
            // If api.get fails, fall back to hardcoded list
            try {
                const res = await api.get('/data/symbols');
                setAvailableSymbols(res.data);
                if (res.data.length > 0) setSelectedSymbol(res.data[0]);
            } catch (err) {
                console.error("ML Server symbol fetch failed, using fallback");
                setAvailableSymbols(["BTC-USD", "ETH-USD", "SOL-USD", "XRP-USD"]);
                setSelectedSymbol("BTC-USD");
            }

            // B. Fetch BTC/ETH/Macro from External API (Legacy Source)
            const response = await fetch('https://crypto-lpzi.onrender.com/api/data');
            if (response.ok) {
                const text = await response.text();
                const result = JSON.parse(text.replace(/NaN/g, 'null'));
                
                const process = (arr) => arr.map(d => ({ ...d, close: parseFloat(d.close), time: d.start ? new Date(parseFloat(d.start) * 1000).toLocaleDateString() : d.date }));
                const cleanBtc = process(result['BTC-USD'] || []);
                const cleanEth = process(result['ETH-USD'] || []);
                
                setMasterBtcData(cleanBtc);
                setMasterEthData(cleanEth);
                if(cleanBtc.length) setLatestBtc(cleanBtc[cleanBtc.length-1].close);
                if(cleanEth.length) setLatestEth(cleanEth[cleanEth.length-1].close);

                // Macro
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
            setError("Failed to load initial data");
        } finally {
            setLoading(false);
        }
    };
    initFetch();
  }, []);

  // 2. Fetch Selected Symbol Data (From ML Server)
  useEffect(() => {
      if (!selectedSymbol) return;
      
      const fetchSelected = async () => {
          try {
              // Hit the new ML Server Endpoint
              const res = await api.get(`/data/candles?symbol=${selectedSymbol}&timeframe=1h`);
              if (Array.isArray(res.data)) {
                  // Normalize data
                  const clean = res.data.map(d => ({
                      ...d,
                      close: parseFloat(d.close),
                      time: new Date(d.start * 1000).toLocaleDateString() // Mapping for XAxis
                  }));
                  setSelectedChartData(clean);
                  if (clean.length > 0) setLatestSelected(clean[clean.length - 1].close);
              }
          } catch (e) {
              console.error("Failed to fetch selected symbol:", e);
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

  if (loading) return <div className="dashboard-container">Loading...</div>;

  return (
    <div className="dashboard-container">
      {error && <div className="error-banner">{error}</div>}
      
      <div className="header-row">
        <h1 className="header">Crypto & Macro Dashboard</h1>
        <div className="symbol-selector">
          <span>Select Chart:</span>
          <select value={selectedSymbol} onChange={(e) => setSelectedSymbol(e.target.value)}>
            {availableSymbols.map(sym => <option key={sym} value={sym}>{sym}</option>)}
          </select>
        </div>
      </div>
      
      <h2 className="sub-header">Key Metrics</h2>
      <div className="card-row">
        <MetricCard title="Live BTC Price" value={latestBtc} />
        <MetricCard title="Live ETH Price" value={latestEth} />
        {selectedSymbol && <MetricCard title={`Live ${selectedSymbol}`} value={latestSelected} />}
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
            <LineChart data={displayedSelected}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis domain={['auto', 'auto']} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Line type="monotone" dataKey="close" stroke="#82ca9d" name={`${selectedSymbol} Close`} dot={false} strokeWidth={2} />
            </LineChart>
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
            <XAxis dataKey="time" />
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
            <XAxis dataKey="time" />
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
