import React, { useEffect, useRef, useState, useMemo } from "react";
import { createChart, CrosshairMode, ColorType } from "lightweight-charts";

export function ChartIndependent({ results, symbol = "SOL-USD" }) {
    const chartContainerRef = useRef(null);
    const chartRef = useRef(null);
    
    // 🟢 State for the Floating Legend
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
            grid: { vertLines: { color: "rgba(255, 255, 255, 0.05)" }, horzLines: { color: "rgba(255, 255, 255, 0.05)" } },
            timeScale: { timeVisible: true, borderColor: "#374151" },
            crosshair: { mode: CrosshairMode.Normal }, // Enable Crosshair
        });

        const candleSeries = chart.addCandlestickSeries({ upColor: "#10b981", downColor: "#ef4444", borderVisible: false, wickVisible: true });
        candleSeries.setData(candles);

        // 🟢 Set Initial Legend to the Latest Candle
        const lastCandle = candles[candles.length - 1];
        if (lastCandle) setLegend(lastCandle);

        // 🟢 Crosshair Listener for Hover Effect
        chart.subscribeCrosshairMove((param) => {
            if (param.time) {
                const data = param.seriesData.get(candleSeries);
                if (data) setLegend(data);
            } else {
                // Optional: Revert to last candle when mouse leaves
                setLegend(lastCandle); 
            }
        });

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

    return (
        <div className="w-full h-full relative group">
            {/* 🟢 FLOATING LEGEND */}
            <div className="absolute top-4 left-4 z-20 font-mono text-[10px] pointer-events-none select-none bg-zinc-950/80 backdrop-blur-sm p-2 rounded border border-zinc-800/50 shadow-xl transition-opacity opacity-0 group-hover:opacity-100">
                <div className="flex gap-4 items-center mb-1">
                    <span className="font-black text-amber-500 text-xs">{symbol}</span>
                    <span className="text-zinc-500">EXECUTION</span>
                </div>
                <div className="flex gap-3 text-zinc-300">
                    <div>O: <span className={legend.open > legend.close ? 'text-rose-400' : 'text-emerald-400'}>{Number(legend.open).toFixed(2)}</span></div>
                    <div>H: <span className="text-zinc-400">{Number(legend.high).toFixed(2)}</span></div>
                    <div>L: <span className="text-zinc-400">{Number(legend.low).toFixed(2)}</span></div>
                    <div>C: <span className={legend.open > legend.close ? 'text-rose-400' : 'text-emerald-400'}>{Number(legend.close).toFixed(2)}</span></div>
                </div>
            </div>

            <div ref={chartContainerRef} className="w-full h-full" />
        </div>
    );
}
