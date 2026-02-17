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
        
        if (sorted.length > 0) {
            console.log("📊 Chart Range:", 
                new Date(sorted[0].time * 1000).toLocaleDateString(), 
                "->", 
                new Date(sorted[sorted.length-1].time * 1000).toLocaleDateString()
            );
        }
        
        return sorted;
    }, [results]);

    // 2. Process Trades & Markers (Fixed Logic)
    const { markers, tradeLookup } = useMemo(() => {
        const trades = results?.trades || [];
        if (trades.length === 0) return { markers: [], tradeLookup: {} };

        // Helper to standardize trade type labels
        const getLabel = (type) => {
            const t = type.toLowerCase();
            if (t === 'buy' || t === 'long') return 'LONG';
            if (t === 'sell' || t === 'short') return 'SHORT';
            return 'EXIT';
        };

        const formattedTrades = trades.map(t => ({
            ...t,
            time: formatTime(t.entry_time || t.time),
            price: parseFloat(t.price),
            // 🟢 Robust Size Check: Check multiple common field names
            size: parseFloat(t.size || t.amount || t.quantity || t.position_size || 0),
            pnl: parseFloat(t.pnl || t.profit || t.realized_pnl || t.net_profit || 0),
            rawType: t.type
        })).sort((a,b) => a.time - b.time);

        const lookup = {}; 
        let lastEntry = null;

        formattedTrades.forEach(t => {
            // Initial map
            lookup[t.time] = t;

            if (['buy', 'sell', 'long', 'short'].includes(t.rawType.toLowerCase())) {
                lastEntry = t;
            } 
            else if ((t.rawType.toLowerCase().includes('close') || t.rawType === 'exit') && lastEntry) {
                // Link Entry and Exit
                lastEntry.exitMatch = t;
                t.entryMatch = lastEntry;

                // 🟢 CRITICAL FIX: Pass PnL from Exit back to Entry so tooltip shows it
                lastEntry.pnl = t.pnl;
                
                // Pass Size from Entry to Exit if missing
                if (!t.size) t.size = lastEntry.size;

                // Update lookup with linked data
                lookup[lastEntry.time] = lastEntry;
                lookup[t.time] = t;
                
                lastEntry = null;
            }
        });

        const markersList = formattedTrades.map(t => {
            const label = getLabel(t.rawType);
            if (label === "LONG") return { time: t.time, position: "belowBar", color: "#10b981", shape: "arrowUp", text: "L" };
            if (label === "SHORT") return { time: t.time, position: "aboveBar", color: "#ef4444", shape: "arrowDown", text: "S" };
            if (label === "EXIT") return { time: t.time, position: "aboveBar", color: "#fbbf24", shape: "circle", text: "X" };
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
            timeScale: { timeVisible: true, borderColor: "#374151", barSpacing: 10, rightOffset: 5 },
            crosshair: { mode: CrosshairMode.Normal },
        });

        const candleSeries = chart.addCandlestickSeries({ upColor: "#10b981", downColor: "#ef4444", borderVisible: false, wickVisible: true });
        candleSeries.setData(candles);
        candleSeries.setMarkers(markers);

        const tradeLineSeries = chart.addLineSeries({
            color: 'rgba(255, 255, 255, 0.6)',
            lineWidth: 1,
            lineStyle: LineStyle.Dashed,
            crosshairMarkerVisible: false,
            priceLineVisible: false,
            lastValueVisible: false,
        });
        tradeLineSeriesRef.current = tradeLineSeries;

        const updateLegend = (data, trade) => {
            if (!data) return;
            const dateStr = new Date(data.time * 1000).toLocaleDateString();
            setLegend({
                open: data.open, high: data.high, low: data.low, close: data.close,
                timeStr: dateStr,
                tradeInfo: trade || null
            });
        };

        const lastCandle = candles[candles.length - 1];
        if (lastCandle) updateLegend(lastCandle, null);

        // Hover Listener
        chart.subscribeCrosshairMove((param) => {
            if (param.time) {
                const data = param.seriesData.get(candleSeries);
                const trade = tradeLookup[param.time];
                
                if (data) updateLegend(data, trade);

                if (trade) {
                    let points = [];
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
                    
                    if (points.length === 2) {
                        points.sort((a,b) => a.time - b.time);
                        tradeLineSeries.setData(points);
                    } else {
                        tradeLineSeries.setData([]);
                    }
                } else {
                    tradeLineSeries.setData([]);
                }
            } else {
                if (lastCandle) updateLegend(lastCandle, null);
                tradeLineSeries.setData([]);
            }
        });

        // Force Start from Beginning
        if (candles.length > 0) {
            chart.timeScale().fitContent();
            setTimeout(() => {
                const logicalRange = { from: 0, to: 150 }; 
                chart.timeScale().setVisibleLogicalRange(logicalRange);
            }, 100);
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

    // Helper to format trade label for UI
    const getDisplayType = (rawType) => {
        const t = rawType.toLowerCase();
        if (t === 'buy' || t === 'long') return 'LONG';
        if (t === 'sell' || t === 'short') return 'SHORT';
        return 'EXIT';
    };

    return (
        <div className="w-full h-full relative group">
            {/* 🟢 LEGEND OVERLAY */}
            <div className="absolute top-4 left-4 z-50 pointer-events-none select-none">
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
                    
                    {/* 🟢 DYNAMIC TRADE INFO */}
                    {legend.tradeInfo && (
                        <div className="mt-2 pt-2 border-t border-zinc-800 flex gap-4 text-[10px] font-mono animate-in fade-in">
                            <div className="text-zinc-400">
                                TYPE: <span className={getDisplayType(legend.tradeInfo.rawType) === "LONG" ? "text-emerald-400" : getDisplayType(legend.tradeInfo.rawType) === "SHORT" ? "text-rose-400" : "text-amber-400"}>
                                    {getDisplayType(legend.tradeInfo.rawType)}
                                </span>
                            </div>
                            <div className="text-zinc-400">
                                SIZE: <span className="text-white">{legend.tradeInfo.size > 0 ? legend.tradeInfo.size : "N/A"}</span>
                            </div>
                            <div className="text-zinc-400">
                                PNL: <span className={legend.tradeInfo.pnl >= 0 ? "text-emerald-400" : "text-rose-400"}>
                                    {legend.tradeInfo.pnl >= 0 ? "+" : ""}${legend.tradeInfo.pnl.toFixed(2)}
                                </span>
                            </div>
                        </div>
                    )}
                </div>

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
