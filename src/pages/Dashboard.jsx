// ./pages/Dashboard.jsx
// FULL UPGRADED VERSION
// Features:
// 1. Dynamic Dropdown for all available symbols
// 2. Selected Symbol Chart rendered ABOVE BTC/ETH charts
// 3. 1D, 1W, 1M, 3M Intervals

import React, { useState, useEffect } from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';

import './Dashboard.css';

const POLLING_INTERVAL_MS = 30000; // 30 seconds
const chartIntervals = ['1D', '1W', '1M', '3M'];

// --- Custom Tooltip Component ---
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const formatCurrency = (val) => {
      if (!val) return 'N/A';
      return parseFloat(val).toLocaleString('en-US', {
        style: 'currency',
        currency: 'USD',
      });
    };
    // Handle generic time keys (some APIs return 'start', others might differ)
    const timestamp = data.start ? parseFloat(data.start) : data.time;
    const date = new Date(timestamp * 1000);
    const formattedDateTime = date.toLocaleString(); 

    return (
      <div className="custom-tooltip">
        <p className="tooltip-label">{formattedDateTime}</p>
        <p className="tooltip-item">{`Open: ${formatCurrency(data.open)}`}</p>
        <p className="tooltip-item">{`High: ${formatCurrency(data.high)}`}</p>
        <p className="tooltip-item">{`Low: ${formatCurrency(data.low)}`}</p>
        <p className="tooltip-item-close">{`Close: ${formatCurrency(data.close)}`}</p>
      </div>
    );
  }
  return null;
};

