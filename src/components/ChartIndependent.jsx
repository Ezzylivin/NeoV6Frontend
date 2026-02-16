import React, { useEffect, useRef, useState, useMemo } from "react";
import { createChart, CrosshairMode, ColorType, LineStyle } from "lightweight-charts";

export function ChartIndependent({ results, symbol = "SOL-USD" }) {
    const chartContainerRef = useRef(null);
    const chartRef = useRef(null);
    const tradeLineSeriesRef = useRef(null); // 🟢 Ref for the connector line
    
    const [legend, setLegend] = useState({ open: "--", high: "--", low: "--", close: "--" });

    const formatTime = (t) => {
        const date = new Date(t);
        return Math.floor(date.getTime() / 1000);
    };

    // 1. Prepare Candle Data
    const candles = useMemo(() => {
        const raw = results?.candleData || [];
        if (raw.length === 0) return [];
        
        const uniqueCandles = new Map();
        raw.forEach(c => {
            const time = formatTime(c.time || c.timestamp);
            if (!isNaN(time)) {
                uniqueCandles.set(time, {
                    time: time,
                    open: parseFloat(c.open),
                    high: parseFloat(c.high),
                    low: parseFloat(c.low),
                    close: parseFloat(c.close),
                });
            }
        });
        return Array.from(uniqueCandles.values()).sort((a, b) => a.time - b.time);
    }, [results]);

    // 2. Process Trades & Markers
    const { markers, tradeLookup } = useMemo(() => {
        const trades = results?.trades || [];
        if (trades.length === 0) return { markers: [], tradeLookup: {} };

        const formattedTrades = trades.map(t => ({
            ...t,
            time: formatTime(t.entry_time || t.time),
            price: parseFloat(t.price) // Ensure price is a number
        })).sort((a,b) => a.time - b.time);

        // Map timestamps to trades for fast lookup during hover
        const lookup = {}; 
        
        // Simple logic: Pair every Entry with the next Exit
        // This creates a "Chain" of trades we can look up by time
        let lastEntry = null;

        formattedTrades.forEach(t => {
            lookup[t.time] = t; // Store trade by time

            if (t.type === 'buy' || t.type === 'sell' || t.type === 'long' || t.type === 'short') {
                lastEntry = t;
            } else if ((t.type.includes('close') || t.type.includes('flip')) && lastEntry) {
                // Link them together
                lastEntry.exitMatch = t;
                t.entryMatch = lastEntry;
                // Update the lookup with the linked version
                lookup[lastEntry.time] = lastEntry;
                lookup[t.time] = t;
                lastEntry = null; // Reset
            }
        });

        const markersList = formattedTrades.map(t => {
            if (t.type === "buy" || t.type === "long") return { time: t.time, position: "belowBar", color: "#10b981", shape: "arrowUp", text: "L" };
            if (t.type === "sell" || t.type === "short") return { time: t.time, position: "aboveBar", color: "#ef4444", shape: "arrowDown", text: "S" };
            if (t.type === "close_long") return { time: t.time, position: "aboveBar", color: "#fbbf24", shape: "circle", text: "X" };
            if (t.type === "close_short") return { time: t.time, position: "belowBar", color: "#fbbf24", shape: "circle", text: "X" };
            return null;
        }).filter(Boolean);

        return { markers: markersList, tradeLookup: lookup };
    }, [results]);

    useEffect(() => {
        if (!chartContainerRef.current || candles.length === 0) return;
        if (chartRef.current) chartRef.current.remove();

        const chart = createChart(chartContainerRef.current, {
            width: chartContainerRef.current.clientWidth,
            height: 500,
            layout: { background: { type: ColorType.Solid, color: "transparent" }, textColor: "#94a3b8" },
            grid: { vertLines: { color: "rgba(255, 255, 255, 0.05)" }, horzLines: { color: "rgba(255, 255, 255, 0.05)" } },
            timeScale: { timeVisible: true, borderColor: "#374151" },
            crosshair: { mode: CrosshairMode.Normal },
        });

        const candleSeries = chart.addCandlestickSeries({ upColor: "#10b981", downColor: "#ef4444", borderVisible: false, wickVisible: true });
        candleSeries.setData(candles);
        candleSeries.setMarkers(markers);

        // 🟢 Create a Hidden Line Series for the Connector
        const tradeLineSeries = chart.addLineSeries({
            color: 'rgba(255, 255, 255, 0.5)',
            lineWidth: 1,
            lineStyle: LineStyle.Dashed,
            crosshairMarkerVisible: false,
            priceLineVisible: false,
            lastValueVisible: false,
        });
        tradeLineSeriesRef.current = tradeLineSeries;

        const lastCandle = candles[candles.length - 1];
        if (lastCandle) setLegend(lastCandle);

        // 🟢 HOVER LISTENER (The Magic Part)
        chart.subscribeCrosshairMove((param) => {
            // 1. Update Legend
            if (param.time) {
                const data = param.seriesData.get(candleSeries);
                if (data) setLegend(data);
            } else {
                setLegend(lastCandle);
            }

            // 2. Draw Connector Line
            if (param.time && tradeLookup[param.time]) {
                const trade = tradeLookup[param.time];
                let points = [];

                // If hovering Entry -> Draw to Exit
                if (trade.exitMatch) {
                    points = [
                        { time: trade.time, value: trade.price },
                        { time: trade.exitMatch.time, value: trade.exitMatch.price }
                    ];
                } 
                // If hovering Exit -> Draw back to Entry
                else if (trade.entryMatch) {
                    points = [
                        { time: trade.entryMatch.time, value: trade.entryMatch.price },
                        { time: trade.time, value: trade.price }
                    ];
                }

                // Update the line series
                if (points.length > 0) {
                    tradeLineSeries.setData(points);
                } else {
                    tradeLineSeries.setData([]); // Clear if no pair found
                }
            } else {
                // Clear line when hovering over empty space or non-trade candles
                tradeLineSeries.setData([]);
            }
        });

        chart.timeScale().fitContent();
        
        const handleResize = () => {
            if (chartContainerRef.current) {
                chart.applyOptions({ width: chartContainerRef.current.clientWidth });
            }
        };
        window.addEventListener('resize', handleResize);

        chartRef.current = chart;
        return () => {
            window.removeEventListener('resize', handleResize);
            chart.remove();
        };
    }, [candles, markers, tradeLookup]);

    return (
        <div className="w-full h-full relative group">
            {/* Legend Overlay */}
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
