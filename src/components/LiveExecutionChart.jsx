import React, { useEffect, useRef, useState, useMemo } from "react";
import { createChart, ColorType, CrosshairMode } from "lightweight-charts";

export function LiveExecutionChart({ symbol, timeframe, isRunning, logs = [], activePositions = [] }) {
    const chartContainerRef = useRef(null);
    const chartRef = useRef(null);
    const candleSeriesRef = useRef(null);
    
    // Data State
    const [candleData, setCandleData] = useState([]);
    const [markers, setMarkers] = useState([]);

    // 1. Fetch Initial 24h History
    useEffect(() => {
        const fetchHistory = async () => {
            // 🟢 In a real app, fetch from your backend: /api/price/history
            // Here we generate realistic mock data for the last 24 hours to ensure the chart starts full
            const now = Math.floor(Date.now() / 1000);
            const initialData = [];
            let price = 50000; 
            
            for (let i = 100; i > 0; i--) {
                const time = now - (i * (timeframe === '1m' ? 60 : 3600));
                const change = (Math.random() - 0.5) * 200;
                price += change;
                initialData.push({
                    time: time,
                    open: price - Math.random() * 50,
                    high: price + Math.random() * 100,
                    low: price - Math.random() * 100,
                    close: price + Math.random() * 50
                });
            }
            setCandleData(initialData);
        };
        
        fetchHistory();
    }, [symbol, timeframe]);

    // 2. Initialize Chart
    useEffect(() => {
        if (!chartContainerRef.current) return;

        const chart = createChart(chartContainerRef.current, {
            width: chartContainerRef.current.clientWidth,
            height: 500,
            layout: { background: { type: ColorType.Solid, color: "transparent" }, textColor: "#94a3b8" },
            grid: { vertLines: { color: "rgba(255, 255, 255, 0.05)" }, horzLines: { color: "rgba(255, 255, 255, 0.05)" } },
            timeScale: { timeVisible: true, borderColor: "#374151" },
            crosshair: { mode: CrosshairMode.Normal },
        });

        const series = chart.addCandlestickSeries({ 
            upColor: "#10b981", downColor: "#ef4444", 
            borderVisible: false, wickVisible: true 
        });
        
        candleSeriesRef.current = series;
        chartRef.current = chart;

        // Auto-resize
        const handleResize = () => chart.applyOptions({ width: chartContainerRef.current.clientWidth });
        window.addEventListener("resize", handleResize);

        return () => {
            window.removeEventListener("resize", handleResize);
            chart.remove();
        };
    }, []);

    // 3. Load Initial Data
    useEffect(() => {
        if (candleSeriesRef.current && candleData.length > 0) {
            candleSeriesRef.current.setData(candleData);
            chartRef.current.timeScale().fitContent(); // 🟢 Start nicely zoomed
        }
    }, [candleData]);

    // 4. 🟢 LIVE SIMULATION (Updates the last candle live)
    useEffect(() => {
        if (!isRunning || candleData.length === 0) return;

        const interval = setInterval(() => {
            const lastCandle = candleData[candleData.length - 1];
            const volatility = Math.random() > 0.5 ? 50 : -50;
            const newClose = lastCandle.close + (Math.random() - 0.5) * 20;
            
            const updatedCandle = {
                ...lastCandle,
                high: Math.max(lastCandle.high, newClose),
                low: Math.min(lastCandle.low, newClose),
                close: newClose
            };

            // Update local state and chart
            candleSeriesRef.current.update(updatedCandle);
            
            // Note: In a real connection, you would append new candles from the backend here
        }, 1000);

        return () => clearInterval(interval);
    }, [isRunning, candleData]);

    // 5. 🟢 "THOUGHTS" TO MARKERS
    useEffect(() => {
        if (!candleSeriesRef.current || logs.length === 0) return;

        const latestLog = logs[logs.length - 1];
        const lastCandle = candleData[candleData.length - 1];
        
        if (!lastCandle) return;

        let newMarker = null;

        // Map specific keywords in logs to visual chart markers
        if (latestLog.includes("Signal")) {
            newMarker = { 
                time: lastCandle.time, 
                position: 'aboveBar', 
                color: '#f59e0b', 
                shape: 'arrowDown', 
                text: 'Signal' 
            };
        } else if (latestLog.includes("Buying") || latestLog.includes("Long")) {
            newMarker = { 
                time: lastCandle.time, 
                position: 'belowBar', 
                color: '#10b981', 
                shape: 'arrowUp', 
                text: 'BUY' 
            };
        } else if (latestLog.includes("Selling") || latestLog.includes("Short")) {
            newMarker = { 
                time: lastCandle.time, 
                position: 'aboveBar', 
                color: '#ef4444', 
                shape: 'arrowDown', 
                text: 'SELL' 
            };
        }

        if (newMarker) {
            setMarkers(prev => {
                const updated = [...prev, newMarker];
                candleSeriesRef.current.setMarkers(updated);
                return updated;
            });
        }

    }, [logs, candleData]);

    return <div ref={chartContainerRef} className="w-full h-full" />;
}
