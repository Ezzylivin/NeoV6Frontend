// File: src/components/ChartIndependent.jsx
// 🚀 UPGRADE: v33.3 - "Chart Rescue" (Fixed Zero Height & Deduping)

import React, { useEffect, useRef } from "react";
import { createChart, ColorType } from "lightweight-charts";

export function ChartIndependent({ results, symbol = "BTC-USD" }) {
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);
  const seriesRef = useRef(null);

  useEffect(() => {
    // 1. Safety Check
    if (!chartContainerRef.current) return;
    if (!results || !results.candleData || results.candleData.length === 0) return;

    // 2. Initialize Chart (Only once)
    if (!chartRef.current) {
      chartRef.current = createChart(chartContainerRef.current, {
        layout: { background: { type: ColorType.Solid, color: "#0b0f19" }, textColor: "#94a3b8" },
        grid: { vertLines: { color: "#1e293b" }, horzLines: { color: "#1e293b" } },
        width: chartContainerRef.current.clientWidth,
        height: 500, // Explicit Height
        timeScale: { 
            timeVisible: true, 
            secondsVisible: false,
            borderColor: "#334155"
        },
        rightPriceScale: {
            borderColor: "#334155"
        }
      });

      seriesRef.current = chartRef.current.addCandlestickSeries({
        upColor: "#22c55e", downColor: "#ef4444", borderVisible: false, wickUpColor: "#22c55e", wickDownColor: "#ef4444",
      });
    }

    // 3. Robust Data Parsing
    const validData = [];
    const timeSet = new Set();

    results.candleData.forEach((c) => {
        // Handle various backend date formats
        const d = new Date(c.time || c.date || c.datetime);
        const timeStamp = d.getTime() / 1000; // Unix Seconds

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
    if (validData.length > 0 && seriesRef.current) {
        seriesRef.current.setData(validData);
    }

    // 4. Markers
    const markers = [];
    (results.tradeBreakdown || []).forEach((t) => {
        const entryTime = new Date(t.entryTime).getTime() / 1000;
        const exitTime = t.exitTime ? new Date(t.exitTime).getTime() / 1000 : null;

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

    if (seriesRef.current) {
        seriesRef.current.setMarkers(markers.sort((a,b) => a.time - b.time));
    }

    // 5. Fit Content
    if (chartRef.current) {
        chartRef.current.timeScale().fitContent();
    }

    // 6. Resize Observer
    const resizeObserver = new ResizeObserver((entries) => {
      if (entries.length === 0 || !entries[0]) return;
      const { width } = entries[0].contentRect;
      if (chartRef.current) {
          chartRef.current.applyOptions({ width });
      }
    });
    resizeObserver.observe(chartContainerRef.current);

    return () => {
      resizeObserver.disconnect();
      // Only destroy chart on unmount, not every render
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, [results]); // Only re-run when results change

  // 🚀 CRITICAL CSS FIX: Ensure container has size
  return <div ref={chartContainerRef} style={{ width: "100%", height: "500px", minHeight: "500px" }} />;
}
