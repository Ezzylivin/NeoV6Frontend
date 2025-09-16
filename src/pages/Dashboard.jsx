// ./pages/Dashboard.jsx
// FULL UPGRADED VERSION
// Now includes chart interval selection (1W, 1M, 3M, All)

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
const chartIntervals = ['1W', '1M', '3M', 'ALL']; // Define intervals

// --- Custom Tooltip Component (Unchanged) ---
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
    const date = new Date(parseFloat(data.start) * 1000);
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

// --- Metric Card Component (Unchanged) ---
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

// --- NEW: Interval Buttons Component ---
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


// --- Main Dashboard Component (Updated) ---
function Dashboard() {
  // --- NEW: Master vs. Displayed State ---
  const [masterBtcData, setMasterBtcData] = useState([]);
  const [masterEthData, setMasterEthData] = useState([]);
  const [displayedBtcData, setDisplayedBtcData] = useState([]);
  const [displayedEthData, setDisplayedEthData] = useState([]);
  
  // --- NEW: State for active intervals ---
  const [btcInterval, setBtcInterval] = useState('1M'); // Default to 1 Month
  const [ethInterval, setEthInterval] = useState('1M'); // Default to 1 Month

  // (Existing states)
  const [latestMetrics, setLatestMetrics] = useState({ cpi: null, fedRate: null });
  const [latestBtcPrice, setLatestBtcPrice] = useState(null);
  const [latestEthPrice, setLatestEthPrice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Effect 1: Fetching data (polled)
  // This now *only* sets the master data, prices, and metrics
  useEffect(() => {
    const fetchData = async () => {
      setError(null);
      try {
        const response = await fetch('https://crypto-lpzi.onrender.com/api/data');
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);

        const text = await response.text();
        const fixedText = text.replace(/NaN/g, 'null');
        const result = JSON.parse(fixedText);
        
        const btcArray = result['BTC-USD'] || [];
        const ethArray = result['ETH-USD'] || [];

        const cleanBtc = btcArray.map(d => ({...d, close: parseFloat(d.close)}));
        const cleanEth = ethArray.map(d => ({...d, close: parseFloat(d.close)}));

        // --- NEW: Set MASTER data lists ---
        setMasterBtcData(cleanBtc);
        setMasterEthData(cleanEth);
        
        // (Set latest prices and metrics - unchanged)
        if (cleanBtc.length > 0) {
          setLatestBtcPrice(cleanBtc[cleanBtc.length - 1].close);
        }
        if (cleanEth.length > 0) {
          setLatestEthPrice(cleanEth[cleanEth.length - 1].close);
        }
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

    fetchData(); // Initial fetch
    const intervalId = setInterval(fetchData, POLLING_INTERVAL_MS); // Poll for updates
    return () => clearInterval(intervalId); // Cleanup
    
  }, [loading]);

  // --- NEW: Effect 2: Filtering for BTC Chart ---
  // This runs whenever master BTC data changes OR the BTC interval button is clicked
  useEffect(() => {
    const filterData = () => {
      const now = Date.now() / 1000; // in seconds
      let cutoff = 0;
      switch (btcInterval) {
        case '1W':
          cutoff = now - 7 * 86400; // 7 days
          break;
        case '1M':
          cutoff = now - 30 * 86400; // 30 days
          break;
        case '3M':
          cutoff = now - 90 * 86400; // 90 days
          break;
        case 'ALL':
        default:
          setDisplayedBtcData(masterBtcData); // Show all
          return;
      }
      const filtered = masterBtcData.filter(d => parseFloat(d.start) >= cutoff);
      setDisplayedBtcData(filtered);
    };

    if (masterBtcData.length > 0) {
      filterData();
    }
  }, [masterBtcData, btcInterval]); // Re-run filter when data or interval changes

  // --- NEW: Effect 3: Filtering for ETH Chart ---
  useEffect(() => {
    const filterData = () => {
      const now = Date.now() / 1000;
      let cutoff = 0;
      switch (ethInterval) {
        case '1W':
          cutoff = now - 7 * 86400;
          break;
        case '1M':
          cutoff = now - 30 * 86400;
          break;
        case '3M':
          cutoff = now - 90 * 86400;
          break;
        case 'ALL':
        default:
          setDisplayedEthData(masterEthData);
          return;
      }
      const filtered = masterEthData.filter(d => parseFloat(d.start) >= cutoff);
      setDisplayedEthData(filtered);
    };
    
    if (masterEthData.length > 0) {
      filterData();
    }
  }, [masterEthData, ethInterval]); // Re-run filter when data or interval changes


  if (loading) {
    return <div className="dashboard-container">Loading dashboard data...</div>;
  }

  return (
    <div className="dashboard-container">
      {error && <div className="error-banner">Error refreshing data: {error}</div>}
      
      <h1 className="header">Crypto & Macro Dashboard</h1>
      
      <h2 className="sub-header">Key Metrics</h2>
      <div className="card-row">
        <MetricCard title="Live BTC Price" value={latestBtcPrice} />
        <MetricCard title="Live ETH Price" value={latestEthPrice} />
        <MetricCard title="Latest CPI" value={latestMetrics.cpi} />
        <MetricCard title="Fed Funds Rate" value={latestMetrics.fedRate} unit="%" />
      </div>

      <h2 className="sub-header">Live Price Charts</h2>
      
      <div className="chart-container">
        {/* --- NEW: Interval Buttons for BTC --- */}
        <div className="chart-header">
          <h3>BTC-USD Closing Price</h3>
          <IntervalButtons 
            intervals={chartIntervals}
            activeInterval={btcInterval}
            onIntervalChange={setBtcInterval} 
          />
        </div>
        <ResponsiveContainer width="100%" height={300}>
          {/* --- NEW: Chart now uses 'displayedBtcData' --- */}
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

      <div className="chart-container">
        {/* --- NEW: Interval Buttons for ETH --- */}
        <div className="chart-header">
          <h3>ETH-USD Closing Price</h3>
          <IntervalButtons 
            intervals={chartIntervals}
            activeInterval={ethInterval}
            onIntervalChange={setEthInterval}
          />
        </div>
        <ResponsiveContainer width="100%" height={300}>
          {/* --- NEW: Chart now uses 'displayedEthData' --- */}
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
