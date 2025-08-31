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

  // --- Render candlestick chart safely ---
  useEffect(() => {
    const candleData = candles[selectedSymbol];
    if (!chartContainerRef.current || !candleData || !candleData.length) return;

    // Remove previous chart if exists
    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 300,
    });
    chartRef.current = chart;

    const series = chart.addCandlestickSeries();
    series.setData(
      candleData.map(c => ({
        time: typeof c.time === "number" ? c.time : Math.floor(new Date(c.time).getTime() / 1000),
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
      }))
    );

    const resizeObserver = new ResizeObserver(entries => {
      for (let entry of entries) {
        chart.applyOptions({ width: entry.contentRect.width });
      }
    });
    resizeObserver.observe(chartContainerRef.current);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
      chartRef.current = null;
    };
  }, [candles, selectedSymbol]);

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-4">Crypto Dashboard</h1>

      {/* --- Dropdown selectors --- */}
      <div className="mb-6 flex flex-wrap gap-6">
        <label>
          Symbol:
          <select
            value={selectedSymbol}
            onChange={e => setSelectedSymbol(e.target.value)}
            className="ml-2 p-1 bg-gray-800 text-white rounded"
          >
            {allSymbols.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </label>

        <label>
          Period (hours):
          <select
            value={period}
            onChange={e => setPeriod(parseInt(e.target.value))}
            className="ml-2 p-1 bg-gray-800 text-white rounded"
          >
            {[1, 6, 12, 24, 72].map(p => (
              <option key={p} value={p}>{p}h</option>
            ))}
          </select>
        </label>

        <label>
          Interval (seconds):
          <select
            value={interval}
            onChange={e => setIntervalSec(parseInt(e.target.value))}
            className="ml-2 p-1 bg-gray-800 text-white rounded"
          >
            {[10, 30, 60, 300, 900, 3600].map(i => (
              <option key={i} value={i}>{i}s</option>
            ))}
          </select>
        </label>
      </div>

      {/* --- Live Price --- */}
      <div className="mb-6">
        <strong>{selectedSymbol}:</strong> {prices[selectedSymbol] ?? "Loading..."}
      </div>

      {/* --- Price History --- */}
      <h2 className="text-xl font-semibold mb-2">Price History</h2>
      {history[selectedSymbol] && history[selectedSymbol].length > 0 ? (
        <LineChart width={600} height={300} data={history[selectedSymbol]}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="time" tickFormatter={t => new Date(t).toLocaleTimeString()} />
          <YAxis />
          <Tooltip labelFormatter={t => new Date(t).toLocaleString()} />
          <Line type="monotone" dataKey="price" stroke="#8884d8" dot={false} />
        </LineChart>
      ) : (
        <p className="text-gray-400 italic">No price history available for {selectedSymbol}.</p>
      )}

      {/* --- Candlestick Chart --- */}
      <h2 className="text-xl font-semibold mt-6 mb-2">Candlestick Chart</h2>
      {candles[selectedSymbol] && candles[selectedSymbol].length > 0 ? (
        <div ref={chartContainerRef} style={{ width: "100%", height: "300px" }}></div>
      ) : (
        <p className="text-gray-400 italic">No candlestick data available for {selectedSymbol}.</p>
      )}
    </div>
  );
}
