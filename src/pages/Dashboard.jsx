// File: src/pages/Dashboard.jsx
import React, { useState, useEffect, useRef } from "react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid
} from "recharts";
import { createChart } from "lightweight-charts";

const allSymbols = ["BTCUSDT", "ETHUSDT", "BNBUSDT"];

// Helper: fetch with retries
const fetchWithRetry = async (url, retries = 2, delayMs = 1000) => {
  for (let i = 0; i <= retries; i++) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      if (i < retries) {
        console.warn(`Retrying fetch (${i + 1}) due to error: ${err.message}`);
        await new Promise(r => setTimeout(r, delayMs));
      } else {
        throw err;
      }
    }
  }
};

export default function Dashboard() {
  const [selectedSymbol, setSelectedSymbol] = useState("BTCUSDT");
  const [prices, setPrices] = useState({});
  const [history, setHistory] = useState({});
  const [candles, setCandles] = useState({});
  const [period, setPeriod] = useState(24);        // hours
  const [interval, setIntervalSec] = useState(60); // seconds

  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);
  const seriesRef = useRef(null);

  const API_URL = import.meta.env.VITE_API_URL;

  // --- Live prices ---
  useEffect(() => {
    const fetchLive = async () => {
      try {
        const data = await fetchWithRetry(`${API_URL}/prices/live?symbols=${allSymbols.join(",")}`);
        if (data.success) setPrices(data.prices);
      } catch (err) {
        console.error("Failed to fetch live prices:", err);
      }
    };
    fetchLive();
    const intv = setInterval(fetchLive, 10000);
    return () => clearInterval(intv);
  }, []);

  // --- Price history ---
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const data = await fetchWithRetry(`${API_URL}/prices/history?symbols=${selectedSymbol}&period=${period}&interval=${interval}`);
        if (data.success) {
          let formatted = (data.history[selectedSymbol] || []).map(p => ({
            time: p.time * 1000, // milliseconds for Recharts
            price: p.price
          }));
          if (formatted.length > 1000) {
            const step = Math.ceil(formatted.length / 1000);
            formatted = formatted.filter((_, i) => i % step === 0);
          }
          setHistory({ [selectedSymbol]: formatted });
        }
      } catch (err) {
        console.error("Failed to fetch history:", err);
      }
    };
    fetchHistory();
  }, [selectedSymbol, period, interval]);

  // --- Create chart once ---
  useEffect(() => {
    if (!chartContainerRef.current) return;

    if (!chartRef.current) {
      const chart = createChart(chartContainerRef.current, {
        width: chartContainerRef.current.clientWidth,
        height: 400,
        layout: { backgroundColor: "#ffffff", textColor: "#333" },
        grid: { vertLines: { color: "#eee" }, horzLines: { color: "#eee" } },
        rightPriceScale: { borderVisible: false },
        timeScale: { borderVisible: false }
      });
      chartRef.current = chart;

      const candlestickSeries = chart.addCandlestickSeries({
        upColor: "#4caf50",
        downColor: "#f44336",
        borderVisible: false,
        wickVisible: true
      });
      seriesRef.current = candlestickSeries;

      const handleResize = () => chart.applyOptions({ width: chartContainerRef.current.clientWidth });
      window.addEventListener("resize", handleResize);
      return () => window.removeEventListener("resize", handleResize);
    }
  }, []);

  // --- Poll candle API and live-scroll chart (last 100 candles) ---
  useEffect(() => {
    if (!selectedSymbol) return;

    const MAX_CANDLES = 100;

    const fetchAndScrollCandles = async () => {
      try {
        const data = await fetchWithRetry(
          `${API_URL}/prices/candles?symbols=${selectedSymbol}&period=${period}&interval=${interval}`
        );
        if (data.success) {
          let formatted = (data.candles[selectedSymbol] || []).map(c => ({
            time: Math.floor(c.time),
            open: c.open,
            high: c.high,
            low: c.low,
            close: c.close
          }));

          // Keep only the last MAX_CANDLES
          formatted = formatted.slice(-MAX_CANDLES);

          setCandles({ [selectedSymbol]: formatted });

          if (seriesRef.current && formatted.length) {
            const lastCandle = formatted[formatted.length - 1];
            seriesRef.current.update(lastCandle);

            // Scroll chart so latest candle is visible
            chartRef.current.timeScale().scrollToRealTime();
          }
        }
      } catch (err) {
        console.error("Failed to fetch candles:", err);
      }
    };

    // Initial fetch
    fetchAndScrollCandles();

    // Poll every 10 seconds
    const pollInterval = setInterval(fetchAndScrollCandles, 10000);
    return () => clearInterval(pollInterval);

  }, [selectedSymbol, period, interval]);

  return (
    <div style={{ padding: "20px" }}>
      <h1>Crypto Dashboard</h1>

      {/* Dropdown selectors */}
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
            {[10, 30, 60, 300, 900, 3600].map(i => <option key={i} value={i}>{i}s</option>)}
          </select>
        </label>
      </div>

      {/* Live price */}
      <h2>Live Price</h2>
      <div style={{ marginBottom: 30 }}>
        <strong>{selectedSymbol}:</strong> {prices[selectedSymbol] || "Loading..."}
      </div>

      {/* Price history chart */}
      <h2>Price History</h2>
      <div style={{ marginBottom: 50 }}>
        <LineChart width={800} height={400} data={history[selectedSymbol] || []}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="time"
            tickFormatter={t => {
              const d = new Date(t);
              return period <= 24 ? d.toLocaleTimeString() : d.toLocaleDateString();
            }}
            type="number"
            domain={['dataMin', 'dataMax']}
            scale="time"
          />
          <YAxis />
          <Tooltip labelFormatter={t => new Date(t).toLocaleString()} />
          <Line type="monotone" dataKey="price" stroke="#8884d8" dot={false} />
        </LineChart>
      </div>

      {/* Candlestick chart */}
      <h2>Candlestick Chart</h2>
      <div ref={chartContainerRef} style={{ width: "100%", height: 400 }}></div>
    </div>
  );
}
