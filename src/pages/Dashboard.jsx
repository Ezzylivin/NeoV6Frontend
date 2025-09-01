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
  ResponsiveContainer,
} from "recharts";

// Example Header Component
const Header = ({ user }) => (
  <header className="bg-gray-800 text-white px-6 py-3 flex justify-between items-center">
    <h1 className="text-xl font-bold">NeoV6 Dashboard</h1>
    <div>
      {user ? (
        <span>{user.username}</span>
      ) : (
        <span>Guest</span>
      )}
    </div>
  </header>
);

export default function Dashboard() {
  const [user] = useState({ username: "Eric" }); // Replace with AuthContext if available
  const [symbol, setSymbol] = useState("BTC/USD");
  const [latestPrice, setLatestPrice] = useState(null);
  const [candles, setCandles] = useState([]);
  const [liveCandles, setLiveCandles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [interval, setIntervalValue] = useState("1h");

  const intervals = ["1m", "5m", "10m", "30m", "1h", "4h", "1d", "3d"];

  const fetchCandles = async (setTarget, tf = interval) => {
    try {
      const exchangeName = "coinbase"; // default exchange
      const res = await axios.get(
        `https://neov6backend.onrender.com/api/candles?exchange=${exchangeName}&symbol=${symbol}&timeframe=${tf}`
      );
      const data = res.data || [];
      setTarget(data);
      if (data.length) setLatestPrice(data[data.length - 1].close);
    } catch (err) {
      console.error("Error fetching candles:", err);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchCandles(setCandles).finally(() => setLoading(false));

    const liveInterval = setInterval(() => fetchCandles(setLiveCandles, "1m"), 60000);
    return () => clearInterval(liveInterval);
  }, [symbol, interval]);

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const d = payload[0].payload;
      return (
        <div className="bg-white p-2 border shadow rounded text-sm">
          <p><strong>{symbol}</strong></p>
          <p>{new Date(d.time * 1000).toLocaleString()}</p>
          <p>O: ${d.open} H: ${d.high}</p>
          <p>L: ${d.low} C: ${d.close}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-gray-100 min-h-screen">
      <Header user={user} />

      <div className="p-4 space-y-8">
        {/* Symbol & Interval Selection */}
        <div className="flex gap-4 items-center">
          <span className="font-semibold text-lg">{symbol}</span>
          {latestPrice !== null && (
            <span className="ml-2 text-green-600 font-semibold">
              ${latestPrice.toLocaleString()}
            </span>
          )}
          <select
            value={interval}
            onChange={(e) => setIntervalValue(e.target.value)}
            className="border p-2 rounded"
          >
            {intervals.map((intv) => (
              <option key={intv} value={intv}>
                {intv}
              </option>
            ))}
          </select>
        </div>

        {/* Historical Chart */}
        <div className="bg-white p-4 shadow rounded">
          <h2 className="text-xl font-bold mb-2">NeoV6 Dashboard</h2>
          <div style={{ width: "100%", height: 300 }}>
            {loading ? (
              <p>Loading chart...</p>
            ) : candles.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={candles}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="time"
                    tickFormatter={(ts) =>
                      new Date(ts * 1000).toLocaleString()
                    }
                  />
                  <YAxis domain={["auto", "auto"]} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="close"
                    stroke="#8884d8"
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p>No chart data available.</p>
            )}
          </div>
        </div>

        {/* Live Prices Chart */}
        <div className="bg-white p-4 shadow rounded">
          <h2 className="text-xl font-bold mb-2">Live Prices</h2>
          <div style={{ width: "100%", height: 300 }}>
            {liveCandles.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={liveCandles}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="time"
                    tickFormatter={(ts) =>
                      new Date(ts * 1000).toLocaleTimeString()
                    }
                  />
                  <YAxis domain={["auto", "auto"]} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="close"
                    stroke="#82ca9d"
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p>Loading live data...</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
