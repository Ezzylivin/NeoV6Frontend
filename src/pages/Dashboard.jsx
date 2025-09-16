// ./pages/Dashboard.jsx
// UPGRADED: Now imports CSS, uses classNames, and polls for live data.

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

// Import the new stylesheet
import './Dashboard.css';

// This is a simple tunable parameter
const POLLING_INTERVAL_MS = 30000; // 30 seconds

// A simple "card" component for styling our metrics
function MetricCard({ title, value, unit = '' }) {
  if (value === null || value === undefined || isNaN(value)) {
    value = "N/A";
  }
  return (
    <div className="metric-card">
      <h3 className="card-title">{title}</h3>
      <div className="card-value">{value}{unit}</div>
    </div>
  );
}

// Main Dashboard Component
function Dashboard() {
  const [btcData, setBtcData] = useState([]);
  const [ethData, setEthData] = useState([]);
  const [latestMetrics, setLatestMetrics] = useState({ cpi: null, fedRate: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // useEffect now handles data polling
  useEffect(() => {
    const fetchData = async () => {
      // Don't show loading spinner on background refreshes
      // Only show it on the very first load
      // setLoading(true); // <- We remove this
      setError(null);

      try {
        const response = await fetch('https://crypto-lpzi.onrender.com/api/data');
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const text = await response.text();
        const fixedText = text.replace(/NaN/g, 'null');
        const result = JSON.parse(fixedText);
        
        const btcArray = result['BTC-USD'] || [];
        const ethArray = result['ETH-USD'] || [];

        const cleanBtc = btcArray.map(d => ({...d, close: parseFloat(d.close)}));
        const cleanEth = ethArray.map(d => ({...d, close: parseFloat(d.close)}));

        setBtcData(cleanBtc);
        setEthData(cleanEth);
        
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
        // Stop loading spinner only on first load
        if (loading) setLoading(false);
      }
    };

    // --- LIVE DATA POLLING ---
    // 1. Fetch data immediately on load
    fetchData();

    // 2. Then, set an interval to fetch data every 30 seconds
    const intervalId = setInterval(fetchData, POLLING_INTERVAL_MS);

    // 3. This is a cleanup function. React runs this when the
    // component is unmounted to prevent memory leaks.
    return () => clearInterval(intervalId);
    // -------------------------

  }, [loading]); // We add 'loading' to the dependency array

  // Show loading spinner *only* on the first load
  if (loading) {
    return <div className="dashboard-container">Loading dashboard data...</div>;
  }

  // Show a non-blocking error if a background refresh fails
  return (
    <div className="dashboard-container">
      {error && <div className="error-banner">Error refreshing data: {error}</div>}
      
      <h1 className="header">Crypto & Macro Dashboard</h1>
      
      <h2 className="sub-header">Key Metrics</h2>
      <div className="card-row">
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
            <Tooltip />
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
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="close" stroke="var(--eth-color)" name="ETH Close" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default Dashboard;
