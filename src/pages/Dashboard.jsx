import React, { useState, useEffect, useContext, createContext } from "react";
import axios from "axios";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer
} from "recharts";
import useAuth from '../context/AuthContext.js';

export default function Dashboard() {
  // The useAuth hook can now be used without a direct import from a separate file.
  const { user, isAuthenticated } = useAuth();

  const [candles1, setCandles1] = useState([]);
  const [candles2, setCandles2] = useState([]);
  const [loading, setLoading] = useState(true);
  const [livePrices, setLivePrices] = useState({ BTC: 0, ETH: 0 });
  const [error, setError] = useState(null);

  const [timeframe1, setTimeframe1] = useState("1h");
  const [timeframe2, setTimeframe2] = useState("1h");

  const symbol1 = "BTC/USD";
  const symbol2 = "ETH/USD";
  const exchange = "coinbase";

  const timeOptions = ["1m", "5m", "15m", "30m", "1h", "4h", "1d"];

  // Fetch and format candles using the configured apiClient
  const fetchChart = async (symbol, timeframe, setCandles) => {
    try {
      const res = await apiClient.get(
        `/candles?exchangeId=${exchange}&symbol=${symbol}&timeframe=${timeframe}`
      );

      if (res.data && Array.isArray(res.data.candles)) {
        const formattedData = res.data.candles.map(c => ({
          time: c[0],
          open: c[1],
          high: c[2],
          low: c[3],
          close: c[4]
        }));

        setCandles(formattedData);
        setError(null);

        if (formattedData.length) {
          setLivePrices(prev => ({
            ...prev,
            [symbol.split("/")[0]]: formattedData[formattedData.length - 1].close
          }));
        }
      } else {
        setCandles([]);
      }
    } catch (err) {
      console.error(`Error fetching chart for ${symbol}:`, err);
      setError(err.response?.data?.message || err.message);
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
          <p>{new Date(d.time).toLocaleString()}</p>
          <p>O: ${d.open}</p>
          <p>H: ${d.high}</p>
          <p>L: ${d.low}</p>
          <p style={{ color }}>C: ${d.close}</p>
        </div>
      );
    }
    return null;
  };

  const renderChart = (symbol, candles, timeframe, setTimeframe, color) => {
    const latest = candles.length ? candles[candles.length - 1] : null;
    const intervalUp = latest ? latest.close >= latest.open : true;

    return (
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="mb-2 flex items-center justify-between gap-2">
          <span className="font-semibold text-lg">
            {symbol} - ${livePrices[symbol.split("/")[0]]?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || "0.00"}
            <span
              style={{
                display: "inline-block", width: "10px", height: "10px",
                marginLeft: "8px", borderRadius: "50%",
                backgroundColor: intervalUp ? "#22c55e" : "#ef4444"
              }}
            ></span>
          </span>
          <select
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value)}
            className="border p-1 text-sm rounded-md bg-gray-50"
          >
            {timeOptions.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        <div style={{ width: "100%", height: 300 }}>
          {candles.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={candles}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" tickFormatter={ts => new Date(ts).toLocaleTimeString()} />
                <YAxis domain={["auto", "auto"]} allowDataOverflow={true} tickFormatter={(price) => `$${price.toLocaleString()}`} />
                <Tooltip content={<CustomTooltip symbol={symbol} />} />
                <Line
                  type="monotone"
                  dataKey="close"
                  stroke={color}
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              <p>No data available for {symbol}</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="p-4 bg-gray-100 min-h-screen">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">
        {isAuthenticated && user ? `Welcome to the Dashboard, ${user.username}!` : "Neo-V6 Dashboard"}
      </h1>
      
      {loading && <p>Loading charts...</p>}
      {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-4">{error}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {renderChart(symbol1, candles1, timeframe1, setTimeframe1, "#8884d8")}
        {renderChart(symbol2, candles2, timeframe2, setTimeframe2, "#82ca9d")}
      </div>
    </div>
  );
}

