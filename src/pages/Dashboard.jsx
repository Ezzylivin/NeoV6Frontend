// File: src/pages/Dashboard.jsx
import React, { useState, useEffect, useRef } from "react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid
} from "recharts";
import { createChart } from "lightweight-charts";

const allSymbols = ["BTCUSDT", "ETHUSDT", "BNBUSDT"];

// --- Helper: fetch with retries ---
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
  const [period, setPeriod] = useState(24);        // hours
  const [interval, setIntervalSec] = useState(60); // seconds

  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);
  const candleSeriesRef = useRef(null);
  const lineSeriesRef = useRef(null);

  const API_URL = import.meta.env.VITE_API_URL;

  // --- Live prices ---
  useEffect(() => {
    const fetchLive = async () => {
      try {
        const data = await fetchWithRetry(
          `${API_URL}/prices/live?symbols=${allSymbols.join(",")}`
        );
        if (data.success) setPrices(data.prices);
      } catch (err) {
        console.error("Failed to fetch live prices:", err);
      }
    };
    fetchLive();
    const intv = setInterval(fetchLive, 10000);
    return () => clearInterval(intv);
  }, []);

  // --- Price history (Recharts) ---
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const data = await fetchWithRetry(
          `${API_URL}/prices/history?symbols=${selectedSymbol}&period=${period}&interval=${interval}`
        );
        if (data.success) {
          let formatted = (data.history[selectedSymbol] || []).map(p => ({
            time: p.time * 1000, // ms for Recharts
            price: p.price
          }));
          // Downsample to max 1000 points
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

  // --- Setup lightweight-charts once ---
  useEffect(() => {
    if (!chartContainerRef.current || chartRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 500,
      layout: {
        background: { color: "#111" },
        textColor: "#DDD",
      },
      grid: {
        vertLines: { color: "#222" },
        horzLines: { color: "#222" },
      },
      crosshair: { mode: 1 },
      rightPriceScale: { borderVisible: false },
      timeScale: { borderVisible: false },
    });
    chartRef.current = chart;

    const candleSeries = chart.addCandlestickSeries({
      upColor: "#26a69a",
      downColor: "#ef5350",
      borderUpColor: "#26a69a",
      borderDownColor: "#ef5350",
      wickUpColor: "#26a69a",
      wickDownColor: "#ef5350",
    });
    candleSeriesRef.current = candleSeries;

    const lineSeries = chart.addLineSeries({
      color: "#2962FF",
      lineWidth: 2,
    });
    lineSeriesRef.current = lineSeries;

    const resizeObserver = new ResizeObserver(() => {
      chart.applyOptions({
        width: chartContainerRef.current.clientWidth,
        height: chartContainerRef.current.clientHeight,
      });
    });
    resizeObserver.observe(chartContainerRef.current);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
    };
  }, []);

  // --- Poll candles & update lightweight-charts ---
  useEffect(() => {
    if (!selectedSymbol) return;

    const MAX_CANDLES = 100;

    const fetchCandles = async () => {
      try {
        const data = await fetchWithRetry(
          `${API_URL}/prices/candles?symbols=${selectedSymbol}&period=${period}&interval=${interval}`
        );
        if (data.success) {
          let formatted = (data.candles[selectedSymbol] || []).map(c => ({
            time: Math.floor(c.time), // API should return sec timestamps
            open: c.open,
            high: c.high,
            low: c.low,
            close: c.close,
          }));
          formatted = formatted.slice(-MAX_CANDLES);

          if (candleSeriesRef.current) {
            candleSeriesRef.current.setData(formatted);
          }
          if (lineSeriesRef.current) {
            lineSeriesRef.current.setData(
              formatted.map(c => ({ time: c.time, value: c.close }))
            );
          }

          chartRef.current?.timeScale().scrollToRealTime();
        }
      } catch (err) {
        console.error("Failed to fetch candles:", err);
      }
    };

    fetchCandles();
    const intv = setInterval(fetchCandles, 10000);
    return () => clearInterval(intv);
  }, [selectedSymbol, period, interval]);

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4 text-white">Crypto Dashboard</h1>

      {/* Controls */}
      <div className="mb-6 flex flex-wrap gap-6">
        <label>
          Symbol:
          <select
            className="ml-2"
            value={selectedSymbol}
            onChange={e => setSelectedSymbol(e.target.value)}
          >
            {allSymbols.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>

        <label>
          Period (hours):
          <select
            className="ml-2"
            value={period}
            onChange={e => setPeriod(parseInt(e.target.value))}
          >
            {[1, 6, 12, 24, 72, 168, 720].map(p => (
              <option key={p} value={p}>{p}h</option>
            ))}
          </select>
        </label>

        <label>
          Interval (sec):
          <select
            className="ml-2"
            value={interval}
            onChange={e => setIntervalSec(parseInt(e.target.value))}
          >
            {[10, 30, 60, 300, 900, 3600].map(i => (
              <option key={i} value={i}>{i}s</option>
            ))}
          </select>
        </label>
      </div>

      {/* Live price */}
      <h2 className="text-lg font-semibold mb-2">Live Price</h2>
      <div className="mb-8">
        <strong>{selectedSymbol}:</strong>{" "}
        {prices[selectedSymbol] || "Loading..."}
      </div>

      {/* History chart (Recharts) */}
      <h2 className="text-lg font-semibold mb-2">Price History</h2>
      <div className="mb-8 bg-white p-4 rounded-lg shadow-md">
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

      {/* Candlestick chart (lightweight-charts) */}
      <h2 className="text-lg font-semibold mb-2">Candlestick Chart</h2>
      <div
        ref={chartContainerRef}
        className="w-full h-[500px] rounded-xl shadow-lg bg-black"
      />
    </div>
  );
}
