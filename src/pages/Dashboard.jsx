// File: src/pages/Dashboard.jsx
import React, { useState, useEffect } from "react";
import axios from "axios";
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from "recharts";

export default function Dashboard() {
  const [candles, setCandles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [symbol, setSymbol] = useState("BTC/USD");
  const [latestPrice, setLatestPrice] = useState(null);

  const fetchChart = async () => {
    try {
      setLoading(true);
      const exchangeName = "coinbase"; // default exchange
      const res = await axios.get(
        `https://neov6backend.onrender.com/api/candles?exchange=${exchangeName}&symbol=${symbol}&timeframe=1h`
      );

      const data = res.data || [];
      setCandles(data);

      if (data.length) {
        setLatestPrice(data[data.length - 1].close);
      }
    } catch (err) {
      console.error("Error fetching chart:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChart();
    const interval = setInterval(fetchChart, 60000);
    return () => clearInterval(interval);
  }, [symbol]);

 // Custom tooltip (compact with date)
const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const d = payload[0].payload;
    const date = new Date(d.time * 1000);
    return (
      <div className="bg-white px-2 py-1 border border-gray-300 shadow rounded text-xs">
        <div className="font-semibold">{symbol}</div>
        <div>
          {date.toLocaleDateString()} {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} | 
          O:{d.open} H:{d.high} L:{d.low} C:{d.close}
        </div>
      </div>
    );
  }
  return null;
};

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-2">Dashboard</h1>

      <div className="mb-4">
        <span className="text-lg font-semibold">{symbol}</span>
        {latestPrice !== null && (
          <span className="ml-4 text-green-600 font-semibold">
            ${latestPrice.toLocaleString()}
          </span>
        )}
      </div>

      <div style={{ width: "100%", height: 400 }}>
        {loading ? (
          <p>Loading chart...</p>
        ) : candles.length ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={candles}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="time"
                tickFormatter={(ts) => new Date(ts * 1000).toLocaleTimeString()}
              />
              <YAxis domain={["auto", "auto"]} />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="close" stroke="#8884d8" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p>No chart data available.</p>
        )}
      </div>
    </div>
  );
}
