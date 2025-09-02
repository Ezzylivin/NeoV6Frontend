// File: src/pages/Dashboard.jsx
import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer
} from "recharts";

export default function Dashboard() {
  const [candles1, setCandles1] = useState([]);
  const [candles2, setCandles2] = useState([]);
  const [loading, setLoading] = useState(true);

  const [timeframe1, setTimeframe1] = useState("1h");
  const [timeframe2, setTimeframe2] = useState("1h");

  const symbol1 = "BTC/USD";
  const symbol2 = "ETH/USD";
  const exchange = "coinbase"; // US-based

  const timeOptions = ["1m","5m","10m","15m","30m","1h","4h","1d"];

  const fetchChart = async (symbol, timeframe, setCandles) => {
    try {
      const res = await axios.get(
        `https://neov6backend.onrender.com/api/candles?exchange=${exchange}&symbol=${symbol}&timeframe=${timeframe}`
      );
      setCandles(res.data || []);
    } catch (err) {
      console.error(`Error fetching chart for ${symbol}:`, err);
      setCandles([]);
    }
  };

  useEffect(() => {
    setLoading(true);
    const loadCharts = async () => {
      await Promise.all([
        fetchChart(symbol1, timeframe1, setCandles1),
        fetchChart(symbol2, timeframe2, setCandles2)
      ]);
      setLoading(false);
    };

    loadCharts();
    const interval = setInterval(loadCharts, 60000);
    return () => clearInterval(interval);
  }, [timeframe1, timeframe2]);

  const CustomTooltip = ({ active, payload, symbol }) => {
    if (active && payload && payload.length) {
      const d = payload[0].payload;
      const color = d.close >= d.open ? "green" : "red";
      return (
        <div className="bg-white p-2 border shadow rounded text-sm">
          <p><strong>{symbol}</strong></p>
          <p>{new Date(d.time * 1000).toLocaleString()}</p>
          <p>O: ${d.open}</p>
          <p>H: ${d.high}</p>
          <p>L: ${d.low}</p>
          <p style={{ color }}>C: ${d.close}</p>
        </div>
      );
    }
    return null;
  };

  const renderChart = (symbol, candles, timeframe, setTimeframe, color) => (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <span className="font-semibold">{symbol}</span>
        <select
          value={timeframe}
          onChange={(e) => setTimeframe(e.target.value)}
          className="border p-1 text-sm"
        >
          {timeOptions.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>
      <div style={{ width: "100%", height: 300 }}>
        {candles.length ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={candles}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" tickFormatter={(ts) => new Date(ts * 1000).toLocaleTimeString()} />
              <YAxis domain={["auto", "auto"]} />
              <Tooltip content={<CustomTooltip symbol={symbol} />} />
              <Line
                type="monotone"
                dataKey="close"
                stroke={color}
                dot={(d) => (
                  <circle
                    r={3}
                    fill={d.payload.close >= d.payload.open ? "green" : "red"}
                  />
                )}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p>No data for {symbol}</p>
        )}
      </div>
    </div>
  );

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Dashboard (US Exchanges Only)</h1>
      {loading && <p>Loading charts...</p>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {renderChart(symbol1, candles1, timeframe1, setTimeframe1, "#8884d8")}
        {renderChart(symbol2, candles2, timeframe2, setTimeframe2, "#82ca9d")}
      </div>
    </div>
  );
}
