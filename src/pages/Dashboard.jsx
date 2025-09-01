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

export default function Dashboard() {
  const [candles, setCandles] = useState([]);
  const [symbol, setSymbol] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDefaultChart = async () => {
      try {
        // 1️⃣ Get exchanges
        const exchangeRes = await axios.get(
          "https://neov6backend.onrender.com/api/exchanges"
        );
        const exchanges = exchangeRes.data.exchanges || [];

        if (!exchanges.length) {
          console.error("No exchanges found");
          setLoading(false);
          return;
        }

        // 2️⃣ Pick first exchange & first symbol
        const defaultExchange = exchanges[0];
        const defaultSymbol = defaultExchange.symbols?.[0];

        if (!defaultSymbol) {
          console.error("No symbols found for exchange", defaultExchange.name);
          setLoading(false);
          return;
        }

        setSymbol(defaultSymbol);

        // 3️⃣ Fetch candles
        const candleRes = await axios.get(
          `https://neov6backend.onrender.com/api/candles?exchange=${defaultExchange.name}&symbol=${defaultSymbol}&timeframe=1h`
        );
        setCandles(candleRes.data || []);
      } catch (err) {
        console.error("Error fetching default chart:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchDefaultChart();
  }, []);

  // --- Custom Tooltip ---
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const d = payload[0].payload;
      return (
        <div className="bg-white text-xs p-2 border border-gray-300 shadow rounded">
          <p className="font-semibold">{symbol}</p>
          <p>Time: {new Date(d.time * 1000).toLocaleString()}</p>
          <p>O: ${d.open}</p>
          <p>H: ${d.high}</p>
          <p>L: ${d.low}</p>
          <p>C: ${d.close}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-2">Dashboard</h1>

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
                  new Date(ts * 1000).toLocaleTimeString()
                }
                tick={{ fontSize: 10 }}
              />
              <YAxis
                domain={["auto", "auto"]}
                tick={{ fontSize: 10 }}
                width={50}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="close"
                stroke="#8884d8"
                dot={false}
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p>No chart data available.</p>
        )}
      </div>
    </div>
  );
}
