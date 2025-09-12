import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer
} from "recharts";

export default function Dashboard() {
  const [candles1, setCandles1] = useState([]);
  const [candles2, setCandles2] = useState([]);
  const [loading, setLoading] = useState(true);
  const [livePrices, setLivePrices] = useState({ BTC: 0, ETH: 0 });

  // Add state to hold potential errors for each chart
  const [error1, setError1] = useState(null);
  const [error2, setError2] = useState(null);

  const [timeframe1, setTimeframe1] = useState("1h");
  const [timeframe2, setTimeframe2] = useState("1h");

  const symbol1 = "BTC/USD";
  const symbol2 = "ETH/USD";
  const exchange = "coinbase"; // Your exchange ID

  const timeOptions = ["1m", "5m", "15m", "30m", "1h", "4h", "1d"];

  // Fetch and format candles
  const fetchChart = async (symbol, timeframe, setCandles, setError) => {
    setError(null); // Clear previous error on new fetch
    try {
      const res = await axios.get(
        `https://neov6backend.onrender.com/api/candles?exchangeId=${exchange}&symbol=${symbol}&timeframe=${timeframe}`
      );

      if (res.data && Array.isArray(res.data.candles)) {
        const formattedData = res.data.candles.map(c => ({
          time: c[0],   // Timestamp
          open: c[1],   // Open
          high: c[2],   // High
          low: c[3],    // Low
          close: c[4]   // Close
        }));

        setCandles(formattedData);
        
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
      // Set a user-friendly error message to be displayed in the UI
      setError(`Failed to load chart: ${err.message}. This is likely a CORS issue or the backend server is down.`);
      setCandles([]); // Clear data on error
    }
  };

  useEffect(() => {
    setLoading(true);
    const loadCharts = async () => {
      await Promise.all([
        fetchChart(symbol1, timeframe1, setCandles1, setError1),
        fetchChart(symbol2, timeframe2, setCandles2, setError2)
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

  // Pass the 'error' state to the render function
  const renderChart = (symbol, candles, timeframe, setTimeframe, color, error) => {
    const latest = candles.length ? candles[candles.length - 1] : null;
    const intervalUp = latest ? latest.close >= latest.open : true;

    return (
      <div>
        <div className="mb-2 flex items-center gap-2">
          <span className="font-semibold">
            {symbol} - ${livePrices[symbol.split("/")[0]]?.toLocaleString() || "0"}
            <span
              style={{
                display: "inline-block", width: "10px", height: "10px",
                marginLeft: "6px", borderRadius: "50%",
                backgroundColor: intervalUp ? "green" : "red"
              }}
            ></span>
          </span>
          <select
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value)}
            className="border p-1 text-sm rounded"
          >
            {timeOptions.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        <div style={{ width: "100%", height: 300 }}>
          {/* Display the error message if it exists */}
          {error ? (
            <div className="flex items-center justify-center h-full text-red-600 bg-red-50 p-4 rounded">
              <p className="text-center font-semibold">{error}</p>
            </div>
          ) : candles.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={candles}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" tickFormatter={ts => new Date(ts).toLocaleTimeString()} />
                <YAxis domain={["auto", "auto"]} allowDataOverflow={true} />
                <Tooltip content={<CustomTooltip symbol={symbol} />} />
                <Line
                  type="monotone"
                  dataKey="close"
                  stroke={color}
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
    <div className="p-4 bg-gray-50 min-h-screen">
      <h1 className="text-2xl font-bold mb-4">Neo-V6 Dashboard</h1>
      {/* Show a general loading message, errors will be shown in the chart areas */}
      {loading && !error1 && !error2 && <p>Loading charts...</p>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Pass the error states to the renderChart calls */}
        {renderChart(symbol1, candles1, timeframe1, setTimeframe1, "#8884d8", error1)}
        {renderChart(symbol2, candles2, timeframe2, setTimeframe2, "#82ca9d", error2)}
      </div>
    </div>
  );
}

