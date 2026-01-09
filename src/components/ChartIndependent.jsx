import React, { useEffect, useRef, useState, useMemo } from "react";
import { createChart, ColorType, CrosshairMode } from "lightweight-charts";
import { Calendar } from "lucide-react"; 
import "./ChartIndependent.css"; 

export function ChartIndependent({ results, symbol = "BTC-USD" }) {
    const chartContainerRef = useRef(null);
    const chartRef = useRef(null);
    const seriesRef = useRef(null);
    
    // Process Data into valid Unix seconds
    const candles = useMemo(() => {
        if (!results?.candleData || results.candleData.length === 0) return [];
        return results.candleData.map(c => {
            let t = c.timestamp || c.time || c.datetime;
            if (typeof t === 'object' && t.$date) t = t.$date;
            return { 
                time: Math.floor(new Date(t).getTime() / 1000), 
                open: parseFloat(c.open), 
                high: parseFloat(c.high), 
                low: parseFloat(c.low), 
                close: parseFloat(c.close) 
            };
        }).sort((a, b) => a.time - b.time);
    }, [results]);

    useEffect(() => {
        if (!chartContainerRef.current || candles.length === 0) return;
        
        if (chartRef.current) chartRef.current.remove();

        const chart = createChart(chartContainerRef.current, {
            width: chartContainerRef.current.clientWidth,
            height: 450,
            layout: { background: { type: ColorType.Solid, color: "#000000" }, textColor: "#94a3b8" },
            grid: { vertLines: { color: "rgba(16, 185, 129, 0.1)" }, horzLines: { color: "rgba(16, 185, 129, 0.1)" } },
            timeScale: { timeVisible: true, borderColor: "rgba(52, 211, 153, 0.2)" }
        });

        const candleSeries = chart.addCandlestickSeries({ upColor: "#10b981", downColor: "#ef4444" });
        candleSeries.setData(candles);
        
        chartRef.current = chart;
        seriesRef.current = candleSeries;

        return () => chart.remove();
    }, [candles]);

    if (candles.length === 0) return <div className="chart-loading">⚠️ No Price Data Found in Results</div>;

    return (
        <div className="independent-container">
            <div className="flex justify-between items-center mb-2">
                <h2 className="text-white font-bold">{symbol}</h2>
                <div className="data-range-badge bg-white/5 px-3 py-1 rounded text-xs text-neutral-400">
                    <Calendar size={12} className="inline mr-1"/> {candles.length} bars loaded
                </div>
            </div>
            <div ref={chartContainerRef} className="chart-canvas" style={{ minHeight: '450px' }} />
        </div>
    );
}
