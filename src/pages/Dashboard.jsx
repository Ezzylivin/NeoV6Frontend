// File: src/pages/Dashboard.jsx
import React, { useState, useEffect } from "react";
import axios from "axios";
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from "recharts";

export default function Dashboard() {
  const [candles, setCandles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [symbol, setSymbol] = useState("BTC/USD"); // current asset
  const [latestPrice, setLatestPrice] = useState(null);

  useEffect(() => {
    const fetchChart = async () => {
      try {
        const exchangeName = "coinbase"; // default exchange
        const candleRes = await axios.get(
          `https://neov6backend.onrender.com/api/candles?exchange=${exchangeName}&symbol=${symbol}&timeframe=1h`
        );

        const candlesData = candleRes.data || [];
        setCandles(candlesData);

        if (candlesData.length) {
          setLatestPrice(candlesData[candlesData.length - 1].close); // most recent close
        }
      } catch (err) {
        console.error("Error fetching chart:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchChart();
  }, [symbol]);

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-2">Dashboard</h1>

      {/* Symbol & Latest Price */}
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
