import React, { useEffect, useRef, useState } from "react";
import { createChart, ColorType, CrosshairMode } from "lightweight-charts";
import axios from "axios";

// 🟢 CONFIG
const VITE_API = import.meta.env.VITE_API_URL || "https://neov6backend.onrender.com";
const API_BASE = VITE_API.endsWith('/api') ? VITE_API : `${VITE_API}/api`;

export function LiveTradingChart({ symbol, timeframe, isRunning, logs = [] }) {
    const chartContainerRef = useRef(null);
    const chartRef = useRef(null);
    const candleSeriesRef = useRef(null);
    
    // Data State
    const [candleData, setCandleData] = useState([]);

    // 1. 🟢 REAL DATA: Fetch Historical History on Mount
    useEffect(() => {
        const fetchHistory = async () => {
            try {
                // Ensure your backend has this endpoint or adjust accordingly
                const res = await axios.get(`${API_BASE}/market/candles`, { 
                    params: { symbol, timeframe, limit: 100 } 
                });
                
                if (res.data && Array.isArray(res.data)) {
                    // Sort by time just in case
                    const sorted = res.data.sort((a, b) => a.time - b.time);
                    setCandleData(sorted);
                }
            } catch (e) { 
                console.error("Failed to load historical market data:", e); 
            }
        };
        
        fetchHistory();
    }, [symbol, timeframe]);

    // 2. Initialize Chart
    useEffect(() => {
        if (!chartContainerRef.current) return;

        // Cleanup previous instance if exists
        if (chartRef.current) {
            chartRef.current.remove();
        }

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

        const handleResize = () => chart.applyOptions({ width: chartContainerRef.current.clientWidth });
        window.addEventListener("resize", handleResize);

        return () => {
            window.removeEventListener("resize", handleResize);
            chart.remove();
        };
    }, []);

    // 3. Load Initial Data to Series
    useEffect(() => {
        if (candleSeriesRef.current && candleData.length > 0) {
            candleSeriesRef.current.setData(candleData);
            chartRef.current.timeScale().fitContent(); 
        }
    }, [candleData]);

    // 4. 🟢 REAL DATA: Live Polling
    useEffect(() => {
        if (!isRunning || candleData.length === 0) return;

        const interval = setInterval(async () => {
            try {
                // Fetch latest price
                const res = await axios.get(`${API_BASE}/market/price`, { params: { symbol } });
                const currentPrice = parseFloat(res.data.price);
                
                if (!isNaN(currentPrice)) {
                    const lastCandle = candleData[candleData.length - 1];
                    
                    // Simple logic: Update current candle (High/Low/Close)
                    const updatedCandle = {
                        ...lastCandle,
                        high: Math.max(lastCandle.high, currentPrice),
                        low: Math.min(lastCandle.low, currentPrice),
                        close: currentPrice
                    };

                    candleSeriesRef.current.update(updatedCandle);
                }
            } catch (e) {
                console.error("Live polling failed:", e);
            }
        }, 2000); // Poll every 2 seconds

        return () => clearInterval(interval);
    }, [isRunning, candleData, symbol]);

    // 5. 🟢 "THOUGHTS" TO MARKERS (Visualizing Logs)
    useEffect(() => {
        if (!candleSeriesRef.current || logs.length === 0 || candleData.length === 0) return;

        const latestLog = logs[logs.length - 1];
        const lastCandle = candleData[candleData.length - 1];
        
        if (!lastCandle) return;

        let newMarker = null;

        if (latestLog.includes("Signal") || latestLog.includes("Trigger")) {
            newMarker = { time: lastCandle.time, position: 'aboveBar', color: '#f59e0b', shape: 'arrowDown', text: 'Signal' };
        } else if (latestLog.includes("Buying") || latestLog.includes("Long")) {
            newMarker = { time: lastCandle.time, position: 'belowBar', color: '#10b981', shape: 'arrowUp', text: 'BUY' };
        } else if (latestLog.includes("Selling") || latestLog.includes("Short")) {
            newMarker = { time: lastCandle.time, position: 'aboveBar', color: '#ef4444', shape: 'arrowDown', text: 'SELL' };
        }

        if (newMarker) {
            const currentMarkers = candleSeriesRef.current.markers() || [];
            candleSeriesRef.current.setMarkers([...currentMarkers, newMarker]);
        }

    }, [logs, candleData]);

    return <div ref={chartContainerRef} className="w-full h-full" />;
}
