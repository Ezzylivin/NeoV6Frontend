import React, { useEffect, useRef, useState, useMemo } from "react";
import { createChart, CrosshairMode, ColorType, LineStyle } from "lightweight-charts";

export function ChartIndependent({ results, symbol = "SOL-USD" }) {
    const chartContainerRef = useRef(null);
    const chartRef = useRef(null);
    const tradeLineSeriesRef = useRef(null);
    
    // 🟢 State for the Floating Legend
    const [legend, setLegend] = useState({ 
        open: "--", high: "--", low: "--", close: "--", 
        timeStr: "--" 
    });

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
        const sorted = Array.from(uniqueCandles.values()).sort((a, b) => a.time - b.time);
        return sorted;
    }, [results]);

    // 2. Process Trades & Markers
    const { markers, tradeLookup } = useMemo(() => {
        const trades = results?.trades || [];
        if (trades.length === 0) return { markers: [], tradeLookup: {} };

        // Ensure trades are sorted and mapped
        const formattedTrades = trades.map(t => ({
            ...t,
            time: formatTime(t.entry_time || t.time),
            price: parseFloat(t.price)
        })).sort((a,b) => a.time - b.time);

        const lookup = {}; 
        let lastEntry = null;

        formattedTrades.forEach(t => {
            // Map the trade to its timestamp for O(1) lookup on hover
            lookup[t.time] = t;

            // Link Entries and Exits
            if (['buy', 'sell', 'long', 'short'].includes(t.type)) {
                lastEntry = t;
            } else if ((t.type.includes('close') || t.type.includes('flip')) && lastEntry) {
                lastEntry.exitMatch = t;
                t.entryMatch = lastEntry;
                // Update lookup to ensure both "ends" of the trade know about each other
                lookup[lastEntry.time] = lastEntry;
                lookup[t.time] = t;
                lastEntry = null;
            }
        });

        // Create Visual Markers
        const markersList = formattedTrades.map(t => {
            if (t.type === "buy" || t.type === "long") return { time: t.time, position: "belowBar", color: "#10b981", shape: "arrowUp", text: "L" };
            if (t.type === "sell" || t.type === "short") return { time: t.time, position: "aboveBar", color: "#ef4444", shape: "arrowDown", text: "S" };
            if (t.type.includes("close")) return { time: t.time, position: "aboveBar", color: "#fbbf24", shape: "circle", text: "X" };
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
            timeScale: { 
                timeVisible: true, 
                borderColor: "#374151",
                rightOffset: 5, // Small offset to ensure the last candle is visible
                barSpacing: 6   // Start with a reasonable zoom level
            },
            crosshair: { mode: CrosshairMode.Normal },
        });

        const candleSeries = chart.addCandlestickSeries({ upColor: "#10b981", downColor: "#ef4444", borderVisible: false, wickVisible: true });
        candleSeries.setData(candles);
        candleSeries.setMarkers(markers);

        // Connector Line Series (Dashed White Line)
        const tradeLineSeries = chart.addLineSeries({
            color: 'rgba(255, 255, 255, 0.6)',
            lineWidth: 1,
            lineStyle: LineStyle.Dashed,
            crosshairMarkerVisible: false,
            priceLineVisible: false,
            lastValueVisible: false,
        });
        tradeLineSeriesRef.current = tradeLineSeries;

        // Legend Updater
        const updateLegend = (data) => {
            if (!data || !data.time) return;
            const dateStr = new Date(data.time * 1000).toLocaleDateString();
            setLegend({
                open: data.open, high: data.high, low: data.low, close: data.close,
                timeStr: dateStr
            });
        };

        // Initialize Legend with Last Candle
        const lastCandle = candles[candles.length - 1];
        if (lastCandle) updateLegend(lastCandle);

        // 🟢 HOVER LOGIC
        chart.subscribeCrosshairMove((param) => {
            if (param.time) {
                // 1. Update Legend Data
                const data = param.seriesData.get(candleSeries);
                if (data) updateLegend(data);

                // 2. Draw Connector Line
                const trade = tradeLookup[param.time];
                if (trade) {
                    let points = [];
                    // Logic: Always sort points by time (Ascending) for the chart engine
                    if (trade.exitMatch) {
                        points = [
                            { time: trade.time, value: trade.price },
                            { time: trade.exitMatch.time, value: trade.exitMatch.price }
                        ];
                    } else if (trade.entryMatch) {
                        points = [
                            { time: trade.entryMatch.time, value: trade.entryMatch.price },
                            { time: trade.time, value: trade.price }
                        ];
                    }
                    
                    // Sort is CRITICAL for Lightweight Charts
                    points.sort((a,b) => a.time - b.time);
                    
                    if (points.length > 0) tradeLineSeries.setData(points);
                    else tradeLineSeries.setData([]);
                } else {
                    tradeLineSeries.setData([]);
                }
            } else {
                // Mouse Leave
                if (lastCandle) updateLegend(lastCandle);
                tradeLineSeries.setData([]);
            }
        });

        // 🟢 FORCE VISIBLE RANGE (Fix for "Starting in Middle")
        if (candles.length > 0) {
            const startTime = candles[0].time;
            const endTime = candles[candles.length - 1].time;
            
            // Apply immediate fit
            chart.timeScale().fitContent();

            // Apply forced range after a render cycle to override default "right-align"
            setTimeout(() => {
                chart.timeScale().setVisibleRange({
                    from: startTime,
                    to: endTime
                });
            }, 50);
        }
        
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
            {/* 🟢 LEGEND OVERLAY */}
            <div className="absolute top-4 left-4 z-50 pointer-events-none select-none">
                {/* OHLC Data Box */}
                <div className="bg-zinc-950/90 backdrop-blur-md p-3 rounded-xl border border-zinc-800 shadow-2xl mb-2">
                    <div className="flex gap-4 items-center mb-1">
                        <span className="font-black text-amber-500 text-xs tracking-wider">{symbol}</span>
                        <span className="text-[10px] text-zinc-500 font-mono">{legend.timeStr}</span>
                    </div>
                    <div className="flex gap-4 text-[10px] font-mono text-zinc-300">
                        <div>O: <span className={legend.open > legend.close ? 'text-rose-400' : 'text-emerald-400'}>{Number(legend.open).toFixed(2)}</span></div>
                        <div>H: <span className="text-zinc-400">{Number(legend.high).toFixed(2)}</span></div>
                        <div>L: <span className="text-zinc-400">{Number(legend.low).toFixed(2)}</span></div>
                        <div>C: <span className={legend.open > legend.close ? 'text-rose-400' : 'text-emerald-400'}>{Number(legend.close).toFixed(2)}</span></div>
                    </div>
                </div>

                {/* Marker Key */}
                <div className="flex gap-3 bg-zinc-950/80 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-zinc-800/50 w-fit">
                    <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-emerald-500"></div><span className="text-[9px] text-zinc-400 font-bold">L = LONG</span></div>
                    <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-rose-500"></div><span className="text-[9px] text-zinc-400 font-bold">S = SHORT</span></div>
                    <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-amber-400"></div><span className="text-[9px] text-zinc-400 font-bold">X = EXIT</span></div>
                </div>
            </div>

            <div ref={chartContainerRef} className="w-full h-full" />
        </div>
    );
}
