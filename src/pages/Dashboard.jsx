// File: src/pages/Dashboard.jsx
import React, { useEffect, useRef, useState } from "react";
import { createChart, CrosshairMode } from "lightweight-charts";
import axios from "axios";

export default function Dashboard() {
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);
  const lineSeriesRef = useRef(null);

  const [exchanges, setExchanges] = useState({});
  const [exchange, setExchange] = useState("");
  const [symbols, setSymbols] = useState([]);
  const [symbol, setSymbol] = useState("");

  // --- Initialize chart ---
  useEffect(() => {
    const container = chartContainerRef.current;
    if (!container) return;

    const chart = createChart(container, {
      width: container.clientWidth,
      height: 500,
      layout: { background: { color: "#111" }, textColor: "#DDD" },
      grid: { vertLines: { color: "#222" }, horzLines: { color: "#222" } },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: { borderVisible: false },
      timeScale: { borderVisible: false },
    });

    chartRef.current = chart;

    // Only line series now
    const lineSeries = chart.addLineSeries({
      color: "#26a69a",
      lineWidth: 2,
    });
    lineSeriesRef.current = lineSeries;

    const resizeObserver = new ResizeObserver(() => {
      chart.applyOptions({
        width: container.clientWidth,
        height: container.clientHeight,
      });
    });
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
    };
  }, []);

  // --- Load exchanges from backend ---
  useEffect(() => {
    const fetchExchanges = async () => {
      try {
        const { data } = await axios.get("http://localhost:5000/api/exchanges");
        setExchanges(data);

        const defaultExchange = Object.keys(data)[0];
        setExchange(defaultExchange);
        setSymbols(data[defaultExchange]);
        setSymbol(data[defaultExchange][0]);
      } catch (err) {
        console.error("Error fetching exchanges:", err);
      }
    };
    fetchExchanges();
  }, []);

  // --- Update symbols when exchange changes ---
  useEffect(() => {
    if (!exchange) return;
    setSymbols(exchanges[exchange] || []);
    setSymbol(exchanges[exchange]?.[0] || "");
  }, [exchange, exchanges]);

  // --- Fetch line chart data ---
  useEffect(() => {
    if (!exchange || !symbol) return;

    const fetchData = async () => {
      try {
        const { data } = await axios.get("http://localhost:5000/api/candles", {
          params: { exchange, symbol, timeframe: "1m" },
        });

        const formatted = data.map((c) => ({
          time: Math.floor(c.time),
          value: c.close,
        }));

        if (lineSeriesRef.current) lineSeriesRef.current.setData(formatted);

        chartRef.current.timeScale().scrollToRealTime();
      } catch (err) {
        console.error("Error fetching data:", err);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [exchange, symbol]);

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4 text-white">Trading Dashboard</h1>

      {/* Dropdowns */}
      <div className="flex gap-4 mb-4">
        <select
          value={exchange}
          onChange={(e) => setExchange(e.target.value)}
          className="p-2 rounded-lg bg-gray-800 text-white"
        >
          {Object.keys(exchanges).map((ex) => (
            <option key={ex} value={ex}>
              {ex.toUpperCase()}
            </option>
          ))}
        </select>

        <select
          value={symbol}
          onChange={(e) => setSymbol(e.target.value)}
          className="p-2 rounded-lg bg-gray-800 text-white"
        >
          {symbols.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {/* Chart */}
      <div
        ref={chartContainerRef}
        className="w-full h-[500px] rounded-xl shadow-lg bg-black"
      />
    </div>
  );
}
