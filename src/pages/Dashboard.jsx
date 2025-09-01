// File: src/pages/Dashboard.jsx
import React, { useState, useEffect, useRef } from "react";
import { createChart } from "lightweight-charts";

const allSymbols = ["BTCUSDT", "ETHUSDT", "BNBUSDT", "SOLUSDT"];

export default function Dashboard() {
  const [selectedSymbol, setSelectedSymbol] = useState("BTCUSDT");
  const [prices, setPrices] = useState({});
  const [candles, setCandles] = useState([]);
  const [period, setPeriod] = useState(24);        // hours
  const [interval, setIntervalSec] = useState(60); // seconds

  const chartRef = useRef(null);
  const chartContainerRef = useRef(null);
  const seriesRef = useRef(null);

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

  // --- Fetch OHLC / candlestick data ---
  useEffect(() => {
    const fetchCandles = async () => {
      try {
        const API_URL = import.meta.env.VITE_API_URL;
        const res = await fetch(
          `${API_URL}/prices/candles?symbols=${selectedSymbol}&period=${period}&interval=${interval}`
        );
        const data = await res.json();
        if (data.success && data.candles[selectedSymbol]?.length) {
          setCandles(data.candles[selectedSymbol]);
        } else {
          setCandles([]); // fallback if no data
        }
      } catch (err) {
        console.error("Failed to fetch candles:", err);
        setCandles([]);
      }
    };
    fetchCandles();
  }, [selectedSymbol, period, interval]);

  // --- Render / update chart ---
  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Remove old chart
    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }

    const chart = createChart(chartContainerRef.current, { width: chartContainerRef.current.clientWidth, height: 400 });
    chartRef.current = chart;

    const candlestickSeries = chart.addCandlestickSeries();
    seriesRef.current = candlestickSeries;

    if (candles.length) {
      const data = candles.map(c => ({
        time: typeof c.time === "number" ? c.time : Math.floor(new Date(c.time).getTime() / 1000),
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
      }));
      candlestickSeries.setData(data);
    }
  }, [candles, selectedSymbol]);

  return (
    <div style={{ padding: "20px" }}>
      <h1>Crypto Dashboard</h1>

      {/* --- Dropdown selectors --- */}
      <div style={{ marginBottom: 20 }}>
        <label>
          Symbol:
          <select value={selectedSymbol} onChange={e => setSelectedSymbol(e.target.value)} style={{ marginLeft: 10 }}>
            {allSymbols.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>

        <label style={{ marginLeft: 30 }}>
          Period (hours):
          <select value={period} onChange={e => setPeriod(parseInt(e.target.value))} style={{ marginLeft: 10 }}>
            {[1, 6, 12, 24, 72, 168, 720].map(p => <option key={p} value={p}>{p}h</option>)}
          </select>
        </label>

        <label style={{ marginLeft: 30 }}>
          Interval (seconds):
          <select value={interval} onChange={e => setIntervalSec(parseInt(e.target.value))} style={{ marginLeft: 10 }}>
            {[10, 30, 60, 300, 900, 3600, 14400, 86400].map(i => <option key={i} value={i}>{i}s</option>)}
          </select>
        </label>
      </div>

      {/* --- Live Price --- */}
      <h2>Live Price</h2>
      <div style={{ marginBottom: 30 }}>
        <strong>{selectedSymbol}:</strong> {prices[selectedSymbol] || "Loading..."}
      </div>

      {/* --- Candlestick Chart --- */}
      <h2>Candlestick Chart</h2>
      <div ref={chartContainerRef} style={{ border: "1px solid #ccc" }}></div>
      {candles.length === 0 && <p>No candle data available for this period/interval.</p>}
    </div>
  );
}
