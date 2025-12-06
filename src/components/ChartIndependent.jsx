// File: src/components/ChartIndependent.jsx
// 🚀 UPGRADE: v33.1 - "Bulletproof Rendering" (Auto-Validates Data)

import React, { useEffect, useRef } from "react";
import { createChart, ColorType } from "lightweight-charts";

export function ChartIndependent({ results, symbol = "BTC-USD" }) {
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    // 1. Safety Check: If no container or data, abort
    if (!chartContainerRef.current) return;
    if (!results || !results.candleData || results.candleData.length === 0) {
        // Optional: Render a placeholder or just return
        return; 
    }

    // 2. Destroy old chart to prevent memory leaks/duplicates
    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }

    // 3. Initialize Chart
    const chart = createChart(chartContainerRef.current, {
      layout: { background: { type: ColorType.Solid, color: "#0b0f19" }, textColor: "#94a3b8" },
      grid: { vertLines: { color: "#1e293b" }, horzLines: { color: "#1e293b" } },
      width: chartContainerRef.current.clientWidth,
      height: 500,
      timeScale: { 
          timeVisible: true, 
          secondsVisible: false,
          borderColor: "#334155"
      },
      rightPriceScale: {
          borderColor: "#334155"
      }
    });

    chartRef.current = chart;

    const candleSeries = chart.addCandlestickSeries({
      upColor: "#22c55e", downColor: "#ef4444", borderVisible: false, wickUpColor: "#22c55e", wickDownColor: "#ef4444",
    });

    // 4. 🚀 ROBUST DATA PARSING (The Fix)
    const validData = [];
    const timeSet = new Set();

    results.candleData.forEach((c) => {
        // Try parsing the date
        const d = new Date(c.time || c.date || c.datetime);
        const timeStamp = d.getTime() / 1000; // Unix Seconds

        // Filter out bad dates (NaN) and duplicates
        if (!isNaN(timeStamp) && !timeSet.has(timeStamp)) {
            validData.push({
                time: timeStamp,
                open: Number(c.open),
                high: Number(c.high),
                low: Number(c.low),
                close: Number(c.close),
            });
            timeSet.add(timeStamp);
        }
    });

    // Sort Chronologically
    validData.sort((a, b) => a.time - b.time);

    // Apply Data
    if (validData.length > 0) {
        candleSeries.setData(validData);
    }

    // 5. Markers (Trades)
    const markers = [];
    (results.tradeBreakdown || []).forEach((t) => {
        const entryTime = new Date(t.entryTime).getTime() / 1000;
        const exitTime = t.exitTime ? new Date(t.exitTime).getTime() / 1000 : null;

        // Only show markers if they map to a valid candle on screen
        if (timeSet.has(entryTime)) {
            markers.push({
                time: entryTime,
                position: t.position === "long" ? "belowBar" : "aboveBar",
                color: t.position === "long" ? "#22c55e" : "#ef4444",
                shape: t.position === "long" ? "arrowUp" : "arrowDown",
                text: "ENTRY",
                size: 2
            });
        }

        if (exitTime && timeSet.has(exitTime)) {
            markers.push({
                time: exitTime,
                position: t.position === "long" ? "aboveBar" : "belowBar",
                color: t.profit >= 0 ? "#3b82f6" : "#f59e0b",
                shape: "circle",
                text: t.profit >= 0 ? "WIN" : "LOSS",
                size: 2
            });
        }
    });

    candleSeries.setMarkers(markers.sort((a,b) => a.time - b.time));

    // 6. Responsive Resize
    const resizeObserver = new ResizeObserver((entries) => {
      if (entries.length === 0 || !entries[0]) return;
      const { width } = entries[0].contentRect;
      chart.applyOptions({ width });
    });
    resizeObserver.observe(chartContainerRef.current);

    return () => {
      resizeObserver.disconnect();
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, [results]);

  return <div ref={chartContainerRef} style={{ width: "100%", height: "100%" }} />;
}
