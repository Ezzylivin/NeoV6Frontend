// ./pages/Dashboard.jsx
// FULL UPGRADED VERSION
// Fetches live data, handles JSON errors, and uses Dashboard.css for styling

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

// You can tune this. 30000ms = 30 seconds
const POLLING_INTERVAL_MS = 30000; 

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

  useEffect(() => {
    const fetchData = async () => {
      // Only set error to null on a new attempt
      setError(null);

      try {
        const response = await fetch('https://crypto-lpzi.onrender.com/api/data');
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }

        // Fix for "NaN" in JSON error
        const text = await response.text();
        const fixedText = text.replace(/NaN/g, 'null');
        const result = JSON.parse(fixedText);
        
        const btcArray = result['BTC-USD'] || [];
        const ethArray = result['ETH-USD'] || [];

        // Clean data for charting
        const cleanBtc = btcArray.map(d => ({...d, close: parseFloat(d.close)}));
        const cleanEth = ethArray.map(d => ({...d, close: parseFloat(d.close)}));

        setBtcData(cleanBtc);
        setEthData(cleanEth);
        
        // Find latest metrics
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
        setError(e.message); // Set the error message
      } finally {
        // Stop loading spinner only on the *first* load
        if (loading) setLoading(false);
      }
    };

    // --- LIVE DATA POLLING ---
    fetchData(); // Fetch immediately on load
    const intervalId = setInterval(fetchData, POLLING_INTERVAL_MS); // Then poll every 30s

    // Cleanup function to stop polling when component is removed
    return () => clearInterval(intervalId);
    
  }, [loading]); // 'loading' is a dependency to manage the initial spinner

  // Show a full-page spinner *only* on the first load
  if (loading) {
    return <div className="dashboard-container">Loading dashboard data...</div>;
  }

  // Render the dashboard
  return (
    <div className="dashboard-container">
      {/* Show a non-blocking error banner if a background refresh fails */}
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
