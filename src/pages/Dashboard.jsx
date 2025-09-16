// ./pages/Dashboard.jsx
// This version includes a fix for the "NaN is not valid JSON" error.

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

// A simple "card" component for styling our metrics
function MetricCard({ title, value, unit = '' }) {
  if (value === null || value === undefined || isNaN(value)) {
    value = "N/A";
  }
  return (
    <div style={styles.card}>
      <h3 style={styles.cardTitle}>{title}</h3>
      <div style={styles.cardValue}>{value}{unit}</div>
    </div>
  );
}

// Main Dashboard Component
function Dashboard() {
  // 1. States for data, loading, and errors
  const [btcData, setBtcData] = useState([]);
  const [ethData, setEthData] = useState([]);
  const [latestMetrics, setLatestMetrics] = useState({ cpi: null, fedRate: null });
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 2. useEffect to fetch data on mount
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch('https://crypto-lpzi.onrender.com/api/data');
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }

        // --- THIS IS THE FIX ---
        // 1. Get the response as raw text instead of .json()
        const text = await response.text();

        // 2. Replace all occurrences of NaN with null. 
        // We use a regular expression /NaN/g to replace ALL instances.
        const fixedText = text.replace(/NaN/g, 'null');

        // 3. Now, parse the "fixed" text
        const result = JSON.parse(fixedText);
        // --- END OF FIX ---
        
        // --- Data Parsing (same as before) ---
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
        // This will also catch errors from JSON.parse if the fix fails
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []); // Runs once on mount

  // 3. Render logic (same as before)
  if (loading) {
    return <div style={styles.container}>Loading dashboard data...</div>;
  }

  if (error) {
    return <div style={styles.container}>Error: {error}</div>;
  }

  // 4. Success! Render the full dashboard (same as before)
  return (
    <div style={styles.container}>
      <h1 style={styles.header}>Crypto & Macro Dashboard</h1>
      
      <h2 style={styles.subHeader}>Key Metrics</h2>
      <div style={styles.cardRow}>
        <MetricCard title="Latest CPI" value={latestMetrics.cpi} />
        <MetricCard title="Fed Funds Rate" value={latestMetrics.fedRate} unit="%" />
      </div>

      <h2 style={styles.subHeader}>Price Charts</h2>
      
      <div style={styles.chartContainer}>
        <h3>BTC-USD Closing Price</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={btcData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="time" />
            <YAxis domain={['auto', 'auto']} />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="close" stroke="#f7931a" name="BTC Close" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div style={styles.chartContainer}>
        <h3>ETH-USD Closing Price</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={ethData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="time" />
            <YAxis domain={['auto', 'auto']} />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="close" stroke="#8884d8" name="ETH Close" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// --- Basic CSS-in-JS for styling (same as before) ---
const styles = {
  container: {
    fontFamily: 'Arial, sans-serif',
    padding: '20px',
    backgroundColor: '#f4f7f6',
  },
  header: {
    color: '#333',
    borderBottom: '2px solid #ddd',
    paddingBottom: '10px'
  },
  subHeader: {
    color: '#555',
    marginTop: '30px'
  },
  cardRow: {
    display: 'flex',
    gap: '20px',
    flexWrap: 'wrap'
  },
  card: {
    backgroundColor: '#fff',
    padding: '20px',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    minWidth: '200px',
  },
  cardTitle: {
    margin: '0 0 10px 0',
    color: '#777',
    fontSize: '16px'
  },
  cardValue: {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#333'
  },
  chartContainer: {
    backgroundColor: '#fff',
    padding: '20px',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    marginTop: '20px',
  }
};

export default Dashboard;
