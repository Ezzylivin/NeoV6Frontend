// File: src/pages/Dashboard.jsx
import React, { useState, useEffect } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

const allSymbols = ["BTCUSDT", "ETHUSDT", "BNBUSDT"];

export default function Dashboard() {
  const [selectedSymbol, setSelectedSymbol] = useState("BTCUSDT");
  const [prices, setPrices] = useState({});
  const [history, setHistory] = useState({});
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
        const res = await fetch(`${API_URL}/prices/history?symbols=${selectedSymbol}&period=${period}&interval=${interval}`);
        const data = await res.json();
        if (data.success) setHistory({ [selectedSymbol]: data.history[selectedSymbol] || [] });
      } catch (err) {
        console.error("Failed to fetch history:", err);
      }
    };
    fetchHistory();
  }, [selectedSymbol, period, interval]);

  return (
    <div className="p-6 bg-gray-900 text-white min-h-screen">
      <h1 className="text-3xl font-bold mb-4">Crypto Dashboard</h1>

      {/* --- Dropdown selectors --- */}
      <div className="mb-6 flex flex-wrap gap-4">
        <div>
          <label>Symbol: </label>
          <select value={selectedSymbol} onChange={e => setSelectedSymbol(e.target.value)}>
            {allSymbols.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div>
          <label>Period (hours): </label>
          <select value={period} onChange={e => setPeriod(parseInt(e.target.value))}>
            {[1, 6, 12, 24, 72].map(p => <option key={p} value={p}>{p}h</option>)}
          </select>
        </div>

        <div>
          <label>Interval (seconds): </label>
          <select value={interval} onChange={e => setIntervalSec(parseInt(e.target.value))}>
            {[10, 30, 60, 300, 900, 3600].map(i => <option key={i} value={i}>{i}s</option>)}
          </select>
        </div>
      </div>

      {/* --- Live price --- */}
      <div className="mb-6 text-lg">
        <strong>{selectedSymbol}:</strong> {prices[selectedSymbol] || "Loading..."}
      </div>

      {/* --- Price history chart --- */}
      <div>
        <h2 className="text-xl font-semibold mb-2">Price History</h2>
        <LineChart width={600} height={300} data={history[selectedSymbol] || []}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="time" tickFormatter={t => new Date(t).toLocaleTimeString()} />
          <YAxis />
          <Tooltip labelFormatter={t => new Date(t).toLocaleString()} />
          <Line type="monotone" dataKey="price" stroke="#8884d8" dot={false} />
        </LineChart>
      </div>
    </div>
  );
}
