// File: src/pages/Dashboard.jsx
import React, { useState, useEffect } from "react";
import axios from "axios";
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from "recharts";

export default function Dashboard() {
  const [exchanges, setExchanges] = useState([]);
  const [selectedExchange, setSelectedExchange] = useState("");
  const [symbols, setSymbols] = useState([]);
  const [selectedSymbol, setSelectedSymbol] = useState("");
  const [candles, setCandles] = useState([]);
  const [loading, setLoading] = useState(false);

  // Fetch exchanges on mount
  useEffect(() => {
    const fetchExchanges = async () => {
      try {
        const res = await axios.get("https://neov6backend.onrender.com/api/exchanges");
        setExchanges(res.data.exchanges || []);
      } catch (err) {
        console.error("Error fetching exchanges:", err);
      }
    };
    fetchExchanges();
  }, []);

  // Update symbols when exchange changes
  useEffect(() => {
    if (selectedExchange) {
      const ex = exchanges.find((e) => e.name === selectedExchange);
      setSymbols(ex?.symbols || []);
      setSelectedSymbol("");
      setCandles([]);
    }
  }, [selectedExchange, exchanges]);

  // Fetch candles for selected symbol
  const fetchCandles = async () => {
    if (!selectedExchange || !selectedSymbol) return;
    setLoading(true);
    try {
      const res = await axios.get(
        `https://neov6backend.onrender.com/api/candles?exchange=${selectedExchange}&symbol=${selectedSymbol}&timeframe=1h`
      );
      setCandles(res.data || []); // updated for backend return
    } catch (err) {
      console.error("Error fetching candles:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Dashboard</h1>

      <div className="mb-4 flex gap-4">
        {/* Exchange Selector */}
        <select
          value={selectedExchange}
          onChange={(e) => setSelectedExchange(e.target.value)}
          className="border p-2"
        >
          <option value="">Select Exchange</option>
          {exchanges.map((ex) => (
            <option key={ex.name} value={ex.name}>
              {ex.name}
            </option>
          ))}
        </select>

        {/* Symbol Selector */}
        <select
          value={selectedSymbol}
          onChange={(e) => setSelectedSymbol(e.target.value)}
          className="border p-2"
          disabled={!selectedExchange}
        >
          <option value="">Select Symbol</option>
          {symbols.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        <button
          onClick={fetchCandles}
          className="bg-blue-500 text-white px-4 py-2 rounded"
          disabled={!selectedSymbol || loading}
        >
          {loading ? "Loading..." : "Fetch Chart"}
        </button>
      </div>

      {/* Chart */}
      <div style={{ width: "100%", height: 400 }}>
        {candles.length ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={candles}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="time"
                tickFormatter={(ts) => new Date(ts * 1000).toLocaleString()}
              />
              <YAxis domain={["auto", "auto"]} />
              <Tooltip
                labelFormatter={(ts) => new Date(ts * 1000).toLocaleString()}
              />
              <Line type="monotone" dataKey="close" stroke="#8884d8" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p>No chart data yet. Select exchange & symbol and click "Fetch Chart".</p>
        )}
      </div>
    </div>
  );
}
