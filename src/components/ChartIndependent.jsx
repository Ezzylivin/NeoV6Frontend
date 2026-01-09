import React, { useEffect, useRef, useState, useMemo } from "react";
import { createChart, ColorType, CrosshairMode } from "lightweight-charts";
import { Calendar, Maximize } from "lucide-react"; 
import "./ChartIndependent.css"; 

export function ChartIndependent({ results, symbol = "BTC-USD" }) {
    const chartContainerRef = useRef(null);
    const chartRef = useRef(null);
    const seriesRef = useRef(null);
    
    const [legend, setLegend] = useState({ open: "--", high: "--", low: "--", close: "--", color: "#e2e8f0" });

    // 1. Process Data into valid Unix seconds
    const candles = useMemo(() => {
        const rawData = results?.candleData || [];
        if (rawData.length === 0) return [];

        return rawData.map(c => {
            // Handle multiple timestamp formats (number, string, or mongo $date)
            let t = c.timestamp || c.time || c.datetime || c.date;
            if (typeof t === 'object' && t.$date) t = t.$date;
            
            const timeInSeconds = Math.floor(new Date(t).getTime() / 1000);

            return { 
                time: timeInSeconds, 
                open: parseFloat(c.open || 0), 
                high: parseFloat(c.high || 0), 
                low: parseFloat(c.low || 0), 
                close: parseFloat(c.close || 0) 
            };
        }).sort((a, b) => a.time - b.time);
    }, [results]);

    useEffect(() => {
        if (!chartContainerRef.current || candles.length === 0) return;
        if (chartRef.current) chartRef.current.remove();

        const chart = createChart(chartContainerRef.current, {
            width: chartContainerRef.current.clientWidth,
            height: 450,
            layout: { 
                background: { type: ColorType.Solid, color: "#000000" }, 
                textColor: "#94a3b8",
                fontFamily: "'Inter', sans-serif"
            },
            grid: { 
                vertLines: { color: "rgba(6, 78, 59, 0.1)" }, 
                horzLines: { color: "rgba(6, 78, 59, 0.1)" } 
            },
            timeScale: { 
                timeVisible: true, 
                borderColor: "rgba(52, 211, 153, 0.2)",
                secondsVisible: false 
            },
            crosshair: { mode: CrosshairMode.Normal }
        });

        const candleSeries = chart.addCandlestickSeries({ 
            upColor: "#10b981", downColor: "#ef4444",
            borderUpColor: "#10b981", borderDownColor: "#ef4444",
            wickUpColor: "#10b981", wickDownColor: "#ef4444",
        });

        candleSeries.setData(candles);

        // 2. Add Trade Markers if they exist in results
        if (results?.trades || results?.tradeBreakdown) {
            const rawTrades = results.trades || results.tradeBreakdown;
            const markers = rawTrades.map(t => {
                const entryTime = Math.floor(new Date(t.entryTime || t.entry_time).getTime() / 1000);
                return {
                    time: entryTime,
                    position: t.position === "long" ? "belowBar" : "aboveBar",
                    color: t.position === "long" ? "#34d399" : "#f59e0b",
                    shape: t.position === "long" ? "arrowUp" : "arrowDown",
                    text: "E"
                };
            });
            candleSeries.setMarkers(markers);
        }

        // 3. Sync HUD/Legend on Crosshair move
        chart.subscribeCrosshairMove((param) => {
            if (!param.time || !param.seriesData.get(candleSeries)) {
                const lastCandle = candles[candles.length - 1];
                if (lastCandle) setLegend({
                    open: lastCandle.open.toFixed(2),
                    high: lastCandle.high.toFixed(2),
                    low: lastCandle.low.toFixed(2),
                    close: lastCandle.close.toFixed(2),
                    color: lastCandle.close >= lastCandle.open ? "#10b981" : "#ef4444"
                });
                return;
            }
            const data = param.seriesData.get(candleSeries);
            setLegend({
                open: data.open.toFixed(2),
                high: data.high.toFixed(2),
                low: data.low.toFixed(2),
                close: data.close.toFixed(2),
                color: data.close >= data.open ? "#10b981" : "#ef4444"
            });
        });

        chart.timeScale().fitContent();
        chartRef.current = chart;
        seriesRef.current = candleSeries;

        const handleResize = () => chart.applyOptions({ width: chartContainerRef.current.clientWidth });
        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            chart.remove();
        };
    }, [candles, results]);

    if (candles.length === 0) return <div className="chart-loading">⚠️ No Price Data Found in Results</div>;

    return (
        <div className="independent-container">
            <div className="independent-header flex justify-between items-center mb-2">
                <div className="flex items-center gap-4">
                    <h2 className="text-white font-bold">{symbol} <span style={{ color: legend.color }}>${legend.close}</span></h2>
                    <div className="data-range-badge bg-white/5 px-3 py-1 rounded text-xs text-neutral-400">
                        <Calendar size={12} className="inline mr-1"/> {candles.length} bars loaded
                    </div>
                </div>
                <button onClick={() => chartRef.current?.timeScale().fitContent()} className="text-emerald-400 hover:text-white">
                    <Maximize size={16} />
                </button>
            </div>

            <div className="chart-wrapper relative">
                {/* Dynamic Price HUD */}
                <div className="chart-hud absolute top-4 left-4 z-10 bg-black/60 p-2 rounded border border-white/10 text-[10px] space-y-1">
                    <div className="flex gap-2"><span>O</span><span className="text-white">{legend.open}</span></div>
                    <div className="flex gap-2"><span>H</span><span className="text-white">{legend.high}</span></div>
                    <div className="flex gap-2"><span>L</span><span className="text-white">{legend.low}</span></div>
                    <div className="flex gap-2"><span>C</span><span className="text-white font-bold">{legend.close}</span></div>
                </div>
                <div ref={chartContainerRef} className="chart-canvas" style={{ minHeight: '450px' }} />
            </div>
        </div>
    );
}
