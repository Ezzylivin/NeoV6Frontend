// File: src/pages/Dashboard.jsx
import React, { useState, useEffect } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

const allSymbols = ["BTCUSDT", "ETHUSDT", "BNBUSDT"];

export default function Dashboard() {
  const [selectedSymbol, setSelectedSymbol] = useState("BTCUSDT");
  const [prices, setPrices] = useState({});
  const [history, setHistory] = useState({}); // formatted history
  const [period, setPeriod] = useState(24);        // hours
  const [interval, setIntervalSec] = useState(60); // seconds

  // --- Fetch live prices ---
  useEffect(() => {
    const fetchLive = async () => {
      try {
        const API_URL = import.meta.env.VITE_API_URL;
        const res = await fetch(`${API_URL}/prices/live?symbols=${allSymbols.join(",")}`);
        const data = await res.json();
        if (data.success) setPrices(data.prices);
      } catch (err) {
        console.error("Failed to fetch live prices:", err);
      }
    };

    fetchLive();
    const intv = setInterval(fetchLive, 10000);
    return () => clearInterval(intv);
  }, []);

  // --- Fetch price history ---
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const API_URL = import.meta.env.VITE_API_URL;
        const res = await fetch(
          `${API_URL}/prices/history?symbols=${selectedSymbol}&period=${period}&interval=${interval}`
        );
        const data = await res.json();
        if (data.success) {
          // Convert into recharts-friendly format
          const formatted = (data.history[selectedSymbol] || []).map(p => ({
            time: new Date(p.time * 1000), // keep as Date
            price: p.price
          }));
          setHistory({ [selectedSymbol]: formatted });
        }
      } catch (err) {
        console.error("Failed to fetch history:", err);
      }
    };
    fetchHistory();
  }, [selectedSymbol, period, interval]);

  return (
    <div style={{ padding: "20px" }}>
      <h1>Crypto Dashboard</h1>

      {/* Dropdown selectors */}
      <div style={{ marginBottom: 20 }}>
        <label>
          Symbol:
          <select value={selectedSymbol} onChange={e => setSelectedSymbol(e.target.value)} style={{ marginLeft: 10 }}>
            {allSymbols.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>

        <label style={{ marginLeft: 30 }}>
          Period (hours):
          <select value={period} onChange={e => setPeriod(parseInt(e.target.value))} style={{ marginLeft: 10 }}>
            {[1, 6, 12, 24, 72].map(p => <option key={p} value={p}>{p}h</option>)}
          </select>
        </label>

        <label style={{ marginLeft: 30 }}>
          Interval (seconds):
          <select value={interval} onChange={e => setIntervalSec(parseInt(e.target.value))} style={{ marginLeft: 10 }}>
            {[10, 30, 60, 300, 900, 3600].map(i => <option key={i} value={i}>{i}s</option>)}
          </select>
        </label>
      </div>

      {/* Live price */}
      <h2>Live Price</h2>
      <div style={{ marginBottom: 30 }}>
        <strong>{selectedSymbol}:</strong> {prices[selectedSymbol] || "Loading..."}
      </div>

      {/* Price history chart */}
      <h2>Price History</h2>
      <div style={{ marginBottom: 50 }}>
        <LineChart width={800} height={400} data={history[selectedSymbol] || []}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="time" 
            tickFormatter={t => t.toLocaleTimeString()} 
            type="number" 
            domain={['dataMin', 'dataMax']}
            scale="time"
          />
          <YAxis />
          <Tooltip labelFormatter={t => new Date(t).toLocaleString()} />
          <Line type="monotone" dataKey="price" stroke="#8884d8" dot={false} />
        </LineChart>
      </div>
    </div>
  );
}
