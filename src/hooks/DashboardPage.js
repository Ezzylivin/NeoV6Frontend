// DashboardPage.js
// A new component to display your API data in charts and metric cards.

import React, { useState, useEffect } from 'react';
// Import components from the recharts library
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
  if (value === null || value === undefined) {
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
function DashboardPage() {
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
        const result = await response.json();
        
        // --- Data Parsing ---
        const btcArray = result['BTC-USD'] || [];
        const ethArray = result['ETH-USD'] || [];

        // Convert string numbers to actual numbers for charting
        const cleanBtc = btcArray.map(d => ({...d, close: parseFloat(d.close)}));
        const cleanEth = ethArray.map(d => ({...d, close: parseFloat(d.close)}));

        setBtcData(cleanBtc);
        setEthData(cleanEth);
        
        // Find the latest metrics
        // We look backwards from the most recent data point
        let metricsFound = { cpi: null, fedRate: null };
        const combinedData = [...btcArray].reverse(); // Use either array
        
        for (const obs of combinedData) {
          if (obs.cpi && !isNaN(obs.cpi)) {
            metricsFound.cpi = obs.cpi;
          }
          if (obs.fed_funds_rate && !isNaN(obs.fed_funds_rate)) {
            metricsFound.fedRate = obs.fed_funds_rate;
          }
          // If we've found both, we can stop
          if (metricsFound.cpi && metricsFound.fedRate) break;
        }
        
        setLatestMetrics(metricsFound);
        
      } catch (e) {
        console.error("Failed to fetch or parse data:", e);
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []); // Runs once on mount

  // 3. Render logic based on state
  if (loading) {
    return <div style={styles.container}>Loading dashboard data...</div>;
  }

  if (error) {
    return <div style={styles.container}>Error: {error}</div>;
  }

  // 4. Success! Render the full dashboard
  return (
    <div style={styles.container}>
      <h1 style={styles.header}>Crypto & Macro Dashboard</h1>
      
      {/* --- Key Metrics Section --- */}
      <h2 style={styles.subHeader}>Key Metrics</h2>
      <div style={styles.cardRow}>
        <MetricCard title="Latest CPI" value={latestMetrics.cpi} />
        <MetricCard title="Fed Funds Rate" value={latestMetrics.fedRate} unit="%" />
      </div>

      {/* --- Charts Section --- */}
      <h2 style={styles.subHeader}>Price Charts</h2>
      
      {/* BTC Chart */}
      <div style={styles.chartContainer}>
        <h3>BTC-USD Closing Price</h3>
        {/* ResponsiveContainer makes the chart fit its parent div */}
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={btcData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="time" />
            <YAxis domain={['auto', 'auto']} />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="close" stroke="#f7931a" name="BTC Close" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* ETH Chart */}
      <div style={styles.chartContainer}>
        <h3>ETH-USD Closing Price</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={ethData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="time" />
            <YAxis domain={['auto', 'auto']} />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="close" stroke="#8884d8" name="ETH Close" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// --- Basic CSS-in-JS for styling ---
// You can move this to a .css file if you prefer
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

export default DashboardPage;
