import React, { useEffect, useRef, useState, useMemo } from "react";
import { createChart, ColorType, CrosshairMode } from "lightweight-charts";
import { Calendar, Maximize } from "lucide-react"; 
import "./ChartIndependent.css"; 

export function ChartIndependent({ results, symbol = "BTC-USD" }) {
    const chartContainerRef = useRef(null);
    const chartRef = useRef(null);
    const seriesRef = useRef(null);
    
    const [legend, setLegend] = useState({ open: "--", high: "--", low: "--", close: "--", color: "#e2e8f0" });

    const candles = useMemo(() => {
        const rawData = results?.candleData || [];
        if (rawData.length === 0) return [];
        return rawData.map(c => {
            let t = c.timestamp || c.time || c.datetime || c.date;
            if (typeof t === 'object' && t.$date) t = t.$date;
            return { 
                time: Math.floor(new Date(t).getTime() / 1000), 
                open: parseFloat(c.open || 0), high: parseFloat(c.high || 0), low: parseFloat(c.low || 0), close: parseFloat(c.close || 0) 
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
            grid: { vertLines: { color: "rgba(6, 78, 59, 0.1)" }, horzLines: { color: "rgba(6, 78, 59, 0.1)" } },
            timeScale: { timeVisible: true, borderColor: "rgba(52, 211, 153, 0.2)" },
            crosshair: { mode: CrosshairMode.Normal }
        });

        const candleSeries = chart.addCandlestickSeries({ upColor: "#10b981", downColor: "#ef4444" });
        candleSeries.setData(candles);

        if (results?.trades || results?.tradeBreakdown) {
            const rawTrades = results.trades || results.tradeBreakdown;
            const markers = [];
            rawTrades.forEach(t => {
                const entryTs = Math.floor(new Date(t.entryTime || t.entry_time).getTime() / 1000);
                markers.push({ time: entryTs, position: t.position === "long" ? "belowBar" : "aboveBar", color: t.position === "long" ? "#34d399" : "#f59e0b", shape: t.position === "long" ? "arrowUp" : "arrowDown", text: "E" });
                
                if (t.exitTime || t.exit_time) {
                    const exitTs = Math.floor(new Date(t.exitTime || t.exit_time).getTime() / 1000);
                    markers.push({ time: exitTs, position: t.position === "long" ? "aboveBar" : "belowBar", color: t.profit >= 0 ? "#10b981" : "#ef4444", shape: "circle", text: t.profit >= 0 ? "W" : "L" });
                }
            });
            candleSeries.setMarkers(markers.sort((a,b) => a.time - b.time));
        }

        chart.subscribeCrosshairMove((param) => {
            const data = param.seriesData.get(candleSeries) || candles[candles.length - 1];
            if (data) setLegend({ open: data.open.toFixed(2), high: data.high.toFixed(2), low: data.low.toFixed(2), close: data.close.toFixed(2), color: data.close >= data.open ? "#10b981" : "#ef4444" });
        });

        chart.timeScale().fitContent();
        chartRef.current = chart;
        return () => chart.remove();
    }, [candles, results]);

    if (candles.length === 0) return <div className="bot-card p-10 text-amber-500">⚠️ No Price Data Found</div>;

    return (
        <div className="independent-container relative">
            <div className="absolute top-4 left-4 z-10 bg-black/60 p-2 rounded border border-white/10 text-[10px] space-y-1">
                <div className="flex gap-2"><span>O</span><span className="text-white">{legend.open}</span></div>
                <div className="flex gap-2"><span>H</span><span className="text-white">{legend.high}</span></div>
                <div className="flex gap-2"><span>L</span><span className="text-white">{legend.low}</span></div>
                <div className="flex gap-2"><span>C</span><span className="text-white font-bold">{legend.close}</span></div>
            </div>
            <div ref={chartContainerRef} className="chart-canvas" style={{ minHeight: '450px' }} />
        </div>
    );
}
