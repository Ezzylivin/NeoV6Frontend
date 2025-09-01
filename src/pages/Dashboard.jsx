import React, { useEffect, useRef, useState } from "react";
import { createChart, CrosshairMode } from "lightweight-charts";
import axios from "axios";

const EXCHANGES = ["coinbase", "kraken", "gemini"];
const SYMBOLS = ["BTC/USD", "ETH/USD", "LTC/USD"];

export default function Dashboard() {
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);
  const candleSeriesRef = useRef(null);
  const lineSeriesRef = useRef(null);

  const [exchange, setExchange] = useState("coinbase");
  const [symbol, setSymbol] = useState("BTC/USD");

  // --- Chart Initialization ---
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 500,
      layout: { background: { color: "#111" }, textColor: "#DDD" },
      grid: { vertLines: { color: "#222" }, horzLines: { color: "#222" } },
      crosshair: { mode: CrosshairMode.Normal },
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

  // --- Data Fetch ---
  useEffect(() => {
    if (!exchange || !symbol) return;

    const fetchCandles = async () => {
      try {
        const { data } = await axios.get("http://localhost:5000/api/candles", {
          params: { symbol, exchange, timeframe: "1m" },
        });

        if (candleSeriesRef.current) {
          candleSeriesRef.current.setData(data);
        }
        if (lineSeriesRef.current) {
          lineSeriesRef.current.setData(
            data.map((c) => ({ time: c.time, value: c.close }))
          );
        }
      } catch (err) {
        console.error("Error fetching candles:", err);
      }
    };

    fetchCandles();
    const interval = setInterval(fetchCandles, 5000);
    return () => clearInterval(interval);
  }, [exchange, symbol]);

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4 text-white">Trading Dashboard</h1>

      {/* Dropdown Controls */}
      <div className="flex gap-4 mb-4">
        <select
          value={exchange}
          onChange={(e) => setExchange(e.target.value)}
          className="p-2 rounded-lg bg-gray-800 text-white"
        >
          {EXCHANGES.map((ex) => (
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
          {SYMBOLS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {/* Chart Container */}
      <div
        ref={chartContainerRef}
        className="w-full h-[500px] rounded-xl shadow-lg bg-black"
      />
    </div>
  );
}
