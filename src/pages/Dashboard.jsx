// File: src/pages/Dashboard.jsx
import React, { useState, useEffect, useRef } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { createChart } from "lightweight-charts";

const allSymbols = ["BTCUSDT", "ETHUSDT", "BNBUSDT"];

export default function Dashboard() {
  const [selectedSymbol, setSelectedSymbol] = useState("BTCUSDT");
  const [prices, setPrices] = useState({});
  const [history, setHistory] = useState({});
  const [candles, setCandles] = useState({});
  const [period, setPeriod] = useState(24);       // hours
  const [interval, setIntervalSec] = useState(60); // seconds
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);

  // --- Fetch live prices ---
  useEffect(() => {
    const fetchLive = async () => {
      try {
        const API_URL = import.meta.env.VITE_API_URL;
        const res = await fetch(`${API_URL}/prices/live?symbols=${allSymbols.join(",")}`);
        const data = await res.json();
        if (data.success) setPrices(data.prices);
      } catch (err) {
        console.error("Failed to fetch live prices:", err);
      }
    };

    fetchLive();
    const intv = setInterval(fetchLive, 10000);
    return () => clearInterval(intv);
  }, []);

  // --- Fetch price history ---
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const API_URL = import.meta.env.VITE_API_URL;
        const res = await fetch(
          `${API_URL}/prices/history?symbols=${selectedSymbol}&period=${period}&interval=${interval}`
        );
        const data = await res.json();
        if (data.success) setHistory({ [selectedSymbol]: data.history[selectedSymbol] || [] });
      } catch (err) {
        console.error("Failed to fetch history:", err);
      }
    };
    fetchHistory();
  }, [selectedSymbol, period, interval]);

  // --- Fetch candlestick data ---
  useEffect(() => {
    const fetchCandles = async () => {
      try {
        const API_URL = import.meta.env.VITE_API_URL;
        const res = await fetch(
          `${API_URL}/prices/candles?symbols=${selectedSymbol}&period=${period}&interval=${interval}`
        );
        const data = await res.json();
        if (data.success) setCandles({ [selectedSymbol]: data.candles[selectedSymbol] || [] });
      } catch (err) {
        console.error("Failed to fetch candles:", err);
      }
    };
    fetchCandles();
  }, [selectedSymbol, period, interval]);

  // --- Render candlestick chart ---
 // --- Render candlestick chart ---
useEffect(() => {
  if (!chartContainerRef.current || !candles[selectedSymbol] || !candles[selectedSymbol].length) return;

  // Clear old chart
  if (chartRef.current) {
    chartRef.current.remove();
  }

  // Create chart with container size
  const chart = createChart(chartContainerRef.current, {
    width: chartContainerRef.current.clientWidth,
    height: 300,
  });
  const series = chart.addCandlestickSeries();

  const data = candles[selectedSymbol].map(c => ({
    time: typeof c.time === "number" ? c.time : Math.floor(new Date(c.time).getTime() / 1000),
    open: c.open,
    high: c.high,
    low: c.low,
    close: c.close
  }));

  series.setData(data);
  chartRef.current = chart;

  // --- Resize handling ---
  const resizeObserver = new ResizeObserver(entries => {
    for (let entry of entries) {
      chart.applyOptions({ width: entry.contentRect.width });
    }
  });
  resizeObserver.observe(chartContainerRef.current);

  return () => {
    resizeObserver.disconnect();
    chart.remove();
  };
}, [candles, selectedSymbol]);


  return (
    <div>
      <h1>Crypto Dashboard</h1>

      {/* --- Dropdown selectors --- */}
      <div style={{ marginBottom: 20 }}>
        <label>
          Symbol:
          <select
            value={selectedSymbol}
            onChange={e => setSelectedSymbol(e.target.value)}
            style={{ marginLeft: 10 }}
          >
            {allSymbols.map(s => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>

        <label style={{ marginLeft: 30 }}>
          Period (hours):
          <select
            value={period}
            onChange={e => setPeriod(parseInt(e.target.value))}
            style={{ marginLeft: 10 }}
          >
            {[1, 6, 12, 24, 72].map(p => (
              <option key={p} value={p}>
                {p}h
              </option>
            ))}
          </select>
        </label>

        <label style={{ marginLeft: 30 }}>
          Interval (seconds):
          <select
            value={interval}
            onChange={e => setIntervalSec(parseInt(e.target.value))}
            style={{ marginLeft: 10 }}
          >
            {[10, 30, 60, 300, 900, 3600].map(i => (
              <option key={i} value={i}>
                {i}s
              </option>
            ))}
          </select>
        </label>
      </div>

      <h2>Live Price</h2>
      <div style={{ marginBottom: 30 }}>
        <strong>{selectedSymbol}:</strong> {prices[selectedSymbol] || "Loading..."}
      </div>

      <h2>Price History</h2>
      <div style={{ marginBottom: 50 }}>
        <LineChart width={600} height={300} data={history[selectedSymbol] || []}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="time" tickFormatter={t => new Date(t).toLocaleTimeString()} />
          <YAxis />
          <Tooltip labelFormatter={t => new Date(t).toLocaleString()} />
          <Line type="monotone" dataKey="price" stroke="#8884d8" dot={false} />
        </LineChart>
      </div>

      <h2>Candlestick Chart</h2>
<div ref={chartContainerRef} style={{ width: "100%", height: "300px" }}></div>

    </div>
  );
}
