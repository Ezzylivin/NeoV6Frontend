// ./pages/Dashboard.jsx
// FULL UPGRADED VERSION
// Tooltip now converts the 'start' timestamp to include the time.

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

// --- UPGRADED: Custom Tooltip Component ---
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    // Helper to format numbers as currency
    const formatCurrency = (val) => {
      if (!val) return 'N/A';
      return parseFloat(val).toLocaleString('en-US', {
        style: 'currency',
        currency: 'USD',
      });
    };

    // --- THIS IS THE FIX ---
    // 1. Convert Unix timestamp string (seconds) to a number
    const timestampInSeconds = parseFloat(data.start);
    // 2. Convert to milliseconds for JavaScript Date object
    const timestampInMs = timestampInSeconds * 1000;
    // 3. Create a new Date object
    const date = new Date(timestampInMs);
    // 4. Format to a readable string (e.g., "6/19/2025, 12:00:00 AM")
    const formattedDateTime = date.toLocaleString(); 
    // --- END OF FIX ---

    return (
      <div className="custom-tooltip">
        {/* Use the new formatted date and time string */}
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

// A simple "card" component for styling our metrics
function MetricCard({ title, value, unit = '' }) {
  let displayValue = 'N/A';
  if (value !== null && value !== undefined && !isNaN(value)) {
    // Format as currency if it's a 'live-price' card
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

// Main Dashboard Component
function Dashboard() {
  const [btcData, setBtcData] = useState([]);
  const [ethData, setEthData] = useState([]);
  const [latestMetrics, setLatestMetrics] = useState({ cpi: null, fedRate: null });
  const [latestBtcPrice, setLatestBtcPrice] = useState(null);
  const [latestEthPrice, setLatestEthPrice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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

        setBtcData(cleanBtc);
        setEthData(cleanEth);
        
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
        <h3>BTC-USD Closing Price</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={btcData}>
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
        <h3>ETH-USD Closing Price</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={ethData}>
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