// --- Metric Card Component ---
function MetricCard({ title, value, unit = '' }) {
  let displayValue = 'N/A';
  if (value !== null && value !== undefined && !isNaN(value)) {
    if (title.includes('Price')) {
      displayValue = value.toLocaleString('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
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

// --- Interval Buttons Component ---
const IntervalButtons = ({ intervals, activeInterval, onIntervalChange }) => {
  return (
    <div className="interval-controls">
      {intervals.map((interval) => (
        <button
          key={interval}
          className={`interval-button ${activeInterval === interval ? 'active' : ''}`}
          onClick={() => onIntervalChange(interval)}
        >
          {interval}
        </button>
      ))}
    </div>
  );
};

// --- Main Dashboard Component ---
function Dashboard() {
  // Data States
  const [availableSymbols, setAvailableSymbols] = useState([]);
  const [selectedSymbol, setSelectedSymbol] = useState(''); // User selected symbol
  
  // Master Data
  const [masterBtcData, setMasterBtcData] = useState([]);
  const [masterEthData, setMasterEthData] = useState([]);
  const [masterSelectedData, setMasterSelectedData] = useState([]); // Data for the dropdown selection

  // Display (Filtered) Data
  const [displayedBtcData, setDisplayedBtcData] = useState([]);
  const [displayedEthData, setDisplayedEthData] = useState([]);
  const [displayedSelectedData, setDisplayedSelectedData] = useState([]);

  // Intervals
  const [btcInterval, setBtcInterval] = useState('1M'); 
  const [ethInterval, setEthInterval] = useState('1M'); 
  const [selectedInterval, setSelectedInterval] = useState('1M');

  // Metrics
  const [latestMetrics, setLatestMetrics] = useState({ cpi: null, fedRate: null });
  const [latestBtcPrice, setLatestBtcPrice] = useState(null);
  const [latestEthPrice, setLatestEthPrice] = useState(null);
  const [latestSelectedPrice, setLatestSelectedPrice] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Helper to process raw API data arrays
  const processDataArray = (dataArray) => {
    if (!Array.isArray(dataArray)) return [];
    return dataArray.map(d => ({
      ...d, 
      close: parseFloat(d.close),
      // Ensure we have a consistent time key for XAxis if 'start' is used
      time: d.start ? new Date(parseFloat(d.start) * 1000).toLocaleDateString() : d.date
    }));
  };

  // Effect 1: Fetching data
  useEffect(() => {
    const fetchData = async () => {
      setError(null);
      try {
        const response = await fetch('https://crypto-lpzi.onrender.com/api/data');
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);

        const text = await response.text();
        const fixedText = text.replace(/NaN/g, 'null');
        const result = JSON.parse(fixedText);
        
        // 1. Populate Dropdown Options
        const symbols = Object.keys(result).sort();
        setAvailableSymbols(symbols);

        // 2. Set Default Selection if empty
        if (!selectedSymbol && symbols.length > 0) {
            // Prefer a symbol that isn't BTC/ETH if possible, otherwise just the first one
            const defaultSym = symbols.find(s => s !== 'BTC-USD' && s !== 'ETH-USD') || symbols[0];
            setSelectedSymbol(defaultSym);
        }

        // 3. Process BTC & ETH (Fixed Charts)
        const cleanBtc = processDataArray(result['BTC-USD']);
        const cleanEth = processDataArray(result['ETH-USD']);

        setMasterBtcData(cleanBtc);
        setMasterEthData(cleanEth);
        
        // 4. Process Selected Symbol (Dynamic Chart)
        // Note: We use the current selectedSymbol state variable here. 
        // If it was just set in step 2, it might not be updated in this closure yet, 
        // so we check if we have a valid key.
        const currentSym = selectedSymbol || symbols.find(s => s !== 'BTC-USD' && s !== 'ETH-USD') || symbols[0];
        const cleanSelected = processDataArray(result[currentSym]);
        setMasterSelectedData(cleanSelected);

        // 5. Update Latest Prices
        if (cleanBtc.length > 0) setLatestBtcPrice(cleanBtc[cleanBtc.length - 1].close);
        if (cleanEth.length > 0) setLatestEthPrice(cleanEth[cleanEth.length - 1].close);
        if (cleanSelected.length > 0) setLatestSelectedPrice(cleanSelected[cleanSelected.length - 1].close);

        // 6. Extract Macro Metrics
        let metricsFound = { cpi: null, fedRate: null };
        const combinedData = [...cleanBtc].reverse(); 
        for (const obs of combinedData) {
          if (metricsFound.cpi === null && obs.cpi && !isNaN(obs.cpi)) {
            metricsFound.cpi = obs.cpi;
          }
          if (metricsFound.fedRate === null && obs.fed_funds_rate && !isNaN(obs.fed_funds_rate)) {
            metricsFound.fedRate = obs.fed_funds_rate;
          }
          if (metricsFound.cpi !== null && metricsFound.fedRate !== null) break;
        }
        setLatestMetrics(metricsFound);
        
      } catch (e) {
        console.error("Failed to fetch or parse data:", e);
        setError(e.message);
      } finally {
        if (loading) setLoading(false);
      }
    };

    fetchData(); 
    const intervalId = setInterval(fetchData, POLLING_INTERVAL_MS);
    return () => clearInterval(intervalId);
    
  }, [loading, selectedSymbol]); // Re-fetch/Update when selectedSymbol changes

  // Helper function to filter data by time interval
  const filterByInterval = (data, interval) => {
    if (!data || data.length === 0) return [];
    const now = Date.now() / 1000;
    let cutoff = 0;
    
    switch (interval) {
      case '1D': cutoff = now - 1 * 86400; break;
      case '1W': cutoff = now - 7 * 86400; break;
      case '1M': cutoff = now - 30 * 86400; break;
      case '3M': cutoff = now - 90 * 86400; break;
      case 'ALL': default: return data;
    }
    
    return data.filter(d => parseFloat(d.start) >= cutoff);
  };

  // Effect: Filter BTC
  useEffect(() => {
    setDisplayedBtcData(filterByInterval(masterBtcData, btcInterval));
  }, [masterBtcData, btcInterval]);

  // Effect: Filter ETH
  useEffect(() => {
    setDisplayedEthData(filterByInterval(masterEthData, ethInterval));
  }, [masterEthData, ethInterval]);

  // Effect: Filter Selected Symbol
  useEffect(() => {
    setDisplayedSelectedData(filterByInterval(masterSelectedData, selectedInterval));
  }, [masterSelectedData, selectedInterval]);


  if (loading) {
    return <div className="dashboard-container">Loading dashboard data...</div>;
  }

  return (
    <div className="dashboard-container">
      {error && <div className="error-banner">Error refreshing data: {error}</div>}
      
      <div className="header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 className="header">Crypto & Macro Dashboard</h1>
        
        {/* --- NEW: Symbol Selector Dropdown --- */}
        <div className="symbol-selector">
          <span style={{ marginRight: '10px', fontWeight: 'bold' }}>Select Chart:</span>
          <select 
            value={selectedSymbol} 
            onChange={(e) => setSelectedSymbol(e.target.value)}
            style={{ padding: '5px 10px', fontSize: '1rem', borderRadius: '5px' }}
          >
            {availableSymbols.map(sym => (
              <option key={sym} value={sym}>{sym}</option>
            ))}
          </select>
        </div>
      </div>
      
      <h2 className="sub-header">Key Metrics</h2>
      <div className="card-row">
        <MetricCard title="Live BTC Price" value={latestBtcPrice} />
        <MetricCard title="Live ETH Price" value={latestEthPrice} />
        {/* Optional: Show selected symbol price card */}
        {selectedSymbol && selectedSymbol !== 'BTC-USD' && selectedSymbol !== 'ETH-USD' && (
             <MetricCard title={`Live ${selectedSymbol}`} value={latestSelectedPrice} />
        )}
        <MetricCard title="Latest CPI" value={latestMetrics.cpi} />
        <MetricCard title="Fed Funds Rate" value={latestMetrics.fedRate} unit="%" />
      </div>

      <h2 className="sub-header">Live Price Charts</h2>
      
      {/* --- NEW: Dynamic Selected Symbol Chart (Rendered Top) --- */}
      {selectedSymbol && (
        <div className="chart-container highlight-chart">
          <div className="chart-header">
            <h3>{selectedSymbol} Closing Price</h3>
            <IntervalButtons 
              intervals={chartIntervals}
              activeInterval={selectedInterval}
              onIntervalChange={setSelectedInterval} 
            />
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={displayedSelectedData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis domain={['auto', 'auto']} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              {/* Using a distinct color for the custom selection */}
              <Line type="monotone" dataKey="close" stroke="#82ca9d" name={`${selectedSymbol} Close`} dot={false} strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Existing BTC Chart */}
      <div className="chart-container">
        <div className="chart-header">
          <h3>BTC-USD Closing Price</h3>
          <IntervalButtons 
            intervals={chartIntervals}
            activeInterval={btcInterval}
            onIntervalChange={setBtcInterval} 
          />
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={displayedBtcData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="time" />
            <YAxis domain={['auto', 'auto']} />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Line type="monotone" dataKey="close" stroke="var(--btc-color)" name="BTC Close" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Existing ETH Chart */}
      <div className="chart-container">
        <div className="chart-header">
          <h3>ETH-USD Closing Price</h3>
          <IntervalButtons 
            intervals={chartIntervals}
            activeInterval={ethInterval}
            onIntervalChange={setEthInterval}
          />
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={displayedEthData}>
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
