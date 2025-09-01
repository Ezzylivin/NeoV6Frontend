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
  Dot
} from "recharts";

export default function Dashboard() {
  const [candles1, setCandles1] = useState([]);
  const [candles2, setCandles2] = useState([]);
  const [loading, setLoading] = useState(true);

  const [timeframe1, setTimeframe1] = useState("1h");
  const [timeframe2, setTimeframe2] = useState("1h");

  const [price1, setPrice1] = useState(null);
  const [price2, setPrice2] = useState(null);

  const symbol1 = "BTC/USD";
  const symbol2 = "ETH/USD";
  const exchange = "coinbase";

  const timeOptions = ["1m", "5m", "10m", "15m", "30m", "1h", "4h", "1d", "3d"];

  // Fetch chart data and update candles & price
  const fetchChart = async (symbol, timeframe, setCandles, setPrice) => {
    try {
      const res = await axios.get(
        `https://neov6backend.onrender.com/api/candles?exchange=${exchange}&symbol=${symbol}&timeframe=${timeframe}`
      );
      const data = res.data || [];
      setCandles(data);

      if (data.length) {
        setPrice(data[data.length - 1].close);
      }
    } catch (err) {
      console.error(`Error fetching chart for ${symbol}:`, err);
    }
  };

  // Charts update every minute
  useEffect(() => {
    setLoading(true);
    const loadCharts = async () => {
      await Promise.all([
        fetchChart(symbol1, timeframe1, setCandles1, setPrice1),
        fetchChart(symbol2, timeframe2, setCandles2, setPrice2)
      ]);
      setLoading(false);
    };

    loadCharts();
    const chartInterval = setInterval(loadCharts, 60000);
    return () => clearInterval(chartInterval);
  }, [timeframe1, timeframe2]);

  // Live prices update every 5 seconds
  useEffect(() => {
    const fetchPrices = async () => {
      try {
        const [res1, res2] = await Promise.all([
          axios.get(`https://neov6backend.onrender.com/api/candles?exchange=${exchange}&symbol=${symbol1}&timeframe=1m&limit=1`),
          axios.get(`https://neov6backend.onrender.com/api/candles?exchange=${exchange}&symbol=${symbol2}&timeframe=1m&limit=1`)
        ]);
        if (res1.data.length) setPrice1(res1.data[res1.data.length - 1].close);
        if (res2.data.length) setPrice2(res2.data[res2.data.length - 1].close);
      } catch (err) {
        console.error("Error fetching live prices:", err);
      }
    };

    fetchPrices();
    const priceInterval = setInterval(fetchPrices, 5000);
    return () => clearInterval(priceInterval);
  }, []);

  // Custom tooltip
  const CustomTooltip = ({ active, payload, symbol }) => {
    if (active && payload && payload.length) {
      const d = payload[0].payload;
      return (
        <div className="bg-white p-2 border shadow rounded text-sm">
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

  // Custom dot for up/down candles
  const CustomDot = (props) => {
    const { cx, cy, payload, dataKey, index } = props;
    if (index === 0) return null; // skip first candle (no previous to compare)
    const prev = props?.chartData?.[index - 1];
    const color = payload.close >= prev.close ? "green" : "red";
    return <circle cx={cx} cy={cy} r={3} fill={color} />;
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
      {loading && <p>Loading charts...</p>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Chart 1 */}
        <div>
          <div className="mb-2 flex items-center gap-2">
            <span className="font-semibold">
              {symbol1} {price1 !== null && <span className="text-green-600">${price1.toLocaleString()}</span>}
            </span>
            <select
              value={timeframe1}
              onChange={(e) => setTimeframe1(e.target.value)}
              className="border p-1 text-sm"
            >
              {timeOptions.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div style={{ width: "100%", height: 300 }}>
            {candles1.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={candles1}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="time"
                    tickFormatter={(ts) => new Date(ts * 1000).toLocaleTimeString()}
                  />
                  <YAxis domain={["auto", "auto"]} />
                  <Tooltip content={<CustomTooltip symbol={symbol1} />} />
                  <Line
                    type="monotone"
                    dataKey="close"
                    stroke="#8884d8"
                    dot={(props) => <CustomDot {...props} chartData={candles1} />}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p>No data for {symbol1}</p>
            )}
          </div>
        </div>

        {/* Chart 2 */}
        <div>
          <div className="mb-2 flex items-center gap-2">
            <span className="font-semibold">
              {symbol2} {price2 !== null && <span className="text-green-600">${price2.toLocaleString()}</span>}
            </span>
            <select
              value={timeframe2}
              onChange={(e) => setTimeframe2(e.target.value)}
              className="border p-1 text-sm"
            >
              {timeOptions.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div style={{ width: "100%", height: 300 }}>
            {candles2.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={candles2}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="time"
                    tickFormatter={(ts) => new Date(ts * 1000).toLocaleTimeString()}
                  />
                  <YAxis domain={["auto", "auto"]} />
                  <Tooltip content={<CustomTooltip symbol={symbol2} />} />
                  <Line
                    type="monotone"
                    dataKey="close"
                    stroke="#82ca9d"
                    dot={(props) => <CustomDot {...props} chartData={candles2} />}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p>No data for {symbol2}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
