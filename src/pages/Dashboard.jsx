// File: src/pages/Dashboard.jsx
import React, { useState, useEffect } from "react";
import axios from "axios";
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from "recharts";

export default function Dashboard() {
  const [candles, setCandles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBTCChart = async () => {
      try {
        const exchangeName = "coinbase"; // pick a default exchange (must exist in your backend)
        const symbol = "BTC/USD";        // default asset

        const candleRes = await axios.get(
          `https://neov6backend.onrender.com/api/candles?exchange=${exchangeName}&symbol=${symbol}&timeframe=1h`
        );

        setCandles(candleRes.data || []);
      } catch (err) {
        console.error("Error fetching BTC/USD chart:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchBTCChart();
  }, []);

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Dashboard</h1>

      <div style={{ width: "100%", height: 400 }}>
        {loading ? (
          <p>Loading chart...</p>
        ) : candles.length ? (
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
          <p>No chart data available.</p>
        )}
      </div>
    </div>
  );
}
