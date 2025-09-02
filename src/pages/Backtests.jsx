// File: src/pages/Backtests.jsx
import React, { useState, useEffect } from "react";
import axios from "axios";
import { useAuth } from "../context/AuthContext.jsx";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer
} from "recharts";

const SYMBOLS = ["BTC/USD", "ETH/USD", "BNB/USD", "SOL/USD"];
const TIMEFRAMES = ["1m", "5m", "10m", "15m", "30m", "1h", "4h", "1d", "3d"];

export default function Backtests() {
  const { user } = useAuth();
  const [symbol, setSymbol] = useState(SYMBOLS[0]);
  const [timeframe, setTimeframe] = useState(TIMEFRAMES[0]);
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [latestPrice, setLatestPrice] = useState(null);

  const API_URL = import.meta.env.VITE_API_URL || "https://neov6backend.onrender.com/api";

  // Fetch chart data for mini chart
  useEffect(() => {
    const fetchChart = async () => {
      setLoading(true);
      try {
        const res = await axios.get(
          `${API_URL}/candles?exchange=coinbase&symbol=${symbol}&timeframe=${timeframe}`
        );
        const data = res.data || [];
        setChartData(data);
        if (data.length) {
          setLatestPrice(data[data.length - 1].close);
        }
      } catch (err) {
        console.error("Error fetching chart data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchChart();
    const interval = setInterval(fetchChart, 60000); // auto-refresh every minute
    return () => clearInterval(interval);
  }, [symbol, timeframe]);

  // Custom tooltip for compact OHLC
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const d = payload[0].payload;
      return (
        <div className="bg-white p-1 border shadow rounded text-xs text-black">
          <p><strong>{symbol}</strong></p>
          <p>{new Date(d.time * 1000).toLocaleString()}</p>
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
    <div className="p-4 bg-black min-h-screen text-white">
      <h1 className="text-2xl font-bold mb-4">Backtests</h1>

      <div className="mb-4 flex flex-wrap items-center gap-4">
        <div>
          <label className="block mb-1">Symbol:</label>
          <select
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            className="p-2 rounded text-black"
          >
            {SYMBOLS.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block mb-1">Timeframe:</label>
          <select
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value)}
            className="p-2 rounded text-black"
          >
            {TIMEFRAMES.map(tf => (
              <option key={tf} value={tf}>{tf}</option>
            ))}
          </select>
        </div>

        {latestPrice !== null && (
          <div className="ml-4 text-green-400 font-semibold text-lg">
            ${latestPrice.toLocaleString()}
          </div>
        )}
      </div>

      <div style={{ width: "100%", height: 200, marginBottom: "2rem" }}>
        {loading ? (
          <p>Loading chart...</p>
        ) : chartData.length ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <XAxis dataKey="time" hide />
              <YAxis domain={["auto", "auto"]} hide />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="close"
                stroke="#10B981"
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-gray-400">No chart data available.</p>
        )}
      </div>

      {/* Placeholder for backtest results */}
      <div className="bg-gray-900 p-4 rounded-lg">
        <h2 className="text-xl font-semibold mb-2">Backtest Results</h2>
        <p className="text-gray-400">Results will appear here after running a backtest.</p>
      </div>
    </div>
  );
}
