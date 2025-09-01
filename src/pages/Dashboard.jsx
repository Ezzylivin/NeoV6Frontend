// File: src/pages/Dashboard.jsx
import React, { useState, useEffect } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import axios from "axios";

export default function Dashboard() {
  const API_URL = import.meta.env.VITE_API_URL;

  const [exchanges, setExchanges] = useState({});
  const [exchange, setExchange] = useState("");
  const [symbols, setSymbols] = useState([]);
  const [symbol, setSymbol] = useState("");
  const [history, setHistory] = useState([]);
  const [price, setPrice] = useState(null);

  // ---------------------------
  // 1️⃣ Load exchanges & symbols
  // ---------------------------
  useEffect(() => {
    const fetchExchanges = async () => {
      try {
        const { data } = await axios.get(`${API_URL}/exchanges`);
        setExchanges(data);

        const defaultExchange = Object.keys(data)[0];
        setExchange(defaultExchange);
        setSymbols(data[defaultExchange]);
        setSymbol(data[defaultExchange][0]);
      } catch (err) {
        console.error("Error fetching exchanges:", err);
      }
    };

    fetchExchanges();
  }, [API_URL]);

  // ---------------------------
  // 2️⃣ Update symbols when exchange changes
  // ---------------------------
  useEffect(() => {
    if (!exchange) return;
    setSymbols(exchanges[exchange] || []);
    setSymbol(exchanges[exchange]?.[0] || "");
  }, [exchange, exchanges]);

  // ---------------------------
  // 3️⃣ Fetch price history for chart & live price
  // ---------------------------
  useEffect(() => {
    if (!exchange || !symbol) return;

    const fetchHistory = async () => {
      try {
        const { data } = await axios.get(`${API_URL}/candles`, {
          params: { exchange, symbol, timeframe: "1m" },
        });

        // Format for Recharts
        const formatted = data.map((c) => ({
          time: new Date(c.time * 1000).toLocaleTimeString(),
          price: c.close,
        }));

        setHistory(formatted);
        if (formatted.length > 0) setPrice(formatted[formatted.length - 1].price);
      } catch (err) {
        console.error("Error fetching price history:", err);
      }
    };

    fetchHistory();
    const interval = setInterval(fetchHistory, 5000); // refresh every 5s
    return () => clearInterval(interval);
  }, [exchange, symbol, API_URL]);

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4 text-white">Trading Dashboard</h1>

      {/* Exchange + Symbol selectors */}
      <div className="flex gap-4 mb-4">
        <select
          value={exchange}
          onChange={(e) => setExchange(e.target.value)}
          className="p-2 rounded-lg bg-gray-800 text-white"
        >
          {Object.keys(exchanges).map((ex) => (
            <option key={ex} value={ex}>
              {ex.toUpperCase()}
            </option>
          ))}
        </select>

        <select
          value={symbol}
          onChange={(e) => setSymbol(e.target.value)}
          className="p-2 rounded-lg bg-gray-800 text-white"
        >
          {symbols.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {/* Live price */}
      <div className="mb-4 text-white">
        <strong>Live Price for {symbol}:</strong> {price !== null ? price : "Loading..."}
      </div>

      {/* Price history chart */}
      <div style={{ width: "100%", height: 400 }}>
        <ResponsiveContainer>
          <LineChart data={history}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="time" />
            <YAxis domain={["auto", "auto"]} />
            <Tooltip />
            <Line type="monotone" dataKey="price" stroke="#26a69a" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
