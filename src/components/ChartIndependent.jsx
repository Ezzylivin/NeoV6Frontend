import React, { useEffect, useRef, useState, useMemo } from "react";
import { createChart, CrosshairMode, ColorType } from "lightweight-charts";

export function ChartIndependent({ results, symbol = "SOL-USD" }) {
    const chartContainerRef = useRef(null);
    const chartRef = useRef(null);
    const [legend, setLegend] = useState({ open: "--", high: "--", low: "--", close: "--" });

    const formatTime = (t) => Math.floor(new Date(t).getTime() / 1000);

    const candles = useMemo(() => {
        const raw = results?.candleData || [];
        console.group("📊 CHART: DATA FORMATTING");
        console.log("Raw count:", raw.length);
        
        const formatted = raw.map(c => ({
            time: formatTime(c.time || c.timestamp),
            open: parseFloat(c.open || 0),
            high: parseFloat(c.high || 0),
            low: parseFloat(c.low || 0),
            close: parseFloat(c.close || 0),
        })).sort((a, b) => a.time - b.time);

        console.log("✅ Chronological sort applied");
        console.groupEnd();
        return formatted;
    }, [results]);

    useEffect(() => {
        if (!chartContainerRef.current || candles.length === 0) return;
        if (chartRef.current) chartRef.current.remove();

        console.log("🛠️ Initializing Chart Engine...");
        const chart = createChart(chartContainerRef.current, {
            width: chartContainerRef.current.clientWidth,
            height: 500,
            layout: { background: { type: ColorType.Solid, color: "transparent" }, textColor: "#94a3b8" },
            grid: { vertLines: { color: "#1f2937" }, horzLines: { color: "#1f2937" } },
            timeScale: { timeVisible: true, borderColor: "#374151" },
        });

        const candleSeries = chart.addCandlestickSeries({ upColor: "#10b981", downColor: "#ef4444" });
        candleSeries.setData(candles);

        // 🏹 Logs for Trades
        const trades = results?.trades || [];
        if (trades.length > 0) {
            console.log("🏹 Mapping Markers for", trades.length, "trades");
            const markers = trades.map(t => ({
                time: formatTime(t.entry_time || t.time),
                position: t.side === "long" ? "belowBar" : "aboveBar",
                color: t.side === "long" ? "#10b981" : "#f59e0b",
                shape: t.side === "long" ? "arrowUp" : "arrowDown",
                text: t.side === "long" ? "L" : "S"
            })).sort((a, b) => a.time - b.time);
            candleSeries.setMarkers(markers);
        }

        chart.timeScale().fitContent();
        chartRef.current = chart;
        return () => chart.remove();
    }, [candles, results]);

    return <div ref={chartContainerRef} className="w-full h-full" />;
}
