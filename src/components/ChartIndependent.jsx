// File: src/components/ChartIndependent.jsx
import React, { useEffect, useRef } from "react";
import { createChart, ColorType } from "lightweight-charts";

export function ChartIndependent({ results, symbol = "BTC-USD" }) {
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    if (!results || !results.candleData || results.candleData.length === 0) return;
    if (!chartContainerRef.current) return;

    // Destroy old chart
    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }

    // Create New Chart
    const chart = createChart(chartContainerRef.current, {
      layout: { background: { type: ColorType.Solid, color: "#0b0f19" }, textColor: "#DDD" },
      grid: { vertLines: { color: "#1e293b" }, horzLines: { color: "#1e293b" } },
      width: chartContainerRef.current.clientWidth,
      height: 500, // Fixed height to match container
      timeScale: { timeVisible: true, secondsVisible: false },
    });

    chartRef.current = chart;

    const candleSeries = chart.addCandlestickSeries({
      upColor: "#22c55e", downColor: "#ef4444", borderVisible: false, wickUpColor: "#22c55e", wickDownColor: "#ef4444",
    });

    // 🚀 SAFE SORT: Ensure chronological order
    const sortedData = [...results.candleData]
      .sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime())
      .map((c) => ({
        time: new Date(c.time).getTime() / 1000, // Convert to Unix Timestamp (Seconds)
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
      }));

    // Deduping by time to prevent Lightweight Charts error
    const uniqueData = [];
    const timeSet = new Set();
    for (const item of sortedData) {
        if (!timeSet.has(item.time)) {
            uniqueData.push(item);
            timeSet.add(item.time);
        }
    }

    candleSeries.setData(uniqueData);

    // Markers
    const markers = [];
    (results.tradeBreakdown || []).forEach((t) => {
        const entryTime = new Date(t.entryTime).getTime() / 1000;
        const exitTime = t.exitTime ? new Date(t.exitTime).getTime() / 1000 : null;

        markers.push({
            time: entryTime,
            position: t.position === "long" ? "belowBar" : "aboveBar",
            color: t.position === "long" ? "#22c55e" : "#ef4444",
            shape: t.position === "long" ? "arrowUp" : "arrowDown",
            text: t.position === "long" ? "L" : "S",
        });

        if (exitTime) {
            markers.push({
                time: exitTime,
                position: t.position === "long" ? "aboveBar" : "belowBar",
                color: t.profit >= 0 ? "#3b82f6" : "#f59e0b",
                shape: "circle",
                text: t.profit >= 0 ? "Win" : "Loss",
            });
        }
    });

    // Filter markers to only those within candle time range
    const validMarkers = markers.filter(m => timeSet.has(m.time)).sort((a,b) => a.time - b.time);
    candleSeries.setMarkers(validMarkers);

    chart.timeScale().fitContent();

    // Resize Observer
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
