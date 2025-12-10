// ./pages/Dashboard.jsx
// 🚀 UPGRADE: v71.0 - "Unified Flask Frontend"
// Fixes: "api is not defined" error, N/A data, missing charts.

import React, { useState, useEffect } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import './Dashboard.css';

// 🚀 CONFIG: Everything now points to FLASK
const API_URL = "https://crypto-lpzi.onrender.com/api";
const POLLING_INTERVAL_MS = 60000;
const chartIntervals = ['1D', '1W', '1M', '3M'];

// --- HELPERS ---
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const formatCurrency = (val) => val ? parseFloat(val).toLocaleString('en-US', { style: 'currency', currency: 'USD' }) : 'N/A';
    
    let dateObj;
    if (data.start) dateObj = new Date(data.start * 1000);
    else dateObj = new Date(label);
    
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

const IntervalButtons = ({ intervals, activeInterval, onIntervalChange }) => (
  <div className="interval-controls">
    {intervals.map((interval) => (
      <button key={interval} className={`interval-button ${activeInterval === interval ? 'active' : ''}`} onClick={() => onIntervalChange(interval)}>
        {interval}
      </button>
    ))}
  </div>
);

// --- MAIN COMPONENT ---
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

  // 1. Initial Data Fetch
  useEffect(() => {
    const initFetch = async () => {
        try {
            // A. Fetch Symbols (From Flask)
            try {
                const symRes = await fetch(`${API_URL}/symbols`);
                if (symRes.ok) {
                    const symbols = await symRes.json();
                    setAvailableSymbols(symbols);
                    if (symbols.length > 0) setSelectedSymbol(symbols[0]); 
                } else {
                    throw new Error("Symbols endpoint failed");
                }
            } catch (err) {
                console.warn("Symbol fetch failed, using fallback.", err);
                setAvailableSymbols(["BTC-USD", "ETH-USD", "SOL-USD", "XRP-USD"]);
                setSelectedSymbol("BTC-USD");
            }

            // B. Fetch Legacy Data (BTC/ETH/Macro) (From Flask)
            const response = await fetch(`${API_URL}/data`);
            if (response.ok) {
                const result = await response.json();
                const process = (arr) => arr.map(d => ({ 
                    ...d, 
                    close: parseFloat(d.close), 
                    start: d.start ? parseFloat(d.start) : (new Date(d.time).getTime() / 1000),
                    time: d.time 
                }));

                const cleanBtc = process(result['BTC-USD'] || []);
                const cleanEth = process(result['ETH-USD'] || []);
                
                setMasterBtcData(cleanBtc);
                setMasterEthData(cleanEth);
                
                if(cleanBtc.length) setLatestBtc(cleanBtc[cleanBtc.length-1].close);
                if(cleanEth.length) setLatestEth(cleanEth[cleanEth.length-1].close);

                let metrics = { cpi: null, fedRate: null };
                if (cleanBtc.length > 0) {
                    const reversed = [...cleanBtc].reverse();
                    for (const obs of reversed) {
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
        } finally {
            setLoading(false);
        }
    };
    initFetch();
  }, []);

  // 2. Fetch Selected Symbol Data (From Flask)
  useEffect(() => {
      if (!selectedSymbol) return;
      
      const fetchSelected = async () => {
          try {
              const res = await fetch(`${API_URL}/candles?product_id=${selectedSymbol}&granularity=ONE_HOUR`);
              
              if (res.ok) {
                  const data = await res.json();
                  if (Array.isArray(data) && data.length > 0) {
                      const clean = data.map(d => ({
                          ...d,
                          close: parseFloat(d.close),
                          start: parseFloat(d.start),
                          time: new Date(d.start * 1000).toLocaleDateString()
                      }));
                      setSelectedChartData(clean);
                      setLatestSelected(clean[clean.length - 1].close);
                  } else {
                      setSelectedChartData([]);
                      setLatestSelected(null);
                  }
              }
          } catch (e) {
              console.error(`Failed to fetch ${selectedSymbol}:`, e);
              setLatestSelected(null);
              setSelectedChartData([]);
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
                <div style={{color: '#aaa', textAlign: 'center', paddingTop: '100px'}}>
                    {availableSymbols.length === 0 ? "Loading Symbols..." : "Loading Data or No Data Available..."}
                </div>
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
